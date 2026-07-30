// ============================================
// Novel Genesis Step Hook (TanStack Query)
// 封装 20 步的 API 调用：Prompt 获取 → LLM 调用 → 结果存储
// ============================================
import { useMutation } from '@tanstack/react-query';
import { useNovelGenesisStore } from '@/lib/store/novelGenesis';
import { saveStepOutput } from '@/lib/db/stepOutputs';
import { fillStep } from '@/lib/prompts/prompt-api';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { ContentType } from '@/lib/db/stepOutputs';

import { useApiStore } from '@/lib/store/apiStore';
import type { ModuleName } from '@/lib/types';
import { STEP_MODULE_MAP } from '@/lib/prompts/module-meta';
import { useParamsStore } from '@/lib/store/paramsStore';
import { stepIdToKey } from '@/lib/prompts/prompt-api';

export interface ExecuteStepParams {
  projectId: string;
  stepId: number;
  variables: Record<string, unknown>;
  llmConfig?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    provider?: string;
    apiKey?: string;
    baseUrl?: string;
  };
}

function pickLlmConfig(userConfig?: ExecuteStepParams['llmConfig'], module?: ModuleName) {
  // 1. 用户显式传入且带 apiKey 的配置优先
  if (userConfig?.apiKey) return userConfig;

  // 2. 优先使用「按模块分配」的 API 配置（用户在设置页把该模块分配到的配置）
  if (module) {
    const modCfg = useApiStore.getState().getLlmConfigForModule(module);
    if (modCfg) return { ...modCfg, ...userConfig };
  }

  // 3. 回退：自动从 apiStore 查找第一个启用了且填写了 apiKey 的配置
  const { configs } = useApiStore.getState();
  const active = configs.find((c) => c.enabled && c.apiKey);
  if (active) {
    return {
      provider: active.provider,
      apiKey: active.apiKey,
      baseUrl: active.baseUrl,
      model: active.model,
      temperature: active.temperature,
      maxTokens: active.maxTokens || undefined,
      ...userConfig,
    };
  }

  // 3. 回退：读取 Vite 环境变量（构建时注入，不暴露密钥）
  const envKey = import.meta.env.VITE_LLM_API_KEY;
  const envBase = import.meta.env.VITE_LLM_BASE_URL;
  const envModel = import.meta.env.VITE_LLM_MODEL;
  const envProvider = import.meta.env.VITE_LLM_PROVIDER;
  if (envKey) {
    return {
      provider: envProvider || 'openai',
      apiKey: envKey,
      baseUrl: envBase || 'https://api.openai.com/v1',
      model: envModel || 'gpt-4o-mini',
      ...userConfig,
    };
  }

  // 4. 无任何配置，回退到用户传入（后端走 .env）
  return userConfig;
}

export async function runStepLLM(
  stepId: number,
  variables: Record<string, unknown>,
  projectId?: string,
  llmConfig?: ExecuteStepParams['llmConfig'],
): Promise<{ output: string; outputType: ContentType; summary?: string }> {
  const stepVars = { ...variables };
  if (stepId === 20 && projectId) {
    const snapshot = await useNovelGenesisStore.getState().getPreviousStatesSnapshot(projectId);
    if (snapshot) stepVars.previousStates = snapshot;
  }
  const filled = await fillStep(stepId, stepVars);
  const resolvedLlmConfig = pickLlmConfig(llmConfig, STEP_MODULE_MAP[stepId]);
  const stepKey = stepIdToKey(stepId);
  const params = useParamsStore.getState().getEffectiveParams(stepKey);
  const res = await fetchWithAuth('/api/genesis/step', {
    method: 'POST',
    body: JSON.stringify({
      stepId,
      system: filled.system,
      user: filled.user,
      outputType: filled.outputType,
      llmConfig: resolvedLlmConfig,
      params,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error: ${err}`);
  }
  const data = await res.json();
  return {
    output: (data.output as string) ?? '',
    outputType: filled.outputType as ContentType,
    summary: data.summary,
  };
}

export function useGenesisStep() {
  const startStep = useNovelGenesisStore((s) => s.startStep);
  const finalizeStep = useNovelGenesisStore((s) => s.finalizeStep);
  const setStepError = useNovelGenesisStore((s) => s.setStepError);
  const appendStreamChunk = useNovelGenesisStore((s) => s.appendStreamChunk);

  /** 执行普通步骤（JSON/Markdown 一次性返回） */
  const executeStep = useMutation({
    mutationFn: async ({ projectId: _projectId, stepId, variables, llmConfig }: ExecuteStepParams) => {
      startStep(stepId);
      const { output, outputType, summary } = await runStepLLM(stepId, variables, _projectId, llmConfig);
      return { data: { output, summary }, outputType };
    },
    onSuccess: async ({ data, outputType }, { projectId, stepId }) => {
      // 3. JSON 类型做容错解析（后端返回 jsonParse 校验结果）
      let content = data.output;
      if (outputType === 'json' && typeof data.output === 'string') {
        try {
          // 后端已尝试 safeParseJSON，这里再做一层容错
          content = JSON.stringify(JSON.parse(data.output));
        } catch {
          // AI 输出不合法 JSON：尝试提取大括号内内容
          const match = data.output.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              content = JSON.stringify(JSON.parse(match[0]));
            } catch {
              content = data.output; // 保留原始，让展示层处理错误
            }
          }
        }
      }

      // 4. 存 IndexedDB
      const outputRef = `project::${projectId}::step::${stepId}`;
      await saveStepOutput(projectId, stepId, {
        type: outputType,
        content,
        summary: data.summary,
        updatedAt: Date.now(),
      });

      // 5. 更新 Zustand
      finalizeStep(stepId, outputRef, outputType);
    },
    onError: (err, { stepId }) => {
      setStepError(stepId, err instanceof Error ? err.message : '未知错误');
    },
  });

  /** 执行流式步骤（SSE，第16/17/19步） */
  const executeStreamStep = useMutation({
    mutationFn: async ({ projectId, stepId, variables, llmConfig }: ExecuteStepParams) => {
      startStep(stepId);

      // 1. 获取填充后的 Prompt
      const stepVars = { ...variables };
      // Step 20: 自动取上一章最新角色快照，避免传全量历史
      if (stepId === 20) {
        const snapshot = await useNovelGenesisStore.getState().getPreviousStatesSnapshot(projectId);
        if (snapshot) stepVars.previousStates = snapshot;
      }

      const filled = await fillStep(stepId, stepVars);

      // 自动从 apiStore 读取 API 配置
      const resolvedLlmConfig = pickLlmConfig(llmConfig, STEP_MODULE_MAP[stepId]);

      // 计算高级参数（模板级默认 + 用户覆盖/预设）
      const stepKey = stepIdToKey(stepId);
      const params = useParamsStore.getState().getEffectiveParams(stepKey);

      // 2. 调用流式 API
      const res = await fetchWithAuth('/api/genesis/stream', {
        method: 'POST',
        body: JSON.stringify({
          stepId,
          system: filled.system,
          user: filled.user,
          llmConfig: resolvedLlmConfig,
          params,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Stream API error: ${err}`);
      }

      // 3. 消费 SSE
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        streamDone = done;
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const json = line.slice(6);
            if (json === '[DONE]') continue;
            try {
              const parsed = JSON.parse(json);
              buffer += parsed.content || '';
              appendStreamChunk(stepId, parsed.content || '');
            } catch {
              // 忽略解析失败的行
            }
          }
        }
      }

      return { buffer, stepId, projectId };
    },
    onSuccess: async ({ buffer, projectId, stepId }) => {
      // 4. 存 IndexedDB
      const outputRef = `project::${projectId}::step::${stepId}`;
      await saveStepOutput(projectId, stepId, {
        type: 'stream',
        content: buffer,
        updatedAt: Date.now(),
      });

      // 5. 更新 Zustand
      finalizeStep(stepId, outputRef, 'stream');
    },
    onError: (err, { stepId }) => {
      setStepError(stepId, err instanceof Error ? err.message : '流式生成失败');
    },
  });

  return {
    executeStep: executeStep.mutate,
    executeStreamStep: executeStreamStep.mutate,
    isLoading: executeStep.isPending || executeStreamStep.isPending,
    isStreaming: executeStreamStep.isPending,
    error: executeStep.error || executeStreamStep.error,
  };
}

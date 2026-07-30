// ============================================
// Prompt Template Service 前端 API 封装
// 前端只传变量和 stepId，Prompt 原文由后端拼接
// ============================================

import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

export interface PromptMeta {
  id: number;
  key: string;
  name: string;
  variables: string[];
  outputType: 'markdown' | 'json' | 'stream';
}

/** 原始提示词模板（可编辑） */
export interface PromptTemplate {
  id: number;
  name: string;
  system: string;
  user: string;
  variables: string[];
  outputType: 'markdown' | 'json' | 'stream';
}

export interface FilledPrompt {
  stepId: number;
  name: string;
  system: string | null;
  user: string;
  outputType: 'markdown' | 'json' | 'stream';
  variables: string[];
  missingVariables: string[];
}

const API_BASE = '/api';

/** 列出所有 Prompt 模板元信息 */
export async function listPrompts(): Promise<PromptMeta[]> {
  const res = await fetchWithAuth(`${API_BASE}/prompts`);
  if (!res.ok) throw new Error(`Failed to list prompts: ${res.status}`);
  return res.json();
}

/** 获取拼接后的 Prompt（传入变量值） */
export async function fillPrompt(
  stepKey: string,
  variables: Record<string, unknown>
): Promise<FilledPrompt> {
  const res = await fetchWithAuth(`${API_BASE}/prompts/${stepKey}`, {
    method: 'POST',
    body: JSON.stringify({ variables }),
  });
  if (!res.ok) throw new Error(`Failed to fill prompt ${stepKey}: ${res.status}`);
  return res.json();
}

/** 获取原始模板（调试用） */
export async function getRawPrompt(stepKey: string): Promise<unknown> {
  const res = await fetchWithAuth(`${API_BASE}/prompts/${stepKey}/raw`);
  if (!res.ok) throw new Error(`Failed to get raw prompt ${stepKey}: ${res.status}`);
  return res.json();
}

/** 保存（编辑后写回）某个步骤的提示词模板 */
export async function updatePrompt(
  stepKey: string,
  data: { name?: string; system?: string; user?: string; outputType?: string }
): Promise<{ ok: boolean; key: string; template: PromptTemplate }> {
  const res = await fetchWithAuth(`${API_BASE}/prompts/${stepKey}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `保存失败: ${res.status}`);
  }
  return res.json();
}

/** 健康检查 */
export async function checkPromptService(): Promise<{ status: string; templates: number }> {
  const res = await fetchWithAuth(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Prompt service health check failed: ${res.status}`);
  return res.json();
}

/** 快捷函数：步骤 ID 转 key */
export function stepIdToKey(stepId: number): string {
  return `step${stepId}`;
}

/** 快捷函数：填充指定步骤 */
export async function fillStep(
  stepId: number,
  variables: Record<string, unknown>
): Promise<FilledPrompt> {
  return fillPrompt(stepIdToKey(stepId), variables);
}

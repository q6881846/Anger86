/**
 * Prompt Template Service
 * 接收 stepId + variables，返回拼接后的完整 Prompt
 * 技术栈：Node.js + Express (Vite dev server proxy 到 /api/*)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LLMAdapter } from './lib/llm-adapter.js';
import { apiKeyAuth } from './middleware/auth.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
// 放宽 body 限制：step15 等步骤会把完整 step12 骨架 + 角色表 + 主线 + 世界观插值进提示词，
// JSON 体积可能远超 Express 默认的 100KB，导致 413 PayloadTooLarge。
app.use(express.json({
  limit: '50mb',
  // 保存原始请求体，便于 JSON 解析失败时定位被掺入的非法字符
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// JSON 解析失败（如请求体被开发代理/HMR 抖动掺入非法字符）时，记录原始字节并返回清晰错误
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    const preview = (req.rawBody || '').slice(0, 500);
    console.error(`[BAD JSON] ${req.method} ${req.originalUrl} -> ${err.message}\nPREVIEW: ${preview}`);
    return res.status(400).json({ error: '请求体不是合法 JSON', detail: err.message, preview: (req.rawBody || '').slice(0, 200) });
  }
  next(err);
});

// ========== 内存日志环形缓冲区（供前端调试面板查看） ==========
const LOG_BUFFER = [];
const LOG_MAX = 500;
// 先保存原始 console 方法，避免递归
const _origLog = console.log.bind(console);
const _origWarn = console.warn.bind(console);
const _origErr = console.error.bind(console);

function pushLog(level, msg, extra) {
  const entry = { t: new Date().toISOString(), level, msg, extra: extra || null };
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > LOG_MAX) LOG_BUFFER.shift();
  // 同时输出到控制台（用原始方法，避免递归）
  const line = `[${entry.t}] [${level}] ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`;
  if (level === 'ERROR') _origErr(line);
  else if (level === 'WARN') _origWarn(line);
  else _origLog(line);
}
// 拦截 console.log/warn/error，自动入缓冲区
console.log = (...args) => { pushLog('INFO', args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')); };
console.warn = (...args) => { pushLog('WARN', args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')); };
console.error = (...args) => { pushLog('ERROR', args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')); };

// 鉴权：/api 下所有路由（包括 healthcheck，Docker healthcheck 需带 X-API-Key）
app.use('/api', apiKeyAuth);

// 加载 Prompt 模板
const TEMPLATES = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'prompt-templates.json'), 'utf-8')
);

console.log(`[Prompt Service] Loaded ${Object.keys(TEMPLATES).length} prompt templates`);

// ---- 全局字数规划规则注入 ----
// 将字数控制规则（含 {{totalWordTarget}}/{{singleVolumeWord}} 占位符）注入到每个含
// 【全局强制前置规则】的模板 user 末尾，作为「规则 5」。两个占位符由前端随请求传入，
// 在 /api/prompts/:key 填充时由 fillTemplate 替换。
const GLOBAL_WORD_RULE =
  '5. 严格遵循前端传入的 {{totalWordTarget}} 全书总字数、{{singleVolumeWord}} 单卷字数规划设计剧情体量；' +
  '总字数越高，拆分卷数、长线伏笔、支线、人物阶段越多，杜绝前期把全部核心秘密、终极冲突写完导致后期无内容可写。\n';

for (const key of Object.keys(TEMPLATES)) {
  const tpl = TEMPLATES[key];
  if (!tpl || !tpl.user || !tpl.user.includes('【全局强制前置规则】')) continue;
  // 幂等：先移除任何已存在的「规则 5」行（兼容 JSON 里已有的残留 / 重复注入），保证最终恰好一条
  tpl.user = tpl.user.replace(/5\. 严格遵循前端传入的 \{\{totalWordTarget\}\}[^\n]*\n/g, '');
  // 锚点：规则 4 行尾，插入到其后作为「规则 5」
  const rule4Match = tpl.user.match(/\n4\. 现实无力量题材[^\n]*\n/);
  if (rule4Match) {
    tpl.user = tpl.user.replace(rule4Match[0], rule4Match[0] + '\n' + GLOBAL_WORD_RULE);
  } else {
    // 兜底：插在【全局强制前置规则】标题之后
    tpl.user = tpl.user.replace(
      '【全局强制前置规则】\n',
      `【全局强制前置规则】\n\n${GLOBAL_WORD_RULE}\n`
    );
  }
}
console.log('[Prompt Service] Injected global word-target rule into templates');

// ---- JSON 容错工具 ----

function safeParseJSON(text) {
  if (typeof text !== 'string') return { data: null, error: 'Input not a string' };
  // 先尝试直接解析
  try {
    return { data: JSON.parse(text), error: null };
  } catch {
    // 移除 markdown 代码块包装
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3).trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3).trim();
    }
    try {
      return { data: JSON.parse(cleaned), error: null };
    } catch (e2) {
      return { data: null, error: `Invalid JSON after cleanup: ${e2.message}` };
    }
  }
}

// 变量替换函数
function fillTemplate(template, variables) {
  let result = template;
  const missingVars = [];
  
  // 匹配 {{varName}} 和 {{{varName}}}
  const varRegex = /\{\{\{?\s*(\w+)\s*\}?\}\}/g;
  
  result = result.replace(varRegex, (match, varName) => {
    if (variables[varName] !== undefined) {
      return String(variables[varName]);
    }
    missingVars.push(varName);
    return match; // 保留占位符
  });
  
  return { text: result, missing: missingVars };
}

// ---- 特殊语法解析：将 [系统提示词]/[用户消息]/[AI回复]/[章节内容循环] 解析为消息序列 ----

/**
 * 解析包含特殊标记的 Prompt 文本
 * 支持 [系统提示词]、[用户消息]、[AI回复]、[章节内容循环]...[/章节内容循环]
 * 返回 { system: string|null, messages: Array<{role, content}> }
 */
function parseSpecialSyntax(rawText) {
  if (!rawText) return { system: null, messages: [] };
  
  let text = rawText;
  let system = null;
  const messages = [];
  
  // 1. 提取系统提示词（如果有的话）
  const sysMatch = text.match(/^\s*\[系统提示词\]\s*\n?([\s\S]*?)(?=\n?\s*\[(用户消息|AI回复|章节内容循环)\]|$)/);
  if (sysMatch) {
    system = sysMatch[1].trim();
    text = text.slice(sysMatch[0].length);
  }
  
  // 2. 解析消息序列和章节循环
  const tokenRegex = /\[(用户消息|AI回复|章节内容循环)\]|\[\/章节内容循环\]/g;
  let lastIndex = 0;
  let currentRole = null;
  let inChapterLoop = false;
  let loopContent = '';
  let loopVariables = {};
  
  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    const tag = match[1] || match[0].slice(1, -1); // 去掉[]
    const beforeText = text.slice(lastIndex, match.index).trim();
    
    if (tag === '章节内容循环') {
      // 章节循环开始前的文本作为普通消息
      if (beforeText && currentRole) {
        messages.push({ role: currentRole, content: beforeText });
      } else if (beforeText && !currentRole) {
        // 没有角色标记的文本，默认作为第一条用户消息
        messages.push({ role: 'user', content: beforeText });
      }
      inChapterLoop = true;
      currentRole = null;
      loopContent = '';
    } else if (tag === '/章节内容循环') {
      // 章节循环结束，保存循环内容
      if (loopContent.trim()) {
        messages.push({
          role: 'loop',
          content: loopContent.trim(),
          isChapterLoop: true,
        });
      }
      inChapterLoop = false;
      currentRole = null;
    } else if (inChapterLoop) {
      // 在章节循环内部
      if (beforeText) {
        loopContent += (loopContent ? '\n' : '') + beforeText;
      }
      currentRole = tag === '用户消息' ? 'user' : 'assistant';
      loopContent += `\n[${tag}]\n`;
    } else {
      // 普通消息
      if (beforeText && currentRole) {
        messages.push({ role: currentRole, content: beforeText });
      } else if (beforeText && !currentRole) {
        // 第一条没有角色标记的内容
        if (!system && !messages.length) {
          // 如果还没有system和任何消息，这段文本作为user消息
          messages.push({ role: 'user', content: beforeText });
        } else {
          messages.push({ role: 'user', content: beforeText });
        }
      }
      currentRole = tag === '用户消息' ? 'user' : 'assistant';
    }
    
    lastIndex = tokenRegex.lastIndex;
  }
  
  // 处理剩余文本
  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    if (inChapterLoop) {
      loopContent += (loopContent ? '\n' : '') + remaining;
      messages.push({
        role: 'loop',
        content: loopContent.trim(),
        isChapterLoop: true,
      });
    } else if (currentRole) {
      messages.push({ role: currentRole, content: remaining });
    } else if (!messages.length && !system) {
      // 没有任何标记，整段作为user消息
      messages.push({ role: 'user', content: remaining });
    } else if (!messages.length) {
      messages.push({ role: 'user', content: remaining });
    } else {
      // 追加到最后一条消息的末尾
      const last = messages[messages.length - 1];
      last.content += '\n' + remaining;
    }
  }
  
  return { system, messages };
}

// ---- LLM 适配器初始化 ----
const llm = new LLMAdapter({
  provider: process.env.LLM_PROVIDER || 'openai',
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,
  model: process.env.LLM_MODEL,
});

// GET /api/prompts — 列出所有 Prompt 元信息
app.get('/api/prompts', (req, res) => {
  const meta = Object.entries(TEMPLATES).map(([key, tpl]) => ({
    id: tpl.id,
    key,
    name: tpl.name,
    variables: tpl.variables,
    outputType: tpl.outputType,
  }));
  res.json(meta);
});

// POST /api/prompts/:stepKey — 获取拼接后的 Prompt
app.post('/api/prompts/:stepKey', (req, res) => {
  const { stepKey } = req.params;
  const { variables = {} } = req.body;
  
  const tpl = TEMPLATES[stepKey];
  if (!tpl) {
    return res.status(404).json({ error: `Prompt template "${stepKey}" not found` });
  }
  
  // 填充 system prompt
  const systemResult = fillTemplate(tpl.system, variables);
  const userResult = fillTemplate(tpl.user, variables);
  
  const response = {
    stepId: tpl.id,
    name: tpl.name,
    system: systemResult.text || null,
    user: userResult.text,
    outputType: tpl.outputType,
    variables: tpl.variables,
    missingVariables: [...new Set([...systemResult.missing, ...userResult.missing])],
  };
  
  res.json(response);
});

// POST /api/prompts/:stepKey/raw — 获取原始模板（调试用）
app.get('/api/prompts/:stepKey/raw', (req, res) => {
  const { stepKey } = req.params;
  const tpl = TEMPLATES[stepKey];
  if (!tpl) {
    return res.status(404).json({ error: `Prompt template "${stepKey}" not found` });
  }
  res.json(tpl);
});

// PUT /api/prompts/:stepKey — 编辑并持久化保存提示词模板
app.put('/api/prompts/:stepKey', (req, res) => {
  try {
    const { stepKey } = req.params;
    const tpl = TEMPLATES[stepKey];
    if (!tpl) {
      return res.status(404).json({ error: `Prompt template "${stepKey}" not found` });
    }

    const { name, system, user, outputType } = req.body || {};
    if (typeof name === 'string') tpl.name = name;
    if (typeof system === 'string') tpl.system = system;
    if (typeof user === 'string') tpl.user = user;
    if (typeof outputType === 'string') tpl.outputType = outputType;

    const promptPath = path.join(__dirname, 'prompt-templates.json');
    fs.writeFileSync(promptPath, JSON.stringify(TEMPLATES, null, 2), 'utf-8');

    console.log(`[Prompt Service] Updated template "${stepKey}"`);
    res.json({ ok: true, key: stepKey, template: tpl });
  } catch (err) {
    console.error('[Prompt Service] update error:', err);
    res.status(500).json({ error: '保存提示词失败' });
  }
});

// ---- 高级参数系统 ----
// 全局默认参数（未配置模板默认/用户覆盖时的兜底）
// 注意：LongCat 等 OpenAI 兼容网关在「省略 max_tokens」时会使用极小默认值（几乎不输出），
// 因此不能依赖 0 = 不限制。这里显式给出 16000 作为兜底，确保长内容（主线脉络/详细大纲）能完整输出。
const GLOBAL_DEFAULT_PARAMS = {
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 16000,
  frequency_penalty: 0,
  presence_penalty: 0,
};

// 模板级默认参数（按 stepId）。JSON 步骤刻意压低温度/TopP 保证结构稳定；
// 流式正文步骤适当提高温度增加文采。用户通过前端的覆盖优先于模板默认。
// 模型硬上限（按用户提供的规格）：上下文 1024k / 输入 1024k / 输出 128k / 思考 128k
const MODEL_LIMITS = {
  contextWindow: 1024 * 1024, // 1,048,576
  maxInput: 1024 * 1024,      // 1,048,576
  maxOutput: 128 * 1024,      // 131,072
  maxReasoning: 128 * 1024,   // 131,072
};

const TEMPLATE_DEFAULT_PARAMS = {
  4: { temperature: 0.5, top_p: 0.7 }, // 一句话大纲
  8: { temperature: 0.0, top_p: 0.1 }, // 核心角色（JSON 严格）
  9: { temperature: 0.0, top_p: 0.1 }, // 配角（JSON 严格）
  10: { max_tokens: MODEL_LIMITS.maxOutput }, // 主线脉络（超长，流式）→ 跑满输出上限 128k
  12: { max_tokens: MODEL_LIMITS.maxOutput }, // 详细大纲（超长，流式）→ 跑满输出上限 128k
  16: { temperature: 0.85, top_p: 0.9, max_tokens: 3000 }, // 章节正文（流式）
  17: { temperature: 0.85, top_p: 0.9, max_tokens: 3000 }, // 章节续写（流式）
  18: { temperature: 0.3, top_p: 0.5, frequency_penalty: 0.5 }, // 去AI润色
  19: { temperature: 0.8, top_p: 0.85, frequency_penalty: 0.2 }, // 角色对话（流式）
  20: { temperature: 0.0, top_p: 0.1 }, // 角色状态同步（JSON 严格）
  // 其余步骤未列出 → 使用 GLOBAL_DEFAULT
};

// 合并：全局默认 ← 模板默认 ← 用户覆盖（用户优先）
function resolveParams(stepId, userParams = {}) {
  const tpl = TEMPLATE_DEFAULT_PARAMS[String(stepId)] || {};
  return {
    temperature: userParams.temperature ?? tpl.temperature ?? GLOBAL_DEFAULT_PARAMS.temperature,
    top_p: userParams.top_p ?? tpl.top_p ?? GLOBAL_DEFAULT_PARAMS.top_p,
    max_tokens: userParams.max_tokens ?? tpl.max_tokens ?? GLOBAL_DEFAULT_PARAMS.max_tokens,
    frequency_penalty:
      userParams.frequency_penalty ?? tpl.frequency_penalty ?? GLOBAL_DEFAULT_PARAMS.frequency_penalty,
    presence_penalty:
      userParams.presence_penalty ?? tpl.presence_penalty ?? GLOBAL_DEFAULT_PARAMS.presence_penalty,
  };
}

// ---- LLM 代理端点 ----

/** POST /api/genesis/step — 非流式 LLM 调用（多模型适配） */
app.post('/api/genesis/step', async (req, res) => {
  const { stepId, system, user, outputType, llmConfig = {}, params = {} } = req.body;

  if (!user) {
    return res.status(400).json({ error: 'Missing "user" prompt' });
  }

  // 动态适配器：支持请求级覆盖 provider/apiKey/baseURL/model
  const adapter = new LLMAdapter({
    provider: llmConfig.provider || process.env.LLM_PROVIDER || 'openai',
    apiKey: llmConfig.apiKey || process.env.LLM_API_KEY || '',
    baseURL: llmConfig.baseUrl || process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    model: llmConfig.model || process.env.LLM_MODEL || 'gpt-4o-mini',
  });

  if (!adapter.apiKey && adapter.provider !== 'google' && adapter.provider !== 'gemini') {
    return res.status(400).json({ error: 'No API key configured' });
  }

  try {
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: user });

    const isJson = outputType === 'json';
    const responseFormat = undefined; // 不强制 json_object：当前网关在该模式下会返回空流，改由严格 prompt + 前端容错解析

    // 合并：全局默认 ← 模板默认 ← 用户覆盖
    const resolved = resolveParams(stepId, params);
    const body = adapter.buildRequestBody(messages, {
      temperature: resolved.temperature,
      maxTokens: resolved.max_tokens,
      topP: resolved.top_p,
      frequencyPenalty: resolved.frequency_penalty,
      presencePenalty: resolved.presence_penalty,
      stream: false,
      responseFormat,
    });

    const llmRes = await fetch(adapter.getEndpoint(false), {
      method: 'POST',
      headers: adapter.getHeaders(false),
      body: JSON.stringify(body),
    });

    if (!llmRes.ok) {
      const status = llmRes.status;
      const errText = await llmRes.text();
      console.error(`[LLM] step ${stepId} 网关返回 HTTP ${status}: ${errText.slice(0, 300)}`);
      return res.status(status).json({ error: `LLM API error (HTTP ${status}): ${errText.slice(0, 300)}` });
    }

    // 先以文本读取，避免部分 GLM 网关在 stream:false 下返回被截断/压缩异常的 JSON 体，
    // 导致 llmRes.json() 抛出被序列化为 {} 的 TypeError。
    let raw;
    const rawText = await llmRes.text();
    try {
      raw = JSON.parse(rawText);
    } catch (parseErr) {
      console.error(`[LLM] step ${stepId} 响应非合法 JSON（前 500 字符）：`, rawText.slice(0, 500));
      return res.status(502).json({
        error: 'LLM 响应解析失败',
        detail: `网关返回的内容不是合法 JSON（疑似 stream:false 兼容性问题），原始片段：${rawText.slice(0, 300)}`,
      });
    }
    const content = adapter.parseResponse(raw);

    // JSON 输出校验/修复
    let jsonParseResult = null;
    if (outputType === 'json') {
      const parseResult = safeParseJSON(content);
      jsonParseResult = parseResult.error
        ? { valid: false, error: parseResult.error, raw: content }
        : { valid: true, data: parseResult.data };
    }

    res.json({
      stepId,
      output: content,
      outputType,
      model: adapter.model,
      jsonParse: jsonParseResult,
    });
  } catch (err) {
    const maskedKey = adapter.apiKey
      ? `${adapter.apiKey.slice(0, 4)}***${adapter.apiKey.slice(-4)}`
      : '(empty)';
    // 避免 TypeError/网络错误被序列化成 {} 而吞掉真实原因
    console.error('[LLM Step Error]', {
      message: err?.message || String(err),
      cause: err?.cause ? (err.cause.message || String(err.cause)) : undefined,
      stack: err?.stack,
      provider: adapter.provider,
      baseURL: adapter.baseURL,
      model: adapter.model,
      apiKey: maskedKey,
      stepId,
    });
    res.status(502).json({
      error: 'LLM request failed',
      detail: err?.message || String(err),
      cause: err?.cause ? (err.cause.message || String(err.cause)) : undefined,
    });
  }
});

/** POST /api/genesis/stream — 流式 LLM 调用（SSE，多模型适配） */
app.post('/api/genesis/stream', async (req, res) => {
  const { stepId, system, user, outputType, llmConfig = {}, params = {} } = req.body;

  if (!user) {
    return res.status(400).json({ error: 'Missing "user" prompt' });
  }

  const adapter = new LLMAdapter({
    provider: llmConfig.provider || process.env.LLM_PROVIDER || 'openai',
    apiKey: llmConfig.apiKey || process.env.LLM_API_KEY || '',
    baseURL: llmConfig.baseUrl || process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    model: llmConfig.model || process.env.LLM_MODEL || 'gpt-4o-mini',
  });

  if (!adapter.apiKey && adapter.provider !== 'google' && adapter.provider !== 'gemini') {
    return res.status(400).json({ error: 'No API key configured' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders(); // 立即发送响应头，避免代理/网关缓冲导致前端长时间收不到首字节

  try {
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: user });

    // 结构化输出（JSON）步骤：降温度以减少格式漂移（通过模板默认 + 用户覆盖控制）。
    // 不强制 response_format=json_object —— 当前模型/网关在该模式下会返回空流，
    // 导致前端拿到空内容、卡片不渲染（表现为“点了没反应”）。
    // 改用“严格 prompt + 前端 extractJSON 容错解析（支持围栏/对象/数组）”来保证结构。
    const isJson = outputType === 'json';

    // 合并：全局默认 ← 模板默认 ← 用户覆盖
    const resolved = resolveParams(stepId, params);
    // 网关硬上限：LongCat 网关实测 max_tokens>32768 会长时间无响应而超时，强制降级
    if (resolved.max_tokens > 32768) {
      console.warn(`[WARN] step${stepId} max_tokens=${resolved.max_tokens} 超出网关安全上限，自动降级至 32768`);
      resolved.max_tokens = 32768;
    }
    const body = adapter.buildRequestBody(messages, {
      temperature: resolved.temperature,
      maxTokens: resolved.max_tokens,
      topP: resolved.top_p,
      frequencyPenalty: resolved.frequency_penalty,
      presencePenalty: resolved.presence_penalty,
      stream: true,
    });

    // [DEBUG] 记录发给 LLM 的关键参数
    console.log(`[Stream step${stepId}] provider=${adapter.provider} model=${adapter.model} max_tokens=${body.max_tokens} temperature=${body.temperature} user_prompt_len=${messages[messages.length - 1]?.content?.length || 0}`);

    const llmRes = await fetch(adapter.getEndpoint(true), {
      method: 'POST',
      headers: adapter.getHeaders(true),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(600000),
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text();
      throw new Error(`LLM HTTP ${llmRes.status}: ${errText.slice(0, 200)}`);
    }

    const reader = llmRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamDone = false;
    let totalChars = 0;
    let reasoningChars = 0;
    let finishReason = '(unknown)';
    let usageInfo = null;
    let clientAborted = false;
    let heartbeat = null;
    // 首字节超时（毫秒）：网关对超大 max_tokens 可能长时间不返回任何数据（实测 128k 会 hang 满 600s）
    const FIRST_BYTE_TIMEOUT = 120000;
    // 闲置超时（毫秒）：已开始输出后，若超过该时长仍无任何新数据（思考或正文），判定模型卡死/网关异常，主动结束
    const INACTIVITY_TIMEOUT = 90000;
    // 推理长度硬上限（字符数）：部分推理模型会陷入超长/循环思考，超过即主动收尾，避免无限制输出
    const MAX_REASONING = 24000;

    // 心跳保活：每 15s 写一条 SSE 注释，避免代理/浏览器在长时间推理（思考阶段无正文）时判定连接死亡
    heartbeat = setInterval(() => {
      try { res.write(': keep-alive\n\n'); } catch (_) {}
    }, 15000);

    // 监听客户端断开
    req.on('close', () => {
      clientAborted = true;
      console.warn(`[Stream step${stepId}] Client disconnected (abort/timeout), total_chars_so_far=${totalChars} reasoning_chars_so_far=${reasoningChars}`);
      try { reader.cancel(); } catch (_) {}
    });

    while (!streamDone && !clientAborted) {
      // 首字节超时保护：收到任何内容前，若超过 FIRST_BYTE_TIMEOUT 仍无数据则主动报错，
      // 避免网关对超大 max_tokens 不响应时前端永久“等待首字节”。一旦开始收到数据就不再限时。
      let readResult;
      if (totalChars === 0 && reasoningChars === 0) {
        readResult = await Promise.race([
          reader.read(),
          new Promise((_, rej) =>
            setTimeout(
              () =>
                rej(
                  new Error(
                    `120秒未获取模型任何输出，请减少单次生成篇幅、分多卷生成`,
                  ),
                ),
              FIRST_BYTE_TIMEOUT,
            ),
          ),
        ]);
      } else {
        // 闲置超时保护：已开始输出后，若超过 INACTIVITY_TIMEOUT 仍无任何新数据，判定模型卡死，主动结束
        readResult = await Promise.race([
          reader.read(),
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ done: false, value: undefined, _inactive: true }),
              INACTIVITY_TIMEOUT,
            ),
          ),
        ]);
        if (readResult && readResult._inactive) {
          console.warn(`[Stream step${stepId}] 闲置超时（${INACTIVITY_TIMEOUT}ms 无新数据），主动结束`);
          streamDone = true;
          break;
        }
      }
      streamDone = readResult.done;
      if (readResult.done) break;
      const value = readResult.value;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (clientAborted) break;
        if (line.startsWith('data: ')) {
          const json = line.slice(6).trim();
          if (json === '[DONE]') {
            // 上游已声明结束：立即退出循环，不再等待连接关闭（LongCat 网关可能保持连接）
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            // [DEBUG] 捕获 finish_reason 和 usage
            const choice = parsed.choices?.[0];
            if (choice?.finish_reason) finishReason = choice.finish_reason;
            if (parsed.usage) usageInfo = parsed.usage;
            const delta = adapter.parseStreamDelta(parsed);
            if (delta) {
              if (delta.content) {
                totalChars += delta.content.length;
                res.write(`data: ${JSON.stringify({ content: delta.content, stepId })}\n\n`);
              }
              if (delta.reasoning) {
                reasoningChars += delta.reasoning.length;
                res.write(`data: ${JSON.stringify({ reasoning: delta.reasoning, stepId })}\n\n`);
                // 推理长度超过硬上限（如模型陷入循环思考），主动收尾，避免无限制输出
                if (reasoningChars > MAX_REASONING) {
                  console.warn(`[Stream step${stepId}] 推理长度超过上限（${MAX_REASONING} 字符），主动收尾`);
                  streamDone = true;
                  break;
                }
              }
            }
          } catch (parseErr) {
            console.warn('[SSE Parse Skip]', parseErr.message, '| Raw:', json.slice(0, 100));
          }
        }
      }
    }

    if (heartbeat) clearInterval(heartbeat);

    // [DEBUG] 记录流结束时的统计
    if (clientAborted) {
      console.warn(`[Stream step${stepId}] ABORTED total_chars=${totalChars} reasoning_chars=${reasoningChars} finish_reason=${finishReason} usage=${usageInfo ? JSON.stringify(usageInfo) : '(none)'}`);
    } else {
      console.log(`[Stream step${stepId}] DONE total_chars=${totalChars} reasoning_chars=${reasoningChars} finish_reason=${finishReason} usage=${usageInfo ? JSON.stringify(usageInfo) : '(none)'}`);
      res.write('data: [DONE]\n\n');
    }
    res.end();
  } catch (err) {
    // 标准化错误结构，杜绝空 {} 吞掉报错信息（前端据此弹窗，不再静默卡死）
    const traceId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const isTimeout =
      err?.name === 'AbortError' || /超时|timeout/i.test(String(err?.message || ''));
    const errorInfo = {
      code: isTimeout ? 'FIRST_BYTE_TIMEOUT' : 'GATEWAY_TIMEOUT',
      msg:
        err?.message ||
        '大模型网关长时间无响应，单次生成文本量过大，请降低输出长度、分卷生成',
      traceId,
    };
    console.error('[LLM Stream Error]', errorInfo, err);
    try {
      if (res.writable && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: errorInfo })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } catch (_) {}
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', templates: Object.keys(TEMPLATES).length });
});

// 调试日志：返回内存环形缓冲区中的最近日志
app.get('/api/logs', (req, res) => {
  const level = (req.query.level || '').toUpperCase();
  const limit = parseInt(req.query.limit) || 200;
  let logs = LOG_BUFFER.slice(-limit);
  if (level && ['INFO', 'WARN', 'ERROR'].includes(level)) {
    logs = logs.filter(l => l.level === level);
  }
  res.json({ count: logs.length, total: LOG_BUFFER.length, logs });
});

// 清空日志缓冲区
app.post('/api/logs/clear', (req, res) => {
  LOG_BUFFER.length = 0;
  res.json({ ok: true });
});

const PORT = process.env.PROMPT_PORT || 3456;
app.listen(PORT, () => {
  console.log(`[Prompt Service] Running at http://localhost:${PORT}`);
  console.log(`[Prompt Service] Endpoints:`);
  console.log(`  GET  /api/prompts          - List all templates`);
  console.log(`  POST /api/prompts/:key     - Fill template with variables`);
  console.log(`  GET  /api/prompts/:key/raw - Get raw template`);
  console.log(`  GET  /api/health           - Health check`);
  console.log(`  GET  /api/logs             - Debug logs (query: level, limit)`);
  console.log(`  POST /api/logs/clear       - Clear debug logs`);
});

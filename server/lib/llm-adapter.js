/**
 * LLM 多厂商适配层
 * 统一封装请求构建、响应解析、SSE delta 提取
 * ES Module 格式（server/package.json type: module）
 */

export class LLMAdapter {
  constructor(config) {
    this.provider = config.provider || 'openai';
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL?.replace(/\/$/, ''); // 去尾斜杠
    this.model = config.model;
  }

  /** 构建标准化请求体 */
  buildRequestBody(messages, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 4096,
      stream = false,
      responseFormat,
      topP,
      frequencyPenalty,
      presencePenalty,
    } = options;

    switch (this.provider) {
      case 'anthropic': {
        // Anthropic: system 是顶层字段，其余消息 role 只能是 user/assistant
        const systemMsg = messages.find((m) => m.role === 'system');
        const chatMessages = messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          }));
        const body = {
          model: this.model,
          // Anthropic 必填 max_tokens；0 表示不限制，给一个较大的兜底值
          max_tokens: maxTokens > 0 ? maxTokens : 8192,
          messages: chatMessages,
          system: systemMsg?.content,
          stream,
          temperature,
        };
        if (typeof topP === 'number') body.top_p = topP;
        return body;
      }

      case 'google':
      case 'gemini': {
        // Gemini: role 为 user/model，system 并入第一条 user
        const contents = messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));
        const generationConfig = { temperature };
        // 0 表示不限制 → 不发送 maxOutputTokens，由模型决定长度
        if (maxTokens > 0) generationConfig.maxOutputTokens = maxTokens;
        if (typeof topP === 'number') generationConfig.topP = topP;
        // 开启 JSON 模式（Gemini 通过 responseMimeType 强制）
        if (responseFormat === 'json_object') {
          generationConfig.responseMimeType = 'application/json';
        }
        return { contents, generationConfig };
      }

      case 'openai':
      case 'longcat':
      case 'custom':
      default: {
        const body = {
          model: this.model,
          messages,
          temperature,
          stream,
        };
        // 显式发送 max_tokens：LongCat 等网关在省略该字段时会用极小默认值（几乎不输出），
        // 因此不能依赖「省略 = 不限制」。0 或不传时回退到 16000 的显式大值。
        body.max_tokens = maxTokens > 0 ? maxTokens : 16000;
        if (typeof topP === 'number') body.top_p = topP;
        if (typeof frequencyPenalty === 'number') body.frequency_penalty = frequencyPenalty;
        if (typeof presencePenalty === 'number') body.presence_penalty = presencePenalty;
        // 开启 JSON 模式（OpenAI 系通过 response_format 强制）
        if (responseFormat === 'json_object') {
          body.response_format = { type: 'json_object' };
        }
        return body;
      }
    }
  }

  /** 获取请求端点 */
  getEndpoint(stream = false) {
    switch (this.provider) {
      case 'anthropic':
        return `${this.baseURL}/v1/messages`;
      case 'google':
      case 'gemini': {
        const action = stream ? 'streamGenerateContent' : 'generateContent';
        const base = `${this.baseURL}/v1beta/models/${this.model}:${action}`;
        // Gemini API Key 通过 URL query param 传递
        return this.apiKey ? `${base}?key=${this.apiKey}` : base;
      }
      case 'openai':
      case 'longcat':
      case 'custom':
      default:
        return `${this.baseURL}/chat/completions`;
    }
  }

  /** 获取请求头 */
  getHeaders(stream = false) {
    const base = { 'Content-Type': 'application/json' };
    if (stream) base['Accept'] = 'text/event-stream';

    switch (this.provider) {
      case 'anthropic':
        return {
          ...base,
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        };
      case 'google':
      case 'gemini':
        // Key 已在 URL 中，header 无需认证
        return base;
      case 'openai':
      case 'longcat':
      case 'custom':
      default:
        return {
          ...base,
          Authorization: `Bearer ${this.apiKey}`,
        };
    }
  }

  /** 解析非流式响应 → 纯文本 content */
  parseResponse(raw) {
    switch (this.provider) {
      case 'anthropic': {
        if (raw.content && Array.isArray(raw.content)) {
          return raw.content.map((c) => c.text || '').join('');
        }
        if (raw.completion) return raw.completion;
        throw new Error(`Anthropic 响应格式异常: ${JSON.stringify(raw).slice(0, 200)}`);
      }
      case 'google':
      case 'gemini': {
        const candidate = raw.candidates?.[0];
        const text =
          candidate?.content?.parts?.map((p) => p.text).join('') ||
          candidate?.content?.parts?.[0]?.text;
        if (text) return text;
        // 安全拦截（如触发安全过滤器）
        if (raw.promptFeedback?.blockReason) {
          throw new Error(`Gemini 内容被拦截: ${raw.promptFeedback.blockReason}`);
        }
        throw new Error(`Gemini 响应格式异常: ${JSON.stringify(raw).slice(0, 200)}`);
      }
      case 'openai':
      case 'longcat':
      case 'custom':
      default: {
        // OpenAI 标准格式
        // 优先取正文 content；推理模型（如 LongCat-2.0）有时 content 为空而正文落在 reasoning_content，做兜底
        const c = raw.choices?.[0]?.message?.content;
        if (typeof c === 'string' && c.trim().length > 0) return c;
        const reasoning = raw.choices?.[0]?.message?.reasoning_content;
        if (typeof reasoning === 'string' && reasoning.trim().length > 0) return reasoning;
        // 兼容部分国产模型变体
        if (raw.choices?.[0]?.text != null) {
          return raw.choices[0].text;
        }
        if (raw.output?.text != null) {
          return raw.output.text;
        }
        throw new Error(`OpenAI-compatible 响应格式异常: ${JSON.stringify(raw).slice(0, 200)}`);
      }
    }
  }

  /**
   * 解析 SSE 流式 chunk → { content, reasoning }
   * - content: 正文增量（最终写回结果）
   * - reasoning: 推理/思考增量（如 LongCat-2.0 / 推理模型的 reasoning_content），仅用于实时展示，不计入最终输出
   * 无增量时返回 null，避免空写。
   */
  parseStreamDelta(data) {
    switch (this.provider) {
      case 'anthropic': {
        // Claude SSE: event 类型多样，只取文本增量
        if (data.type === 'content_block_delta' && data.delta?.text) {
          return { content: data.delta.text, reasoning: '' };
        }
        return null;
      }
      case 'google':
      case 'gemini': {
        // Gemini SSE: candidates[0].content.parts[0].text
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('');
        return text ? { content: text, reasoning: '' } : null;
      }
      case 'openai':
      case 'longcat':
      case 'custom':
      default: {
        const delta = data.choices?.[0]?.delta || {};
        const content = delta.content != null ? delta.content : '';
        // 兼容不同网关/模型的推理字段名：reasoning_content（DeepSeek/Qwen/LongCat 常见）、
        // reasoning（部分 OpenAI 兼容）、thinking（Claude 风格）
        const reasoningRaw =
          delta.reasoning_content != null
            ? delta.reasoning_content
            : delta.reasoning != null
              ? delta.reasoning
              : delta.thinking != null
                ? delta.thinking
                : '';
        const reasoning = reasoningRaw != null ? String(reasoningRaw) : '';
        if (!content && !reasoning) return null;
        return { content, reasoning };
      }
    }
  }
}

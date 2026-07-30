// ============================================
// 带鉴权和超时的 fetch 包装器
// ============================================

const SERVICE_KEY = import.meta.env.VITE_PROMPT_SERVICE_KEY || '';

interface FetchOptions extends RequestInit {
  timeout?: number;
}

/** 带 X-API-Key 鉴权和超时控制的 fetch */
export async function fetchWithAuth(url: string, options: FetchOptions = {}) {
  // 默认超时 600 秒（10 分钟）：长内容生成（详细大纲、正文写作）可能需要数分钟
  const { timeout = 600000, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers = new Headers(rest.headers || {});
    if (SERVICE_KEY) {
      headers.set('X-API-Key', SERVICE_KEY);
    }
    headers.set('Content-Type', 'application/json');

    const res = await fetch(url, {
      ...rest,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`请求超时 (${timeout}ms)`);
    }
    throw err;
  }
}

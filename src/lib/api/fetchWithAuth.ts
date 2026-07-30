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
  const { timeout = 600000, signal: externalSignal, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  // 支持外部主动中止（如前端「停止生成」按钮）：与超时控制器互不冲突
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

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
      // 统一以 AbortError 暴露，便于调用方区分「主动停止/超时」与真实网络错误
      throw new DOMException('请求已取消或超时', 'AbortError');
    }
    throw err;
  } finally {
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

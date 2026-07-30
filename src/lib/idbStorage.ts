// ============================================
// 本地优先存储：IndexedDB（idb-keyval）封装为 zustand persist 的 StateStorage
// ============================================
import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

const TAG = '[idbStorage]';

const LARGE_WRITE_WARN_CHARS = 2_000_000;

function isQuotaError(e: unknown): boolean {
  const name = (e as { name?: string })?.name || '';
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

function lsGet(name: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.getItem(name);
  } catch {
    /* 隐私模式或被禁用时静默降级 */
  }
  return null;
}

function lsRemove(name: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem(name);
  } catch {
    /* ignore */
  }
}

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const fromIdb = await get<string>(name);
      if (fromIdb != null) return fromIdb;
    } catch (e) {
      console.warn(`${TAG} getItem 读取失败，回退 localStorage：${String((e as Error)?.message || e)}`);
    }
    const fromLs = lsGet(name);
    if (fromLs != null) {
      try {
        await set(name, fromLs);
        lsRemove(name);
      } catch (e) {
        console.warn(`${TAG} 懒迁移写回失败（忽略）：${String((e as Error)?.message || e)}`);
      }
      return fromLs;
    }
    return null;
  },
  setItem: async (name, value) => {
    if (typeof value === 'string' && value.length > LARGE_WRITE_WARN_CHARS) {
      console.warn(`${TAG} 写入体积较大（${(value.length / 1_000_000).toFixed(1)}M 字符）：${name}`);
    }
    try {
      await set(name, value);
    } catch (e) {
      const hint = isQuotaError(e) ? '（配额超限，请清理浏览器存储或导出备份）' : '';
      console.error(`${TAG} setItem 失败：${name}${hint} ${String((e as Error)?.message || e)}`);
    }
  },
  removeItem: async (name) => {
    try {
      await del(name);
    } catch (e) {
      console.warn(`${TAG} removeItem 失败（忽略）：${String((e as Error)?.message || e)}`);
    }
    lsRemove(name);
  },
};

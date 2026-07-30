// ============================================
// UI Store（非持久化，独立切片）
// ============================================
import { create } from 'zustand';
import type { ModuleName } from '../types';

interface UIStore {
  loadingModule: ModuleName | null;
  setLoadingModule: (m: ModuleName | null) => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useUIStore = create<UIStore>((set) => ({
  loadingModule: null,
  setLoadingModule: (m) => set({ loadingModule: m }),
  toast: null,
  showToast: (msg) => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ toast: msg });
    hideTimer = setTimeout(() => set({ toast: null }), 2500);
  },
}));

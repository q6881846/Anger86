import { create } from 'zustand';

interface ParamsModalState {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
}

/**
 * 全局「高级参数」面板状态。
 * 任意位置的「参数」按钮调用 openModal() 即可打开，编辑用户自定义采样参数与预设。
 */
export const useParamsModalStore = create<ParamsModalState>((set) => ({
  open: false,
  openModal: () => set({ open: true }),
  closeModal: () => set({ open: false }),
}));

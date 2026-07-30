import { create } from 'zustand';

interface PromptModalState {
  open: boolean;
  initialStepKey?: string;
  openModal: (stepKey?: string) => void;
  closeModal: () => void;
}

/**
 * 全局提示词编辑弹窗状态。
 * 任意页面的「提示词」按钮调用 openModal(stepKey?) 即可打开查看/编辑。
 */
export const usePromptModalStore = create<PromptModalState>((set) => ({
  open: false,
  initialStepKey: undefined,
  openModal: (stepKey) => set({ open: true, initialStepKey: stepKey }),
  closeModal: () => set({ open: false }),
}));

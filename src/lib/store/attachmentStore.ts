// ============================================
// 附件 Store（用户附加文件管理）
// ============================================
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../idbStorage';
import type { AttachedFile, AttachmentState, ExtractedChunk, VariableBinding } from '../types';
import { TEMPLATE_VARIABLES } from '../constants';

interface AttachmentStore extends AttachmentState {
  // 文件操作
  addFile: (file: AttachedFile) => void;
  removeFile: (fileId: string) => void;
  updateFile: (fileId: string, patch: Partial<AttachedFile>) => void;
  setActiveFile: (fileId: string | null) => void;
  // 分块操作
  updateChunk: (fileId: string, chunkId: string, patch: Partial<ExtractedChunk>) => void;
  removeChunk: (fileId: string, chunkId: string) => void;
  // 变量绑定
  bindVariable: (variableName: string, chunkId: string, fileId: string) => void;
  unbindVariable: (variableName: string) => void;
  getBoundValue: (variableName: string) => string | null;
  getAllBoundValues: () => Record<string, string>;
  // 获取附加内容（用于提示词注入）
  getAttachmentContent: () => string;
  // 辅助
  getVariableLabel: (name: string) => string;
  getBoundChunk: (variableName: string) => ExtractedChunk | null;
}

export const useAttachmentStore = create<AttachmentStore>()(
  persist(
    (set, get) => ({
      files: [],
      activeFileId: null,
      variableBindings: {},

      addFile: (file) => set((s) => ({ files: [...s.files, file] })),
      removeFile: (fileId) =>
        set((s) => {
          const files = s.files.filter((f) => f.id !== fileId);
          // 清理与该文件相关的绑定
          const bindings: VariableBinding = {};
          for (const [varName, boundChunkId] of Object.entries(s.variableBindings)) {
            const chunkBelongsToFile = s.files
              .find((f) => f.id === fileId)
              ?.chunks.some((c) => c.id === boundChunkId);
            if (!chunkBelongsToFile) bindings[varName] = boundChunkId;
          }
          return { files, variableBindings: bindings, activeFileId: s.activeFileId === fileId ? null : s.activeFileId };
        }),
      updateFile: (fileId, patch) =>
        set((s) => ({
          files: s.files.map((f) => (f.id === fileId ? { ...f, ...patch } : f)),
        })),
      setActiveFile: (fileId) => set({ activeFileId: fileId }),

      updateChunk: (fileId, chunkId, patch) =>
        set((s) => ({
          files: s.files.map((f) =>
            f.id === fileId
              ? { ...f, chunks: f.chunks.map((c) => (c.id === chunkId ? { ...c, ...patch } : c)) }
              : f
          ),
        })),
      removeChunk: (fileId, chunkId) =>
        set((s) => {
          const files = s.files.map((f) =>
            f.id === fileId ? { ...f, chunks: f.chunks.filter((c) => c.id !== chunkId) } : f
          );
          const bindings: VariableBinding = {};
          for (const [varName, boundId] of Object.entries(s.variableBindings)) {
            if (boundId !== chunkId) bindings[varName] = boundId;
          }
          return { files, variableBindings: bindings };
        }),

      bindVariable: (variableName, chunkId, _fileId) =>
        set((s) => ({
          variableBindings: { ...s.variableBindings, [variableName]: chunkId },
        })),
      unbindVariable: (variableName) =>
        set((s) => {
          const bindings = { ...s.variableBindings };
          delete bindings[variableName];
          return { variableBindings: bindings };
        }),
      getBoundValue: (variableName) => {
        const state = get();
        const chunkId = state.variableBindings[variableName];
        if (!chunkId) return null;
        for (const file of state.files) {
          const chunk = file.chunks.find((c) => c.id === chunkId);
          if (chunk) return chunk.content;
        }
        return null;
      },
      getAllBoundValues: () => {
        const state = get();
        const result: Record<string, string> = {};
        for (const [varName, chunkId] of Object.entries(state.variableBindings)) {
          for (const file of state.files) {
            const chunk = file.chunks.find((c) => c.id === chunkId);
            if (chunk) {
              result[varName] = chunk.content;
              break;
            }
          }
        }
        return result;
      },
      getAttachmentContent: () => {
        const state = get();
        const parts: string[] = [];
        for (const file of state.files) {
          if (file.status !== 'parsed' && file.status !== 'bound') continue;
          parts.push(`【${file.name}】`);
          for (const chunk of file.chunks) {
            parts.push(`--- ${chunk.title} ---`);
            parts.push(chunk.content);
          }
        }
        return parts.join('\n\n');
      },
      getVariableLabel: (name) => TEMPLATE_VARIABLES.find((v) => v.name === name)?.label || name,
      getBoundChunk: (variableName) => {
        const state = get();
        const chunkId = state.variableBindings[variableName];
        if (!chunkId) return null;
        for (const file of state.files) {
          const chunk = file.chunks.find((c) => c.id === chunkId);
          if (chunk) return chunk;
        }
        return null;
      },
    }),
    {
      name: 'mowen-attachments',
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => idbStorage),
    }
  )
);

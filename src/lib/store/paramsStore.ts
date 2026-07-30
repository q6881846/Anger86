// ============================================
// 高级参数 Store（用户自定义参数 + 预设，持久化到 IndexedDB）
// ============================================
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../idbStorage';
import {
  BUILT_IN_PRESETS,
  mergeParams,
  type AdvancedParams,
  type ParamPreset,
} from '../types/advanced-params';

const DEFAULT_PARAMS: AdvancedParams = {
  temperature: 0.7,
  top_p: 0.9,
  // 显式给出较大的最大输出（LongCat 等网关在省略 max_tokens 时会用极小默认值，导致长内容被截断）
  max_tokens: 16000,
  frequency_penalty: 0,
  presence_penalty: 0,
};

interface ParamsStore {
  /** 全局默认参数（未选预设时的基线） */
  globalDefault: AdvancedParams;
  /** 按 stepKey 的逐模板覆盖 */
  templateOverrides: Record<string, Partial<AdvancedParams>>;
  /** 用户保存的自定义预设 */
  customPresets: ParamPreset[];
  /** 当前选中的预设 ID（undefined = 使用全局默认） */
  activePresetId?: string;

  /** 修改当前基线参数（预设或全局默认）。编辑内置预设会派生副本。 */
  setBaseParam: (key: keyof AdvancedParams, value: number) => void;
  /** 修改某步骤的模板级覆盖 */
  setTemplateParam: (stepKey: string, key: keyof AdvancedParams, value: number) => void;
  /** 清除某步骤某参数覆盖 */
  resetTemplateParam: (stepKey: string, key: keyof AdvancedParams) => void;
  /** 清除某步骤的全部覆盖 */
  clearTemplateOverrides: (stepKey: string) => void;
  /** 将当前参数快照保存为新预设 */
  savePreset: (name: string, description: string, tags?: string[]) => void;
  /** 删除自定义预设 */
  deletePreset: (id: string) => void;
  /** 选择预设 */
  selectPreset: (id: string | undefined) => void;
  /** 重置全部为出厂默认 */
  resetAll: () => void;
  /** 计算最终生效参数（合并 预设/全局默认 + 步骤覆盖） */
  getEffectiveParams: (stepKey?: string) => AdvancedParams;
}

function findPreset(list: ParamPreset[], id?: string): ParamPreset | undefined {
  return list.find((p) => p.id === id);
}

function allPresets(custom: ParamPreset[]): ParamPreset[] {
  return [...BUILT_IN_PRESETS, ...custom];
}

export const useParamsStore = create<ParamsStore>()(
  persist(
    (set, get) => ({
      globalDefault: { ...DEFAULT_PARAMS },
      templateOverrides: {},
      customPresets: [],
      activePresetId: undefined,

      setBaseParam: (key, value) => {
        const state = get();
        const active = findPreset(allPresets(state.customPresets), state.activePresetId);
        if (state.activePresetId && active) {
          if (active.builtIn) {
            // 内置预设不可直接改：派生为新副本并选中
            const newId = `custom-${Date.now()}`;
            const fork: ParamPreset = {
              id: newId,
              name: `${active.name} (副本)`,
              description: active.description,
              tags: active.tags,
              params: { ...active.params, [key]: value },
            };
            set({
              customPresets: [...state.customPresets, fork],
              activePresetId: newId,
            });
          } else {
            set({
              customPresets: state.customPresets.map((p) =>
                p.id === state.activePresetId ? { ...p, params: { ...p.params, [key]: value } } : p
              ),
            });
          }
        } else {
          set({ globalDefault: { ...state.globalDefault, [key]: value } });
        }
      },

      setTemplateParam: (stepKey, key, value) =>
        set((s) => ({
          templateOverrides: {
            ...s.templateOverrides,
            [stepKey]: { ...(s.templateOverrides[stepKey] || {}), [key]: value },
          },
        })),

      resetTemplateParam: (stepKey, key) =>
        set((s) => {
          const cur = { ...(s.templateOverrides[stepKey] || {}) };
          delete cur[key];
          const next = { ...s.templateOverrides };
          if (Object.keys(cur).length === 0) delete next[stepKey];
          else next[stepKey] = cur;
          return { templateOverrides: next };
        }),

      clearTemplateOverrides: (stepKey) =>
        set((s) => {
          const next = { ...s.templateOverrides };
          delete next[stepKey];
          return { templateOverrides: next };
        }),

      savePreset: (name, description, tags) => {
        const state = get();
        const base =
          (state.activePresetId &&
            findPreset(allPresets(state.customPresets), state.activePresetId)?.params) ||
          state.globalDefault;
        const newId = `custom-${Date.now()}`;
        const preset: ParamPreset = {
          id: newId,
          name: name.trim() || '我的预设',
          description: description.trim(),
          tags,
          params: { ...base },
        };
        set({ customPresets: [...state.customPresets, preset], activePresetId: newId });
      },

      deletePreset: (id) =>
        set((s) => {
          const target = s.customPresets.find((p) => p.id === id);
          if (!target || target.builtIn) return {};
          return {
            customPresets: s.customPresets.filter((p) => p.id !== id),
            activePresetId: s.activePresetId === id ? undefined : s.activePresetId,
          };
        }),

      selectPreset: (id) => set({ activePresetId: id }),

      resetAll: () =>
        set({
          globalDefault: { ...DEFAULT_PARAMS },
          templateOverrides: {},
          customPresets: [],
          activePresetId: undefined,
        }),

      getEffectiveParams: (stepKey) => {
        const state = get();
        const active = findPreset(allPresets(state.customPresets), state.activePresetId);
        const base = active ? active.params : state.globalDefault;
        const merged =
          stepKey && state.templateOverrides[stepKey]
            ? mergeParams(base, state.templateOverrides[stepKey])
            : { ...base };
        // 兼容旧默认/用户误设的过小值（0、2048、4096 等）：
        // 推理模型（如 LongCat-2.0）的 reasoning_tokens 会占用大量配额，
        // 若 max_tokens < 8192，思考过程就会占满配额导致正文几乎无输出。
        // 一律提升到 16000 作为兜底，确保长内容（主线脉络/详细大纲）能完整输出。
        // 注意：用户显式设置 ≥ 8192 的值（含 128k 上限）会被原样尊重，不会被此逻辑改写。
        if (typeof merged.max_tokens !== 'number' || merged.max_tokens < 8192) merged.max_tokens = 16000;
        return merged;
      },
    }),
    {
      name: 'mowen-advanced-params',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
    }
  )
);

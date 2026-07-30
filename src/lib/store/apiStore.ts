// ============================================
// API 配置 Store（独立切片）
// ============================================
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../idbStorage';
import type { ApiConfig, ApiProvider, ModuleName } from '../types';

/** 解析后的 LLM 配置（用于传给后端 /api/genesis/*） */
export interface ResolvedLlmConfig {
  provider: ApiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens?: number;
}

interface ApiStore {
  configs: ApiConfig[];
  addConfig: (config: ApiConfig) => void;
  updateConfig: (id: string, patch: Partial<ApiConfig>) => void;
  removeConfig: (id: string) => void;
  assignModule: (configId: string, module: ModuleName) => void;
  unassignModule: (configId: string, module: ModuleName) => void;
  getApiForModule: (module: ModuleName) => ApiConfig | undefined;
  getLlmConfigForModule: (module: ModuleName) => ResolvedLlmConfig | undefined;
}

const defaultConfigs: ApiConfig[] = [
  { id: 'api-1', name: 'LongCat', provider: 'longcat', baseUrl: 'https://api.longcat.chat/openai', apiKey: '', model: 'LongCat-2.0', temperature: 0.75, maxTokens: 0, assignedModules: ['inspiration', 'ruleService', 'worldview', 'coreCharacters', 'supportingCharacters', 'mainPlot', 'chapterOutline', 'writing', 'textOptimize', 'chapterReview', 'stateSync'], enabled: true, thinking: 'auto' },
];

export const useApiStore = create<ApiStore>()(
  persist(
    (set, get) => ({
      configs: defaultConfigs,
      addConfig: (config) => set((s) => ({ configs: [...s.configs, config] })),
      updateConfig: (id, patch) => set((s) => ({ configs: s.configs.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeConfig: (id) => set((s) => ({ configs: s.configs.filter((c) => c.id !== id) })),
      assignModule: (configId, module) =>
        set((s) => ({
          configs: s.configs.map((c) =>
            c.id === configId
              ? { ...c, assignedModules: Array.from(new Set([...c.assignedModules, module])) }
              : { ...c, assignedModules: c.assignedModules.filter((m) => m !== module) }
          ),
        })),
      unassignModule: (configId, module) =>
        set((s) => ({
          configs: s.configs.map((c) =>
            c.id === configId ? { ...c, assignedModules: c.assignedModules.filter((m) => m !== module) } : c
          ),
        })),
      getApiForModule: (module) => get().configs.find((c) => c.enabled && c.assignedModules.includes(module)),
      getLlmConfigForModule: (module) => {
        const c = get().configs.find((x) => x.enabled && x.apiKey && x.assignedModules.includes(module));
        if (!c) return undefined;
        return {
          provider: c.provider,
          apiKey: c.apiKey,
          baseUrl: c.baseUrl,
          model: c.model,
          temperature: c.temperature,
          maxTokens: c.maxTokens || undefined,
        };
      },
    }),
    {
      name: 'mowen-api-configs',
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => idbStorage),
    },
  )
);

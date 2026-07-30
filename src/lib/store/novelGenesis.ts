// ============================================
// Novel Genesis Store (Zustand)
// 26变量 + 20步状态机 + IndexedDB 自动保存
// ============================================
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import type { ContentType } from '../db/stepOutputs';
import { getStepOutput } from '../db/stepOutputs';

/** 26 个 Prompt 变量 */
export interface NovelVariables {
  idea: string;
  tags: string[];
  world: string;
  geography: string;
  rules: string;
  characters: string;
  activeCharacters: string;
  existingNames: string;
  mainPlot: string;
  detailedPlot: string;
  beats: string;
  style: string;
  tone: string;
  pace: string;
  fullContext: string;
  prevSummary: string;
  title: string;
  authorMimic: string;
  currentContent: string;
  content: string;
  summary: string;
  chapterSummary: string;
  // 扩展变量
  chapterOrder: string;
  chapterTitle: string;
  chapterContent: string;
  lastChapterContent: string;
  continuePrompt: string;
  amount: string;
  focusBeatInstruction: string;
  chapterInstruction: string;
  existingChapters: string;
  coreCharacters: string;
  worldContext: string;
  previousStates: string;
  // 全局字数规划（所有模块通用，前端直接传入）
  totalWordTarget: string;
  singleVolumeWord: string;
}

export type StepStatus = 'idle' | 'loading' | 'streaming' | 'success' | 'error';
export type StepType = 'markdown' | 'json' | 'stream';

export interface StepState {
  stepId: number;
  status: StepStatus;
  outputRef: string | null;    // 指向 IndexedDB 的 key
  errorMsg?: string;
  outputType: StepType;
}

export interface NovelGenesisState {
  projectId: string | null;
  vars: NovelVariables;
  steps: StepState[];
  currentStep: number;
  lastSaved: number;

  // Actions
  setProjectId: (pid: string | null) => void;
  setVar: <K extends keyof NovelVariables>(key: K, value: NovelVariables[K]) => void;
  setVars: (patch: Partial<NovelVariables>) => void;

  // Step 状态管理
  startStep: (stepId: number) => void;
    appendStreamChunk: (stepId: number, chunk: string) => void;
    finalizeStep: (stepId: number, outputRef: string, type: ContentType) => void;
    setStepError: (stepId: number, error: string) => void;
    setStepStatus: (stepId: number, status: StepStatus) => void;
    // 步骤跳转（回退时自动清空下游缓存，前进时仅跳转）
    jumpToStep: (stepId: number) => void;

  // 流式写入（仅对 16/17/19）
  streamBuffer: string;
  appendToBuffer: (text: string) => void;
  clearBuffer: () => void;
  // 内部：streamBuffer debounce 保存计时器
  _streamSaveTimer?: ReturnType<typeof setTimeout>;

  // 持久化
  load: (pid: string) => Promise<void>;
  save: () => Promise<void>;
  loadStepOutputs: (pid: string) => Promise<void>;

  // 快捷访问
  getStep: (stepId: number) => StepState | undefined;
  getVar: <K extends keyof NovelVariables>(key: K) => NovelVariables[K];
  getVarsForStep: (stepId: number) => Record<string, unknown>;
  /** 获取 Step 20 的最新角色状态快照（仅取当前活跃角色最新状态，不传全量历史） */
  getPreviousStatesSnapshot: (pid: string) => Promise<string>;
}

const DEFAULT_VARS: NovelVariables = {
  idea: '',
  tags: [],
  world: '',
  geography: '',
  rules: '',
  characters: '',
  activeCharacters: '',
  existingNames: '',
  mainPlot: '',
  detailedPlot: '',
  beats: '',
  style: '小白文',
  tone: '热血',
  pace: '',
  fullContext: '',
  prevSummary: '',
  title: '',
  authorMimic: '',
  currentContent: '',
  content: '',
  summary: '',
  chapterSummary: '',
  chapterOrder: '',
  chapterTitle: '',
  chapterContent: '',
  lastChapterContent: '',
  continuePrompt: '',
  amount: '',
  focusBeatInstruction: '',
  chapterInstruction: '',
  existingChapters: '',
  coreCharacters: '',
  worldContext: '',
  previousStates: '',
  totalWordTarget: '100万',
  singleVolumeWord: '20万',
};

const DEFAULT_STEPS: StepState[] = Array.from({ length: 20 }, (_, i) => ({
  stepId: i + 1,
  status: 'idle',
  outputRef: null,
  outputType: i + 1 === 4 || i + 1 === 8 || i + 1 === 9 || i + 1 === 18 || i + 1 === 20 ? 'json' : i + 1 === 16 || i + 1 === 17 || i + 1 === 19 ? 'stream' : 'markdown',
}));

const STORAGE_KEY = (pid: string) => `novelGenesis::${pid}`;

// 并发去重锁：StrictMode 双挂载 / 重复调用 load 时，同一 pid 只真正加载一次
const loadLocks: Record<string, Promise<void>> = {};

export const useNovelGenesisStore = create<NovelGenesisState>()(
  subscribeWithSelector((set, get) => ({
    projectId: null,
    vars: { ...DEFAULT_VARS },
    steps: [...DEFAULT_STEPS],
    currentStep: 1,
    lastSaved: 0,
    streamBuffer: '',

    setProjectId: (pid) => set({ projectId: pid }),

    setVar: (key, value) =>
      set((s) => ({
        vars: { ...s.vars, [key]: value },
        lastSaved: 0,
      })),

    setVars: (patch) =>
      set((s) => ({
        vars: { ...s.vars, ...patch },
        lastSaved: 0,
      })),

    startStep: (stepId) =>
      set((s) => ({
        steps: s.steps.map((step) =>
          step.stepId === stepId ? { ...step, status: 'loading', errorMsg: undefined } : step
        ),
        currentStep: stepId,
      })),

    appendStreamChunk: (stepId, chunk) =>
      set((s) => ({
        steps: s.steps.map((step) =>
          step.stepId === stepId ? { ...step, status: 'streaming' } : step
        ),
        streamBuffer: s.streamBuffer + chunk,
      })),

    finalizeStep: (stepId, outputRef, type) =>
      set((s) => ({
        steps: s.steps.map((step) =>
          step.stepId === stepId
            ? { ...step, status: 'success', outputRef, outputType: type as StepType }
            : step
        ),
        streamBuffer: '',
        lastSaved: 0,
      })),

    setStepError: (stepId, error) =>
      set((s) => ({
        steps: s.steps.map((step) =>
          step.stepId === stepId ? { ...step, status: 'error', errorMsg: error } : step
        ),
        streamBuffer: '',
      })),

    setStepStatus: (stepId, status) =>
      set((s) => ({
        steps: s.steps.map((step) =>
          step.stepId === stepId ? { ...step, status } : step
        ),
      })),

    jumpToStep: (stepId) =>
      set((s) => {
        const isBackwards = stepId < s.currentStep;
        if (!isBackwards) return { currentStep: stepId };
        // 回退时清空下游步骤缓存
        return {
          steps: s.steps.map((step) =>
            step.stepId >= stepId && step.stepId > 1
              ? { ...step, status: 'idle' as StepStatus, outputRef: null, outputType: step.outputType, errorMsg: undefined }
              : step
          ),
          currentStep: stepId,
          lastSaved: 0,
        };
      }),

    appendToBuffer: (text) => {
      set((s) => {
        const buf = s.streamBuffer + text;
        // 500ms debounce 保存 streamBuffer 到 IndexedDB（刷新可恢复）
        clearTimeout(s._streamSaveTimer);
        const timer = setTimeout(() => {
          const pid = useNovelGenesisStore.getState().projectId;
          if (pid) {
            idbSet(`streamBuffer::${pid}`, buf).catch((err) => {
              console.error('[StreamBuffer] 临时缓存写入失败:', err);
            });
          }
        }, 500);
        return { streamBuffer: buf, _streamSaveTimer: timer };
      });
    },
    clearBuffer: () => {
      set((s) => {
        clearTimeout(s._streamSaveTimer);
        return { streamBuffer: '', _streamSaveTimer: undefined };
      });
    },

    load: async (pid) => {
      // 已在加载中则复用同一 Promise，避免 StrictMode 下重复读 IndexedDB 造成竞态
      if (loadLocks[pid]) return loadLocks[pid];
      const p = (async () => {
        const saved = await idbGet<{
          vars: NovelVariables;
          steps: StepState[];
          currentStep: number;
        }>(STORAGE_KEY(pid));
        if (saved) {
          set({
            projectId: pid,
            vars: { ...DEFAULT_VARS, ...saved.vars },
            steps: saved.steps || [...DEFAULT_STEPS],
            currentStep: saved.currentStep || 1,
            lastSaved: Date.now(),
          });
        } else {
          set({
            projectId: pid,
            vars: { ...DEFAULT_VARS },
            steps: [...DEFAULT_STEPS],
            currentStep: 1,
            lastSaved: Date.now(),
          });
        }
      })();
      loadLocks[pid] = p;
      try {
        await p;
      } finally {
        delete loadLocks[pid];
      }
    },

    save: async () => {
      const { projectId, vars, steps, currentStep } = get();
      if (!projectId) return;
      await idbSet(STORAGE_KEY(projectId), { vars, steps, currentStep });
      set({ lastSaved: Date.now() });
    },

    loadStepOutputs: async (pid) => {
      // 从 IndexedDB 加载各步骤的输出引用
      const { steps } = get();
      const updated = await Promise.all(
        steps.map(async (step) => {
          const data = await idbGet<unknown>(`project::${pid}::step::${step.stepId}`);
          return {
            ...step,
            outputRef: data ? `project::${pid}::step::${step.stepId}` : step.outputRef,
            status: data ? 'success' as StepStatus : step.status,
          };
        })
      );
      set({ steps: updated });
    },

    getStep: (stepId) => get().steps.find((s) => s.stepId === stepId),

    getVar: (key) => get().vars[key],

    /** 获取 Step 20 的最新角色状态快照（仅取当前活跃角色最新状态，不传全量历史） */
    getPreviousStatesSnapshot: async (pid) => {
      const latest = await getStepOutput(pid, 20);
      if (!latest?.content) return '';
      try {
        const parsed = JSON.parse(latest.content);
        // 只取 activeCharacters（当前活跃角色），不传 full 历史
        const snapshot = parsed.activeCharacters || parsed.characters || parsed;
        return typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
      } catch {
        return latest.content.slice(0, 4000); // 超限截断兜底
      }
    },

    getVarsForStep: (stepId) => {
      // TODO: 每次调用都返回新对象，若在 useEffect 依赖里使用会触发无限循环；当前未触发，后续可改为缓存/useMemo
      const { vars } = get();
      // 根据步骤需求返回相关变量
      const stepVars: Record<string, unknown> = {};
      // 通用变量
      if (vars.idea) stepVars.idea = vars.idea;
      if (vars.tags.length) stepVars.tags = vars.tags.join('、');
      if (vars.style) stepVars.style = vars.style;
      if (vars.tone) stepVars.tone = vars.tone;
      if (vars.title) stepVars.title = vars.title;
      if (vars.authorMimic) stepVars.authorMimic = vars.authorMimic;

      // 全局字数规划（始终注入，所有模块通用）
      stepVars.totalWordTarget = vars.totalWordTarget || '100万';
      stepVars.singleVolumeWord = vars.singleVolumeWord || '20万';

      // 步骤特定变量
      if (stepId >= 4) {
        if (vars.world) stepVars.world = vars.world;
        if (vars.geography) stepVars.geography = vars.geography;
        if (vars.rules) stepVars.rules = vars.rules;
      }
      if (stepId >= 8) {
        if (vars.characters) stepVars.characters = vars.characters;
      }
      if (stepId >= 10) {
        if (vars.mainPlot) stepVars.mainPlot = vars.mainPlot;
      }
      if (stepId >= 12) {
        if (vars.detailedPlot) stepVars.detailedPlot = vars.detailedPlot;
      }
      if (stepId >= 15) {
        if (vars.beats) stepVars.beats = vars.beats;
      }
      if (stepId >= 16) {
        if (vars.chapterSummary) stepVars.chapterSummary = vars.chapterSummary;
        if (vars.chapterOrder) stepVars.chapterOrder = vars.chapterOrder;
        if (vars.chapterTitle) stepVars.chapterTitle = vars.chapterTitle;
        if (vars.prevSummary) stepVars.prevSummary = vars.prevSummary;
        if (vars.chapterContent) stepVars.chapterContent = vars.chapterContent;
        if (vars.lastChapterContent) stepVars.lastChapterContent = vars.lastChapterContent;
      }

      return stepVars;
    },
  }))
);

// 自动保存：变量变化后 1.5 秒自动写 IndexedDB
let autoSaveTimer: ReturnType<typeof setTimeout>;
useNovelGenesisStore.subscribe(
  (state) => state.vars,
  () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      try {
        await useNovelGenesisStore.getState().save();
      } catch (err) {
        console.error('[AutoSave] 变量自动保存失败:', err);
      }
    }, 1500);
  }
);

// 自动保存：步骤状态变化后 1.5 秒自动写 IndexedDB
let stepSaveTimer: ReturnType<typeof setTimeout>;
useNovelGenesisStore.subscribe(
  (state) => state.steps,
  () => {
    clearTimeout(stepSaveTimer);
    stepSaveTimer = setTimeout(async () => {
      try {
        await useNovelGenesisStore.getState().save();
      } catch (err) {
        console.error('[AutoSave] 步骤状态自动保存失败:', err);
      }
    }, 1500);
  }
);

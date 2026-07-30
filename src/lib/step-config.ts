// ============================================
// 20 步流水线 — 步骤元信息（用于 UI 渲染）
// ============================================

export interface StepMeta {
  id: number;
  key: string;
  name: string;
  shortName: string;
  phase: 1 | 2 | 3 | 4;
  phaseLabel: string;
  icon: string;
  color: string;
  colorSoft: string;
  desc: string;
  outputType: 'markdown' | 'json' | 'stream';
  isStream: boolean;
}

const PHASE_LABELS: Record<number, string> = {
  1: '灵感阶段',
  2: '架构阶段',
  3: '编排阶段',
  4: '写作阶段',
};

const COLORS = {
  gold: '#f0c674',
  jade: '#6ec092',
  indigo: '#7a9ef0',
  vermilion: '#e85d68',
  plum: '#b890e8',
};

const COLOR_SOFT = {
  gold: 'rgba(212,166,87,0.15)',
  jade: 'rgba(74,139,111,0.15)',
  indigo: 'rgba(91,127,212,0.15)',
  vermilion: 'rgba(201,68,76,0.15)',
  plum: 'rgba(155,109,212,0.15)',
};

const STEP_DEFS: Array<
  Omit<StepMeta, 'phaseLabel' | 'colorSoft' | 'isStream' | 'color'> & { colorKey: keyof typeof COLORS }
> = [
  { id: 1, key: 'step1', name: 'AI灵感搅拌', shortName: '灵感搅拌', phase: 1, icon: '✦', colorKey: 'gold', desc: '基于创意+标签生成差异化方案', outputType: 'markdown' },
  { id: 2, key: 'step2', name: '标签选择', shortName: '标签', phase: 1, icon: '🏷', colorKey: 'gold', desc: '选择小说标签（不限数量）', outputType: 'markdown' },
  { id: 3, key: 'step3', name: 'AI优化灵感', shortName: '优化灵感', phase: 1, icon: '✧', colorKey: 'gold', desc: '对灵感进行爆款风格改写', outputType: 'markdown' },
  { id: 4, key: 'step4', name: '一键生成世界观', shortName: '世界观', phase: 2, icon: '◈', colorKey: 'jade', desc: '构建世界观设定 JSON', outputType: 'json' },
  { id: 5, key: 'step5', name: '优化时代背景', shortName: '时代背景', phase: 2, icon: '⏳', colorKey: 'jade', desc: '丰满时代背景设定', outputType: 'markdown' },
  { id: 6, key: 'step6', name: '优化地理环境', shortName: '地理环境', phase: 2, icon: '🗺', colorKey: 'jade', desc: '扩写地理与势力分布', outputType: 'markdown' },
  { id: 7, key: 'step7', name: '优化核心法则', shortName: '核心法则', phase: 2, icon: '⚖', colorKey: 'jade', desc: '补充力量体系与金手指', outputType: 'markdown' },
  { id: 8, key: 'step8', name: '生成核心角色', shortName: '核心角色', phase: 2, icon: '❖', colorKey: 'indigo', desc: '推导4位核心角色 JSON', outputType: 'json' },
  { id: 9, key: 'step9', name: '生成配角', shortName: '配角', phase: 2, icon: '☕', colorKey: 'indigo', desc: '补充配角角色 JSON', outputType: 'json' },
  { id: 10, key: 'step10', name: '主线脉络', shortName: '主线', phase: 3, icon: '◆', colorKey: 'plum', desc: '构建8-12个主线节点', outputType: 'markdown' },
  { id: 11, key: 'step11', name: '优化主线脉络', shortName: '优化主线', phase: 3, icon: '◇', colorKey: 'plum', desc: '加固节点张力与逻辑', outputType: 'markdown' },
  { id: 12, key: 'step12', name: '生成详细大纲', shortName: '详细大纲', phase: 3, icon: '▦', colorKey: 'plum', desc: '扩展为卷章骨架', outputType: 'markdown' },
  { id: 13, key: 'step13', name: '优化详细大纲', shortName: '优化大纲', phase: 3, icon: '▣', colorKey: 'plum', desc: '增强每章张力与可写性', outputType: 'markdown' },
  { id: 14, key: 'step14', name: '编排与生成', shortName: '编排配置', phase: 3, icon: '⚙', colorKey: 'gold', desc: '选择行文风格与情感基调', outputType: 'markdown' },
  { id: 15, key: 'step15', name: '生成大纲', shortName: '生成大纲', phase: 3, icon: ' list', colorKey: 'indigo', desc: '映射关键节点为章节列表', outputType: 'markdown' },
  { id: 16, key: 'step16', name: '正文智能写作', shortName: '正文写作', phase: 4, icon: '✎', colorKey: 'vermilion', desc: 'SSE流式生成章节正文', outputType: 'stream' },
  { id: 17, key: 'step17', name: '智能续写', shortName: '续写', phase: 4, icon: '✒', colorKey: 'vermilion', desc: 'SSE流式续写正文', outputType: 'stream' },
  { id: 18, key: 'step18', name: '正文智能校对', shortName: '校对', phase: 4, icon: '◉', colorKey: 'jade', desc: '精修校对 JSON 建议', outputType: 'json' },
  { id: 19, key: 'step19', name: '润色去AI', shortName: '润色', phase: 4, icon: '✺', colorKey: 'gold', desc: 'SSE流式去AI化改造', outputType: 'stream' },
  { id: 20, key: 'step20', name: '状态同步', shortName: '状态同步', phase: 4, icon: '⬢', colorKey: 'plum', desc: '检测角色属性变更 JSON', outputType: 'json' },
];

export const STEP_METAS: StepMeta[] = STEP_DEFS.map((s) => ({
  id: s.id,
  key: s.key,
  name: s.name,
  shortName: s.shortName,
  phase: s.phase,
  phaseLabel: PHASE_LABELS[s.phase],
  icon: s.icon,
  color: COLORS[s.colorKey],
  colorSoft: COLOR_SOFT[s.colorKey],
  desc: s.desc,
  outputType: s.outputType,
  isStream: s.outputType === 'stream',
}));

export function getStepMeta(id: number): StepMeta | undefined {
  return STEP_METAS.find((s) => s.id === id);
}

export function getStepsByPhase(phase: number): StepMeta[] {
  return STEP_METAS.filter((s) => s.phase === phase);
}

// ============================================
// 模块元信息（步骤标签与分类，不含任何 Prompt 原文）
// Prompt 原文由后端 Prompt Template Service 管理
// ============================================
import type { ModuleName } from '../types';

export interface ModuleMeta {
  label: string;
  step: 1 | 2 | 3 | 4 | 0;
}

export const MODULE_META_MAP: Record<ModuleName, ModuleMeta> = {
  inspiration: { label: 'AI 灵感搅拌', step: 1 },
  hitPositioning: { label: '爽点定位', step: 1 },
  titleGen: { label: '书名生成', step: 1 },
  ruleService: { label: '法则服务', step: 2 },
  characterTool: { label: '角色工具', step: 2 },
  worldview: { label: '世界观构建', step: 2 },
  coreCharacters: { label: '核心角色', step: 2 },
  supportingCharacters: { label: '配角系统', step: 2 },
  extractCharacters: { label: '角色提取', step: 2 },
  mainPlot: { label: '主线脉络', step: 3 },
  hitDensityCalibration: { label: '爽点密度校准', step: 3 },
  volumeSnapshot: { label: '卷级盘点', step: 4 },
  chapterOutline: { label: '章节大纲', step: 3 },
  logicReview: { label: '逻辑审查', step: 3 },
  writing: { label: '智能续写', step: 4 },
  textOptimize: { label: '文本优化', step: 4 },
  chapterReview: { label: '章节质检', step: 4 },
  chapterFix: { label: '增量修改', step: 4 },
  stateSync: { label: '状态同步', step: 4 },
  hookCheck: { label: '钩子检查', step: 4 },
};

/** 按步骤分组模块 */
export function getModulesByStep(step: 1 | 2 | 3 | 4): ModuleName[] {
  return (Object.entries(MODULE_META_MAP) as [ModuleName, ModuleMeta][])
    .filter(([, m]) => m.step === step)
    .map(([name]) => name);
}

/**
 * 步骤 ID → 模块名（ModuleName）权威映射。
 * 用于把「按步骤触发的生成」关联到「API 设置里分配的模块」，
 * 让用户在设置页把不同 API 配置分配给不同模块时真正生效。
 * 仅列出可明确对应的步骤；未列出的步骤回退到「第一个启用的配置」。
 */
export const STEP_MODULE_MAP: Record<number, ModuleName> = {
  1: 'inspiration',
  3: 'inspiration',
  4: 'worldview',
  5: 'worldview',
  6: 'worldview',
  7: 'ruleService',
  8: 'coreCharacters',
  9: 'supportingCharacters',
  10: 'mainPlot',
  11: 'mainPlot',
  12: 'chapterOutline',
  13: 'chapterOutline',
  16: 'writing',
  17: 'writing',
  18: 'chapterReview',
  19: 'textOptimize',
  20: 'stateSync',
  21: 'coreCharacters',
};

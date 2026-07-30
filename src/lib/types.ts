// ============================================
// 墨文写作 - 全局类型定义
// ============================================

/** 四步工作流阶段 */
export type Step = 1 | 2 | 3 | 4;

/** AI 模块名称 */
export type ModuleName =
  | 'inspiration' | 'hitPositioning' | 'titleGen'
  | 'ruleService' | 'characterTool' | 'worldview'
  | 'coreCharacters' | 'supportingCharacters' | 'extractCharacters'
  | 'mainPlot' | 'hitDensityCalibration'
  | 'volumeSnapshot'
  | 'chapterOutline' | 'logicReview'
  | 'writing' | 'textOptimize'
  | 'chapterReview' | 'chapterFix' | 'stateSync'
  | 'hookCheck';

/** API Provider 类型 */
export type ApiProvider = 'openai' | 'baidu-qianfan' | 'anthropic' | 'longcat' | 'custom';

/** 问题严重程度 */
export type IssueSeverity = '严重' | '警告' | '提示' | '建议';

/** API 配置 */
export interface ApiConfig {
  id: string;
  name: string;
  provider: ApiProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  assignedModules: ModuleName[];
  enabled: boolean;
  thinking?: 'auto' | 'on' | 'off';
}

/** 灵感标签 */
export interface InspirationTags {
  style: string[];
  hit: string[];
  ban: string[];
  open: string;
  entry: string;
  custom: string[];
}

/** 灵感方案 */
export interface InspirationPlan {
  title: string;
  summary: string;
  typeBlend: string;
  satisfactionStructure: { level: string; detail: string; emotion: string }[];
  protagonist: { surface: string; actual: string; desire: string; conflict: string };
  openingHook: string;
  differentiation: string;
  bookNames: string[];
}

/** 世界观 JSON */
export interface Worldview {
  background: { era: string; daily_life: string; social_norms: string };
  geography: {
    overview: string;
    factions: {
      name: string; tag: string; relation_to_mc: string;
      core_conflict_with_mc: string; exploitable: string; first_showdown_chapter: number;
    }[];
    key_locations: { name: string; function: string; first_appearance: number }[];
  };
  rules: {
    core_rules: string;
    power_system: {
      levels: string; visible_traits: string; upgrade_condition: string;
      restriction: string; cost: string;
    };
    rules_contradictions: string;
  };
}

/** 角色能力 */
export interface CharacterAbility {
  name: string; source: string; limitation: string; exploitable: string;
}

/** 角色关系 */
export interface CharacterRelation {
  target: string; surface: string; actual: string; tension: string;
}

/** 角色 */
export interface Character {
  name: string;
  role: string;
  identity: { surface: string; actual: string; faction: string };
  core_desire: string;
  inner_conflict: string;
  secret: string;
  exposure_trigger: string;
  abilities: CharacterAbility[];
  relations: CharacterRelation[];
  plot_function: string;
  arc_direction: string;
  death_flag: string;
  description?: string;
  first_chapter?: number;
}

/** 主线里程碑节点 */
export interface MilestoneNode {
  id: string;
  chapterRange: string;
  estimatedChapters: number;
  coreAction: string;
  emotionTone: string;
  hookDesign: string;
  satisfactionDesign: string;
  logicLink: string;
  unlockWorldview: string;
  foreshadowing: { plant: string[]; resolve: string[] };
}

/** 主线脉络 */
export interface MainPlot {
  coreConflict: string;
  volumes: { name: string; chapterRange: string; coreContent: string; satisfaction: string; foreshadow: string }[];
  milestones: MilestoneNode[];
  rhythmCurve: string;
  satisfactionDistribution: string;
  emotionalSubplot: string;
  longTermForeshadowing: string[];
  ending: string;
}

/** 章节大纲 */
export interface ChapterOutline {
  n: number;
  title: string;
  summary: string;
  core_action: string;
  emotion_curve: string;
  satisfaction_design: string;
  satisfaction_type: string;
  node_mapping: string;
  characters_involved: string[];
  worldview_unlock: string;
  foreshadowing: { plant: string[]; resolve: string[] };
  chapter_hook: string;
  hook_strength: string;
  key_scenes: string[];
  time_constraint: string;
  pace: string;
  stop_point: string;
  no_go: string;
  content?: string;
  reviewStatus?: 'pending' | 'pass' | 'fail';
  reviewIssues?: ReviewIssue[];
}

/** 质检问题 */
export interface ReviewIssue {
  type: string;
  desc: string;
  excerpt: string;
  suggestion: string;
}

/** 节点 */
export interface PlotNode {
  id: string;
  level: string;
  belongs: string;
  name: string;
  type: string;
  chapter_range: string;
  emotion: string;
  characters: string[];
  core_action: string;
  cause: string;
  effect: string;
  hook_type: string;
  foreshadowing: string;
  logic_risk: string;
}

/** 逻辑审查问题 */
export interface LogicIssue {
  chapter_id: string;
  dimension: string;
  severity: IssueSeverity;
  description: string;
  fixAction: string;
  autoFixable: boolean;
}

/** 书架中的单本书快照 */
export interface BookEntry {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  data: ProjectState;
}

/** 项目状态 */
export interface ProjectState {
  bookTitle: string;
  targetWordCount: number;
  idea: string;
  tags: InspirationTags;
  enhanceMode: boolean;
  inspirationText: string;
  inspirationPlans: InspirationPlan[];
  selectedPlanIndex: number;
  selectedPlan: string;
  hitPositioningText: string;
  bookNames: string[];
  worldview: Worldview | null;
  characters: Character[];
  currentVolume: number;
  volumeNodes: Record<number, string>;
  volumeSnapshots: Record<number, string>;
  mainPlot: MainPlot | null;
  chapterOutlines: ChapterOutline[];
  plotNodes: PlotNode[];
  logicIssues: LogicIssue[];
  currentChapter: number;
  reviewIssues: ReviewIssue[];
  continuity: { chapter: number; summary: string }[];
  characterSnapshots: Record<string, string>;
  ruleServiceText: string;
  characterToolText: string;
  calibrationText: string;
}

// ============================================
// 附件功能类型定义
// ============================================

/** 文件类型 */
export type FileType = 'docx' | 'txt' | 'md';

/** 文件状态 */
export type FileStatus = 'uploading' | 'parsed' | 'failed' | 'bound';

/** 提取的文本块 */
export interface ExtractedChunk {
  id: string;
  index: number;
  title: string;
  content: string;
  wordCount: number;
  boundToVariable: string | null; // 绑定到的变量名如 "idea"
}

/** 用户附加文件 */
export interface AttachedFile {
  id: string;
  name: string;
  type: FileType;
  size: number;
  status: FileStatus;
  chunks: ExtractedChunk[];
  rawText: string;
  createdAt: number;
  error?: string;
}

/** 变量绑定映射 */
export type VariableBinding = Partial<Record<string, string>>; // 变量名 -> 文本块ID

/** 附件 Store 状态 */
export interface AttachmentState {
  files: AttachedFile[];
  activeFileId: string | null;
  variableBindings: VariableBinding;
}

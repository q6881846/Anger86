/**
 * 高级参数系统类型定义
 * 支持：模板级默认参数 + 用户自定义覆盖 + 预设管理
 */

export interface AdvancedParams {
  temperature: number;      // 0.0 - 2.0
  top_p: number;            // 0.0 - 1.0
  max_tokens: number;       // 1 - 128000
  frequency_penalty: number; // -2.0 - 2.0
  presence_penalty: number;  // -2.0 - 2.0
  /** 扩展参数，支持任意 OpenAI 兼容参数 */
  [key: string]: number | string | boolean | undefined;
}

/** 参数预设 */
export interface ParamPreset {
  id: string;
  name: string;
  description: string;
  params: AdvancedParams;
  /** 是否内置（不可删除，但可派生副本） */
  builtIn?: boolean;
  /** 适用场景标签 */
  tags?: string[];
}

/** 用户级参数覆盖 */
export interface UserParamOverride {
  /** 全局默认参数 */
  globalDefault: AdvancedParams;
  /** 按模板 key（stepKey）覆盖 */
  templateOverrides: Record<string, Partial<AdvancedParams>>;
  /** 用户保存的预设 */
  customPresets: ParamPreset[];
  /** 当前选中的预设 ID（undefined = 使用全局默认） */
  activePresetId?: string;
}

/** 参数元信息（用于前端表单渲染） */
export interface ParamMeta {
  key: keyof AdvancedParams;
  label: string;
  description: string;
  type: 'slider' | 'number' | 'select';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number;
  marks?: Record<number, string>;
}

/** 模型硬上限（与后端 server.js 的 MODEL_LIMITS 保持一致，按当前模型规格） */
export const MODEL_LIMITS = {
  contextWindow: 1024 * 1024, // 1,048,576 tokens（上下文窗口）
  maxInput: 1024 * 1024,      // 1,048,576 tokens（最大输入）
  maxOutput: 128 * 1024,      // 131,072 tokens（最大输出）
  maxReasoning: 128 * 1024,   // 131,072 tokens（最大思考内容）
};

export const PARAM_METAS: ParamMeta[] = [
  {
    key: 'temperature',
    label: '创造性 / 随机性',
    description: '值越高输出越随机有创意，越低越稳定听话。脑洞用1.0，润色用0.3。',
    type: 'slider',
    min: 0,
    max: 2,
    step: 0.1,
    defaultValue: 0.7,
    marks: { 0: '死板', 0.5: '稳重', 0.7: '平衡', 1.0: '创意', 1.5: '放飞', 2: '疯癫' },
  },
  {
    key: 'top_p',
    label: '核采样 (Top P)',
    description: '从概率前 N% 的词中选择。通常和 Temperature 联动：创意场景0.9，严谨场景0.5。',
    type: 'slider',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.9,
    marks: { 0: '死板', 0.5: '保守', 0.9: '宽松', 1: '全选' },
  },
  {
    key: 'max_tokens',
    label: '最大输出长度',
    description: 'AI 一次最多生成多少 token（模型上限 128k / 131072）。1 token ≈ 1.5 汉字。设为 0 时部分网关会回退到极小默认值导致截断，建议长内容显式设大值。',
    type: 'number',
    min: 0,
    max: MODEL_LIMITS.maxOutput, // 128 * 1024
    step: 1,
    defaultValue: 16000,
    marks: { 0: '不限制', 4096: '4k', 16000: '16k', 65536: '64k', 131072: '128k' },
  },
  {
    key: 'frequency_penalty',
    label: '重复惩罚',
    description: '值越高 AI 越讨厌重复用词。去AI润色时建议 0.3-0.5，防止“缓缓”“蓦然”反复出现。',
    type: 'slider',
    min: -2,
    max: 2,
    step: 0.1,
    defaultValue: 0,
    marks: { '-2': '爱重复', 0: '默认', 1: '少重复', 2: '极度厌恶' },
  },
  {
    key: 'presence_penalty',
    label: '话题新鲜度',
    description: '值越高 AI 越容易换话题。小说需要深入，建议保持 0。',
    type: 'slider',
    min: -2,
    max: 2,
    step: 0.1,
    defaultValue: 0,
    marks: { '-2': '死磕话题', 0: '默认', 1: '偶尔岔开', 2: '极度喜新' },
  },
];

/** 内置预设（不可删除） */
export const BUILT_IN_PRESETS: ParamPreset[] = [
  {
    id: 'default',
    name: '默认平衡',
    description: '通用场景，创意与稳定兼顾',
    builtIn: true,
    tags: ['通用'],
    params: {
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 4096,
      frequency_penalty: 0,
      presence_penalty: 0,
    },
  },
  {
    id: 'brainstorm',
    name: '脑洞风暴',
    description: '高创意发散，适合灵感搅拌、世界观脑洞',
    builtIn: true,
    tags: ['灵感', '世界观', '脑洞'],
    params: {
      temperature: 1.0,
      top_p: 0.95,
      max_tokens: 2048,
      frequency_penalty: 0,
      presence_penalty: 0,
    },
  },
  {
    id: 'worldbuilding',
    name: '世界观构建',
    description: '逻辑严密，设定一致，适合世界观/角色/主线',
    builtIn: true,
    tags: ['世界观', '角色', '主线'],
    params: {
      temperature: 0.5,
      top_p: 0.7,
      max_tokens: 4096,
      frequency_penalty: 0,
      presence_penalty: 0,
    },
  },
  {
    id: 'continuation',
    name: '正文续写',
    description: '有创意但不离谱，适合章节正文生成',
    builtIn: true,
    tags: ['正文', '续写', '章节'],
    params: {
      temperature: 0.85,
      top_p: 0.9,
      max_tokens: 4096,
      frequency_penalty: 0.1,
      presence_penalty: 0,
    },
  },
  {
    id: 'polish',
    name: '润色去AI',
    description: '低温度高服从，严格执行去AI化规则',
    builtIn: true,
    tags: ['润色', '去AI', '精修'],
    params: {
      temperature: 0.3,
      top_p: 0.5,
      max_tokens: 10000,
      frequency_penalty: 0.5,
      presence_penalty: 0,
    },
  },
  {
    id: 'json_strict',
    name: 'JSON严格',
    description: '最低随机性，确保结构化输出不幻觉',
    builtIn: true,
    tags: ['状态同步', '角色', 'JSON'],
    params: {
      temperature: 0.0,
      top_p: 0.1,
      max_tokens: 4096,
      frequency_penalty: 0,
      presence_penalty: 0,
    },
  },
  {
    id: 'dialogue',
    name: '角色对话',
    description: '对话自然有差异，适合角色专属对话生成',
    builtIn: true,
    tags: ['对话', '角色'],
    params: {
      temperature: 0.8,
      top_p: 0.85,
      max_tokens: 2048,
      frequency_penalty: 0.2,
      presence_penalty: 0,
    },
  },
];

/** 合并参数：基础 → 模板默认 → 用户覆盖 */
export function mergeParams(
  base: AdvancedParams,
  templateOverride?: Partial<AdvancedParams>,
  userOverride?: Partial<AdvancedParams>
): AdvancedParams {
  return {
    ...base,
    ...templateOverride,
    ...userOverride,
  };
}

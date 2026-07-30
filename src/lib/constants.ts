// ============================================
// 墨文写作 - 共享常量
// ============================================

export const ARC_COLORS: Record<string, string> = {
  '成长': '#6ec092',
  '黑化': '#e85d68',
  '觉醒': '#b890e8',
  '堕落': '#a8b0c0',
};

export const STRENGTH_COLORS: Record<string, string> = {
  '强': '#e85d68',
  '中': '#f0c674',
  '弱': '#6a7388',
};

export const PACE_COLORS: Record<string, string> = {
  '快': '#e85d68',
  '中': '#f0c674',
  '慢': '#7a9ef0',
};

// ============================================
// 附件功能常量
// ============================================

/** 支持的文件类型 */
export const SUPPORTED_FILE_TYPES: string[] = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain', // .txt
  'text/markdown', // .md
];

/** 支持的文件扩展名 */
export const SUPPORTED_EXTENSIONS = ['.docx', '.txt', '.md'];

/** 模板变量列表（与 docx 中的 26 个变量词对应） */
export const TEMPLATE_VARIABLES = [
  { name: 'idea', label: '核心灵感', description: '小说的核心灵感与创意梗概' },
  { name: 'tags', label: '标签选择', description: '风格标签、爽点标签等' },
  { name: 'world', label: '世界观', description: '整个世界观设定' },
  { name: 'geography', label: '地理环境', description: '地理环境与势力分布' },
  { name: 'rules', label: '核心法则', description: '力量体系与核心规则' },
  { name: 'characters', label: '核心角色', description: '主要角色设定' },
  { name: 'activeCharacters', label: '活跃角色', description: '当前章节活跃角色' },
  { name: 'existingNames', label: '已有角色名', description: '已创建的角色名称列表' },
  { name: 'mainPlot', label: '主线脉络', description: '主线故事脉络' },
  { name: 'detailedPlot', label: '详细大纲', description: '详细章节大纲' },
  { name: 'beats', label: '剧情节点', description: '剧情节点拆解' },
  { name: 'style', label: '行文风格', description: '写作风格设定' },
  { name: 'tone', label: '情感基调', description: '情感基调与氛围' },
  { name: 'pace', label: '节奏控制', description: '叙事节奏' },
  { name: 'fullContext', label: '完整上下文', description: '全部前置内容' },
  { name: 'prevSummary', label: '前文摘要', description: '前文内容摘要' },
  { name: 'title', label: '书名', description: '当前书名' },
  { name: 'authorMimic', label: '模仿作家', description: '模仿的作家风格' },
  { name: 'currentContent', label: '当前内容', description: '当前正在写作的内容' },
  { name: 'content', label: '章节内容', description: '章节正文内容' },
  { name: 'summary', label: '章节摘要', description: '章节摘要' },
  { name: 'chapterSummary', label: '本章摘要', description: '本章内容摘要' },
];

/** 结构块标记 */
export const STRUCTURE_BLOCKS = {
  systemPrompt: '[系统提示词]',
  userMessage: '[用户消息]',
  aiReply: '[AI回复]',
  chapterLoopStart: '[章节内容循环]',
  chapterLoopEnd: '[/章节内容循环]',
};

/** 附件存储 Key */
export const ATTACHMENT_STORAGE_KEY = 'mowen-attachments';

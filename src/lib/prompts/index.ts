// Prompt 系统统一出口
// 前端只传变量和 stepId，Prompt 原文由后端 Prompt Template Service 管理
export * from './module-meta';
export * from './prompt-api';

// 旧版兼容导出（将在全部迁移完成后删除）
export { MODULE_META_MAP as DEFAULT_MODULE_META } from './module-meta';

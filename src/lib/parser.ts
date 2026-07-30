// ============================================
// 文件解析器：.docx（mammoth.js）/ .txt / .md
// ============================================
import mammoth from 'mammoth';
import type { ExtractedChunk, FileType } from './types';

function genChunkId(): string {
  return `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 按段落拆分文本 */
function splitByParagraphs(text: string): ExtractedChunk[] {
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0);
  return paragraphs.map((content, index) => ({
    id: genChunkId(),
    index,
    title: `片段 ${index + 1}`,
    content: content.trim(),
    wordCount: content.trim().length,
    boundToVariable: null,
  }));
}

/** 按双换行分块（适合大纲/章节结构） */
function splitByDoubleNewline(text: string): ExtractedChunk[] {
  const blocks = text.split(/\n\s*\n+/).filter((b) => b.trim().length > 0);
  return blocks.map((content, index) => {
    const lines = content.split('\n');
    const firstLine = lines[0].trim();
    const title = firstLine.length <= 30 && firstLine.length > 0
      ? firstLine
      : `片段 ${index + 1}`;
    return {
      id: genChunkId(),
      index,
      title,
      content: content.trim(),
      wordCount: content.trim().length,
      boundToVariable: null,
    };
  });
}

/** 解析 .docx 文件 */
export async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/** 解析 .txt / .md 文件 */
export async function parseTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

/** 通用解析入口 */
export async function parseFile(file: File, type: FileType): Promise<string> {
  switch (type) {
    case 'docx': return parseDocx(file);
    case 'txt':
    case 'md': return parseTextFile(file);
    default:
      throw new Error(`不支持的文件类型: ${type}`);
  }
}

/** 自动选择拆分策略 */
export function autoSplit(text: string, fileType: FileType): ExtractedChunk[] {
  // docx 按段落拆；txt/md 按双换行拆（更适合大纲结构）
  if (fileType === 'docx') {
    return splitByParagraphs(text);
  }
  return splitByDoubleNewline(text);
}

/** 检测文件类型 */
export function detectFileType(file: File): FileType | null {
  const ext = file.name.toLowerCase();
  if (ext.endsWith('.docx')) return 'docx';
  if (ext.endsWith('.txt')) return 'txt';
  if (ext.endsWith('.md')) return 'md';
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (file.type === 'text/plain') return 'txt';
  if (file.type === 'text/markdown') return 'md';
  return null;
}

/** 检查文件是否受支持 */
export function isSupportedFile(file: File): boolean {
  return detectFileType(file) !== null;
}

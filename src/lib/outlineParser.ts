import type { ChapterOutline } from './types';

function extractField(block: string, label: string): string {
  const re = new RegExp(`【${label}】\\s*([\\s\\S]*?)(?=\\n\\s*【[^】]+】|$)`, 'm');
  const m = block.match(re);
  return m ? m[1].trim() : '';
}

/**
 * 将 step15 逐幕生成合并后的文本解析为章节大纲数组。
 * step15 输出格式示例：
 *   【第1章】章节标题
 *   【梗概】...
 *   【爽点】...
 *   【钩子】...
 *   【对应节点】...
 *   【伏笔】...
 */
export function parseStep15ToOutlines(text: string): ChapterOutline[] {
  if (!text || !text.trim()) return [];

  const re = /【第(\d+)章】([\s\S]*?)(?=\n\s*【第\d+章】|$)/g;
  const outlines: ChapterOutline[] = [];
  const usedN = new Set<number>();
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    let n = parseInt(m[1], 10);
    if (usedN.has(n)) {
      const maxN = outlines.length ? Math.max(...outlines.map((o) => o.n)) : 0;
      n = maxN + 1;
    }
    usedN.add(n);

    const block = m[2];
    const titleLine = (block.split('\n')[0] || '').replace(/^【第\d+章】\s*/, '').trim();
    const summary = extractField(block, '梗概');
    const satisfaction = extractField(block, '爽点');
    const hook = extractField(block, '钩子');
    const node = extractField(block, '对应节点');
    const foreshadow = extractField(block, '伏笔');
    const plant = foreshadow
      ? foreshadow.split(/[，,、；;]/).map((s) => s.trim()).filter(Boolean)
      : [];

    outlines.push({
      n,
      title: titleLine || `第${n}章`,
      summary,
      core_action: '',
      emotion_curve: '',
      satisfaction_design: '',
      satisfaction_type: satisfaction,
      node_mapping: node,
      characters_involved: [],
      worldview_unlock: '',
      foreshadowing: { plant, resolve: [] },
      chapter_hook: hook,
      hook_strength: '',
      key_scenes: [],
      time_constraint: '',
      pace: '',
      stop_point: '',
      no_go: '',
      content: block.trim(),
      reviewStatus: 'pending',
    });
  }

  return outlines;
}

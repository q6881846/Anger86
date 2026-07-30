// 解析 step12（卷/幕骨架）的 Markdown 输出，提取每个「幕」的结构化信息，
// 供 step15 逐幕批量生成时作为 actRequirements / focusBeatInstruction / actEmotion 传入。
//
// 兼容多种大模型输出格式（标题式与列表式均支持，避免模型偏离提示词导致解析为 0）：
// - 幕标题：#### 幕1：xxx / ### 幕1：xxx / - 幕1：xxx
// - 节点标题：## 节点1：xxx / - 节点1：xxx（子节点1.1-1.4）
// - 子节点标题：### 子节点1：xxx / - 子节点1.1：xxx
// - 字段：功能 / 冲突原型 / 必须包含要素 / 情绪要求（含换行续写）
// - 列表式节点的章节数：从「子节点1.1-1.4」范围自动估算（每子节点约 3 章）
// - 若以上都解析不到，再 fallback 到按「节点」块解析

export interface Step12Act {
  title: string; // 幕标题
  nodeRange: string; // 对应节点区间，如 "节点1-2"
  estimatedChapters: number; // 预估章节数
  func: string; // 功能
  conflictType: string; // 冲突原型
  mustInclude: string[]; // 必须包含要素
  emotion: string; // 情绪要求
}

// 从「子节点1.1-1.4」范围推算章节数：每个子节点约 3 章。
// 注意：子节点序号在小数点后（1.1-1.4 = 4 个子节点），不能对小数直接用 floor 相减。
function estimateChaptersFromSubRange(range: string): number | null {
  const parts = range.split(/[-~～]/).map((s) => s.trim());
  if (parts.length !== 2) return null;
  const subIndexOf = (s: string): number => {
    const dot = s.indexOf('.');
    const n = parseInt(dot < 0 ? s : s.slice(dot + 1), 10);
    return isFinite(n) ? n : NaN;
  };
  const startSub = subIndexOf(parts[0]);
  const endSub = subIndexOf(parts[1]);
  if (isNaN(startSub) || isNaN(endSub) || endSub < startSub) return null;
  const subCount = Math.max(1, endSub - startSub + 1);
  return subCount * 3;
}

function parseActsFromStep12Text(text: string): Step12Act[] {
  if (!text || !text.trim()) return [];

  const lines = text.split('\n').map((l) => l.trim());
  const acts: Step12Act[] = [];
  let current: Partial<Step12Act> | null = null;

  const flush = () => {
    if (current && current.title) {
      acts.push({
        title: current.title,
        nodeRange: current.nodeRange || '',
        estimatedChapters: current.estimatedChapters || 10,
        func: current.func || '',
        conflictType: current.conflictType || '',
        mustInclude: current.mustInclude || [],
        emotion: current.emotion || '',
      });
    }
    current = null;
  };

  for (const line of lines) {
    // 模式1：标题式  #### 幕1 / ## 节点1 / ### 子节点1
    const headingMatch = line.match(/^#{0,4}\s*(?:幕|节点|子节点)\s*\d+[:：]\s*(.+)/i);
    // 模式2：列表式  - 节点1：xxx（子节点1.1-1.4）
    const bulletNodeMatch = line.match(
      /^\s*[-•*]\s*节点\s*(\d+)\s*[:：]\s*(.+?)\s*(?:[（(]子节点\s*([^）)]+)[）)])?$/i,
    );
    // 模式3：列表式子节点  - 子节点1.1：xxx（无节点父级时，作为独立幕）
    const bulletSubMatch = line.match(/^\s*[-•*]\s*子节点\s*[\d.]+\s*[:：]\s*(.+)/i);

    if (headingMatch || bulletNodeMatch) {
      flush();
      const raw = (headingMatch ? headingMatch[1] : bulletNodeMatch![2]).trim();
      current = { title: raw, mustInclude: [] };

      // 列表式节点：从「子节点1.1-1.4」自动估算章节数
      if (bulletNodeMatch && bulletNodeMatch[3]) {
        const sub = estimateChaptersFromSubRange(bulletNodeMatch[3]);
        if (sub) current.estimatedChapters = sub;
        current.nodeRange = `节点${bulletNodeMatch[1]}（${bulletNodeMatch[3]}）`;
      }

      // 行内显式「预估X章」优先级最高
      const est = line.match(/预估[约]?(\d+)[~～至-]?(\d*)\s*章/);
      if (est) {
        const min = parseInt(est[1], 10);
        const max = est[2] ? parseInt(est[2], 10) : min;
        current.estimatedChapters = Math.floor((min + max) / 2);
      }
      continue;
    }

    // 列表式子节点（无父级节点时单独成幕）
    if (bulletSubMatch && !current) {
      flush();
      current = {
        title: bulletSubMatch[1].trim(),
        nodeRange: '子节点',
        estimatedChapters: 3,
        mustInclude: [],
      };
      continue;
    }

    if (!current) continue;

    if (/对应节点|对应主线节点|节点范围/i.test(line)) {
      const m = line.match(/[:：]\s*(.+)/);
      if (m) current.nodeRange = m[1].trim();
      continue;
    }
    if (/预估.*章|约.*章/i.test(line)) {
      const m = line.match(/(\d+)\s*章/);
      if (m) current.estimatedChapters = parseInt(m[1], 10);
      continue;
    }
    if (/功能[:：]/i.test(line)) {
      const m = line.match(/功能[:：]\s*(.+)/i);
      if (m) current.func = m[1].trim();
      continue;
    }
    if (/冲突原型[:：]/i.test(line)) {
      const m = line.match(/冲突原型[:：]\s*(.+)/i);
      if (m) current.conflictType = m[1].trim();
      continue;
    }
    if (/情绪要求|情绪曲线|情绪[:：]/i.test(line)) {
      const m = line.match(/[:：]\s*(.+)/);
      if (m) current.emotion = m[1].trim();
      continue;
    }
    // 必须包含要素（列表项）
    if (/^\d+[.．、]\s*/.test(line)) {
      const item = line.replace(/^\d+[.．、]\s*/, '').trim();
      if (item) {
        if (!current.mustInclude) current.mustInclude = [];
        current.mustInclude.push(item);
      }
      continue;
    }
  }

  flush();

  // 前面都没解析到，再 fallback 到按「节点」块解析（兼容标题式/列表式）
  if (acts.length === 0) return parseActsFromNodesFallback(text);
  return acts;
}

// Fallback：按「节点X」块解析（兼容 ## 节点1 标题式 与 - 节点1 列表式）
function parseActsFromNodesFallback(text: string): Step12Act[] {
  const acts: Step12Act[] = [];
  const nodeBlocks = text
    .split(/(?=^#{0,4}\s*节点\d+[:：]|^\s*[-•*]\s*节点\d+[:：])/m)
    .filter(Boolean);

  for (const block of nodeBlocks) {
    const titleMatch = block.match(/^\s*#{0,4}\s*节点\s*\d+\s*[:：]\s*(.+)/m);
    if (!titleMatch) continue;

    const title = titleMatch[1].trim();
    const rangeMatch = block.match(/子节点\s*([\d.]+)[-~～]([\d.]+)/);
    const estMatch = block.match(/预估[约]?(\d+)[~～至-]?(\d*)/);
    let est = 10;
    if (estMatch) est = parseInt(estMatch[1], 10);
    else if (rangeMatch) {
      const sub = estimateChaptersFromSubRange(`${rangeMatch[1]}-${rangeMatch[2]}`);
      if (sub) est = sub;
    }

    const items = block
      .split('\n')
      .filter((l) => /^\s*[-•]\s+/.test(l))
      .map((l) => l.replace(/^\s*[-•]\s+/, '').trim())
      .filter(Boolean);

    acts.push({
      title,
      nodeRange: title,
      estimatedChapters: est,
      func: items[0] || '',
      conflictType: '',
      mustInclude: items.slice(1),
      emotion: '',
    });
  }

  return acts;
}

export function parseStep12Acts(text: string): Step12Act[] {
  return parseActsFromStep12Text(text);
}

// 将单个幕组装为 step15 的 actRequirements 文本
export function actRequirementsText(act: Step12Act): string {
  const parts = [
    `功能：${act.func}`,
    `冲突原型：${act.conflictType}`,
    '必须包含要素：',
  ];
  if (act.mustInclude.length === 0) parts.push('（见幕描述中的关键事件）');
  act.mustInclude.forEach((m, i) => parts.push(`${i + 1}. ${m}`));
  parts.push(`情绪要求：${act.emotion}`);
  return parts.join('\n');
}

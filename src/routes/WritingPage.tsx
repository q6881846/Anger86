// ============================================
// 4. 写作页面 — 正文智能写作
// ============================================
import { useState, useEffect, useRef } from 'react';
import { useNovelGenesisStore } from '@/lib/store/novelGenesis';
import { useProjectStore } from '@/lib/store/projectStore';
import { PhaseNav } from '@/components/PhaseNav';
import { useReveal } from '@/components/hooks';
import { fillStep, stepIdToKey } from '@/lib/prompts/prompt-api';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { useApiStore } from '@/lib/store/apiStore';
import { useParamsStore } from '@/lib/store/paramsStore';
import { runStepLLM } from '@/hooks/useGenesisStep';
import type { ChapterOutline, ModuleName } from '@/lib/types';

// 依据章节大纲，合成一段完整章节草稿（离线模板，接入真实模型后替换）
function composeChapter(o: ChapterOutline | null, n: number): string {
  const title = o?.title || `第${n}章`;
  const summary = (o?.summary || '').trim();
  const satisfy = o?.satisfaction_type || '情绪释放';
  const hook = (o?.chapter_hook || '').trim();
  const paras: string[] = [];
  paras.push(`第${n}章《${title}》`);
  paras.push(
    `寒风卷着碎雪，从破败的檐角灌进来，临时栖身的窝棚里几乎没有什么热气。${summary ? summary.replace(/。$/, '') + '。' : '流民少女阿芦的寒热症毫无征兆地发作了，面色青紫，牙关紧咬，呼吸细得像一缕随时会断的丝。'}棚外有人探了探头，又默默缩了回去——这样的世道，一条命轻得不如半块饼。`
  );
  paras.push(
    `「都这光景了还折腾什么？」「一个流民丫头，死了也就死了，别白白搭上药。」人群里响起细碎的议论，有人已经别过脸去。在穷途末路的人群里，冷眼与侥幸总是最先冒头的东西。`
  );
  paras.push(
    `林川没理会那些声音。他蹲下身，指尖搭上阿芦腕间跳动的脉络，闭眼片刻，再睁眼时，眼底只剩下近乎固执的专注。他没有解释，只是从怀中取出那套谁也看不懂的银针——以及，只有他能唤出的系统医术。`
  );
  paras.push(
    `「系统，标定心俞、足三里、人中。」虚空中一抹微光掠过视野，穴位数值被一寸寸标红。第一根银针落下时，阿芦的身子猛地一颤；第二根、第三根……冷汗顺着林川的额角滑落，他比谁都清楚，这一针若偏半分，便是回天乏力。`
  );
  paras.push(
    `就在第四根针没入肌肤的刹那，阿芦喉间忽然溢出一口浊气，青紫以肉眼可见的速度从脸颊褪去，转为正常的苍白。她睫毛颤了颤，竟缓缓睁开了眼。「我……还活着？」棚里死寂了一瞬，随即是倒吸凉气的声音——方才还断言无救的人，此刻连退了两步。这一章的「${satisfy}」，正落在这起死回生的一刻。`
  );
  if (hook) {
    paras.push(
      `林川收针入匣，掌心却浮现一行淡金小字：『检测到宿主首次成功施救，系统权限已解锁——但真正的考验，才刚刚开始。』他忽然意识到，今夜救下的不只是一个阿芦，还有某种正悄然苏醒的东西。远处传来一声极轻的铃响，像是回应，又像是预警。${hook}`
    );
  } else {
    paras.push(
      `林川收针入匣，掌心却浮现一行淡金小字：『检测到宿主首次成功施救，系统权限已解锁——但真正的考验，才刚刚开始。』他忽然意识到，今夜救下的不只是一个阿芦，还有某种正悄然苏醒的东西。雪夜深处，似乎有什么正在被悄悄改写。`
    );
  }
  paras.push(
    `（以上为根据本章大纲自动合成的章节草稿，可供继续扩写。接入真实生成模型后，将替换为完整、连贯的正文内容。）`
  );
  return paras.join('\n\n');
}

function pick(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) r[k] = obj[k];
  return r;
}

// 工具栏 → 步骤 + 模块 + 模式 的权威映射（与 STEP_MODULE_MAP / prompt-templates.json 对齐）
const TOOL_STEP: Record<string, { step: number; module: ModuleName; mode: 'text' | 'json'; append?: boolean }> = {
  '智能写作': { step: 16, module: 'writing', mode: 'text' },
  '智能续写': { step: 17, module: 'writing', mode: 'text', append: true },
  '润色去AI': { step: 19, module: 'writing', mode: 'text' },
  '智能校对': { step: 18, module: 'chapterReview', mode: 'json' },
  '状态同步': { step: 20, module: 'stateSync', mode: 'json' },
};

// 各 step 在 prompt 模板中声明的变量清单
const STEP_KEYS: Record<number, string[]> = {
  16: ['authorMimic','chapterContent','chapterOrder','chapterSummary','chapterTitle','characters','continuePrompt','geography','idea','lastChapterContent','prevSummary','rules','style','tone','world'],
  17: ['authorMimic','beats','characters','detailedPlot','idea','mainPlot','style','tone','world'],
  19: ['chapterSummary','characters','content','style','tone'],
  18: ['chapterSummary','characters','fullContext','idea','tags','world'],
  20: ['chapterSummary','characters','content'],
};

// 解析模块对应的 LLM 配置（优先：分配给该模块且含 apiKey 的配置 → 任一启用且含 key 的配置）
function resolveLlm(module: ModuleName) {
  const st = useApiStore.getState();
  const modCfg = st.getLlmConfigForModule(module);
  if (modCfg) return modCfg;
  const active = st.configs.find((c) => c.enabled && c.apiKey);
  if (active) {
    return {
      provider: active.provider,
      apiKey: active.apiKey,
      baseUrl: active.baseUrl,
      model: active.model,
      temperature: active.temperature,
      maxTokens: active.maxTokens || undefined,
    };
  }
  return undefined;
}

// 真正调用后端流式接口（/api/genesis/stream），按 SSE 解析并回调 onChunk
async function callLLMStream(
  stepId: number,
  variables: Record<string, unknown>,
  module: ModuleName,
  onChunk: (s: string) => void,
): Promise<{ ok: boolean; output: string; error?: string }> {
  try {
    const filled = await fillStep(stepId, variables);
    const llmConfig = resolveLlm(module);
    if (!llmConfig || !llmConfig.apiKey) {
      return { ok: false, output: '', error: '未配置 API Key（请在「设置 → API 配置」中填写 API Key 并分配给写作模块）' };
    }
    const stepKey = stepIdToKey(stepId);
    const params = useParamsStore.getState().getEffectiveParams(stepKey);
    const res = await fetchWithAuth('/api/genesis/stream', {
      method: 'POST',
      body: JSON.stringify({
        stepId,
        system: filled.system,
        user: filled.user,
        outputType: filled.outputType,
        llmConfig,
        params,
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { ok: false, output: '', error: `后端错误 ${res.status}：${err || res.statusText}` };
    }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const rd = await reader.read();
      if (rd.done) break;
      const chunk = decoder.decode(rd.value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (!json || json === '[DONE]') continue;
        try {
          const parsed = JSON.parse(json);
          const c = parsed.content || '';
          if (c) onChunk(c);
        } catch {
          /* 忽略心跳/非 JSON 行 */
        }
      }
    }
    return { ok: true, output: '' };
  } catch (e: unknown) {
    return { ok: false, output: '', error: e instanceof Error ? e.message : String(e) };
  }
}

const AI_TOOLS = [
  { icon: '\u2726', label: '智能写作', color: '#f0c674', bg: 'rgba(212,166,87,0.12)' },
  { icon: '\u2726', label: '智能续写', color: '#6ec092', bg: 'rgba(110,192,146,0.1)' },
  { icon: '\u2699', label: '智能校对', color: '#7a9ef0', bg: 'rgba(122,158,240,0.1)' },
  { icon: '\u2726', label: '润色去AI', color: '#e85d68', bg: 'rgba(232,93,104,0.1)' },
  { icon: '\u2699', label: '状态同步', color: '#b890e8', bg: 'rgba(184,144,232,0.1)' },
];

const selectStyle: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid var(--ink-border)',
  borderRadius: 6,
  fontSize: 12,
  background: 'var(--ink-surface)',
  outline: 'none',
  color: '#e8e4d8',
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px solid var(--ink-border)',
  borderRadius: 6,
  background: 'var(--ink-surface)',
  color: '#8a93a8',
  fontSize: 12,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const goldBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 12px',
  border: 'none',
  borderRadius: 6,
  background: 'linear-gradient(135deg, #d4a657, #f0c674)',
  color: '#0a0e1a',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(212,166,87,0.2)',
  transition: 'all 0.2s',
};

export default function WritingPage() {
  useReveal();
  const { vars, setVar, getVar } = useNovelGenesisStore();
  const [activeChapter, setActiveChapter] = useState(1);
  const [wordCount, setWordCount] = useState(0);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genTool, setGenTool] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  const [genStatus, setGenStatus] = useState('');
  const [saveToast, setSaveToast] = useState('');
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chapterOutlines = useProjectStore((s) => s.chapterOutlines);
  const updateChapter = useProjectStore((s) => s.updateChapter);
  const chapters = chapterOutlines.length
    ? chapterOutlines
    : [1, 2, 3].map((n) => ({ n, title: `第${n}章` }));
  const activeOutline = chapterOutlines.find((c) => c.n === activeChapter) || null;
  // 仅取渲染所需的安全字段，杜绝把整个 ChapterOutline 对象当作 React 子节点渲染
  const chaptersView = chapters.map((c) => ({ n: c.n, title: String(c.title ?? '未命名') }));

  const stopPulse = () => { if (pulseRef.current) { clearInterval(pulseRef.current); pulseRef.current = null; } };
  const startPulse = () => {
    stopPulse();
    pulseRef.current = setInterval(() => { setGenProgress((p) => (p >= 90 ? 15 : p + 12)); }, 120);
  };
  useEffect(() => () => stopPulse(), []);

  // 依据大纲与全局设定，组装各 step 所需的变量
  const buildAllVars = () => {
    const o = activeOutline;
    return {
      authorMimic: getVar('authorMimic'),
      world: getVar('world'),
      geography: getVar('geography'),
      rules: getVar('rules'),
      characters: getVar('characters'),
      idea: getVar('idea'),
      tags: getVar('tags'),
      style: getVar('style'),
      tone: getVar('tone'),
      mainPlot: getVar('mainPlot'),
      detailedPlot: getVar('detailedPlot'),
      beats: getVar('beats'),
      totalWordTarget: getVar('totalWordTarget'),
      singleVolumeWord: getVar('singleVolumeWord'),
      chapterOrder: String(activeChapter),
      chapterTitle: o?.title || `第${activeChapter}章`,
      chapterSummary: o
        ? `梗概：${o.summary || ''}\n爽点类型：${o.satisfaction_type || ''}\n对应节点：${o.node_mapping || ''}\n章节钩子：${o.chapter_hook || ''}`
        : '',
      chapterContent: vars.content || '',
      lastChapterContent: '',
      prevSummary: (chapterOutlines || [])
        .filter((c) => (c.n ?? 0) < activeChapter)
        .map((c) => `第${c.n}章《${c.title || ''}》：${c.summary || ''}`)
        .join('\n') || '（无前文）',
      continuePrompt: o
        ? `请依据本章大纲创作，重点呈现「${o.satisfaction_type || '情绪'}」爽点，并以「${o.chapter_hook || ''}」作为章节钩子收尾。`
        : '请创作本章正文。',
      content: vars.content || '',
      fullContext: vars.content || '',
    };
  };

  // 智能写作动作：真正调用后端流式 API（你配置的 writing 模块 / GLM），失败则回退本地模板并明确提示
  const runTool = async (tool: string) => {
    if (isGenerating) return;
    const cfg = TOOL_STEP[tool];
    if (!cfg) return;
    setActiveTool(tool);
    setIsGenerating(true);
    setGenTool(tool);
    setGenProgress(0);
    setGenStatus(`${tool}：正在连接 API（${cfg.module} / step${cfg.step}）…`);
    const variables = pick(buildAllVars(), STEP_KEYS[cfg.step] || []);

    // 结构化结果类（校对 / 状态同步）：走一次性接口
    if (cfg.mode === 'json') {
      try {
        const r = await runStepLLM(cfg.step, variables);
        const out = typeof r.output === 'string' ? r.output : '';
        let count = 0;
        try {
          const parsed = JSON.parse(out);
          count = Array.isArray(parsed) ? parsed.length : (out ? 1 : 0);
        } catch {
          count = out ? 1 : 0;
        }
        setIsGenerating(false);
        setGenTool(null);
        setGenStatus(`✓ ${tool} 完成，返回 ${count} 条结果（详见控制台）`);
        // eslint-disable-next-line no-console
        console.log(`[${tool}] 结果：`, out);
      } catch (e: unknown) {
        setIsGenerating(false);
        setGenTool(null);
        setGenStatus(`✗ ${tool} 失败：${e instanceof Error ? e.message : String(e)}`);
      }
      return;
    }

    // 流式正文类（写作 / 续写 / 润色）
    let acc = '';
    const base = cfg.append && vars.content ? vars.content + '\n\n' : '';
    startPulse();
    const res = await callLLMStream(cfg.step, variables, cfg.module, (s: string) => {
      acc += s;
      const full = base + acc;
      setVar('content', full);
      setWordCount(full.replace(/\s/g, '').length);
      setGenStatus(`${tool}：正在生成…（已收到 ${acc.replace(/\s/g, '').length} 字）`);
    });
    stopPulse();
    if (!res.ok) {
      // API 未连通：回退本地模板并明确提示，避免「点了没反应」
      const fb = base + composeChapter(activeOutline, activeChapter);
      setVar('content', fb);
      setWordCount(fb.replace(/\s/g, '').length);
      setIsGenerating(false);
      setGenTool(null);
      setGenStatus(`⚠ ${tool} 未连接 API（${res.error}）；已用本地模板生成占位，请检查 API Key 配置与后端服务是否在运行`);
      return;
    }
    const finalText = base + acc;
    setVar('content', finalText);
    setWordCount(finalText.replace(/\s/g, '').length);
    setIsGenerating(false);
    setGenTool(null);
    setGenProgress(100);
    setGenStatus(`${tool}：✓ 已生成约 ${finalText.replace(/\s/g, '').length} 字`);
  };

  return (
    <div style={{ background: 'var(--ink-deep)', minHeight: '100vh', paddingTop: 64 }}>
      <PhaseNav currentPhase={4} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div
          className="reveal"
          style={{
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* Left: Chapter List */}
          <div
            style={{
              background: 'var(--ink-card)',
              border: '1px solid var(--ink-border)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
              position: 'sticky',
              top: 72,
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--ink-border)',
              }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#e8e4d8',
                }}
              >
                章节目录
              </h3>
            </div>
            <div>
              {chaptersView.map((ch) => (
                <div
                  key={ch.n}
                  onClick={() => setActiveChapter(ch.n)}
                  style={{
                    padding: '12px 20px',
                    cursor: 'pointer',
                    borderLeft:
                      activeChapter === ch.n
                        ? '3px solid #f0c674'
                        : '3px solid transparent',
                    background:
                      activeChapter === ch.n ? 'rgba(212,166,87,0.08)' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (activeChapter !== ch.n) {
                      e.currentTarget.style.background = 'rgba(212,166,87,0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeChapter !== ch.n) {
                      e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow='none';
                    }
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: activeChapter === ch.n ? 600 : 400,
                      color: activeChapter === ch.n ? '#f0c674' : '#e8e4d8',
                    }}
                  >
                    第{ch.n}章
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#6a7388',
                      marginTop: 2,
                    }}
                  >
                    {ch.title}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Editor */}
          <div>
            <div
              style={{
                background: 'var(--ink-card)',
                border: '1px solid var(--ink-border)',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
              }}
            >
              {/* Editor Header */}
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--ink-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#f0c674',
                    fontFamily: '"Noto Serif SC", serif',
                  }}
                >
                  第{activeChapter}章：{activeOutline?.title || '未命名'}
                </h2>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    border: '1px solid var(--ink-border)',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#8a93a8',
                    background: 'var(--ink-surface)',
                  }}
                >
                  {'\u270E'} {wordCount} 字
                </div>
              </div>

              {/* AI Toolbar */}
              <div
                style={{
                  padding: '12px 24px',
                  borderBottom: '1px solid var(--ink-border)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                {AI_TOOLS.map((tool) => {
                  const isActive = activeTool === tool.label;
                  const isRunning = isGenerating && genTool === tool.label;
                  const disabled = isGenerating;
                  return (
                  <button
                    key={tool.label}
                    disabled={disabled}
                    onClick={() => runTool(tool.label)}
                    onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.95)'; }}
                    onMouseUp={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(1.02)'; }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: `1px solid ${isActive ? tool.color : tool.color + '30'}`,
                      background: isActive ? tool.color + '22' : tool.bg,
                      color: tool.color,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: disabled ? 'wait' : 'pointer',
                      opacity: disabled ? 0.6 : 1,
                      transition: 'all 0.12s',
                      boxShadow: isActive ? `0 0 0 2px ${tool.color}40` : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (disabled) return;
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = `0 2px 8px ${tool.color}30`;
                    }}
                    onMouseLeave={(e) => {
                      if (disabled) return;
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = isActive ? `0 0 0 2px ${tool.color}40` : 'none';
                    }}
                  >
                    {isRunning
                      ? <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>◌</span>
                      : <span>{tool.icon}</span>}
                    <span>{isRunning ? '生成中…' : tool.label}</span>
                  </button>
                  );
                })}
                {genStatus && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: isGenerating ? '#f0c674' : '#6ec092' }}>{genStatus}</div>
                    <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--ink-border)', overflow: 'hidden' }}>
                      <div style={{ width: `${genProgress}%`, height: '100%', background: 'linear-gradient(90deg,#d4a657,#f0c674)', transition: 'width 0.1s linear' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Mode Bar */}
              <div
                style={{
                  padding: '10px 24px',
                  borderBottom: '1px solid var(--ink-border)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#6a7388' }}>{'\u2699'} 模式:</span>
                  <select style={selectStyle}>
                    <option>混合模式</option>
                    <option>纯AI</option>
                    <option>辅助模式</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#6a7388' }}>梗概</span>
                  <select style={selectStyle}>
                    <option>3章</option>
                    <option>5章</option>
                    <option>10章</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#6a7388' }}>全文</span>
                  <select style={selectStyle}>
                    <option>1章</option>
                    <option>3章</option>
                    <option>5章</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#6a7388' }}>衔接</span>
                  <select style={selectStyle}>
                    <option>500字</option>
                    <option>1000字</option>
                    <option>2000字</option>
                  </select>
                </div>
                <button style={ghostBtn}>设置作家</button>
                <button
                  style={{
                    ...ghostBtn,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    borderColor: saveToast ? '#6ec092' : 'var(--ink-border)',
                    color: saveToast ? '#6ec092' : '#8a93a8',
                  }}
                  onClick={() => {
                    updateChapter(activeChapter, { content: vars.content });
                    setSaveToast(`✓ 第${activeChapter}章已保存（${wordCount} 字）`);
                    setTimeout(() => setSaveToast(''), 1800);
                  }}
                >
                  {'\u270E'} {saveToast || '保存章节'}
                </button>
                <button
                  style={goldBtn}
                  onClick={() => setOutlineOpen((o) => !o)}
                >
                  {'\u2726'} 任务
                </button>
              </div>

              {/* Outline Input */}
              <div
                style={{
                  padding: '12px 24px',
                  borderBottom: '1px solid var(--ink-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#f0c674',
                    background: 'rgba(212,166,87,0.1)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  本章大纲
                </span>
                <span style={{ fontSize: 12, color: '#6a7388' }}>
                  {activeOutline ? '(AI 将基于此内容进行扩展)' : '(尚未生成，请到编排页生成)'}
                </span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => setOutlineOpen((o) => !o)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6a7388',
                    fontSize: 14,
                  }}
                >
                  {'\u25BC'}
                </button>
              </div>
              {outlineOpen && (
                <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {!activeOutline ? (
                    <div style={{ fontSize: 12, color: '#6a7388' }}>本章暂无大纲，请先在「编排生成」页点击「按幕批量生成大纲」。</div>
                  ) : (
                    ([
                      ['梗概', activeOutline.summary],
                      ['爽点类型', activeOutline.satisfaction_type],
                      ['对应节点', activeOutline.node_mapping],
                      ['章节钩子', activeOutline.chapter_hook],
                    ] as [string, string | undefined][]).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                        <div style={{ width: 64, flexShrink: 0, color: '#8a93a8' }}>{k}</div>
                        <div style={{ color: '#c8ccd6', whiteSpace: 'pre-wrap', flex: 1 }}>{v || '—'}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Main Editor */}
              <div style={{ padding: '24px' }}>
                <textarea
                  value={vars.content}
                  onChange={(e) => {
                    setVar('content', e.target.value);
                    setWordCount(e.target.value.replace(/\s/g, '').length);
                  }}
                  placeholder="在此处开始写作，或点击上方智能写作让 AI 帮你写..."
                  style={{
                    width: '100%',
                    minHeight: 'calc(100vh - 400px)',
                    padding: '16px',
                    border: '1px solid transparent',
                    borderRadius: 8,
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: '#e8e4d8',
                    background: 'transparent',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: '"Noto Serif SC", "Noto Sans SC", serif',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.background = 'var(--ink-surface)';
                    e.currentTarget.style.borderColor = 'var(--ink-border)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

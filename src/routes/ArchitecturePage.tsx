// ============================================
// 2. 架构搭建页面 — 世界观、角色、剧情
// ============================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNovelGenesisStore } from '@/lib/store/novelGenesis';
import { PhaseNav } from '@/components/PhaseNav';
import { useReveal } from '@/components/hooks';
import { usePromptModalStore } from '@/lib/store/promptModalStore';
import { useUIStore } from '@/lib/store/uiStore';
import { fillStep } from '@/lib/prompts/prompt-api';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { useParamsStore } from '@/lib/store/paramsStore';
import { useApiStore } from '@/lib/store/apiStore';
import { STEP_MODULE_MAP } from '@/lib/prompts/module-meta';
import { Character, CharacterAbility, CharacterStatus, RoleType } from '@/lib/types/character';
import { CharacterGrid } from '@/components/CharacterGrid';

interface SectionProps {
  number: number;
  title: string;
  children: React.ReactNode;
  isDone?: boolean;
}


function Section({ number, title, children, isDone = false }: SectionProps) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div
      className="reveal"
      style={{
        background: 'var(--ink-card)',
        border: '1px solid var(--ink-border)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          padding: '18px 24px',
          borderBottom: expanded ? '1px solid var(--ink-border)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(212,166,87,0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow='none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              background: isDone ? 'rgba(110,192,146,0.2)' : 'rgba(212,166,87,0.15)',
              color: isDone ? '#6ec092' : '#f0c674',
              border: isDone ? '1px solid rgba(110,192,146,0.3)' : '1px solid rgba(212,166,87,0.3)',
              flexShrink: 0,
              transition: 'all 0.3s',
            }}
          >
            {isDone ? '\u2713' : number}
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#e8e4d8',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            {title}
          </span>
        </div>
        <span
          style={{
            fontSize: 12,
            color: '#6a7388',
            transition: 'transform 0.3s',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          {'\u25B4'}
        </span>
      </div>
      {expanded && (
        <div style={{ padding: '20px 24px 24px' }}>{children}</div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  border: '1px solid var(--ink-border)',
  borderRadius: 10,
  fontSize: 13,
  lineHeight: 1.6,
  color: '#e8e4d8',
  background: 'var(--ink-surface)',
  resize: 'vertical',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: '"Noto Sans SC", sans-serif',
};

const focusHandler = (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'rgba(212,166,87,0.4)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,166,87,0.08)';
};
const blurHandler = (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'var(--ink-border)';
  e.currentTarget.style.boxShadow = 'none';
};

const smallBtnGold: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid rgba(212,166,87,0.3)',
  borderRadius: 6,
  background: 'rgba(212,166,87,0.1)',
  color: '#d4a657',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const ghostBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  border: '1px solid var(--ink-border)',
  borderRadius: 8,
  background: 'var(--ink-surface)',
  color: '#8a93a8',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const goldBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 18px',
  background: 'linear-gradient(135deg, #d4a657, #f0c674)',
  color: '#0a0e1a',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(212,166,87,0.25)',
  transition: 'all 0.2s',
};

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#8a93a8',
  width: 22,
  height: 22,
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

function TogglePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        border: '1px solid var(--ink-border)',
        borderRadius: 999,
        background: active ? 'rgba(212,166,87,0.12)' : 'var(--ink-surface)',
        color: active ? '#d4a657' : '#8a93a8',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 24,
          height: 12,
          borderRadius: 999,
          background: active ? '#d4a657' : '#3a4258',
          position: 'relative',
          transition: 'background 0.2s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: active ? 14 : 2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }}
        />
      </span>
      {label}
    </button>
  );
}

// 将 Step4 合并输出按分隔符拆分为三段，分别填入三个输入框
function parseWorldview(text: string): { world: string; geography: string; rules: string } {
  const clean = text.replace(/^```(?:json|markdown)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parts = clean.split(/---(world|geography|rules)---/i);
  const result = { world: '', geography: '', rules: '' };
  for (let i = 1; i < parts.length; i += 2) {
    const tag = parts[i].toLowerCase();
    const content = (parts[i + 1] ?? '').trim();
    if (tag === 'world') result.world = content;
    else if (tag === 'geography') result.geography = content;
    else if (tag === 'rules') result.rules = content;
  }
  // 兜底：模型未输出分隔符时，整体作为世界观
  if (!result.world && !result.geography && !result.rules) {
    result.world = clean;
  }
  return result;
}

// 通用流式生成：拼接后端 SSE 返回的最终文本（content）
// onDelta 用于实时展示：content 为正文增量，reasoning 为推理/思考增量（如 LongCat-2.0）
async function streamGenesis(
  stepId: number,
  variables: Record<string, unknown>,
  onDelta?: (d: { content?: string; reasoning?: string }) => void,
): Promise<string> {
  const filled = await fillStep(stepId, variables);
  const effective = useParamsStore.getState().getEffectiveParams();
  // 按步骤对应的模块，取用户在 API 设置里分配的 API 配置（让「分配模块」真正生效）
  const module = STEP_MODULE_MAP[stepId];
  const moduleCfg = module ? useApiStore.getState().getLlmConfigForModule(module) : undefined;
  const res = await fetchWithAuth('/api/genesis/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stepId,
      system: filled.system,
      user: filled.user,
      outputType: filled.outputType,
      llmConfig: moduleCfg || {},
      // 长生成步骤使用更保守的实际请求上限：step10=48k，step12=32k。
      // LongCat 网关实测 max_tokens>32k 会长时间无响应而超时，故压低；
      // 128k 仅作为系统/UI 上限（用户可在高级参数设，但后端会硬拦截到 32k）。
      params: {
        max_tokens:
          stepId === 10
            ? 49152
            : stepId === 12
              ? 32768
              : effective.max_tokens,
      },
    }),
  });
  if (!res.body) throw new Error('后端未返回流式响应');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
    const lines = raw.split('\n');
    raw = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') continue;
      try {
        const p = JSON.parse(json);
        if (p.error) {
          const e = p.error;
          throw new Error(typeof e === 'string' ? e : e?.msg || e?.message || JSON.stringify(e));
        }
        if (p.content) {
          buffer += p.content;
          onDelta?.({ content: p.content });
        }
        if (p.reasoning) onDelta?.({ reasoning: p.reasoning });
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  return buffer;
}

export default function ArchitecturePage() {
  useReveal();
  const openPromptModal = usePromptModalStore((s) => s.openModal);
  const { vars, setVar } = useNovelGenesisStore();
  const { showToast } = useUIStore();
  const [worldviewGenerating, setWorldviewGenerating] = useState(false);
  const [charactersGenerating, setCharactersGenerating] = useState(false);
  const [mainPlotGenerating, setMainPlotGenerating] = useState(false);
  const [detailedGenerating, setDetailedGenerating] = useState(false);
  // 详细大纲生成时的实时预览（content=正文，reasoning=推理思考过程）
  const [liveDetailed, setLiveDetailed] = useState<{ content: string; reasoning: string }>({ content: '', reasoning: '' });
  const [optimizing, setOptimizing] = useState<Record<string, boolean>>({});
  const [singleCharMode, setSingleCharMode] = useState(true);

  // 通用优化：把目标字段当前内容交给对应 step 优化，结果写回该字段
  const runOptimize = async (
    stepId: number,
    fieldKey: 'world' | 'geography' | 'rules' | 'characters' | 'mainPlot' | 'detailedPlot',
    build: (v: { [k: string]: unknown }) => Record<string, unknown>,
    label: string,
  ) => {
    if (optimizing[fieldKey]) return;
    const v = useNovelGenesisStore.getState().vars;
    const current = (v[fieldKey] as string) || '';
    if (!current.trim()) {
      showToast(`请先在「${label}」中填写或生成内容`);
      return;
    }
    setOptimizing((o) => ({ ...o, [fieldKey]: true }));
    try {
      const out = await streamGenesis(stepId, build(v as unknown as { [k: string]: unknown }));
      useNovelGenesisStore.getState().setVars({ [fieldKey]: out || current } as Partial<typeof v>);
      showToast(`「${label}」已优化 ✦`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '优化失败');
    } finally {
      setOptimizing((o) => ({ ...o, [fieldKey]: false }));
    }
  };

  const handleGenerateWorldview = async () => {
    if (worldviewGenerating) return;
    const v = useNovelGenesisStore.getState().vars;
    if (!v.idea.trim() && !v.world.trim() && !v.geography.trim() && !v.rules.trim()) {
      showToast('请先生成或填写核心灵感');
      return;
    }
    setWorldviewGenerating(true);
    useNovelGenesisStore.getState().setStepStatus(4, 'loading');
    let buffer = '';
    try {
      const filled = await fillStep(4, { idea: v.idea, tags: v.tags.join(', ') });
      const effective = useParamsStore.getState().getEffectiveParams();
      // 取「世界观」模块在 API 设置里分配的配置
      const moduleCfg = useApiStore.getState().getLlmConfigForModule('worldview');
      const res = await fetchWithAuth('/api/genesis/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: 4,
          system: filled.system,
          user: filled.user,
          llmConfig: moduleCfg || {},
          params: { max_tokens: effective.max_tokens },
        }),
      });
      if (!res.body) throw new Error('后端未返回流式响应');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const lines = raw.split('\n');
        raw = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') continue;
          try {
            const p = JSON.parse(json);
            if (p.error) throw new Error(p.error);
            if (p.content) buffer += p.content;
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
      const parsed = parseWorldview(buffer);
      useNovelGenesisStore.getState().setVars({
        world: parsed.world || v.world,
        geography: parsed.geography || v.geography,
        rules: parsed.rules || v.rules,
      });
      useNovelGenesisStore.getState().setStepStatus(4, 'success');
      showToast('世界观已生成并填入 ✦');
    } catch (e) {
      useNovelGenesisStore.getState().setStepStatus(4, 'error');
      showToast(e instanceof Error ? e.message : '生成失败');
    } finally {
      setWorldviewGenerating(false);
    }
  };

  // 强制单角色模式下，无论模型返回多少，只保留 1 个（优先主角）
  const applySingleChar = (text: string): string => {
    if (!singleCharMode) return text;
    const list = normalizeCharacters(text || '');
    if (list.length === 0) return text;
    const protagonist = list.find((c) => c.role === '主角') || list[0];
    return JSON.stringify([protagonist], null, 2);
  };

  const handleGenerateCharacters = async () => {
    if (charactersGenerating) return;
    const v = useNovelGenesisStore.getState().vars;
    if (!v.world.trim() && !v.idea.trim()) {
      showToast('请先生成世界观或灵感');
      return;
    }
    setCharactersGenerating(true);
    useNovelGenesisStore.getState().setStepStatus(8, 'loading');
    try {
      const out = await streamGenesis(8, {
        worldContext: v.world,
        geography: v.geography,
        rules: v.rules,
        tags: v.tags.join(', '),
        idea: v.idea,
        singleCharMode: singleCharMode ? '是' : '否',
        charCount: singleCharMode ? 1 : 6,
      });
      const finalOut = applySingleChar(out || '');
      useNovelGenesisStore.getState().setVars({ characters: finalOut || v.characters, coreCharacters: finalOut || v.coreCharacters });
      useNovelGenesisStore.getState().setStepStatus(8, 'success');
      showToast('核心角色已生成 ✦');
    } catch (e) {
      useNovelGenesisStore.getState().setStepStatus(8, 'error');
      showToast(e instanceof Error ? e.message : '生成失败');
    } finally {
      setCharactersGenerating(false);
    }
  };

  const handleGenerateMainPlot = async () => {
    if (mainPlotGenerating) return;
    const v = useNovelGenesisStore.getState().vars;
    if (!v.world.trim() && !v.characters.trim()) {
      showToast('请先生成世界观与核心角色');
      return;
    }
    setMainPlotGenerating(true);
    useNovelGenesisStore.getState().setStepStatus(10, 'loading');
    try {
      const out = await streamGenesis(10, {
        coreCharacters: v.characters,
        rules: v.rules,
        tags: v.tags.join(', '),
        world: v.world,
      });
      useNovelGenesisStore.getState().setVars({ mainPlot: out || v.mainPlot });
      useNovelGenesisStore.getState().setStepStatus(10, 'success');
      showToast('主线脉络已生成 ✦');
    } catch (e) {
      useNovelGenesisStore.getState().setStepStatus(10, 'error');
      showToast(e instanceof Error ? e.message : '生成失败');
    } finally {
      setMainPlotGenerating(false);
    }
  };

  const handleGenerateDetailedPlot = async () => {
    if (detailedGenerating) return;
    const v = useNovelGenesisStore.getState().vars;
    if (!v.mainPlot.trim()) {
      showToast('请先生成主线脉络');
      return;
    }
    setDetailedGenerating(true);
    setLiveDetailed({ content: '', reasoning: '' });
    useNovelGenesisStore.getState().setStepStatus(12, 'loading');
    try {
      const out = await streamGenesis(12, {
        characters: v.characters,
        geography: v.geography,
        mainPlot: v.mainPlot,
        rules: v.rules,
        tags: v.tags.join(', '),
        world: v.world,
      }, (d) => {
        setLiveDetailed((prev) => ({
          content: prev.content + (d.content || ''),
          reasoning: prev.reasoning + (d.reasoning || ''),
        }));
      });
      useNovelGenesisStore.getState().setVars({ detailedPlot: out || v.detailedPlot });
      useNovelGenesisStore.getState().setStepStatus(12, 'success');
      showToast('详细大纲已生成 ✦');
    } catch (e) {
      useNovelGenesisStore.getState().setStepStatus(12, 'error');
      showToast(e instanceof Error ? e.message : '生成失败');
    } finally {
      setDetailedGenerating(false);
      setLiveDetailed({ content: '', reasoning: '' });
    }
  };

  // 从模型输出中稳健提取 JSON：兼容 ```json 代码块、前后多余文本、对象包裹数组、
  // 以及流式输出被截断/末尾缺逗号缺括号等"残缺 JSON"情况，尽力恢复出角色数组。
  const extractJSON = (text: string): any => {
    if (!text || !text.trim()) return null;
    let t = text.trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();

    const tryParse = (s: string): any | null => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    };

    // 1) 直接整段解析
    let parsed = tryParse(t);
    if (parsed) return parsed;

    // 2) 截取最外层 [...] 或 {...} 再解析
    const arrM = t.match(/\[[\s\S]*\]/);
    if (arrM && (parsed = tryParse(arrM[0]))) return parsed;
    const objM = t.match(/\{[\s\S]*\}/);
    if (objM && (parsed = tryParse(objM[0]))) {
      const arrVal = Object.values(parsed as Record<string, unknown>).find((v) => Array.isArray(v));
      if (arrVal) return arrVal;
      return parsed;
    }

    // 3) 残缺 JSON 兜底：按顶层对象切分，逐个对象恢复
    //    匹配形如 { "key": ... } 的顶层对象起点（粗略排除字符串内的 {）
    const arrStart = t.indexOf('[');
    const body = arrStart >= 0 ? t.slice(arrStart + 1) : t;
    const recovered: any[] = [];
    const keyRegex = /\{\s*"[^"\\]+"\s*:/g;
    const starts: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = keyRegex.exec(body)) !== null) {
      const before = body.slice(0, m.index);
      // 未转义双引号为偶数 => 不在字符串内 => 视为顶层对象起点
      const q = (before.match(/(?<!\\)"/g) || []).length;
      if (q % 2 === 0) starts.push(m.index);
    }
    for (let i = 0; i < starts.length; i++) {
      const from = starts[i];
      const to = i + 1 < starts.length ? starts[i + 1] : body.length;
      let chunk = body.slice(from, to).replace(/,\s*$/, '').trim();
      // 去掉尾部可能粘连的 ] 或后续内容
      const closeBracket = chunk.lastIndexOf(']');
      if (closeBracket >= 0) chunk = chunk.slice(0, closeBracket).trim();
      if (!chunk.startsWith('{')) continue;
      // 尝试补全尾部缺失的引号/括号
      const tries = [chunk, chunk + '}', chunk + '"}', chunk + '"} }', chunk + '"} }'];
      let obj: any = null;
      for (const cand of tries) {
        obj = tryParse(cand);
        if (obj) break;
      }
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) recovered.push(obj);
    }
    if (recovered.length > 0) return recovered;

    return null;
  };

  // 根据名字 + 背景关键词推断角色类型（AI 常把所有角色 role 标成"主角"，这里做二次校正）
  const inferRole = (c: any, idx: number): string => {
    // 如果模型明确给了非"主角"的角色类型，尊重它
    if (c.role && c.role !== '主角' && c.role !== '核心角色') return c.role;
    const name = (c.name || c?.identity?.name || '').toString();
    const text = `${name} ${c.background || ''} ${c.surface || ''} ${c.actual || ''} ${
      Array.isArray(c.abilities) ? c.abilities.map((a: any) => a?.name || '').join(' ') : c.abilities || ''
    }`.toLowerCase();
    // 反派关键词（命中任何一个都算反派）
    if (/反派|凶手|杀手|魔头|恶人|暴君|幕后黑手|黑手|boss|敌人|对手|劲敌|仇人|诡王|诡异/.test(text)) return '反派';
    // 系统/金手指/精灵 → 工具人（只在名字明显含"系统/空间/精灵"时）
    if (/^(系统|金手指|面板|神器|空间|精灵|助手)/.test(name)) return '工具人';
    if (/系统精灵|系统面板|随身系统/.test(text)) return '工具人';
    // 师傅/师父类 → 配角
    if (/师父|师傅|恩师|前辈|高人|长老/.test(text)) return '配角';
    // 第一个角色默认主角
    if (idx === 0) return '主角';
    // 其余默认配角
    return '配角';
  };

  // 兜底提取角色名：模型有时会漏写 c.name 或放进 identity.name / 第一行
  const fallbackName = (c: any, idx: number): string => {
    const cand =
      c?.identity?.name ||
      c?.name ||
      c?.displayName ||
      c?.characterName ||
      c?.surface ||
      '';
    if (typeof cand === 'string' && cand.trim() && cand.length < 30) return cand.trim();
    // 从 surface/background 第一句里抽 【xx】或'xx' 或 "xx" 的人名
    const raw = `${c?.surface || ''}\n${c?.background || ''}`;
    const m =
      raw.match(/【([^】\n]{1,15})】/) ||
      raw.match(/"([^"\n]{1,15})"/) ||
      raw.match(/「([^」\n]{1,15})」/);
    if (m) return m[1].trim();
    return `角色#${idx + 1}`;
  };

  const normalizeCharacters = (text: string): Character[] => {
    const data = extractJSON(text);
    if (!data) return [];
    const arr = Array.isArray(data) ? data : [data];
    return arr.map((c: any, idx: number): Character => {
      // 新 schema 优先：surfaceIdentity / trueIdentity / innerConflict
      // 兼容旧 schema：identity.surface、扁平 surface、或 background 字符串
      const id = typeof c?.identity === 'object' && c.identity ? c.identity : ({} as any);
      let surface = c.surfaceIdentity || id.surface || c.surface || '';
      let actual = c.trueIdentity || id.actual || c.actual || '';
      let conflict = c.innerConflict || c.inner_conflict || c.tension || '';

      // 旧数据兜底：从 background 字符串里抽 表面/真实/冲突
      const bg = c.background || c.backgroundText || '';
      if ((!surface || !actual || !conflict) && bg) {
        const ms = bg.match(/表面[:：]\s*([^\n]+)/);
        const mt = bg.match(/真实[:：]\s*([^\n]+)/);
        const mc = bg.match(/内在冲突[:：]\s*([^\n]+)/);
        if (!surface && ms) surface = ms[1].trim();
        if (!actual && mt) actual = mt[1].trim();
        if (!conflict && mc) conflict = mc[1].trim();
      }

      const role = inferRole(c, idx) as RoleType;

      // 能力：新 schema 数组 / 旧 schema 字符串
      let abilities: CharacterAbility[] = [];
      if (Array.isArray(c.abilities)) {
        abilities = c.abilities.map((a: any) => {
          if (typeof a === 'string') return { name: a, desc: '', type: '' };
          return {
            name: a?.name || '',
            desc: a?.desc || a?.description || a?.source || '',
            type: (['主动', '被动', '限制'].includes(a?.type) ? a.type : '') as CharacterAbility['type'],
          };
        });
      } else if (typeof c.abilities === 'string' && c.abilities.trim()) {
        abilities = c.abilities
          .split(/[、,，]/)
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((n: string) => ({ name: n, desc: '', type: '' as const }));
      }

      // 状态：新 schema 对象 / 旧 schema 字符串
      const sRaw = c.status;
      const status: CharacterStatus =
        typeof sRaw === 'string'
          ? { mood: sRaw, health: '', location: '' }
          : {
              mood: sRaw?.mood || '',
              health: sRaw?.health || sRaw?.healthStatus || '',
              location: sRaw?.location || '',
            };

      const plotFunction = c.plot_function || c.plotFunction || '';

      return {
        role,
        name: fallbackName(c, idx),
        surfaceIdentity: surface,
        trueIdentity: actual,
        innerConflict: conflict,
        abilities,
        status,
        plotFunction,
      };
    });
  };

  const chars = normalizeCharacters(vars.characters || '');

  const writeChars = (list: Character[]) => {
    const text = JSON.stringify(list, null, 2);
    useNovelGenesisStore.getState().setVars({ characters: text, coreCharacters: text });
  };
  const updateChar = (idx: number, patch: Partial<Character>) =>
    writeChars(chars.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const deleteChar = (idx: number) => writeChars(chars.filter((_, i) => i !== idx));
  const addChar = () =>
    writeChars([
      ...chars,
      {
        role: '配角',
        name: '',
        surfaceIdentity: '',
        trueIdentity: '',
        innerConflict: '',
        abilities: [],
        status: { mood: '', health: '', location: '' },
        plotFunction: '',
      },
    ]);

  return (
    <div style={{ background: 'var(--ink-deep)', minHeight: '100vh', paddingTop: 64 }}>
      <PhaseNav currentPhase={2} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
          className="reveal"
        >
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#f0c674',
              fontFamily: '"Noto Serif SC", serif',
            }}
          >
            2. 架构搭建
          </h1>
          <Link to="/arrangement" style={{ textDecoration: 'none' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #d4a657, #f0c674)',
                color: '#0a0e1a',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(212,166,87,0.3)',
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(212,166,87,0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,166,87,0.3)';
              }}
            >
              <span>下一步: 编排与生成</span>
              <span>{'\u203A'}</span>
            </button>
          </Link>
        </div>

        {/* Section 1: 世界观设定 */}
        <Section number={1} title="世界观设定">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
            }}
          >
            {[
              {
                key: 'world' as const,
                label: '时代背景',
                stepId: 5,
                stepKey: 'step5',
                build: (v: { [k: string]: unknown }) => ({ currentContent: v.world, tags: (v.tags as string[]).join(', ') }),
              },
              {
                key: 'geography' as const,
                label: '地理环境 + 势力分布',
                stepId: 6,
                stepKey: 'step6',
                build: (v: { [k: string]: unknown }) => ({ currentContent: v.geography, geography: v.geography, idea: v.idea, tags: (v.tags as string[]).join(', '), world: v.world }),
              },
              {
                key: 'rules' as const,
                label: '核心法则 / 金手指',
                stepId: 7,
                stepKey: 'step7',
                build: (v: { [k: string]: unknown }) => ({ currentContent: v.rules, geography: v.geography, idea: v.idea, tags: (v.tags as string[]).join(', '), world: v.world }),
              },
            ].map((field) => (
              <div key={field.key}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#8a93a8',
                    marginBottom: 8,
                  }}
                >
                  {field.label}
                </label>
                <textarea
                  value={vars[field.key]}
                  onChange={(e) => setVar(field.key, e.target.value)}
                  placeholder="输入内容..."
                  rows={6}
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <span
                    onClick={() => openPromptModal(field.stepKey)}
                    style={{
                      fontSize: 11,
                      color: '#6a7388',
                      cursor: 'pointer',
                      textDecoration: 'underline dotted',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {'\u2699'} 配置优化提示词
                  </span>
                  <button
                    style={smallBtnGold}
                    disabled={optimizing[field.key]}
                    onClick={() => runOptimize(field.stepId, field.key, field.build, field.label)}
                  >
                    {optimizing[field.key] ? '\u23F3' : '\u2726'} 优化
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 10 }}>
                <button onClick={() => openPromptModal('step4')} style={ghostBtn}>{'\u2699'} 提示词</button>
                <button
                  onClick={handleGenerateWorldview}
              disabled={worldviewGenerating}
              style={{
                ...goldBtn,
                opacity: worldviewGenerating ? 0.7 : 1,
                cursor: worldviewGenerating ? 'not-allowed' : 'pointer',
                background: worldviewGenerating ? '#2a3650' : goldBtn.background,
                color: worldviewGenerating ? '#6a7388' : goldBtn.color,
                boxShadow: worldviewGenerating ? 'none' : (goldBtn.boxShadow as string),
              }}
            >
              <span>{worldviewGenerating ? '\u23F3' : '\u2726'}</span> 一键生成世界观
            </button>
          </div>
        </Section>

        {/* Section 2: 人物小传 */}
        <Section number={2} title="人物小传">
          {/* 顶部工具条：强制单角色 / 数字 / +生成配角 / 提示词 / 生成核心角色 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            <TogglePill
              active={singleCharMode}
              onClick={() => setSingleCharMode((v) => !v)}
              label="强制单角色"
            />
            <button
              onClick={() => addChar()}
              style={ghostBtn}
            >
              + 生成配角
            </button>
            <button onClick={() => openPromptModal('step8')} style={ghostBtn}>
              {'\u2699'} 提示词
            </button>
            <button
              onClick={handleGenerateCharacters}
              disabled={charactersGenerating}
              style={{
                ...goldBtn,
                opacity: charactersGenerating ? 0.7 : 1,
                cursor: charactersGenerating ? 'not-allowed' : 'pointer',
                background: charactersGenerating ? '#2a3650' : (goldBtn.background as string),
                color: charactersGenerating ? '#6a7388' : (goldBtn.color as string),
                boxShadow: charactersGenerating ? 'none' : (goldBtn.boxShadow as string),
              }}
            >
              <span>{charactersGenerating ? '\u23F3' : '\u2726'}</span> 生成核心角色
            </button>
          </div>

          <CharacterGrid
            characters={chars}
            onUpdate={updateChar}
            onDelete={deleteChar}
            onAdd={addChar}
          />
        </Section>

        {/* Section 3: 剧情架构 */}
        <Section number={3} title="剧情架构">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: '#8a93a8' }}>
                  主线核心脉络
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => openPromptModal('step10')}
                    style={{
                      ...ghostBtn,
                      padding: '4px 10px',
                      fontSize: 12,
                    }}
                  >
                    {'\u2699'} 提示词
                  </button>
                  <button
                    onClick={handleGenerateMainPlot}
                    disabled={mainPlotGenerating}
                    style={{
                      ...goldBtn,
                      padding: '4px 12px',
                      fontSize: 12,
                      opacity: mainPlotGenerating ? 0.7 : 1,
                      cursor: mainPlotGenerating ? 'not-allowed' : 'pointer',
                      background: mainPlotGenerating ? '#2a3650' : goldBtn.background,
                      color: mainPlotGenerating ? '#6a7388' : goldBtn.color,
                      boxShadow: mainPlotGenerating ? 'none' : '0 4px 16px rgba(212,166,87,0.25)',
                    }}
                  >
                    {mainPlotGenerating ? '\u23F3' : '\u2726'} 生成脉络
                  </button>
                </div>
              </div>
              <textarea
                value={vars.mainPlot}
                onChange={(e) => setVar('mainPlot', e.target.value)}
                placeholder="在此输入主线核心脉络..."
                rows={10}
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: '#8a93a8' }}>
                  详细架构 (爽点/伏笔/转折)
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => openPromptModal('step12')}
                    style={{
                      ...ghostBtn,
                      padding: '4px 10px',
                      fontSize: 12,
                    }}
                  >
                    {'\u2699'} 提示词
                  </button>
                  <button
                    onClick={handleGenerateDetailedPlot}
                    disabled={detailedGenerating}
                    style={{
                      ...goldBtn,
                      padding: '4px 12px',
                      fontSize: 12,
                      opacity: detailedGenerating ? 0.7 : 1,
                      cursor: detailedGenerating ? 'not-allowed' : 'pointer',
                      background: detailedGenerating ? '#2a3650' : goldBtn.background,
                      color: detailedGenerating ? '#6a7388' : goldBtn.color,
                    }}
                  >
                    {detailedGenerating ? '\u23F3' : '\u2726'} 生成详细大纲
                  </button>
                </div>
              </div>
              {detailedGenerating && (
                <div
                  style={{
                    border: '1px solid #2a3650',
                    borderRadius: 8,
                    background: '#0f1626',
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#e0b84c', marginBottom: 6 }}>
                    ⏳ 正在生成（实时预览，完成后写入下方文本框）… 已接收 {liveDetailed.content.length + liveDetailed.reasoning.length} 字符
                  </div>
                  {liveDetailed.reasoning && (
                    <pre
                      style={{
                        margin: '0 0 8px',
                        maxHeight: 120,
                        overflow: 'auto',
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: '#6a7388',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        borderLeft: '2px solid #2a3650',
                        paddingLeft: 8,
                      }}
                    >
                      {liveDetailed.reasoning}
                    </pre>
                  )}
                  <pre
                    style={{
                      margin: 0,
                      maxHeight: 240,
                      overflow: 'auto',
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: '#cdd5e5',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {liveDetailed.content || (liveDetailed.reasoning ? '（正文尚未开始，模型思考中…）' : '（已连接模型，等待首字节…）')}
                  </pre>
                </div>
              )}
              <textarea
                value={vars.detailedPlot}
                onChange={(e) => setVar('detailedPlot', e.target.value)}
                placeholder="在此输入详细架构..."
                rows={10}
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, gap: 16 }}>
            <span style={{ fontSize: 11, color: '#6a7388', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span onClick={() => openPromptModal('step11')} style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}>{'⚙'} 配置优化提示词</span>
              <button
                style={{ ...smallBtnGold, marginLeft: 8 }}
                disabled={optimizing['mainPlot']}
                onClick={() =>
                  runOptimize(
                    11,
                    'mainPlot',
                    (v) => ({ currentContent: v.mainPlot, characters: v.characters, rules: v.rules, tags: (v.tags as string[]).join(', '), world: v.world }),
                    '主线脉络',
                  )
                }
              >
                {optimizing['mainPlot'] ? '\u23F3' : '\u2726'} 优化脉络
              </button>
            </span>
            <span style={{ fontSize: 11, color: '#6a7388', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span onClick={() => openPromptModal('step13')} style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}>{'⚙'} 配置优化提示词</span>
              <button
                style={{ ...smallBtnGold, marginLeft: 8 }}
                disabled={optimizing['detailedPlot']}
                onClick={() =>
                  runOptimize(
                    13,
                    'detailedPlot',
                    (v) => ({ currentContent: v.detailedPlot, characters: v.characters, idea: v.idea, mainPlot: v.mainPlot, rules: v.rules, tags: (v.tags as string[]).join(', '), world: v.world }),
                    '详细大纲',
                  )
                }
              >
                {optimizing['detailedPlot'] ? '\u23F3' : '\u2726'} 优化大纲
              </button>
            </span>
          </div>
        </Section>

        {/* Section 4: 剧情节点拆解 */}
        <Section number={4} title="剧情节点拆解">
          <p style={{ fontSize: 13, color: '#8a93a8', marginBottom: 16 }}>
            将详细大纲拆解为一个个具体的里程碑事件，作为章节生成的路标。
          </p>
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            {[
              { icon: '\u2726', label: '智能提炼', active: true },
              { icon: '\u2699', label: '提示词', stepKey: 'step12' },
              { icon: '\u2699', label: '提示词', stepKey: 'step12' },
              { icon: '\u25CB', label: '无限推演' },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.stepKey ? () => openPromptModal(btn.stepKey as string) : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: btn.active
                    ? 'none'
                    : '1px solid var(--ink-border)',
                  background: btn.active
                    ? 'linear-gradient(135deg, #d4a657, #f0c674)'
                    : 'var(--ink-surface)',
                  color: btn.active ? '#0a0e1a' : '#8a93a8',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: btn.active
                    ? '0 4px 16px rgba(212,166,87,0.25)'
                    : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <span>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              style={{
                ...ghostBtn,
                padding: '6px 12px',
                fontSize: 12,
              }}
            >
              {'\u2699'} 逻辑审查
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="输入新节点后按回车..."
              style={{
                ...inputStyle,
                flex: 1,
                resize: 'none' as const,
              }}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
            <button style={ghostBtn}>添加</button>
          </div>
        </Section>
      </div>
    </div>
  );
}

// ============================================
// 1. 灵感页面 — 核心灵感与标签选择
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
import { useApiStore } from '@/lib/store/apiStore';
import { saveStepOutput } from '@/lib/db/stepOutputs';

const TAGS = [
  '男频','女频','穿越','重生','系统',
  '无限流','修仙','高武','末世','赛博朋克',
  '克苏鲁','宫斗','甜宠','大女主','无敌流',
  '迪化流','规则怪谈','穿书','种田',
  '悬疑刑侦','惊悚','星际','西幻','洪荒',
  '娱乐明星','诡秘','凡人流','稳健流',
  '脑洞流','反套路','爽文','虐文','燃文',
  '都市修仙','灵气复苏','御兽流','卡牌流',
  '签到流','重生逆袭','年代文','虐恋',
  '追妻火葬场','破镜重圆','替身','白月光',
  '青梅竹马','豪门世家','先婚后爱','暗恋',
  '职场','商战','校园','军旅','历史',
  '科幻','玄幻','武侠','仙侠','奇幻',
  '现代言情','古代言情','耽美','百合',
  '盗墓','探险','末日','丧尸','机甲',
  '游戏','电竞','直播','美食','基建',
];

const wordInputStyle = {
  flex: 1,
  minWidth: 200,
  padding: '10px 12px',
  border: '1px solid var(--ink-border)',
  borderRadius: 8,
  fontSize: 13,
  lineHeight: 1.5,
  color: '#e8e4d8',
  background: 'var(--ink-surface)',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: '"Noto Sans SC", sans-serif',
};

export default function InspirationPage() {
  useReveal();
  const openPromptModal = usePromptModalStore((s) => s.openModal);
  const showToast = useUIStore((s) => s.showToast);
  const { vars, setVar } = useNovelGenesisStore();
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(vars.tags));
  const [generating, setGenerating] = useState(false);

  const toggleTag = (tag: string) => {
    const next = new Set(selectedTags);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    setSelectedTags(next);
    setVar('tags', Array.from(next));
  };

  // 流式生成：结果实时写入输入框（vars.idea），便于直接编辑
  const runStream = async (stepId: number, variables: Record<string, unknown>) => {
    setGenerating(true);
    setVar('idea', '');
    let buffer = '';
    try {
      const filled = await fillStep(stepId, variables);
      // 取「灵感搅拌」模块在 API 设置里分配的配置
      const moduleCfg = useApiStore.getState().getLlmConfigForModule('inspiration');
      const res = await fetchWithAuth('/api/genesis/stream', {
        method: 'POST',
        body: JSON.stringify({
          stepId,
          system: filled.system,
          user: filled.user,
          llmConfig: moduleCfg || {},
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
            const parsed = JSON.parse(json);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              buffer += parsed.content;
              setVar('idea', buffer);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      await saveStepOutput('novel-genesis', stepId, { type: 'stream', content: buffer, updatedAt: Date.now() });
      showToast(stepId === 3 ? '已优化 ✦' : '灵感已生成 ✦');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleInspirationBlend = async () => {
    if (!vars.idea.trim() && selectedTags.size === 0) {
      showToast('请至少选择一个标签或输入灵感');
      return;
    }
    await runStream(1, { idea: vars.idea, tags: Array.from(selectedTags).join(', ') });
  };

  const handleOptimizeIdea = async () => {
    if (!vars.idea.trim()) {
      showToast('请先输入或生成创意');
      return;
    }
    await runStream(3, { idea: vars.idea, tags: Array.from(selectedTags).join(', ') });
  };

  return (
    <div style={{ background: 'var(--ink-deep)', minHeight: '100vh', paddingTop: 64 }}>
      <PhaseNav currentPhase={1} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Page Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }} className="reveal">
          <h1 style={{ fontSize:26, fontWeight:700, color:'#f0c674', fontFamily:'"Noto Serif SC", serif' }}>
            1. 核心灵感
          </h1>
          <Link to="/architecture" style={{ textDecoration:'none' }}>
            <button style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'12px 24px',
              background:'linear-gradient(135deg, #d4a657, #f0c674)',
              color:'#0a0e1a', border:'none', borderRadius:10,
              fontSize:14, fontWeight:700, cursor:'pointer',
              boxShadow:'0 4px 20px rgba(212,166,87,0.3)',
              transition:'all 0.3s cubic-bezier(0.22,1,0.36,1)',
            }}
              onMouseEnter={e=>{ e.currentTarget.style.transform='translateX(4px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(212,166,87,0.45)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform='translateX(0)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(212,166,87,0.3)'; }}
            >
              <span>下一步: 架构搭建</span>
              <span>{'\u203A'}</span>
            </button>
          </Link>
        </div>

        {/* Info Banner */}
        <div className="reveal" style={{
          background:'rgba(212,166,87,0.08)', border:'1px solid rgba(212,166,87,0.2)',
          borderRadius:12, padding:'14px 20px', marginBottom:24,
          display:'flex', alignItems:'center', gap:12,
        }}>
          <span style={{
            width:22, height:22, borderRadius:'50%', background:'rgba(212,166,87,0.2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, color:'#f0c674', flexShrink:0,
          }}>{'\u2139'}</span>
          <span style={{ fontSize:14, color:'#d4a657', fontWeight:500 }}>
            无灵感时，可选标签生成 AI 灵感；有灵感时，可直接输入一句灵感，再开始 AI 搅拌。
          </span>
        </div>

        {/* Two Column Layout */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:24, alignItems:'start' }}>
          {/* Left: 创意生成器 */}
          <div className="reveal" style={{
            background:'var(--ink-card)', border:'1px solid var(--ink-border)',
            borderRadius:16, overflow:'hidden',
            boxShadow:'0 4px 24px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              padding:'20px 24px', borderBottom:'1px solid var(--ink-border)',
              display:'flex', alignItems:'center', justifyContent:'space-between',
            }}>
              <h2 style={{ fontSize:17, fontWeight:700, color:'#e8e4d8' }}>
                创意生成器
              </h2>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => openPromptModal('step1')} style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'7px 14px', border:'1px solid var(--ink-border)',
                  borderRadius:8, background:'var(--ink-surface)',
                  color:'#8a93a8', fontSize:13, fontWeight:500,
                  cursor:'pointer', transition:'all 0.2s',
                }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(212,166,87,0.3)'; e.currentTarget.style.color='#d4a657'; e.currentTarget.style.boxShadow='0 0 16px rgba(212,166,87,0.1)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--ink-border)'; e.currentTarget.style.color='#8a93a8'; e.currentTarget.style.boxShadow='none'; }}
                >
                  <span>{'\u2699'}</span><span>提示词</span>
                </button>
                <button
                  onClick={handleInspirationBlend}
                  disabled={generating}
                  style={{
                    display:'flex', alignItems:'center', gap:6,
                    padding:'7px 16px', background: generating ? '#2a3650' : 'linear-gradient(135deg, #d4a657, #f0c674)',
                    color: generating ? '#6a7388' : '#0a0e1a', border:'none', borderRadius:8,
                    fontSize:13, fontWeight:700, cursor: generating ? 'not-allowed' : 'pointer',
                    boxShadow: generating ? 'none' : '0 4px 16px rgba(212,166,87,0.25)',
                    transition:'all 0.2s',
                    opacity: generating ? 0.7 : 1,
                  }}
                  onMouseEnter={e=>{ if (!generating) { e.currentTarget.style.transform='scale(1.03)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(212,166,87,0.4)'; } }}
                  onMouseLeave={e=>{ e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='none'; }}
                >
                  <span>{generating ? '\u23F3' : '\u2726'}</span><span>AI 灵感搅拌</span>
                </button>
              </div>
            </div>

            <div style={{ padding:'20px 24px 0' }}>
              <label style={{
                display:'block', fontSize:13, fontWeight:600,
                color:'#8a93a8', marginBottom:10,
              }}>
                作品规划（字数控制 · 作用于全部生成模块）
              </label>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <input
                  value={vars.totalWordTarget}
                  onChange={e=>setVar('totalWordTarget', e.target.value)}
                  placeholder="想写多长？例：300万（全书总字数）"
                  style={wordInputStyle}
                  onFocus={e=>{ e.currentTarget.style.borderColor='rgba(212,166,87,0.4)'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(212,166,87,0.08)'; }}
                  onBlur={e=>{ e.currentTarget.style.borderColor='var(--ink-border)'; e.currentTarget.style.boxShadow='none'; }}
                />
                <input
                  value={vars.singleVolumeWord}
                  onChange={e=>setVar('singleVolumeWord', e.target.value)}
                  placeholder="每卷多长？例：25万（单卷字数）"
                  style={wordInputStyle}
                  onFocus={e=>{ e.currentTarget.style.borderColor='rgba(212,166,87,0.4)'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(212,166,87,0.08)'; }}
                  onBlur={e=>{ e.currentTarget.style.borderColor='var(--ink-border)'; e.currentTarget.style.boxShadow='none'; }}
                />
              </div>
            </div>

            <div style={{ padding:'24px' }}>
              <label style={{
                display:'block', fontSize:13, fontWeight:600,
                color:'#8a93a8', marginBottom:10,
              }}>
                输入核心梗 / 脑洞
              </label>
              <textarea
                value={vars.idea}
                onChange={e=>setVar('idea', e.target.value)}
                placeholder="在这里输入你的创意核心..."
                style={{
                  width:'100%', minHeight:380, padding:'16px',
                  border:'1px solid var(--ink-border)', borderRadius:12,
                  fontSize:14, lineHeight:1.7, color:'#e8e4d8',
                  background:'var(--ink-surface)', resize:'vertical',
                  outline:'none', transition:'border-color 0.2s, box-shadow 0.2s',
                  fontFamily:'"Noto Sans SC", sans-serif',
                }}
                onFocus={e=>{ e.currentTarget.style.borderColor='rgba(212,166,87,0.4)'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(212,166,87,0.08)'; }}
                onBlur={e=>{ e.currentTarget.style.borderColor='var(--ink-border)'; e.currentTarget.style.boxShadow='none'; }}
              />
            </div>

            <div style={{
              padding:'16px 24px 20px', display:'flex', justifyContent:'flex-end', gap:10,
            }}>
              <button onClick={() => openPromptModal('step3')} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'8px 16px', border:'1px solid var(--ink-border)',
                borderRadius:8, background:'var(--ink-surface)',
                color:'#8a93a8', fontSize:13, fontWeight:500, cursor:'pointer',
                transition:'all 0.2s',
              }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(212,166,87,0.3)'; e.currentTarget.style.color='#d4a657'; e.currentTarget.style.boxShadow='0 0 16px rgba(212,166,87,0.1)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--ink-border)'; e.currentTarget.style.color='#8a93a8'; e.currentTarget.style.boxShadow='none'; }}
              >
                <span>{'\u2699'}</span><span>提示词</span>
              </button>
              <button
                onClick={handleOptimizeIdea}
                disabled={generating || !vars.idea.trim()}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'8px 18px', background: generating ? '#2a3650' : 'linear-gradient(135deg, #d4a657, #f0c674)',
                  color: generating ? '#6a7388' : '#0a0e1a', border:'none', borderRadius:8,
                  fontSize:13, fontWeight:700, cursor: (generating || !vars.idea.trim()) ? 'not-allowed' : 'pointer',
                  boxShadow: generating ? 'none' : '0 4px 16px rgba(212,166,87,0.25)',
                  transition:'all 0.2s',
                  opacity: (generating || !vars.idea.trim()) ? 0.7 : 1,
                }}
                onMouseEnter={e=>{ if (!generating && vars.idea.trim()) { e.currentTarget.style.transform='scale(1.03)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(212,166,87,0.4)'; } }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='none'; }}
              >
                <span>{generating ? '\u23F3' : '\u2726'}</span><span>AI 优化该创意</span>
              </button>
            </div>
          </div>

          {/* Right: 标签选择 */}
          <div className="reveal" style={{
            background:'var(--ink-card)', border:'1px solid var(--ink-border)',
            borderRadius:16, overflow:'hidden',
            boxShadow:'0 4px 24px rgba(0,0,0,0.3)',
            position:'sticky', top:72,
          }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--ink-border)' }}>
              <h2 style={{ fontSize:17, fontWeight:700, color:'#e8e4d8' }}>
                标签选择 <span style={{ fontWeight:400, color:'#6a7388' }}>(不限数量)</span>
              </h2>
            </div>
            <div style={{
              padding:'20px 24px', display:'flex', flexWrap:'wrap', gap:8,
              maxHeight:'calc(100vh - 200px)', overflowY:'auto',
            }}>
              {TAGS.map(tag=>{
                const active = selectedTags.has(tag);
                return (
                  <button key={tag} onClick={()=>toggleTag(tag)} style={{
                    padding:'6px 14px', borderRadius:20,
                    border: active ? '1px solid rgba(212,166,87,0.5)' : '1px solid var(--ink-border)',
                    background: active ? 'rgba(212,166,87,0.15)' : 'var(--ink-surface)',
                    color: active ? '#f0c674' : '#8a93a8',
                    fontSize:13, fontWeight:500, cursor:'pointer',
                    transition:'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                    userSelect:'none',
                  }}
                    onMouseEnter={e=>{
                      if (!active) {
                        e.currentTarget.style.borderColor='rgba(212,166,87,0.3)';
                        e.currentTarget.style.color='#d4a657'; e.currentTarget.style.boxShadow='0 0 20px rgba(212,166,87,0.2)';
                      }
                    }}
                    onMouseLeave={e=>{
                      if (!active) {
                        e.currentTarget.style.borderColor='var(--ink-border)';
                        e.currentTarget.style.color='#8a93a8'; e.currentTarget.style.boxShadow='none';
                      }
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
              <button style={{
                padding:'6px 14px', borderRadius:20,
                border:'1px dashed var(--ink-border-bright)',
                background:'var(--ink-surface)', color:'#6a7388',
                fontSize:13, cursor:'pointer', transition:'all 0.2s',
              }}>
                + 自定义标签
              </button>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}

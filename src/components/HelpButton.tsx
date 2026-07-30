import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useProjectStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';

const STEP_MAP: Record<string, string> = {
  '/': '首页 / 概览',
  '/step1': 'Step 1 \u00b7 灵感',
  '/step2': 'Step 2 \u00b7 架构',
  '/step3': 'Step 3 \u00b7 编排',
  '/step4': 'Step 4 \u00b7 写作',
  '/settings': 'API 设置',
};

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const location = useLocation();

  const {
    bookTitle, idea, tags, characters, chapterOutlines,
    worldview, mainPlot, currentChapter, continuity,
  } = useProjectStore(useShallow((s) => ({
    bookTitle: s.bookTitle, idea: s.idea, tags: s.tags,
    characters: s.characters, chapterOutlines: s.chapterOutlines,
    worldview: s.worldview, mainPlot: s.mainPlot,
    currentChapter: s.currentChapter, continuity: s.continuity,
  })));

  const currentModule = STEP_MAP[location.pathname] || '未知页面';

  const totalWords = useMemo(
    () => chapterOutlines.reduce((a, c) => a + (c.content?.length || 0), 0),
    [chapterOutlines],
  );

  const tagText = useMemo(() => [
    tags.style.length ? `\u6587\u98ce:${tags.style.join('/')}` : '',
    tags.hit.length ? `\u723d\u70b9:${tags.hit.join('/')}` : '',
    tags.ban.length ? `\u7981\u5fcc:${tags.ban.join('/')}` : '',
    tags.open ? `\u5f00\u7bc7:${tags.open}` : '',
    tags.entry ? `\u4e3b\u89d2\u51fa\u573a:${tags.entry}` : '',
    tags.custom.length ? `\u81ea\u5b9a\u4e49:${tags.custom.join('/')}` : '',
  ].filter(Boolean).join(' \u00b7 ') || '\u65e0', [tags]);

  let currentContent = '';
  if (location.pathname === '/step1') {
    currentContent = `\u3010\u521b\u610f\u3011\n${idea.slice(0, 500) || '\uff08\u7a7a\uff09'}\n\n\u3010\u6807\u7b7e\u3011${tagText}`;
  } else if (location.pathname === '/step2') {
    currentContent = `\u3010\u4e16\u754c\u89c2\u3011${worldview ? worldview.background.era.slice(0, 200) + '...' : '\uff08\u672a\u751f\u6210\uff09'}\n\n\u3010\u89d2\u8272\u6570\u3011${characters.length}`;
  } else if (location.pathname === '/step3') {
    const mp = mainPlot
      ? `\u6838\u5fc3\u51b2\u7a81:${mainPlot.coreConflict.slice(0, 200)}\n\u91cc\u7a0b\u7891\u6570:${mainPlot.milestones.length}`
      : '\uff08\u672a\u751f\u6210\uff09';
    const chTitles = chapterOutlines.map((c) => `\u7b2c${c.n}\u7ae0 ${c.title}`).join('\u3001');
    currentContent = `\u3010\u4e3b\u7ebf\u8109\u7edc\u3011${mp}\n\n\u3010\u7ae0\u8282\u5927\u7eb2\u3011${chTitles || '\uff08\u7a7a\uff09'}`;
  } else if (location.pathname === '/step4') {
    const ch = chapterOutlines.find((c) => c.n === currentChapter) || chapterOutlines[0];
    currentContent = ch
      ? `\u3010\u5f53\u524d\u7ae0\u8282\u3011\u7b2c${ch.n}\u7ae0 ${ch.title}\n\u5b57\u6570:${ch.content?.length || 0}\n\u6b63\u6587\u524d500\u5b57:\n${ch.content?.slice(0, 500) || '\uff08\u7a7a\uff09'}`
      : '\uff08\u6682\u65e0\u7ae0\u8282\uff09';
  } else if (location.pathname === '/settings') {
    currentContent = '\uff08API \u8bbe\u7f6e\u9875\uff0c\u65e0\u7f16\u8f91\u5185\u5bb9\uff09';
  } else {
    currentContent = '\uff08\u9996\u9875\u6982\u89c8\uff09';
  }

  const ctx = {
    '\u4e66\u540d': bookTitle || '\u672a\u547d\u540d',
    '\u5f53\u524d\u9875\u9762': currentModule,
    '\u521b\u610f': idea ? '\u5df2\u586b\u5199' : '\u7a7a',
    '\u6807\u7b7e': tagText,
    '\u89d2\u8272\u6570': characters.length,
    '\u7ae0\u8282\u6570': chapterOutlines.length,
    '\u603b\u5b57\u6570': totalWords,
    '\u4e16\u754c\u89c2': worldview ? '\u5df2\u751f\u6210' : '\u672a\u751f\u6210',
    '\u4e3b\u7ebf\u8109\u7edc': mainPlot ? '\u5df2\u751f\u6210' : '\u672a\u751f\u6210',
    '\u8fde\u7eed\u6458\u8981\u6bb5\u6570': continuity.length,
  };

  const fullText = `\u3010\u58a8\u6587\u5199\u4f5c \u00b7 \u6c42\u52a9\u4e0a\u4e0b\u6587\u3011
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${Object.entries(ctx).map(([k, v]) => `${k}\uff1a${v}`).join('\n')}

\u3010\u5f53\u524d\u9875\u9762\u5185\u5bb9\u3011
${currentContent}

\u3010\u6211\u7684\u95ee\u9898\u3011
${question || '\uff08\u8bf7\u63cf\u8ff0\u4f60\u9047\u5230\u7684\u95ee\u9898\uff09'}

\u3010\u671f\u671b\u3011
\uff08\u8bf7\u63cf\u8ff0\u4f60\u5e0c\u671b\u600e\u4e48\u6539\uff09
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;

  const gatherContext = () => {
    navigator.clipboard
      .writeText(fullText)
      .then(() => {
        alert('\u4e0a\u4e0b\u6587\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f\uff01\u76f4\u63a5\u7c98\u8d34\u7ed9 AI \u52a9\u624b\u5373\u53ef');
      })
      .catch(() => {
        window.prompt('\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u5168\u9009\u590d\u5236\uff1a', fullText);
      });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="\u5411 AI \u52a9\u624b\u6c42\u52a9\uff08\u81ea\u52a8\u9644\u4e0a\u5f53\u524d\u9879\u76ee\u4e0a\u4e0b\u6587\uff09"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
          color: '#f0c674', background: 'rgba(212,166,87,0.12)',
          border: '1px solid rgba(212,166,87,0.4)', borderRadius: 999,
          cursor: 'pointer', transition: 'all 0.3s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212,166,87,0.22)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(212,166,87,0.12)')}
      >
        \u6c42\u52a9
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(5,8,16,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--ink-card)', border: '1px solid var(--ink-border)',
          borderRadius: 14, width: 480, maxHeight: '82vh', overflow: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)', padding: '22px 26px',
          color: 'var(--text-primary)', fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f0c674' }}>\u5411 AI \u52a9\u624b\u6c42\u52a9</h3>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}
          >
            x
          </button>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
          \u6211\u4f1a\u81ea\u52a8\u6536\u96c6\u5f53\u524d\u9879\u76ee\u72b6\u6001\u548c\u672c\u9875\u7f16\u8f91\u5185\u5bb9\u3002\u5728\u4e0b\u65b9\u63cf\u8ff0\u95ee\u9898\uff0c\u70b9\u51fb\u590d\u5236\uff0c\u76f4\u63a5\u7c98\u8d34\u7ed9 AI \u52a9\u624b\u5373\u53ef\u3002
        </div>

        <div style={{ background: 'var(--ink-surface)', border: '1px solid var(--ink-border)', borderRadius: 6, padding: 10, fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
          <strong style={{ color: '#f0c674' }}>\u5f53\u524d\uff1a</strong>{currentModule}<br />
          <strong style={{ color: '#f0c674' }}>\u4e66\u540d\uff1a</strong>{bookTitle || '\u672a\u547d\u540d'}<br />
          <strong style={{ color: '#f0c674' }}>\u7ae0\u8282\uff1a</strong>{chapterOutlines.length} \u7ae0 \u00b7 {totalWords.toLocaleString()} \u5b57
        </div>

        <label style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
          \u95ee\u9898\u63cf\u8ff0
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="\u6bd4\u5982\uff1aStep4 \u7eed\u5199\u65f6 API \u8fd4\u56de\u7a7a\u5185\u5bb9\uff0c\u6216\u8005\u6211\u60f3\u628a\u67d0\u4e2a\u529f\u80fd\u6539\u6210..."
          style={{
            width: '100%', minHeight: 80, fontFamily: 'inherit', fontSize: '0.82rem',
            padding: 8, border: '1px solid var(--ink-border)', borderRadius: 5,
            background: 'var(--ink-surface)', color: 'var(--text-primary)',
            resize: 'vertical', outline: 'none', lineHeight: 1.7,
          }}
        />

        <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setOpen(false)}
            style={{
              padding: '8px 18px', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--ink-border-bright)',
              color: 'var(--text-secondary)', borderRadius: 8,
            }}
          >
            \u53d6\u6d88
          </button>
          <button
            onClick={gatherContext}
            style={{
              padding: '8px 18px', fontSize: 13, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer',
              background: 'linear-gradient(135deg, #4a8b6f, #6ec092)', color: '#0a0e1a',
              border: 'none', borderRadius: 8,
            }}
          >
            \u590d\u5236\u4e0a\u4e0b\u6587
          </button>
        </div>
      </div>
    </div>
  );
}

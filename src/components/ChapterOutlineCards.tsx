import { useState } from 'react';
import { useProjectStore } from '../lib/store/projectStore';
import type { ChapterOutline } from '../lib/types';

type FieldType = 'text' | 'textarea' | 'list';
interface FieldDef {
  key: keyof ChapterOutline;
  label: string;
  type: FieldType;
}

const FIELDS: FieldDef[] = [
  { key: 'summary', label: '梗概', type: 'textarea' },
  { key: 'satisfaction_type', label: '爽点类型', type: 'text' },
  { key: 'node_mapping', label: '对应节点', type: 'text' },
  { key: 'chapter_hook', label: '章节钩子', type: 'textarea' },
];

const cardStyle: React.CSSProperties = {
  background: 'var(--ink-surface)',
  border: '1px solid var(--ink-border)',
  borderRadius: 12,
  overflow: 'hidden',
};
const headStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--ink-border)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};
const badgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#0b0e16',
  background: '#f0c674',
  borderRadius: 6,
  padding: '2px 8px',
  whiteSpace: 'nowrap',
};
const titleInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#e8e4d8',
  fontSize: 14,
  fontWeight: 600,
};
const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--ink-border)',
  color: '#8a93a8',
  borderRadius: 6,
  padding: '2px 8px',
  fontSize: 12,
  cursor: 'pointer',
};
const bodyStyle: React.CSSProperties = {
  padding: 14,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px 14px',
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: '#6a7388',
  marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--ink-bg)',
  border: '1px solid var(--ink-border)',
  borderRadius: 6,
  color: '#c8ccd6',
  fontSize: 12,
  padding: '6px 8px',
  outline: 'none',
};
const taStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical', lineHeight: 1.5 };
const addBtnStyle: React.CSSProperties = {
  background: 'rgba(212,166,87,0.12)',
  border: '1px solid rgba(212,166,87,0.4)',
  color: '#f0c674',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 12,
  cursor: 'pointer',
};
const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#f0c674',
  cursor: 'pointer',
  fontSize: 13,
  textDecoration: 'underline',
  padding: '0 4px',
};

function valToStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function valToListStr(v: unknown): string {
  return Array.isArray(v) ? v.join('，') : '';
}

export function ChapterOutlineCards() {
  const outlines = useProjectStore((s) => s.chapterOutlines);
  const updateChapter = useProjectStore((s) => s.updateChapter);
  const setChapterOutlines = useProjectStore((s) => s.setChapterOutlines);
  const [expanded, setExpanded] = useState<number | null>(null);

  const addChapter = () => {
    const nextN = outlines.length ? Math.max(...outlines.map((o) => o.n)) + 1 : 1;
    const blank: ChapterOutline = {
      n: nextN,
      title: `第${nextN}章（未命名）`,
      summary: '',
      satisfaction_type: '',
      node_mapping: '',
      foreshadowing: { plant: [], resolve: [] },
      chapter_hook: '',
      reviewStatus: 'pending',
    };
    setChapterOutlines((prev) => [...prev, blank]);
  };

  const removeChapter = (n: number) => {
    setChapterOutlines((prev) => prev.filter((c) => c.n !== n));
  };

  const onField = (n: number, field: FieldDef, value: string) => {
    if (field.type === 'list') {
      const arr = value.split(/[，,、；;]/).map((s) => s.trim()).filter(Boolean);
      updateChapter(n, { [field.key]: arr } as Partial<ChapterOutline>);
    } else {
      updateChapter(n, { [field.key]: value } as Partial<ChapterOutline>);
    }
  };

  if (outlines.length === 0) {
    return (
      <div
        style={{
          marginTop: 20,
          padding: 24,
          border: '1px dashed var(--ink-border)',
          borderRadius: 12,
          textAlign: 'center',
          color: '#6a7388',
          fontSize: 13,
        }}
      >
        暂无章节大纲。可点下方按钮生成，或
        <button onClick={addChapter} style={linkBtnStyle}>
          手动添加一章
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#c8ccd6' }}>
          章节大纲卡片（{outlines.length} 章）
        </span>
        <button onClick={addChapter} style={addBtnStyle}>
          + 新增章节
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 14,
        }}
      >
        {outlines.map((c) => (
          <div key={c.n} style={cardStyle}>
            <div style={headStyle}>
              <span style={badgeStyle}>第{c.n}章</span>
              <input
                value={c.title}
                onChange={(e) => updateChapter(c.n, { title: e.target.value })}
                style={titleInputStyle}
                placeholder="章节标题"
              />
              <button
                onClick={() => setExpanded(expanded === c.n ? null : c.n)}
                style={iconBtnStyle}
              >
                {expanded === c.n ? '收起' : '详情'}
              </button>
              <button onClick={() => removeChapter(c.n)} style={iconBtnStyle}>
                ✕
              </button>
            </div>
            <div style={bodyStyle}>
              {(expanded === c.n ? FIELDS : FIELDS.slice(0, 6)).map((f) => (
                <div
                  key={String(f.key)}
                  style={f.type === 'textarea' ? { gridColumn: '1 / -1' } : undefined}
                >
                  <label style={labelStyle}>{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={valToStr(c[f.key])}
                      onChange={(e) => onField(c.n, f, e.target.value)}
                      style={taStyle}
                      rows={2}
                    />
                  ) : (
                    <input
                      value={f.type === 'list' ? valToListStr(c[f.key]) : valToStr(c[f.key])}
                      onChange={(e) => onField(c.n, f, e.target.value)}
                      style={inputStyle}
                    />
                  )}
                </div>
              ))}
              {c.foreshadowing?.plant?.length ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>伏笔</label>
                  <div style={{ fontSize: 12, color: '#c8ccd6' }}>
                    {c.foreshadowing.plant.join('，')}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

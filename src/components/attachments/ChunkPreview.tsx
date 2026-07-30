import { useAttachmentStore, useUIStore } from '@/lib/store';
import { TEMPLATE_VARIABLES } from '@/lib/constants';
import type { ExtractedChunk } from '@/lib/types';

export function ChunkPreview({ chunk, fileId }: { chunk: ExtractedChunk; fileId: string }) {
  const variableBindings = useAttachmentStore((s) => s.variableBindings);
  const bindVariable = useAttachmentStore((s) => s.bindVariable);
  const unbindVariable = useAttachmentStore((s) => s.unbindVariable);
  const showToast = useUIStore((s) => s.showToast);

  // 查找当前 chunk 绑定的变量
  const boundVar = Object.entries(variableBindings).find(([, id]) => id === chunk.id)?.[0];

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        background: 'var(--ink-surface)',
        border: `1px solid ${boundVar ? 'rgba(212,166,87,0.3)' : 'var(--ink-border)'}`,
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#f0c674' }}>
          {chunk.title}
        </span>
        <span style={{ fontSize: 11, color: '#6a7388' }}>
          {chunk.wordCount} 字
        </span>
      </div>
      <div
        style={{
          fontSize: 12, color: '#a8b0c0', lineHeight: 1.6,
          maxHeight: 80, overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {chunk.content}
      </div>

      {/* 变量绑定区 */}
      <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {boundVar ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 6,
                background: 'rgba(212,166,87,0.15)', color: '#f0c674',
                border: '1px solid rgba(212,166,87,0.3)',
              }}
            >
              已绑定: {boundVar}
            </span>
            <button
              onClick={() => { unbindVariable(boundVar); showToast('已取消绑定'); }}
              style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 4,
                background: 'transparent', color: '#e85d68',
                border: '1px solid rgba(201,68,76,0.3)', cursor: 'pointer',
              }}
            >
              解绑
            </button>
          </div>
        ) : (
          TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.name}
              onClick={() => {
                bindVariable(v.name, chunk.id, fileId);
                showToast(`已绑定到变量 {{${v.name}}}`);
              }}
              style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 4,
                background: 'var(--ink-card)', color: '#a8b0c0',
                border: '1px solid var(--ink-border)', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title={v.description}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d4a657'; e.currentTarget.style.color = '#f0c674'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ink-border)'; e.currentTarget.style.color = '#a8b0c0'; }}
            >
              {v.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

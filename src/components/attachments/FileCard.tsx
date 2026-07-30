import { useAttachmentStore } from '@/lib/store';
import type { AttachedFile } from '@/lib/types';

const TYPE_LABELS: Record<string, string> = { docx: 'Word', txt: '文本', md: 'Markdown' };

export function FileCard({ file }: { file: AttachedFile }) {
  const removeFile = useAttachmentStore((s) => s.removeFile);
  const setActiveFile = useAttachmentStore((s) => s.setActiveFile);
  const activeFileId = useAttachmentStore((s) => s.activeFileId);

  const isActive = activeFileId === file.id;
  const statusColor =
    file.status === 'parsed' || file.status === 'bound' ? '#6ec092' :
    file.status === 'failed' ? '#e85d68' :
    '#f0c674';

  const statusText =
    file.status === 'uploading' ? '解析中...' :
    file.status === 'parsed' ? `已解析 (${file.chunks.length} 片段)` :
    file.status === 'bound' ? '已绑定变量' :
    file.status === 'failed' ? `失败: ${file.error || ''}` : '未知';

  return (
    <div
      onClick={() => setActiveFile(isActive ? null : file.id)}
      style={{
        padding: '12px 16px',
        borderRadius: 10,
        background: isActive ? 'rgba(212,166,87,0.1)' : 'var(--ink-surface)',
        border: `1px solid ${isActive ? 'rgba(212,166,87,0.3)' : 'var(--ink-border)'}`,
        cursor: 'pointer',
        transition: 'all 0.3s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <span style={{ fontSize: 18 }}>{'\u{1F4C4}'}</span>
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontSize: 13, fontWeight: 500, color: '#e8e4d8',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
              title={file.name}
            >
              {file.name}
            </div>
            <div style={{ fontSize: 11, color: '#6a7388', marginTop: 2 }}>
              {TYPE_LABELS[file.type]} · {(file.size / 1024).toFixed(1)} KB
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: statusColor, fontWeight: 500 }}>{statusText}</span>
          <button
            onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
            style={{
              background: 'none', border: 'none', color: '#6a7388',
              cursor: 'pointer', fontSize: 16, padding: '2px 6px',
              borderRadius: 4, transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#e85d68')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6a7388')}
          >
            {'\u00d7'}
          </button>
        </div>
      </div>
    </div>
  );
}

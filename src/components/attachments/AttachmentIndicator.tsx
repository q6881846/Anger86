import { useAttachmentStore } from '@/lib/store';

export function AttachmentIndicator() {
  const files = useAttachmentStore((s) => s.files);
  const variableBindings = useAttachmentStore((s) => s.variableBindings);

  const boundCount = Object.keys(variableBindings).length;
  const parsedFiles = files.filter((f) => f.status === 'parsed' || f.status === 'bound');

  if (files.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderRadius: 8,
        background: 'rgba(212,166,87,0.08)',
        border: '1px solid rgba(212,166,87,0.2)',
      }}
    >
      <span style={{ fontSize: 14 }}>{'\u{1F4CE}'}</span>
      <span style={{ fontSize: 12, color: '#f0c674' }}>
        附件: {parsedFiles.length}/{files.length} 文件 · {boundCount} 变量绑定
      </span>
    </div>
  );
}

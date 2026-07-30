import { FileDropZone } from './FileDropZone';
import { FileCard } from './FileCard';
import { ChunkPreview } from './ChunkPreview';
import { useAttachmentStore } from '@/lib/store';

export function AttachmentPanel() {
  const files = useAttachmentStore((s) => s.files);
  const activeFileId = useAttachmentStore((s) => s.activeFileId);
  const activeFile = files.find((f) => f.id === activeFileId);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px' }}>
      <h2 style={{ fontFamily: '"Noto Serif SC", serif', fontSize: 20, fontWeight: 700, color: '#f0c674', marginBottom: 16 }}>
        附件管理
      </h2>

      <FileDropZone />

      {files.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e8e4d8', marginBottom: 12 }}>
            已上传文件 ({files.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        </div>
      )}

      {activeFile && (activeFile.status === 'parsed' || activeFile.status === 'bound') && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e8e4d8', marginBottom: 12 }}>
            「{activeFile.name}」文本片段 — 点击片段绑定到模板变量
          </h3>
          <div>
            {activeFile.chunks.map((chunk) => (
              <ChunkPreview key={chunk.id} chunk={chunk} fileId={activeFile.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

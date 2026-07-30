import { useState, useCallback } from 'react';
import { useAttachmentStore } from '@/lib/store';
import { useUIStore } from '@/lib/store';
import { parseFile, autoSplit, detectFileType, isSupportedFile } from '@/lib/parser';
import type { AttachedFile } from '@/lib/types';

function genFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FileDropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const addFile = useAttachmentStore((s) => s.addFile);
  const showToast = useUIStore((s) => s.showToast);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      for (const file of Array.from(files)) {
        if (!isSupportedFile(file)) {
          showToast(`不支持的文件格式: ${file.name}`);
          continue;
        }

        const type = detectFileType(file)!;
        const attachedFile: AttachedFile = {
          id: genFileId(),
          name: file.name,
          type,
          size: file.size,
          status: 'uploading',
          chunks: [],
          rawText: '',
          createdAt: Date.now(),
        };

        addFile(attachedFile);

        try {
          const text = await parseFile(file, type);
          const chunks = autoSplit(text, type);

          useAttachmentStore.getState().updateFile(attachedFile.id, {
            status: 'parsed',
            rawText: text,
            chunks,
          });
          showToast(`「${file.name}」解析完成，共 ${chunks.length} 个片段`);
        } catch (err) {
          useAttachmentStore.getState().updateFile(attachedFile.id, {
            status: 'failed',
            error: err instanceof Error ? err.message : '解析失败',
          });
          showToast(`「${file.name}」解析失败: ${err instanceof Error ? err.message : '未知错误'}`);
        }
      }
    },
    [addFile, showToast]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = '';
    },
    [handleFiles]
  );

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        border: `2px dashed ${isDragging ? '#d4a657' : '#3a4a70'}`,
        borderRadius: 16,
        padding: '32px 24px',
        textAlign: 'center',
        background: isDragging ? 'rgba(212,166,87,0.08)' : 'var(--ink-card)',
        transition: 'all 0.3s',
        cursor: 'pointer',
      }}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept=".docx,.txt,.md"
        multiple
        style={{ display: 'none' }}
        onChange={onFileSelect}
      />
      <div style={{ fontSize: 36, marginBottom: 12 }}>{'\u{1F4C4}'}</div>
      <div style={{ fontSize: 15, color: '#e8e4d8', fontWeight: 500, marginBottom: 8 }}>
        拖拽文件到此处，或点击选择
      </div>
      <div style={{ fontSize: 12, color: '#6a7388' }}>
        支持 .docx、.txt、.md，自动解析并拆分为文本片段
      </div>
    </div>
  );
}

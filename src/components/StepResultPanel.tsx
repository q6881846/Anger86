// 通用「步骤生成结果」展示面板
// 读取 IndexedDB 中对应 projectId + stepId 的输出，并随 store 中的步骤状态显示
// 加载中 / 失败 / 成功 三态。各生成页（灵感、架构等）复用此组件即可。
import { useEffect, useState } from 'react';
import { getStepOutput } from '@/lib/db/stepOutputs';
import { useNovelGenesisStore } from '@/lib/store/novelGenesis';

interface Props {
  projectId: string;
  stepId: number;
  title?: string;
  onRetry?: () => void;
}

export function StepResultPanel({ projectId, stepId, title, onRetry }: Props) {
  // 直接订阅该步骤的状态，避免每次渲染都返回新数组
  const status = useNovelGenesisStore((s) => s.steps.find((x) => x.stepId === stepId)?.status || 'idle');
  const [output, setOutput] = useState('');

  useEffect(() => {
    if (status === 'loading' || status === 'streaming') return;
    getStepOutput(projectId, stepId).then((d) => setOutput(d?.content || ''));
  }, [status, projectId, stepId]);

  // 无任何内容且不处于生成/失败态时，不渲染面板
  if (status !== 'loading' && status !== 'streaming' && status !== 'error' && !output) return null;

  return (
    <div
      className="reveal"
      style={{
        marginTop: 16,
        background: 'var(--ink-card)',
        border: '1px solid var(--ink-border)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          padding: '10px 18px',
          borderBottom: '1px solid var(--ink-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f0c674', fontFamily: '"Noto Serif SC", serif' }}>
          {'\u2726'} {title || `步骤 ${stepId} 结果`}
        </span>
        <span style={{ fontSize: 11, color: '#6a7388' }}>
          {status === 'success' && `${output.length} 字`}
          {status === 'error' && '生成失败'}
          {(status === 'loading' || status === 'streaming') && '生成中…'}
        </span>
      </div>
      <div style={{ padding: 18, maxHeight: 480, overflowY: 'auto' }}>
        {(status === 'loading' || status === 'streaming') ? (
          <div style={{ fontSize: 13, color: '#8a93a8' }}>AI 正在生成，请稍候…</div>
        ) : status === 'error' ? (
          <div style={{ fontSize: 13, color: '#e85d68', lineHeight: 1.8 }}>
            生成失败：请确认后端服务已启动，且已正确配置 API Key。
            {onRetry && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={onRetry}
                  style={{
                    padding: '6px 14px',
                    background: 'linear-gradient(135deg, #d4a657, #f0c674)',
                    color: '#0a0e1a',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  重试
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: 13,
              lineHeight: 1.85,
              color: '#d8d4c8',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            {output}
          </div>
        )}
      </div>
    </div>
  );
}

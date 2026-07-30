import { useEffect, useRef, useState } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

interface LogEntry {
  t: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  msg: string;
  extra: any;
}

export function DebugLogPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = levelFilter ? `/api/logs?level=${levelFilter}&limit=300` : '/api/logs?limit=300';
      const res = await fetchWithAuth(url);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      setLogs([{ t: new Date().toISOString(), level: 'ERROR', msg: `无法获取日志: ${e}`, extra: null }]);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      await fetchWithAuth('/api/logs/clear', { method: 'POST' });
      setLogs([]);
    } catch (e) {
      console.error('clear logs failed', e);
    }
  };

  useEffect(() => {
    // 快捷键 Ctrl+Shift+L 切换面板
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetchLogs();
    if (!autoRefresh) return;
    const timer = setInterval(fetchLogs, 2000);
    return () => clearInterval(timer);
  }, [open, autoRefresh, levelFilter]);

  useEffect(() => {
    // 打开时自动滚动到底部
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs, open]);

  const levelColor = (lv: string) => {
    if (lv === 'ERROR') return '#ff6b6b';
    if (lv === 'WARN') return '#ffc048';
    return '#a0a0a0';
  };

  return (
    <>
      {/* 浮动按钮 */}
      <button
        onClick={() => setOpen(!open)}
        title="调试日志 (Ctrl+Shift+L)"
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 9998,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(20,20,30,0.85)',
          color: '#c0c0ff',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}
      >
        📋
      </button>

      {/* 日志面板 */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 64,
            right: 16,
            width: 'min(720px, 90vw)',
            height: 'min(500px, 60vh)',
            zIndex: 9999,
            background: 'rgba(15,15,25,0.97)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* 头部 */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#e0e0ff', fontWeight: 600, fontSize: 13 }}>后端调试日志</span>
            <span style={{ color: '#888', fontSize: 11 }}>{logs.length} 条</span>
            <div style={{ flex: 1 }} />
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#ccc',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                padding: '3px 6px',
                fontSize: 11,
              }}
            >
              <option value="">全部</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
            <label style={{ color: '#aaa', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
              自动刷新
            </label>
            <button onClick={fetchLogs} disabled={loading} style={btnStyle}>刷新</button>
            <button onClick={clearLogs} style={{ ...btnStyle, color: '#ff6b6b' }}>清空</button>
            <button onClick={() => setOpen(false)} style={btnStyle}>✕</button>
          </div>

          {/* 日志列表 */}
          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 12px',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: 11.5,
              lineHeight: 1.6,
            }}
          >
            {logs.length === 0 && !loading && (
              <div style={{ color: '#666', textAlign: 'center', padding: 30 }}>暂无日志</div>
            )}
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                <span style={{ color: '#666' }}>{log.t.slice(11, 23)}</span>
                {' '}
                <span style={{ color: levelColor(log.level), fontWeight: 600 }}>[{log.level}]</span>
                {' '}
                <span style={{ color: '#d0d0d0' }}>{log.msg}</span>
                {log.extra && (
                  <span style={{ color: '#888' }}> {typeof log.extra === 'string' ? log.extra : JSON.stringify(log.extra)}</span>
                )}
              </div>
            ))}
          </div>

          {/* 底部提示 */}
          <div style={{ padding: '6px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#666', fontSize: 10, flexShrink: 0 }}>
            Ctrl+Shift+L 切换 · ESC 关闭 · 生成异常时把这里的日志截图发给我
          </div>
        </div>
      )}
    </>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: '#ccc',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 4,
  padding: '3px 10px',
  fontSize: 11,
  cursor: 'pointer',
};

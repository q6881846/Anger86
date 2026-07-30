import { Link, useLocation } from 'react-router-dom';

const phases = [
  { path: '/genesis/inspiration', label: '灵感', num: '1', phase: 1 },
  { path: '/genesis/architecture', label: '架构', num: '2', phase: 2 },
  { path: '/genesis/orchestration', label: '编排', num: '3', phase: 3 },
  { path: '/genesis/writing', label: '写作', num: '4', phase: 4 },
];

export function PhaseNavBar() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(10,14,26,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(42,54,80,0.6)',
        padding: '0 32px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* 左侧：返回首页 + 书名 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: '"Noto Serif SC", serif', fontSize: 18, fontWeight: 700, color: '#f0c674', letterSpacing: 2 }}>
            墨文写作
          </span>
        </Link>
        <span style={{ color: 'rgba(138,147,168,0.3)', fontSize: 14 }}>|</span>
        <span style={{ color: '#6a7388', fontSize: 13 }}>新书</span>
      </div>

      {/* 中间：4阶段切换 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {phases.map((p) => {
          const isActive = currentPath === p.path || currentPath.startsWith(p.path + '/');
          return (
            <Link key={p.path} to={p.path} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 16px',
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 500,
                  background: isActive ? 'rgba(212,166,87,0.15)' : 'transparent',
                  color: isActive ? '#f0c674' : '#6a7388',
                  border: isActive ? '1px solid rgba(212,166,87,0.3)' : '1px solid transparent',
                  transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    background: isActive ? '#f0c674' : 'rgba(106,115,136,0.2)',
                    color: isActive ? '#0a0e1a' : '#6a7388',
                  }}
                >
                  {p.num}
                </span>
                <span>{p.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 右侧：AI模型 + 保存状态 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#6a7388' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6ec092' }} />
          AI 模型
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6ec092' }} />
          已保存
        </span>
      </div>
    </div>
  );
}

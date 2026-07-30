import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const phases = [
  { id: 1, label: '灵感', path: '/inspiration' },
  { id: 2, label: '架构', path: '/architecture' },
  { id: 3, label: '编排', path: '/arrangement' },
  { id: 4, label: '写作', path: '/writing' },
];

interface PhaseNavProps {
  currentPhase: number;
}

export function PhaseNav({ currentPhase }: PhaseNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 80,
        background: scrolled
          ? 'rgba(10,14,26,0.95)'
          : 'rgba(10,14,26,0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(212,166,87,0.1)',
        padding: '14px 0',
        transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '0 24px',
        }}
      >
        {phases.map((phase, idx) => {
          const isActive = currentPhase === phase.id;
          const isDone = currentPhase > phase.id;
          const isFuture = currentPhase < phase.id;
          return (
            <Link
              key={phase.id}
              to={isFuture ? '#' : phase.path}
              style={{ textDecoration: 'none' }}
            >
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: isActive
                    ? '1px solid rgba(212,166,87,0.4)'
                    : isDone
                    ? '1px solid rgba(110,192,146,0.3)'
                    : '1px solid rgba(42,54,80,0.5)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isFuture ? 'default' : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                  background: isActive
                    ? 'rgba(212,166,87,0.15)'
                    : isDone
                    ? 'rgba(110,192,146,0.08)'
                    : 'rgba(22,30,46,0.6)',
                  color: isActive
                    ? '#f0c674'
                    : isDone
                    ? '#6ec092'
                    : '#6a7388',
                  boxShadow: isActive
                    ? '0 2px 12px rgba(212,166,87,0.15)'
                    : 'none',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  pointerEvents: isFuture ? 'none' : 'auto',
                  opacity: isFuture ? 0.4 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isFuture && !isActive) {
                    e.currentTarget.style.background = 'rgba(212,166,87,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(212,166,87,0.25)';
                    e.currentTarget.style.color = '#d4a657';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isFuture && !isActive) {
                    e.currentTarget.style.background = isDone
                      ? 'rgba(110,192,146,0.08)'
                      : 'rgba(22,30,46,0.6)';
                    e.currentTarget.style.borderColor = isDone
                      ? 'rgba(110,192,146,0.3)'
                      : 'rgba(42,54,80,0.5)';
                    e.currentTarget.style.color = isDone ? '#6ec092' : '#6a7388';
                  }
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    background: isActive
                      ? 'rgba(212,166,87,0.25)'
                      : isDone
                      ? 'rgba(110,192,146,0.15)'
                      : 'rgba(42,54,80,0.4)',
                    color: isActive
                      ? '#f0c674'
                      : isDone
                      ? '#6ec092'
                      : '#6a7388',
                    transition: 'all 0.3s',
                  }}
                >
                  {isDone ? '\u2713' : idx + 1}
                </span>
                <span style={{ fontFamily: '"Noto Sans SC", sans-serif' }}>
                  {phase.label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

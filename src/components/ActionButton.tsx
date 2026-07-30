import React from 'react';

type Variant = 'gold' | 'ghost' | 'danger' | 'jade';

interface ActionButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  icon?: string;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const base: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: 'none',
  borderRadius: 8,
};

const variants: Record<Variant, { style: React.CSSProperties; hover: React.CSSProperties }> = {
  gold: {
    style: {
      ...base,
      padding: '8px 18px',
      background: 'linear-gradient(135deg, #d4a657, #f0c674)',
      color: '#0a0e1a',
      fontSize: 13,
      fontWeight: 700,
      boxShadow: '0 4px 16px rgba(212,166,87,0.25)',
    },
    hover: { transform: 'scale(1.03)' },
  },
  ghost: {
    style: {
      ...base,
      padding: '8px 16px',
      border: '1px solid var(--ink-border)',
      background: 'var(--ink-surface)',
      color: '#8a93a8',
      fontSize: 13,
      fontWeight: 500,
    },
    hover: { borderColor: 'rgba(212,166,87,0.3)', color: '#d4a657' },
  },
  danger: {
    style: {
      ...base,
      padding: '6px 12px',
      border: '1px solid rgba(232,93,104,0.3)',
      background: 'rgba(232,93,104,0.1)',
      color: '#e85d68',
      fontSize: 12,
    },
    hover: { borderColor: 'rgba(232,93,104,0.5)', background: 'rgba(232,93,104,0.15)' },
  },
  jade: {
    style: {
      ...base,
      padding: '8px 18px',
      background: 'linear-gradient(135deg, #4a8b6f, #6ec092)',
      color: '#0a0e1a',
      fontSize: 13,
      fontWeight: 700,
      boxShadow: '0 4px 16px rgba(110,192,146,0.25)',
    },
    hover: { transform: 'scale(1.03)' },
  },
};

export default function ActionButton({
  onClick,
  disabled,
  loading,
  variant = 'ghost',
  icon,
  size = 'md',
  children,
  style,
}: ActionButtonProps) {
  const v = variants[variant];
  const isDisabled = disabled || loading;

  const computed: React.CSSProperties = {
    ...v.style,
    ...(size === 'sm' ? { padding: '4px 12px', fontSize: 12 } : {}),
    ...(isDisabled
      ? {
          opacity: 0.6,
          cursor: 'not-allowed',
          background: variant === 'gold' || variant === 'jade' ? '#2a3650' : v.style.background,
          color: variant === 'gold' || variant === 'jade' ? '#6a7388' : v.style.color,
          boxShadow: 'none',
          transform: 'none',
        }
      : {}),
    ...style,
  };

  const iconChar = loading ? '\u23F3' : icon;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      style={computed}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        Object.assign(e.currentTarget.style, v.hover);
      }}
      onMouseLeave={(e) => {
        if (isDisabled) return;
        Object.keys(v.hover).forEach((k) => {
          (e.currentTarget.style as any)[k] = '';
        });
      }}
    >
      {iconChar && <span>{iconChar}</span>}
      <span>{children}</span>
    </button>
  );
}

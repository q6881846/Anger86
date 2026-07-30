import { useUIStore } from '@/lib/store';

export function Toast() {
  const toast = useUIStore((s) => s.toast);
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', bottom: 32, left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--ink-card)', color: 'var(--bodhi-gold-bright)',
        padding: '12px 24px', borderRadius: 100,
        border: '1px solid rgba(212,166,87,0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        fontSize: 14, zIndex: 9999,
        backdropFilter: 'blur(20px)',
        animation: 'fade-up 0.4s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {toast}
    </div>
  );
}

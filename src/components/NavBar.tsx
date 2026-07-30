import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { HelpButton } from './HelpButton';
import { useProjectStore, useUIStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { useParamsModalStore } from '@/lib/store/paramsModalStore';

const navLinks = [
  { href: '/', label: '首页' },
  { href: '/shelf', label: '书架' },
  { href: '/inspiration', label: '创作流水线' },
  { href: '/settings', label: 'API 设置' },
];

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;

  const { currentBookTitle, currentBookId, bookList, switchBook } = useProjectStore(
    useShallow((s) => {
      const list = Object.values(s.books || {}).sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
      return {
        currentBookTitle: s.bookTitle || (list[0]?.title ?? ''),
        currentBookId: s.currentBookId,
        bookList: list,
        switchBook: s.switchBook,
      };
    })
  );
  const showToast = useUIStore((s) => s.showToast);
  const openParamsModal = useParamsModalStore((s) => s.openModal);
  const [bookMenuOpen, setBookMenuOpen] = useState(false);
  const bookMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (!bookMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (bookMenuRef.current && !bookMenuRef.current.contains(e.target as Node)) {
        setBookMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [bookMenuOpen]);

  const handleSwitch = (bookId: string) => {
    if (bookId === currentBookId) {
      setBookMenuOpen(false);
      return;
    }
    const ok = switchBook(bookId);
    setBookMenuOpen(false);
    showToast(ok ? '已切换书本' : '切换失败');
  };

  return (
    <nav
      aria-label="主导航"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: scrolled ? '8px 32px' : '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,14,26,0.92)' : 'rgba(10,14,26,0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(212,166,87,0.1)',
        transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/" style={{ textDecoration: 'none' }} aria-label="墨文写作首页">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" style={{ transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotate(360deg) scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotate(0) scale(1)')}
            >
              <path d="M16 2C8 2 4 10 4 18C4 24 8 28 16 30C24 28 28 24 28 18C28 10 24 2 16 2Z" fill="rgba(212,166,87,0.15)" stroke="#d4a657" strokeWidth="1.5" />
              <path d="M16 4C16 14 16 20 16 28" stroke="#d4a657" strokeWidth="1" strokeDasharray="2 3" />
            </svg>
            <span style={{ fontFamily: '"Noto Serif SC", serif', fontSize: 22, fontWeight: 700, color: '#f0c674', letterSpacing: 2 }}>
              墨文写作
            </span>
          </div>
        </Link>

        {bookList.length > 0 && (
          <div ref={bookMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setBookMenuOpen((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px',
                background: 'rgba(212,166,87,0.08)',
                border: '1px solid rgba(212,166,87,0.2)',
                borderRadius: 8,
                color: '#f0c674', fontSize: 13, fontWeight: 500,
                fontFamily: '"Noto Sans SC", sans-serif',
                cursor: 'pointer', transition: 'all 0.3s',
                maxWidth: 200,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212,166,87,0.15)'; e.currentTarget.style.borderColor = 'rgba(212,166,87,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212,166,87,0.08)'; e.currentTarget.style.borderColor = 'rgba(212,166,87,0.2)'; }}
            >
              <span style={{
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 140,
              }}>
                {currentBookTitle || '未命名'}
              </span>
              <span style={{ fontSize: 10, opacity: 0.7, flexShrink: 0 }}>
                {bookMenuOpen ? '\u25B4' : '\u25BE'}
              </span>
            </button>

            {bookMenuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                minWidth: 260, maxWidth: 360,
                background: 'rgba(18,22,38,0.98)',
                backdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(212,166,87,0.15)',
                borderRadius: 12,
                padding: 6,
                boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                zIndex: 200,
              }}>
                {bookList.map((book) => {
                  const isCurrent = book.id === currentBookId;
                  return (
                    <div
                      key={book.id}
                      onClick={() => handleSwitch(book.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 8, cursor: 'pointer',
                        background: isCurrent ? 'rgba(212,166,87,0.1)' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{
                          fontSize: 14, fontWeight: isCurrent ? 600 : 400,
                          color: isCurrent ? '#f0c674' : '#e8e4d8',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {book.title || '未命名'}
                        </div>
                        {book.data.chapterOutlines.length > 0 && (
                          <div style={{ fontSize: 11, color: '#6a7388', marginTop: 2 }}>
                            {book.data.chapterOutlines.length} 章大纲
                          </div>
                        )}
                      </div>
                      {isCurrent && (
                        <span style={{ color: '#f0c674', fontSize: 14, marginLeft: 8, flexShrink: 0 }}>{'\u2713'}</span>
                      )}
                    </div>
                  );
                })}
                <div style={{ height: 1, background: 'rgba(212,166,87,0.1)', margin: '6px 0' }} />
                <Link
                  to="/shelf"
                  onClick={() => setBookMenuOpen(false)}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    color: '#a8b0c0', fontSize: 13, transition: 'all 0.2s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#f0c674'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a8b0c0'; }}
                  >
                    {'\u{1F4DA}'} 管理书架
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', gap: 32, listStyle: 'none' }}>
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} to={link.href} style={{ textDecoration: 'none' }} aria-label={link.label}>
                <span
                  style={{
                    fontSize: 14, fontWeight: 500, cursor: 'pointer',
                    color: active ? '#f0c674' : '#a8b0c0',
                    borderBottom: active ? '2px solid #d4a657' : '2px solid transparent',
                    paddingBottom: 4, transition: 'all 0.3s',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#f0c674'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#a8b0c0'; }}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
        <button
          onClick={openParamsModal}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500,
            background: 'rgba(212,166,87,0.08)', border: '1px solid rgba(212,166,87,0.2)',
            color: '#f0c674', cursor: 'pointer', transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212,166,87,0.15)'; e.currentTarget.style.borderColor = 'rgba(212,166,87,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212,166,87,0.08)'; e.currentTarget.style.borderColor = 'rgba(212,166,87,0.2)'; }}
        >
          {'⚙'} 参数
        </button>
        <HelpButton />
      </div>
    </nav>
  );
}

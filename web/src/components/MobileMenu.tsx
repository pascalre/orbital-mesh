import { useState, type ReactNode } from 'react';

type View = 'menu' | 'info' | 'controls';

interface MobileMenuProps {
  info: ReactNode;
  controls: ReactNode;
}

/**
 * Mobile layout: a floating ☰ button over the globe. Tapping it opens a
 * full-screen menu page listing Info and Controls. Selecting one shows that
 * section full-screen with a back arrow; closing returns to the globe.
 */
export function MobileMenu({ info, controls }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('menu');

  const openMenu = () => {
    setView('menu');
    setOpen(true);
  };
  const close = () => setOpen(false);

  const headerBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#00c897',
    cursor: 'pointer',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'white',
    borderRadius: '12px',
    padding: '18px 20px',
    fontSize: '1.05rem',
    fontWeight: 'bold',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'sans-serif',
  };

  return (
    <>
      {/* Floating open button — fixed to top-left, always above the canvas */}
      {!open && (
        <button
          aria-label="Open menu"
          onClick={openMenu}
          style={{
            position: 'fixed',
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            left: '16px',
            zIndex: 1000,
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            fontSize: '1.5rem',
            lineHeight: 1,
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
          }}
        >
          ☰
        </button>
      )}

      {/* Full-screen overlay: menu list or a selected section */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1001,
            background: 'rgba(0,0,0,0.94)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {/* Overlay header: back (in a section) + close */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              flex: '0 0 auto',
            }}
          >
            {view === 'menu' ? (
              <span style={{ color: 'white', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '1px' }}>
                MENU
              </span>
            ) : (
              <button style={headerBtnStyle} onClick={() => setView('menu')}>
                ‹ Back
              </button>
            )}
            <button style={headerBtnStyle} onClick={close}>
              ✕ Close
            </button>
          </div>

          {/* Scrollable body */}
          <div
            style={{
              flex: '1 1 auto',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '16px',
            }}
          >
            {view === 'menu' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
                <button style={menuItemStyle} onClick={() => setView('info')}>
                  <span>ℹ Info</span>
                  <span style={{ color: '#00c897' }}>›</span>
                </button>
                <button style={menuItemStyle} onClick={() => setView('controls')}>
                  <span>⚙ Controls</span>
                  <span style={{ color: '#00c897' }}>›</span>
                </button>
              </div>
            )}
            {view === 'info' && info}
            {view === 'controls' && controls}
          </div>
        </div>
      )}
    </>
  );
}

export default MobileMenu;

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { IconClose, IconInfo, IconSliders } from './icons';

type View = 'controls' | 'info';

interface MobileMenuProps {
  info: ReactNode;
  controls: ReactNode;
}

const TITLES: Record<View, string> = {
  controls: 'Controls',
  info: 'About Orbital Mesh',
};

/**
 * Phone layout: the globe stays visible. A bottom navigation with two items
 * (Controls, Info) opens a sheet above it. Tapping the active item, the close
 * button or pressing Escape closes the sheet and returns focus to the item.
 */
export function MobileMenu({ info, controls }: Readonly<MobileMenuProps>) {
  const [view, setView] = useState<View | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Record<View, HTMLButtonElement | null>>({ controls: null, info: null });
  const lastView = useRef<View | null>(null);
  const titleId = useId();

  const toggle = (next: View) => setView((current) => (current === next ? null : next));
  const close = () => setView(null);

  // Move focus into the sheet when it opens, back to the trigger when it closes.
  useEffect(() => {
    if (view) {
      lastView.current = view;
      closeRef.current?.focus();
    } else if (lastView.current) {
      triggerRefs.current[lastView.current]?.focus();
      lastView.current = null;
    }
  }, [view]);

  useEffect(() => {
    if (!view) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setView(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view]);

  const items: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'controls', label: 'Controls', icon: <IconSliders size={20} /> },
    { id: 'info', label: 'Info', icon: <IconInfo size={20} /> },
  ];

  return (
    <>
      {/* Always mounted (just hidden): the filter state lives inside the controls
          and must survive closing the sheet, otherwise the UI would show reset
          filters while the broker subscription is still filtered. */}
      <dialog
        className="hud-sheet"
        open={!!view}
        aria-labelledby={titleId}
        hidden={!view}
      >
        <div className="hud-sheet__head">
          <h2 id={titleId} className="hud-title">{TITLES[view ?? 'controls']}</h2>
          <button ref={closeRef} type="button" className="hud-btn hud-btn--icon hud-btn--ghost" onClick={close} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div className="hud-sheet__body">
          <div hidden={view !== 'controls'}>{controls}</div>
          <div hidden={view !== 'info'}>{info}</div>
        </div>
      </dialog>

      <nav className="hud-nav" aria-label="Main">
        {items.map((item) => (
          <button
            key={item.id}
            ref={(el) => { triggerRefs.current[item.id] = el; }}
            type="button"
            className="hud-nav__btn"
            aria-expanded={view === item.id}
            onClick={() => toggle(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}

export default MobileMenu;

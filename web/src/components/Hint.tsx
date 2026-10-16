import { useEffect, useState } from 'react';
import { IconClose } from './icons';

interface HintProps {
  mobile: boolean;
}

const HIDE_AFTER_MS = 12000;

/** One-time interaction hint. Disappears on its own, on first touch/drag, or via the close button. */
export function Hint({ mobile }: HintProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hide = () => setVisible(false);
    const timer = setTimeout(hide, HIDE_AFTER_MS);
    window.addEventListener('pointerdown', hide, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="hud-hint"
      role="note"
      style={mobile ? { bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' } : undefined}
    >
      <span>
        {mobile
          ? 'Drag to rotate · Pinch to zoom · Tap a satellite'
          : 'Drag to rotate · Scroll to zoom · Click a satellite to pin it'}
      </span>
      <button
        type="button"
        className="hud-btn hud-btn--icon hud-btn--ghost"
        onClick={() => setVisible(false)}
        aria-label="Dismiss hint"
        style={{ minHeight: 32, width: 32 }}
      >
        <IconClose />
      </button>
    </div>
  );
}

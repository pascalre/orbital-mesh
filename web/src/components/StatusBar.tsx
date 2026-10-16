import type { ConnectionStatus } from '../services/subscriber';
import { IconAlert, IconRefresh } from './icons';

interface StatusBarProps {
  status: ConnectionStatus;
  error: string | null;
  msgRate: number;
  satelliteCount: number;
  onRetry: () => void;
}

const LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting',
  live: 'Live',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
};

/**
 * Always-visible connection state, top centre. Replaces the status that used to
 * hide inside the controls panel (and was invisible on phones).
 */
export function StatusBar({ status, error, msgRate, satelliteCount, onRetry }: StatusBarProps) {
  return (
    <div className="hud-statusbar">
      <div className="hud-pill" data-status={status} role="status" aria-live="polite">
        <span className="hud-dot" aria-hidden="true" />
        <span>{LABEL[status]}</span>
        {status === 'live' && (
          <>
            <span className="hud-pill__sep" aria-hidden="true" />
            <span className="hud-pill__metric">
              {satelliteCount.toLocaleString('en-US')} sats · {msgRate.toLocaleString('en-US')} msg/s
            </span>
          </>
        )}
      </div>

      {status === 'offline' && (
        <div className="hud-statusbar__error" role="alert">
          <IconAlert style={{ color: 'var(--hud-danger)', flex: 'none' }} />
          <span title={error ?? undefined}>Can’t reach the event broker. Live data is paused.</span>
          <button type="button" className="hud-btn hud-btn--accent" onClick={onRetry}>
            <IconRefresh /> Retry
          </button>
        </div>
      )}
    </div>
  );
}

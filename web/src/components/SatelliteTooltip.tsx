import { IconClose } from './icons';

export interface SatelliteData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  alt: number;
  launchYear: number;
  inc: number;
  ecc: number;
  x: number;
  y: number;
}

interface SatelliteTooltipProps {
  data: SatelliteData | null;
  visible: boolean;
  x: number;
  y: number;
  /** Phone layout: the card is a bottom sheet above the navigation. */
  mobile?: boolean;
  /** Pinned cards (clicked or tapped) are interactive and closable; hover cards just follow the cursor. */
  pinned?: boolean;
  onClose?: () => void;
}

const CARD_WIDTH = 280;
const CARD_HEIGHT = 330;
const CARD_MARGIN = 12;

export const SatelliteTooltip = ({ data, visible, x, y, mobile = false, pinned = false, onClose }: SatelliteTooltipProps) => {
  if (!visible || !data) return null;

  const closable = mobile || pinned;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const left = Math.min(Math.max(x + 20, CARD_MARGIN), vw - CARD_WIDTH - CARD_MARGIN);
  const top = Math.min(Math.max(y + 20, CARD_MARGIN), vh - CARD_HEIGHT);

  const className = [
    'hud-card',
    mobile ? 'hud-card--sheet' : '',
    pinned ? 'hud-card--pinned' : '',
  ].filter(Boolean).join(' ');

  return (
    <aside
      className={className}
      aria-label={`Satellite ${data.name}`}
      style={mobile ? undefined : { left, top, pointerEvents: pinned ? 'auto' : 'none' }}
    >
      <div className="hud-card__head">
        <div>
          <h2 className="hud-card__name">{data.name}</h2>
          <p className="hud-card__meta">NORAD {data.id}</p>
        </div>
        {closable && (
          <button
            type="button"
            className="hud-btn hud-btn--icon hud-btn--ghost"
            onClick={onClose}
            aria-label="Close satellite details"
          >
            <IconClose />
          </button>
        )}
      </div>

      <dl className="hud-kv">
        <dt>Launch year</dt>
        <dd>{data.launchYear}</dd>
        <dt>Inclination</dt>
        <dd>{data.inc.toFixed(2)}°</dd>
        <dt>Eccentricity</dt>
        <dd>{data.ecc.toFixed(5)}</dd>
        <dt>Latitude</dt>
        <dd>{data.lat.toFixed(2)}°</dd>
        <dt>Longitude</dt>
        <dd>{data.lng.toFixed(2)}°</dd>
        <dt>Altitude</dt>
        <dd>{Math.round(data.alt).toLocaleString('en-US')} km</dd>
      </dl>

      {!mobile && !pinned && <p className="hud-card__hint">Click to pin this card</p>}
    </aside>
  );
};

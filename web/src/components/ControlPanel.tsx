import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { REGIONS, getRegion, cellsForRegion } from '../utils/geoGrid';
import type { ConnectionStatus } from '../services/subscriber';
import {
  IconChevronDown,
  IconCrosshair,
  IconReset,
} from './icons';

const ORBIT_OPTIONS: { value: string; label: string }[] = [
  { value: '*', label: 'All orbits' },
  { value: 'leo', label: 'LEO · Low Earth' },
  { value: 'sso', label: 'SSO · Sun-synchronous' },
  { value: 'po', label: 'PO · Polar' },
  { value: 'meo', label: 'MEO · Medium Earth' },
  { value: 'geo', label: 'GEO · Geostationary' },
  { value: 'heo', label: 'HEO · Highly elliptical' },
  { value: 'molniya', label: 'Molniya' },
];

const PROVIDER_VALUES = ["centispace", "cosmo", "ermis", "femto", "glonass", "gps", "hades", "hawk", "hulianwang", "iss", "irnss", "jack", "jilin", "kuiper", "lpntsat", "oneweb", "optisat", "parus", "progress", "qianfan", "rassvet", "shiyan", "spoqc", "starlink", "strix", "superview", "ten", "transporter", "xinzhengcheng"];
const PROVIDER_ACRONYMS = new Set(['gps', 'iss', 'irnss', 'glonass', 'spoqc', 'lpntsat']);
const PROVIDER_OPTIONS: { value: string; label: string }[] = [
  { value: '*', label: 'All providers' },
  ...PROVIDER_VALUES.map((value) => ({
    value,
    label: PROVIDER_ACRONYMS.has(value) ? value.toUpperCase() : value.charAt(0).toUpperCase() + value.slice(1),
  })),
];

const ISS_NORAD_ID = '25544';
const MAX_EVENTS = 5;
const EVENT_MIN_INTERVAL_MS = 250; // the feed is for humans, not a firehose
const EMPTY_HINT_DELAY_MS = 5000;

interface EventLog {
  id: string;
  timestamp: string;
  satellite: string;
  topic: string;
  altitude: number;
  latitude: number;
  longitude: number;
}

interface ControlPanelProps {
  /** Emits the full set of broker topics to subscribe to (one per grid cell when a region is chosen). */
  onFilterChange: (topics: string[]) => void;
  /** Raises the selected region key so the 3D grid overlay can be drawn. */
  onRegionChange?: (regionKey: string) => void;
  satelliteCount: number;
  status: ConnectionStatus;
  solaceData: any;
  autoRotate: boolean;
  onAutoRotateChange: (value: boolean) => void;
  /** When true, render content only (no fixed-corner panel chrome); the host sheet handles layout. */
  mobile?: boolean;
}

function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hud-clock">
      <time className="hud-clock__time" dateTime={now.toISOString()}>
        {now.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false })}
        <span className="hud-clock__unit"> UTC</span>
      </time>
      <span className="hud-eyebrow">
        {now.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' })}
      </span>
    </div>
  );
}

interface SectionProps {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, badge, defaultOpen = true, children }: Readonly<SectionProps>) {
  return (
    <details className="hud-section" open={defaultOpen}>
      <summary>
        <span className="hud-eyebrow">{title}</span>
        {badge ? <span className="hud-badge" aria-label={`${badge} active`}>{badge}</span> : null}
        <IconChevronDown className="hud-chevron" />
      </summary>
      <div className="hud-section__body">{children}</div>
    </details>
  );
}

export function ControlPanel({
  onFilterChange,
  onRegionChange,
  satelliteCount,
  status,
  solaceData,
  autoRotate,
  onAutoRotateChange,
  mobile = false,
}: Readonly<ControlPanelProps>) {
  const ids = {
    orbit: useId(),
    provider: useId(),
    norad: useId(),
    noradHint: useId(),
    region: useId(),
    rotate: useId(),
  };

  const [events, setEvents] = useState<EventLog[]>([]);
  const lastEventAt = useRef(0);

  const [selectedOrbit, setSelectedOrbit] = useState('*');
  const [selectedNoradID, setSelectedNoradID] = useState('*');
  const [selectedProvider, setSelectedProvider] = useState('*');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [settled, setSettled] = useState(false);

  const isTrackingISS =
    selectedOrbit === 'leo' && selectedProvider === 'iss' && selectedNoradID === ISS_NORAD_ID && selectedRegion === 'all';

  const activeFilterCount =
    (selectedOrbit !== '*' ? 1 : 0) +
    (selectedProvider !== '*' ? 1 : 0) +
    (selectedNoradID !== '*' ? 1 : 0) +
    (selectedRegion !== 'all' ? 1 : 0);

  const focusISS = () => {
    setEvents([]);
    setSelectedOrbit('leo');
    setSelectedProvider('iss');
    setSelectedNoradID(ISS_NORAD_ID);
    setSelectedRegion('all');
  };

  const clearFilters = () => {
    setEvents([]);
    setSelectedOrbit('*');
    setSelectedProvider('*');
    setSelectedNoradID('*');
    setSelectedRegion('all');
  };

  useEffect(() => {
    if (!solaceData) return;

    // Throttle: the event stream is a glance, not a log.
    const nowMs = Date.now();
    if (nowMs - lastEventAt.current < EVENT_MIN_INTERVAL_MS) return;

    try {
      const rawString: string =
        typeof solaceData.getBinaryAttachment === 'function' ? solaceData.getBinaryAttachment() : solaceData;

      const jsonStart = rawString.indexOf('{');
      const jsonEnd = rawString.lastIndexOf('}');
      if (jsonStart === -1) return;

      const payload = JSON.parse(rawString.substring(jsonStart, jsonEnd + 1));
      const topicName: string = solaceData.getDestination ? solaceData.getDestination().getName() : 'N/A';

      lastEventAt.current = nowMs;
      const newEvent: EventLog = {
        id: `${nowMs}-${payload.id ?? payload.name ?? 'sat'}`,
        timestamp: new Date(nowMs).toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' }),
        satellite: String(payload.id || payload.name || 'Unknown'),
        topic: topicName,
        altitude: Number(payload.alt ?? payload.altitude ?? 0),
        latitude: Number(payload.lat ?? payload.latitude ?? 0),
        longitude: Number(payload.lng ?? payload.longitude ?? 0),
      };

      setEvents((prev) => [newEvent, ...prev].slice(0, MAX_EVENTS));
    } catch (e) {
      console.error('Stream Error:', e);
    }
  }, [solaceData]);

  // Build the broker subscription topics. Base filter is orbit/provider/norad;
  // when a region is selected we fan out to one topic per grid cell it covers.
  const activeTopics = useMemo(() => {
    const orbit = selectedOrbit;
    const provider = selectedProvider;
    const noradID = selectedNoradID;
    const base = `earth/sat/tracked/${orbit}/${provider}/${noradID}`;

    const region = getRegion(selectedRegion);
    if (!region || region.key === 'all') {
      // Match the two trailing geo levels with single-level wildcards.
      return [`${base}/*/*`];
    }

    const cells = cellsForRegion(region);
    return cells.map((c) => `${base}/${c.latIdx}/${c.lngIdx}`);
  }, [selectedOrbit, selectedProvider, selectedNoradID, selectedRegion]);

  const topicKey = activeTopics.join('|');

  useEffect(() => {
    onFilterChange(activeTopics);
  }, [activeTopics, onFilterChange]);

  useEffect(() => {
    onRegionChange?.(selectedRegion);
  }, [selectedRegion, onRegionChange]);

  // After a filter change, give the broker a moment before claiming "no results".
  useEffect(() => {
    setSettled(false);
    const timer = setTimeout(() => setSettled(true), EMPTY_HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [topicKey]);

  const showEmptyHint = status === 'live' && settled && satelliteCount === 0;

  const body = (
    <>
      <Clock />

      <Section title="Filters" badge={activeFilterCount}>
        <div className="hud-fields">
          <div className="hud-field">
            <label className="hud-label" htmlFor={ids.orbit}>Orbit</label>
            <select
              id={ids.orbit}
              className="hud-select"
              value={selectedOrbit}
              onChange={(e) => setSelectedOrbit(e.target.value)}
            >
              {ORBIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="hud-field">
            <label className="hud-label" htmlFor={ids.provider}>Provider</label>
            <select
              id={ids.provider}
              className="hud-select"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
            >
              {PROVIDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="hud-field">
            <label className="hud-label" htmlFor={ids.norad}>NORAD ID</label>
            <input
              id={ids.norad}
              className="hud-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={9}
              placeholder="any"
              aria-describedby={ids.noradHint}
              value={selectedNoradID === '*' ? '' : selectedNoradID}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                setSelectedNoradID(digits === '' ? '*' : digits);
              }}
            />
            <span id={ids.noradHint} className="hud-sr-only">Digits only. Leave empty for all satellites.</span>
          </div>

          <div className="hud-field">
            <label className="hud-label" htmlFor={ids.region}>Region</label>
            <select
              id={ids.region}
              className="hud-select"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              {REGIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
        </div>

        <div className="hud-actions">
          <button type="button" className="hud-btn hud-btn--accent" aria-pressed={isTrackingISS} onClick={focusISS}>
            <IconCrosshair /> Track ISS
          </button>
          <button type="button" className="hud-btn" onClick={clearFilters} disabled={activeFilterCount === 0}>
            <IconReset /> Reset
          </button>
        </div>

        {showEmptyHint && (
          <output className="hud-notice">
            <span>No satellites match these filters right now. Widen the filters or reset them.</span>
          </output>
        )}
      </Section>

      <Section title="View">
        <button
          type="button"
          id={ids.rotate}
          className="hud-switch"
          role="switch"
          aria-checked={autoRotate}
          onClick={() => onAutoRotateChange(!autoRotate)}
        >
          <span>Auto-rotate globe</span>
          <span className="hud-switch__track" aria-hidden="true" />
        </button>
      </Section>

      <Section title="Subscription">
        <p className="hud-sub-count">
          {activeTopics.length === 1
            ? '1 subscription'
            : `${activeTopics.length.toLocaleString('en-US')} subscriptions`}
        </p>
        <div className="hud-code">
          <code className="hud-code__list" aria-label="Active topic subscriptions">
            {activeTopics.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </code>
        </div>
      </Section>

      <Section title="Event stream">
        {events.length === 0 ? (
          <p className="hud-empty">
            <span className="hud-dot" aria-hidden="true" />
            <span>Waiting for orbital telemetry…</span>
          </p>
        ) : (
          <ol className="hud-feed" aria-label="Latest position events">
            {events.map((event) => (
              <li key={event.id} title={event.topic}>
                <span className="hud-feed__time">{event.timestamp}</span>
                <span className="hud-feed__id">#{event.satellite}</span>
                <span className="hud-dim">{Math.round(event.altitude).toLocaleString('en-US')} km</span>
                <span className="hud-feed__pos">
                  {event.latitude.toFixed(2)}°, {event.longitude.toFixed(2)}°
                </span>
                <span className="hud-feed__topic">{event.topic}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );

  if (mobile) {
    return <div className="hud-flat">{body}</div>;
  }

  return (
    <aside className="hud-panel hud-panel--right" aria-label="Controls">
      <div className="hud-panel__scroll">{body}</div>
    </aside>
  );
}

export default ControlPanel;

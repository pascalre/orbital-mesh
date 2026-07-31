import React from 'react';

interface SatelliteData {
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
  mobile?: boolean;
  onClose?: () => void;
}

const CARD_WIDTH = 280;
const CARD_MARGIN = 12;

export const SatelliteTooltip = ({ data, visible, x, y, mobile = false, onClose }: SatelliteTooltipProps) => {
  if (!visible || !data) return null;

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    paddingBottom: '4px',
    marginBottom: '10px',
    marginTop: '18px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#ccc'
  };

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    marginBottom: '4px'
  };

  const valueStyle: React.CSSProperties = {
    color: '#00c897',
    fontWeight: 'bold'
  };

  // Desktop: follow the cursor but keep the card fully on-screen.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const clampedLeft = Math.min(Math.max(x + 20, CARD_MARGIN), vw - CARD_WIDTH - CARD_MARGIN);
  const clampedTop = Math.min(Math.max(y + 20, CARD_MARGIN), vh - 320);

  const desktopStyle: React.CSSProperties = {
    position: 'fixed',
    left: clampedLeft,
    top: clampedTop,
    zIndex: 10000,
    width: `${CARD_WIDTH}px`,
    pointerEvents: 'none',
  };

  // Mobile: pinned above the tab bar, dismissible, always on-screen.
  const mobileStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${CARD_MARGIN}px`,
    right: `${CARD_MARGIN}px`,
    bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
    zIndex: 10000,
    width: 'auto',
    pointerEvents: 'auto',
  };

  return (
    <div style={{
      ...(mobile ? mobileStyle : desktopStyle),
      color: 'white',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      padding: '15px 20px',
      borderRadius: '12px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      fontFamily: 'monospace',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      boxSizing: 'border-box',
    }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h2 style={{ ...sectionHeaderStyle, marginTop: 0, color: 'white', fontSize: '0.95rem', flex: 1 }}>
          {data.name} 🛰️
        </h2>
        {mobile && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#00c897',
              cursor: 'pointer',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '1rem',
              lineHeight: 1,
              marginLeft: '10px',
            }}
          >
            ✕
          </button>
        )}
      </div>
      <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
        <div style={statRowStyle}>
          <span>NORAD ID</span>
          <span style={valueStyle}>{data.id}</span>
        </div>
        <div style={statRowStyle}>
          <span>Launch Year</span>
          <span style={valueStyle}>{data.launchYear}</span>
        </div>
        <div style={statRowStyle}>
          <span>Inclination</span>
          <span style={valueStyle}>{data.inc.toFixed(2)}°</span>
        </div>
        <div style={statRowStyle}>
          <span>Eccentricity</span>
          <span style={valueStyle}>{data.ecc.toFixed(5)}</span>
        </div>
        <div style={statRowStyle}>
          <span>Latitude</span>
          <span style={valueStyle}>{data.lat.toFixed(2)}°</span>
        </div>
        <div style={statRowStyle}>
          <span>Longitude</span>
          <span style={valueStyle}>{data.lng.toFixed(2)}°</span>
        </div>
        <div style={statRowStyle}>
          <span>Altitude</span>
          <span style={valueStyle}>{Math.round(data.alt)} km</span>
        </div>
      </div>
    </div>
  );
};
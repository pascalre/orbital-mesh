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
}

export const SatelliteTooltip = ({ data, visible, x, y }: SatelliteTooltipProps) => {
  if (!visible || !data) return null;

  // Gemeinsame Styles vom ControlPanel übernommen
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

  return (
    <div style={{
      position: 'fixed',
      left: x,
      top: y,
      transform: 'translate(20px, 20px)', // Versatz damit Cursor nichts verdeckt
      zIndex: 10000,
      color: 'white',
      backgroundColor: 'rgba(0, 0, 0, 0.75)', // Exakt wie ControlPanel
      padding: '15px 20px',
      borderRadius: '12px',
      width: '280px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      fontFamily: 'monospace',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      pointerEvents: 'none'
    }}>
      {/* Header Bereich */}
      <h2 style={{ ...sectionHeaderStyle, marginTop: 0, color: 'white', fontSize: '0.95rem' }}>
        {data.name} 🛰️ 
      </h2>

      {/* Stats Sektion im Kachel-Look */}
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
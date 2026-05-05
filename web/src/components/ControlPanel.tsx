import * as React from 'react';
import { useMemo } from 'react';
import { useState, useEffect } from 'react';

const ORBIT_OPTIONS = ["*", "leo", "geo", "sso", "meo", "heo", "molniya", "po"];
const PROVIDER_OPTIONS = ["*", "centispace", "cosmo", "ermis", "femto", "glonass", "gps", "hades", "hawk", "hulianwang", "iss", "irnss", "jack", "jilin", "kuiper", "lpntsat", "oneweb", "optisat", "parus", "progress", "qianfan", "rassvet", "shiyan", "spoqc", "starlink", "strix", "superview", "ten", "transporter", "xinzhengcheng"];
interface EventLog {
  id: string;
  timestamp: string;
  satellite: string;
  topic: string;
  altitude: number;
  latitude?: number;
  longitude?: number;
}
interface ControlPanelProps {
  onFilterChange: (topic: string) => void;
  satelliteCount: number;
  msgRate: number;
  isConnected: boolean;
  solaceData: any;
}

export function ControlPanel({ onFilterChange, satelliteCount, msgRate, isConnected, solaceData }: ControlPanelProps) {
  const [events, setEvents] = useState<EventLog[]>([]);

  const [time, setTime] = useState(new Date());
  const [selectedOrbit, setSelectedOrbit] = React.useState("*");
  const [selectedNoradID, setSelectedNoradID] = React.useState("*");
  const [selectedProvider, setSelectedProvider] = React.useState("*");

  const focusISS = () => {
    setEvents([]);
    setSelectedOrbit("leo");
    setSelectedProvider("iss");
    setSelectedNoradID("25544");
  };

  const clearFilters = () => {
    setEvents([]);
    setSelectedOrbit("*");
    setSelectedProvider("*");
    setSelectedNoradID("*");
  };

  const getTopicPart = (value: string) => value === "ALL" ? "*" : value;

  useEffect(() => {
    if (!solaceData) return;
    try {
      let rawString = "";
      if (typeof solaceData.getBinaryAttachment === 'function') {
        rawString = solaceData.getBinaryAttachment();
      } else {
        rawString = solaceData;
      }

      const jsonStart = rawString.indexOf('{');
      const jsonEnd = rawString.lastIndexOf('}');
      if (jsonStart === -1) return;

      const payload = JSON.parse(rawString.substring(jsonStart, jsonEnd + 1));
      const topicName = solaceData.getDestination ? solaceData.getDestination().getName() : 'N/A';


      const newEvent: EventLog = {
        id: Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' }),
        satellite: payload.id || payload.name || 'Unknown',
        topic: topicName,
        altitude: payload.alt || payload.altitude || 0,
        latitude: payload.lat || payload.latitude || 0,
        longitude: payload.lng || payload.longitude || 0,
      };

      setEvents(prev => [newEvent, ...prev].slice(0, 5));
    } catch (e) {
      console.error("Stream Error:", e);
    }
  }, [solaceData]);

  const activeTopic = useMemo(() => {
    const orbit = getTopicPart(selectedOrbit);
    const provider = getTopicPart(selectedProvider);
    const noradID = getTopicPart(selectedNoradID);
    return `earth/sat/tracked/${orbit}/${provider}/${noradID}`;
  }, [selectedOrbit, selectedProvider, selectedNoradID]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    onFilterChange(activeTopic);
  }, [activeTopic, onFilterChange]);

  const filterGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    marginRight: '12px'
  };

  const selectStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#00c897',
    border: '1px solid rgba(0, 242, 255, 0.3)',
    borderRadius: '4px',
    padding: '6px',
    width: '100%',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer'
  };

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
    marginBottom: '6px'
  };

  return (
    <div style={{
      position: 'absolute',
      top: '25px',
      right: '25px',
      zIndex: 10,
      color: 'white',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: '20px 25px',
      borderRadius: '14px',
      width: '430px',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      fontFamily: 'sans-serif',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      maxHeight: 'calc(100vh - 100px)',
      overflowY: 'auto',
    }}>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontFamily: 'monospace' }}>
        <div style={{ fontWeight: 'bold', letterSpacing: '2px', fontSize: '1.6rem' }}>
          {time.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false })} UTC
        </div>
        <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '2px' }}>
          {time.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' })}
        </div>
      </div>

      <h2 style={sectionHeaderStyle}>FILTERS</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>

        <div style={filterGroupStyle}>
          <span style={{ fontSize: '0.75rem', marginBottom: '5px', opacity: 0.7 }}>Orbit</span>
          <select style={selectStyle} value={selectedOrbit} onChange={(e) => setSelectedOrbit(e.target.value)}>
            {ORBIT_OPTIONS.map(opt => <option key={opt} value={opt} style={{ color: 'black' }}>{opt}</option>)}
          </select>
        </div>

        <div style={filterGroupStyle}>
          <span style={{ fontSize: '0.75rem', marginBottom: '5px', opacity: 0.7 }}>Provider</span>
          <select style={selectStyle} value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}>
            {PROVIDER_OPTIONS.map(opt => <option key={opt} value={opt} style={{ color: 'black' }}>{opt}</option>)}
          </select>
        </div>

        <div style={{ ...filterGroupStyle, marginRight: 0 }}>
          <span style={{ fontSize: '0.75rem', marginBottom: '5px', opacity: 0.7 }}>NORAD ID</span>
          <input
            type="text"
            placeholder="*"
            style={{
              ...selectStyle,
              cursor: 'text',
              boxSizing: 'border-box',
            }}
            value={selectedNoradID === '*' ? '' : selectedNoradID}
            onChange={(e) => {
              const val = e.target.value.trim();
              setSelectedNoradID(val === '' ? '*' : val);
            }}
          />
        </div>
      </div>
      <div style={{
        marginTop: '12px',
        display: 'flex',
        gap: '10px',
        justifyContent: 'space-between'
      }}>
        <button
          onClick={focusISS}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 200, 151, 0.1)',
            border: '1px solid #00c897',
            color: '#00c897',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            letterSpacing: '1px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 200, 151, 0.2)';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 200, 151, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 200, 151, 0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          TRACK ISS
        </button>

        <button
          onClick={clearFilters}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 200, 151, 0.1)',
            border: '1px solid #00c897',
            color: '#00c897',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            letterSpacing: '1px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
        >
          CLEAR FILTERS
        </button>
      </div>

      <h2 style={sectionHeaderStyle}>LIVE STATS</h2>
      <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
        <div style={statRowStyle}>
          <span>Status</span>
          <span style={{ color: isConnected ? '#00c897' : '#ff4444', fontWeight: 'bold' }}>
            {isConnected ? '● ONLINE' : '○ OFFLINE'}
          </span>
        </div>

        <div style={{ ...statRowStyle, flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
          <span>Subscription</span>
          <span style={{
            opacity: 0.8,
            fontSize: '0.85rem',
            wordBreak: 'break-all',
            lineHeight: '1.2',
            fontFamily: 'monospace'
          }}>
            {activeTopic}
          </span>
        </div>

        <div style={statRowStyle}>
          <span>Message Rate</span>
          <span style={{ fontFamily: 'monospace' }}>{msgRate} msg/s</span>
        </div>
        <div style={statRowStyle}>
          <span>Tracked Satellites</span>
          <span style={{ fontFamily: 'monospace' }}>{satelliteCount}</span>
        </div>
      </div>

      <h2 style={sectionHeaderStyle}>EVENT STREAM</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {events.length === 0 && (
          <p style={{ fontSize: '0.85rem', opacity: 0.5, fontStyle: 'italic' }}>Waiting for orbital telemetry...</p>
        )}
        {events.map((event) => (
          <p style={{ fontSize: '0.65rem', fontFamily: 'monospace', borderLeft: '3px solid #00c897', paddingLeft: '12px', lineHeight: '1.4' }}>
            {event.topic}<br />[{event.timestamp}] LAT: {event.latitude?.toFixed(2)}, LON: {event.longitude?.toFixed(2)}, ALT: {event.altitude.toFixed(2)}
          </p>
        ))}
      </div>
    </div>
  );
}

export default ControlPanel;
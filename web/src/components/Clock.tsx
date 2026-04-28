import { useState, useEffect } from 'react';

export function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer); // Cleanup bei Unmount
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '1.5rem',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: '10px 20px',
      borderRadius: '8px',
      backdropFilter: 'blur(5px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      zIndex: 1000, // Damit sie über dem Canvas liegt
      pointerEvents: 'none', // Verhindert, dass die Uhr OrbitControls blockiert
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end'
    }}>
      <div style={{ fontWeight: 'bold', letterSpacing: '2px' }}>
        {time.toLocaleTimeString('en-US', { 
  timeZone: 'UTC', 
  hour12: false 
})} UTC
      </div>
      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
        {time.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' })}
      </div>
    </div>
  );
}
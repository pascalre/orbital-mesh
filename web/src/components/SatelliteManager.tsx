import { useState, useEffect } from 'react';
import { Satellite } from './Satellite';

interface SatelliteManagerProps {
  filterTopic: string;
  solaceData: any;
  isConnected: boolean;
  onHoverSatellite: (data: any) => void;
}

export function SatelliteManager({ 
  filterTopic, 
  solaceData, 
  isConnected, 
  onHoverSatellite 
}: SatelliteManagerProps) {
  const [satelliteMap, setSatelliteMap] = useState<Record<string, any>>({});

  // 1. Reset der Map bei Filterwechsel
  useEffect(() => {
    setSatelliteMap({});
    onHoverSatellite(null);
  }, [filterTopic]);

  // 2. Nachrichtenverarbeitung mit robustem Parsing
  useEffect(() => {
    if (!solaceData) return;

    try {
      let rawString = "";

      // Extrahiere den String aus der Solace Message
      if (typeof solaceData.getBinaryAttachment === 'function') {
        rawString = solaceData.getBinaryAttachment();
      } else {
        rawString = solaceData;
      }

      if (!rawString || typeof rawString !== 'string') return;

      // Robustes JSON-Extraction (sucht den ersten { und letzten })
      const jsonStart = rawString.indexOf('{');
      const jsonEnd = rawString.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) return;

      const payload = JSON.parse(rawString.substring(jsonStart, jsonEnd + 1));

      // ID Bestimmung
      const satId = payload.id || payload.name || payload.noradId;
      if (!satId) return;

      // Update der Map (nur wenn Koordinaten vorhanden)
      if (payload.lat !== undefined && payload.lng !== undefined) {
        setSatelliteMap(prev => ({
          ...prev,
          [satId]: {
            ...payload,
            // Sicherstellen, dass Koordinaten Zahlen sind für Three.js
            lat: Number(payload.lat),
            lng: Number(payload.lng),
            alt: Number(payload.alt || 0),
            lastUpdate: Date.now()
          }
        }));
      }
    } catch (e) {
      console.error("SatelliteManager Parsing Error:", e);
    }
  }, [solaceData]);

  if (!isConnected) return null;

  return (
    <>
      {Object.entries(satelliteMap).map(([id, satData]) => (
        <Satellite 
          key={id} 
          name={satData.name} 
          data={satData} 
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverSatellite({ 
              ...satData, 
              x: e.clientX, 
              y: e.clientY 
            });
            document.body.style.cursor = 'pointer';
          }}
          onPointerMove={(e) => {
            onHoverSatellite({ 
              ...satData,
              x: e.clientX, 
              y: e.clientY 
            });
          }}
          onPointerOut={() => {
            onHoverSatellite(null);
            document.body.style.cursor = 'auto';
          }}
        />
      ))}
    </>
  );
}
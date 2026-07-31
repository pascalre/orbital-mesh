import { useState, useEffect, useRef } from 'react';
import { Satellite } from './Satellite';

interface SatelliteManagerProps {
  filterTopics: string[];
  solaceData: any;
  isConnected: boolean;
  onHoverSatellite: (data: any) => void;
  onCountChange?: (count: number) => void;
  isMobile?: boolean;
}

export function SatelliteManager({
  filterTopics,
  solaceData,
  isConnected,
  onHoverSatellite,
  onCountChange,
  isMobile = false
}: SatelliteManagerProps) {
  const [satelliteMap, setSatelliteMap] = useState<Record<string, any>>({});
  const lastFilterChange = useRef(Date.now());
  const filterKey = filterTopics.join('|');

  useEffect(() => {
    setSatelliteMap({});
    onHoverSatellite(null);
    lastFilterChange.current = Date.now();
  }, [filterKey]);

  useEffect(() => {
    if (onCountChange) {
      onCountChange(Object.keys(satelliteMap).length);
    }
  }, [satelliteMap, onCountChange]);

  useEffect(() => {
    if (!solaceData) return;

    if (Date.now() - lastFilterChange.current < 500) return;

    try {
      const rawString = typeof solaceData.getBinaryAttachment === 'function'
        ? solaceData.getBinaryAttachment()
        : solaceData;

      const jsonStart = rawString.indexOf('{');
      const jsonEnd = rawString.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) return;
      const payload = JSON.parse(rawString.substring(jsonStart, jsonEnd + 1));

      const incomingTopic = typeof solaceData.getDestination === 'function'
        ? solaceData.getDestination().getName()
        : '';
      if (!filterTopics.some((f) => isTopicMatch(incomingTopic, f))) {
        return;
      }

      const satId = payload.id || payload.name || payload.noradId;
      if (!satId) return;

      setSatelliteMap(prev => ({
        ...prev,
        [satId]: {
          ...payload,
          lastUpdate: Date.now()
        }
      }));
    } catch (e) {
      console.error("SatelliteManager Sync Error:", e);
    }
  }, [solaceData, filterKey]);

  // Level-by-level match with '*' (single level) and '>' (multi-level tail),
  // matching the broker's semantics and useSolace's client-side filter.
  function isTopicMatch(incoming: string, filter: string): boolean {
    if (filter === "*" || filter.includes(">")) return true;

    const iParts = incoming.split('/');
    const fParts = filter.split('/');
    if (iParts.length !== fParts.length) return false;

    for (let i = 0; i < fParts.length; i++) {
      if (fParts[i] !== "*" && fParts[i] !== iParts[i]) return false;
    }
    return true;
  }

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
            // On touch, don't chase the finger — keep the pinned card stable.
            if (isMobile) return;
            onHoverSatellite({
              ...satData,
              x: e.clientX,
              y: e.clientY
            });
          }}
          onPointerOut={() => {
            // On touch there's no real "out"; the tooltip's close button dismisses it.
            if (isMobile) return;
            onHoverSatellite(null);
            document.body.style.cursor = 'auto';
          }}
        />
      ))}
    </>
  );
}
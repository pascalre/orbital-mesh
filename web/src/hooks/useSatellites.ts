import { useRef, useEffect } from 'react';
import { useSolace } from './useSolace';

export const useSatellites = (topic: string) => {
  // Wir nutzen ein Objekt als Map: { "25544": { lat: ..., lng: ... }, ... }
  const satellitesMapRef = useRef<Record<string, any>>({});
  
  const { data } = useSolace(topic);

  useEffect(() => {
    if (data && data.noradId) {
      // Update oder Hinzufügen des Satelliten im Ref
      satellitesMapRef.current[data.noradId] = {
        ...data,
        lastUpdate: Date.now()
      };
    }
  }, [data]);

  return satellitesMapRef;
};
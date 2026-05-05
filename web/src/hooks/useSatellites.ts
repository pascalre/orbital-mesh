import { useRef, useEffect } from 'react';
import { useSolace } from './useSolace';

export const useSatellites = (topic: string) => {
  const satellitesMapRef = useRef<Record<string, any>>({});
  
  const { data } = useSolace(topic);

  useEffect(() => {
    if (data && data.noradId) {
      satellitesMapRef.current[data.noradId] = {
        ...data,
        lastUpdate: Date.now()
      };
    }
  }, [data]);

  return satellitesMapRef;
};
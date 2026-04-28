import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

export const useDummySatellites = (count: number = 500) => {
  const satellitesRef = useRef<any[]>([]);

  useEffect(() => {
    // Initialisiere Dummy-Daten
    const dummies = Array.from({ length: count }).map((_, i) => ({
      id: `dummy-${i}`,
      lat: (Math.random() - 0.5) * 180,
      lng: (Math.random() - 0.5) * 360,
      alt: 400 + Math.random() * 2000, // LEO Bereich
      speed: 0.05 + Math.random() * 0.1
    }));
    satellitesRef.current = dummies;
  }, [count]);

  useFrame((state, delta) => {
    // Simuliere Bewegung: Wir lassen sie einfach nach Osten driften
    satellitesRef.current.forEach(sat => {
      sat.lng = (sat.lng + sat.speed) % 360;
    });
  });

  return satellitesRef;
};
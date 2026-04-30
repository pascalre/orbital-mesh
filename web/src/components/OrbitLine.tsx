import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { geodeticToVec3 } from '../utils/coordinateConversion';

export function OrbitLine({ data }: { data: any }) {
  const lineRef = useRef<THREE.Line>(null);

  const lineGeometry = useMemo(() => {
    if (!data || data.alt === undefined) return null;

    const points = [];
    const segments = 256; // Höhere Auflösung für Ellipsen
    const EARTH_RADIUS = 2;
    
    // 1. Bahnelemente extrahieren
    const inc = THREE.MathUtils.degToRad(data.inc || 0); // Neigung
    const ecc = data.ecc || 0; // Exzentrizität (0 = Kreis, >0 = Ellipse)
    
    // Mittlerer Radius (Große Halbachse a)
    // Wir nehmen an, die übermittelte Höhe ist die aktuelle Höhe
    const a = EARTH_RADIUS + (Number(data.alt) / 6371) * EARTH_RADIUS; 

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      
      // 2. Die Ellipsen-Formel (Kepler-Bahn)
      // r = a * (1 - e^2) / (1 + e * cos(theta))
      const r = (a * (1 - Math.pow(ecc, 2))) / (1 + ecc * Math.cos(theta));

      // Punkt in der Bahnebene berechnen
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      
      points.push(new THREE.Vector3(x, 0, z));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [data]);

  useFrame(() => {
    if (lineRef.current && data) {
      // 3. Ausrichtung im Raum
      const targetPos = geodeticToVec3(data.lat, data.lng, data.alt);
      
      // Wir richten die gesamte Ellipse so aus, dass sie durch die 
      // aktuelle Position des Satelliten verläuft
      lineRef.current.lookAt(targetPos);
      
      // Korrektur: Die Inklination steckt oft schon in der targetPos-Ausrichtung,
      // aber wir müssen die Scheibe um 90 Grad kippen, damit "flach" zum Kern.
      lineRef.current.rotateX(Math.PI / 2);
    }
  });

  if (!lineGeometry) return null;

  return (
    <line ref={lineRef} geometry={lineGeometry}>
      <lineBasicMaterial 
        color="#00f2ff" 
        transparent 
        opacity={0.7} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </line>
  );
}
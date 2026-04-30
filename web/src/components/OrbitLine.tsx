import * as THREE from 'three';
import { useMemo } from 'react';

export function OrbitLine({ data }: { data: any }) {
  const lineGeometry = useMemo(() => {
    if (!data || data.alt === undefined) return null;

    // --- EMERGENCY CALIBRATION ---
    const LNG_OFFSET = 0;
    const INC_OFFSET = 95;
    // ----------------------------

    const points = [];
    const segments = 256; 
    const EARTH_RADIUS = 2;
    const ecc = data.ecc || 0;
    const a = EARTH_RADIUS + (Number(data.alt) / 6371) * EARTH_RADIUS; 

    // Calculate angles in radians
    const baseLng = (data.lng + LNG_OFFSET) * (Math.PI / 180);
    const baseInc = (data.inc + INC_OFFSET) * (Math.PI / 180);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const r = (a * (1 - Math.pow(ecc, 2))) / (1 + ecc * Math.cos(theta));

      // 1. Create point in the orbital plane
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;
      const z = 0;

      const point = new THREE.Vector3(x, y, z);

      // 2. Rotate point by inclination (around X axis)
      point.applyAxisAngle(new THREE.Vector3(1, 0, 0), baseInc);

      // 3. Rotate point by longitude (around Y axis)
      point.applyAxisAngle(new THREE.Vector3(0, 1, 0), baseLng);

      points.push(point);
    }

    return new THREE.BufferGeometry().setFromPoints(points);
    // Important: We add LNG_OFFSET to dependencies to force a rebuild
  }, [data.id, data.alt, data.lat, data.lng]); 

  if (!lineGeometry) return null;

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial 
        color="#00f2ff" 
        transparent 
        opacity={0.8} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </line>
  );
}
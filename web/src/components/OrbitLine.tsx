import * as THREE from 'three';
import { useMemo } from 'react';

export function OrbitLine({ data }: { data: any }) {
  // 1. Create the material outside of useMemo for efficiency
  const material = useMemo(() => new THREE.LineBasicMaterial({
    color: "#00f2ff",
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }), []);

  const orbitLineObject = useMemo(() => {
    if (!data || data.alt === undefined) return null;

    // --- CALIBRATION ---
    const LNG_OFFSET = 105; 
    const INC_OFFSET = 0;
    // -------------------

    const points = [];
    const segments = 256; 
    const EARTH_RADIUS = 2;
    const ecc = data.ecc || 0;
    const a = EARTH_RADIUS + (Number(data.alt) / 6371) * EARTH_RADIUS; 

    // Convert angles to radians
    const baseLng = (data.lng + LNG_OFFSET) * (Math.PI / 180);
    const baseInc = (data.inc + INC_OFFSET) * (Math.PI / 180);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const r = (a * (1 - Math.pow(ecc, 2))) / (1 + ecc * Math.cos(theta));

      // Create point in equatorial plane
      const point = new THREE.Vector3(
        Math.cos(theta) * r,
        0,
        Math.sin(theta) * r
      );

      // Apply Inclination (Tilt)
      point.applyAxisAngle(new THREE.Vector3(1, 0, 0), baseInc);
      // Apply Longitude (Earth rotation alignment)
      point.applyAxisAngle(new THREE.Vector3(0, 1, 0), baseLng);

      points.push(point);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Return a full Three.js Line object
    return new THREE.Line(geometry, material);
  }, [data.id, data.alt, data.lng, data.inc, material]); 

  if (!orbitLineObject) return null;

  // Use <primitive /> to bypass all JSX/SVG name conflicts
  return <primitive object={orbitLineObject} />;
}
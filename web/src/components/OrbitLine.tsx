import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { geodeticToVec3 } from '../utils/coordinateConversion';

export function OrbitLine({ data }: { data: any }) {
  const lineRef = useRef<THREE.Line>(null);

  // Geometrie (Radius 2)
  const lineGeometry = useMemo(() => {
    if (!data || data.alt === undefined) return null;
    const EARTH_RADIUS = 2; 
    const radius = EARTH_RADIUS + (Number(data.alt) / 6371) * EARTH_RADIUS; 
    const points = [];
    for (let i = 0; i <= 128; i++) {
      const theta = (i / 128) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [data]);

  useFrame(() => {
    if (lineRef.current && data) {
      const now = new Date();
      const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
      const dayRotation = -(utcHours / 24) * 2 * Math.PI;
      const TEXTURE_OFFSET = Math.PI;
      const currentRotY = dayRotation + TEXTURE_OFFSET;

      // Position berechnen inkl. Rotation
      const targetPos = geodeticToVec3(data.lat, data.lng, data.alt, currentRotY);
      
      lineRef.current.lookAt(targetPos);
      lineRef.current.rotateX(Math.PI / 2);
    }
  });

  return (
    <line ref={lineRef} geometry={lineGeometry!}>
      <lineBasicMaterial color="#00f2ff" transparent opacity={0.6} blending={THREE.AdditiveBlending}/>
    </line>
  );
}
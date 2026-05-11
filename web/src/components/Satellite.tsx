import { useRef, useMemo, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { geodeticToVec3 } from '../utils/coordinateConversion';

interface SatelliteProps extends React.ComponentPropsWithoutRef<'mesh'> {
  data: {
    lat: number;
    lng: number;
    alt: number;
  };
  name: string;
}

export function Satellite({ data, onPointerOver, onPointerOut, ...props }: SatelliteProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const targetPosition = useMemo(() => {
    return geodeticToVec3(data.lat, data.lng, data.alt);
  }, [data.lat, data.lng, data.alt]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.lerp(targetPosition, 0.1);

      const targetScale = hovered ? 1.75 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
    }
  });

  return (
    <mesh
      ref={meshRef}
      {...props}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        setHovered(true);
        if (typeof onPointerOver === 'function') {
          onPointerOver(e);
        }
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        setHovered(false);
        if (typeof onPointerOut === 'function') {
          onPointerOut(e);
        }
      }}
    >
      <sphereGeometry args={[0.03, 16, 16]} />
      <meshStandardMaterial
        color={hovered ? "#ffeb3b" : "#00c897"}
        emissive={hovered ? "#ffeb3b" : "#009670"}
        emissiveIntensity={hovered ? 5 : 2}
        toneMapped={false}
      />
    </mesh>
  );
}
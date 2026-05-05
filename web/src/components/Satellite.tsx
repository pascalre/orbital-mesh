import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
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

export function Satellite({ data, ...props }: SatelliteProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const targetPosition = useMemo(() => {
    return geodeticToVec3(data.lat, data.lng, data.alt);
  }, [data.lat, data.lng, data.alt]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.lerp(targetPosition, 0.1);
    }
  });

  return (
    <mesh
      ref={meshRef}
      {...props}
    >
      <sphereGeometry args={[0.03, 16, 16]} />

      <meshStandardMaterial
        color="#00c897"
        emissive="#009670"
        emissiveIntensity={2}
        toneMapped={false}
      />
    </mesh>
  );
}
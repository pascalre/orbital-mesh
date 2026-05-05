import * as THREE from 'three';
import { useRef } from 'react';
import { Sphere } from '@react-three/drei';

interface SunProps {
  direction: { x: number; y: number; z: number };
}

export function Sun({ direction }: SunProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const sunPos: [number, number, number] = [
    direction.x * 100,
    direction.y * 100,
    direction.z * 100
  ];

  return (
    <group position={sunPos}>
      <Sphere ref={meshRef} args={[5, 64, 64]}>
        <meshBasicMaterial
          color="#ffffbb"
        />
      </Sphere>

      <pointLight
        intensity={20}
        distance={1000}
        decay={0}
      />
    </group>
  );
}
export default Sun;
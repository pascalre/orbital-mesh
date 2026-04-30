import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { geodeticToVec3 } from '../utils/coordinateConversion';

// Wir definieren die Props so, dass sie alle Standard-Mesh-Events (wie onPointerOver) unterstützen
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

  // 1. Umrechnung der Geodätischen Koordinaten (Go-Backend) in Three.js World-Space
  // useMemo verhindert unnötige Neuberechnungen bei jedem Frame
  const targetPosition = useMemo(() => {
    return geodeticToVec3(data.lat, data.lng, data.alt);
  }, [data.lat, data.lng, data.alt]);

  // 2. Kontinuierliche Bewegung
  useFrame(() => {
    if (meshRef.current) {
      // 'lerp' sorgt für flüssige Bewegungen zwischen den Netzwerk-Updates
      meshRef.current.position.lerp(targetPosition, 0.1);
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      // Wir geben alle Props (inkl. der Hover-Events vom Manager) an das Mesh weiter
      {...props}
    >
      {/* Die Geometrie: Eine Kugel mit niedriger Segmentierung für beste Performance.
        Radius 0.03 ist bei einem Erdradius von 2 gut sichtbar.
      */}
      <sphereGeometry args={[0.03, 16, 16]} />
      
      {/* Das Material: Ein kräftiges Türkis mit Glow-Effekt.
        meshStandardMaterial reagiert auf die Lichter in deiner Szene.
      */}
      <meshStandardMaterial 
        color="#00c897" 
        emissive="#009670" 
        emissiveIntensity={2} 
        toneMapped={false} // Verhindert, dass Bloom den Effekt zu sehr abschwächt
      />
    </mesh>
  );
}
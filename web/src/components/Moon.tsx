import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

import moonVertex from '../shaders/moon.vertex.glsl?raw';
import moonFragment from '../shaders/moon.fragment.glsl?raw';

interface MoonProps {
  sunDirection: { x: number; y: number; z: number };
}

export function Moon({ sunDirection }: MoonProps) {
  const moonRef = useRef<THREE.Mesh>(null);
  const texture = useTexture('./textures/2k_moon.jpg');

  // Material mit Uniforms erstellen
  const moonMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      // Nutze einen Fallback-Vektor, falls sunDirection beim ersten Render fehlt
      uSunDirection: { 
        value: new THREE.Vector3(
          sunDirection?.x ?? 1, 
          sunDirection?.y ?? 0, 
          sunDirection?.z ?? 0
        ) 
      }
    },
    vertexShader: moonVertex,
    fragmentShader: moonFragment
  }), [texture]);

  useFrame(({ clock }) => {
    if (!moonRef.current) return;
    
    const t = clock.getElapsedTime() * 0.01; 
    const distance = 18;
    
    // 1. Position aktualisieren
    const x = Math.cos(t) * distance;
    const z = Math.sin(t) * distance;
    moonRef.current.position.set(x, 0, z);

    // 2. Lichtrichtung korrigieren
    // Wir berechnen: Sonnen-Position (weit weg) MINUS Mond-Position
    // Da die Sonne bei uns als Richtungsvektor vorliegt, 
    // müssen wir diesen Vektor "weit weg" projizieren.
    const sunWorldPos = new THREE.Vector3(
      sunDirection.x * 1000, 
      sunDirection.y * 1000, 
      sunDirection.z * 1000
    );
    
    // Vektor vom Mond zur Sonne
    const lightDir = new THREE.Vector3()
      .copy(sunWorldPos)
      .sub(moonRef.current.position)
      .normalize();

    // Den korrigierten Vektor in den Shader schieben
    moonMaterial.uniforms.uSunDirection.value.copy(lightDir);

    moonRef.current.rotation.y = t + Math.PI;
  });

  return (
    <mesh ref={moonRef} material={moonMaterial}>
      <sphereGeometry args={[0.54, 64, 64]} />
    </mesh>
  );
}
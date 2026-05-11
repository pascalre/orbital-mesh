import * as THREE from "three";
import { useMemo, useRef } from "react";

import vertexShader from '../shaders/starfield.vertex.glsl?raw';
import fragmentShader from '../shaders/starfield.fragment.glsl?raw';

export function Starfield({ numStars = 4000 }) {
  const meshRef = useRef<THREE.Points>(null);

  const [positions, colors, sizes, speeds, brightness] = useMemo(() => {
    const pos = new Float32Array(numStars * 3);
    const cols = new Float32Array(numStars * 3);
    const sz = new Float32Array(numStars);
    const spd = new Float32Array(numStars);
    const bright = new Float32Array(numStars);

    for (let i = 0; i < numStars; i++) {
      const radius = 300 + Math.random() * 50;
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      const color = new THREE.Color().setHSL(0.6, 0.2, 0.8 + Math.random() * 0.2);
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;

      sz[i] = Math.random() * 4.0 + 2.0;
      spd[i] = 0.0;
      bright[i] = Math.random();
    }

    return [pos, cols, sz, spd, bright];
  }, [numStars]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={sizes.length}
          array={sizes}
          itemSize={1}
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          count={speeds.length}
          array={speeds}
          itemSize={1}
          args={[speeds, 1]}
        />
        <bufferAttribute
          attach="attributes-aBrightness"
          count={brightness.length}
          array={brightness}
          itemSize={1}
          args={[brightness, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexColors
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </points>
  );
}
import * as THREE from "three";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";

import atmosphereVs from "../shaders/atmosphere.vertex.glsl?raw";
import atmosphereFs from "../shaders/atmosphere.fragment.glsl?raw";

interface AtmosphereProps {
  sunDirection: THREE.Vector3;
}

export function Atmosphere({ sunDirection }: AtmosphereProps) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(0x9cc5ff) }, // Dein rimHex
        color2: { value: new THREE.Color(0x000000) }, // Dein facingHex
        fresnelBias: { value: 0.1 },
        fresnelScale: { value: 1.0 },
        fresnelPower: { value: 4.0 },
        uSunDirection: { value: sunDirection },
      },
      vertexShader: atmosphereVs,
      fragmentShader: atmosphereFs,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide, // Deine Vorlage nutzt FrontSide
    });
  }, []);

  useFrame(() => {
    material.uniforms.uSunDirection.value.copy(sunDirection);
  });

  return (
    <mesh raycast={() => null}>
      {/* 2.03 aus deiner Vorlage für die perfekte Größe */}
      <icosahedronGeometry args={[2.03, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
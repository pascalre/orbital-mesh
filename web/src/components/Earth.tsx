import * as THREE from "three";
import { useMemo } from "react";
import { useLoader, useFrame } from "@react-three/fiber";

import earthVertex from "../shaders/earth.vertex.glsl?raw";
import earthFragment from "../shaders/earth.fragment.glsl?raw";

interface EarthProps {
  sunDirection: THREE.Vector3;
}

export function Earth({ sunDirection }: EarthProps) {
  const [day, night, clouds] = useLoader(THREE.TextureLoader, [
    "./textures/8k_earth_daymap.jpg",
    "./textures/8k_earth_nightmap.jpg",
    "./textures/8k_earth_clouds.jpg",
  ]);

  clouds.wrapS = THREE.RepeatWrapping;
  clouds.wrapT = THREE.RepeatWrapping;

  const earthMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: day },
        nightTexture: { value: night },
        cloudsTexture: { value: clouds },
        uSunDirection: { value: sunDirection.clone() },
        uTime: { value: 0 },
      },
      vertexShader: earthVertex,
      fragmentShader: earthFragment,
    });
  }, [day, night, clouds]);

  useFrame((state) => {
    // NUR NOCH DIE WOLKEN-ANIMATION
    // Da sich die Gruppe dreht, driften die Wolken hier relativ zur Erdoberfläche
    earthMaterial.uniforms.uTime.value = state.clock.getElapsedTime() * 0.001;
    earthMaterial.uniforms.uSunDirection.value.copy(sunDirection);
  });

  return (
    <mesh material={earthMaterial}>
      <sphereGeometry args={[2, 64, 64]} />
    </mesh>
  );
}
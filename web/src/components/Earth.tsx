import * as THREE from "three";
import { useMemo, useRef } from "react"; // useRef importieren!
import { useLoader, useFrame } from "@react-three/fiber";

import earthVertex from "../shaders/earth.vertex.glsl?raw";
import earthFragment from "../shaders/earth.fragment.glsl?raw";

interface EarthProps {
  sunDirection: THREE.Vector3;
}

export function Earth({ sunDirection }: EarthProps) {
  // 1. Die fehlende Referenz deklarieren
  const meshRef = useRef<THREE.Mesh>(null);

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
    // Sicherstellen, dass das Mesh bereits geladen ist
    if (meshRef.current) {
      // Wolken-Animation
      earthMaterial.uniforms.uTime.value = state.clock.getElapsedTime() * 0.001;

      // Die Sonnenrichtung in den lokalen Raum der Erde umrechnen,
      // damit die Ausleuchtung trotz Erdrotation statisch bleibt.
      const inverseWorldMatrix = new THREE.Matrix4();
      inverseWorldMatrix.copy(meshRef.current.matrixWorld).invert();
      
      const localSun = sunDirection.clone().applyMatrix4(inverseWorldMatrix).normalize();
      
      earthMaterial.uniforms.uSunDirection.value.copy(localSun);
    }
  });

  return (
    <mesh 
      ref={meshRef} // <--- SEHR WICHTIG: Die Referenz hier zuweisen!
      material={earthMaterial}
    >
      <sphereGeometry args={[2, 64, 64]} />
    </mesh>
  );
}
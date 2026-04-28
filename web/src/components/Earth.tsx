import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";

import earthVertex from "../shaders/earth.vertex.glsl?raw";
import earthFragment from "../shaders/earth.fragment.glsl?raw";

interface EarthProps {
  sunDirection: THREE.Vector3;
}

export function Earth({ sunDirection }: EarthProps) {
  const earthRef = useRef<THREE.Mesh>(null);

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
    if (!earthRef.current) return;

const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

    const dayRotation = -(utcHours / 24) * 2 * Math.PI;
    const TEXTURE_OFFSET = Math.PI; 

    // 3. Kombination
    earthRef.current.rotation.y = dayRotation + TEXTURE_OFFSET;

    // 3. Wolken-Animation (Drift)
    // Wir nutzen state.clock.getElapsedTime(), um einen Wert zu haben, 
    // der immer weiterzählt, unabhängig von der Tageszeit.
    const cloudDriftSpeed = 0.25; // Justiere hier die Windgeschwindigkeit
    const drift = state.clock.getElapsedTime() * cloudDriftSpeed;

    // Wir schicken die Summe aus Erdrotation und Drift an den Shader
    // So bewegen sich die Wolken MIT der Erde, aber driften langsam weiter.
    earthMaterial.uniforms.uTime.value = earthRef.current.rotation.y + drift;
    
    // 4. Sonnenrichtung
    earthMaterial.uniforms.uSunDirection.value.copy(sunDirection);
  });

  return (
    <group>
      <mesh ref={earthRef} material={earthMaterial}>
        <sphereGeometry args={[2, 64, 64]} />
      </mesh>
    </group>
  );
}
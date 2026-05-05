import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { memo, useMemo, useRef } from "react";

function getPoints({ numStars = 500 } = {}) {
  function randomSpherePoint() {
    const radius = Math.random() * 25 + 25;
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    const rate = Math.random() * 1;
    const prob = Math.random();
    const light = Math.random();

    function update(t: number) {
      const lightness = prob > 0.8 ? light + Math.sin(t * rate) * 1 : light;
      return lightness;
    }

    return {
      pos: new THREE.Vector3(x, y, z),
      update,
      minDist: radius,
    };
  }

  const verts = [];
  const colors = [];
  const positions: any[] = [];

  for (let i = 0; i < numStars; i += 1) {
    const p = randomSpherePoint();
    positions.push(p);
    const col = new THREE.Color().setHSL(0.6, 0.2, Math.random());
    verts.push(p.pos.x, p.pos.y, p.pos.z);
    colors.push(col.r, col.g, col.b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    transparent: true,
    map: new THREE.TextureLoader().load("./circle.png"),
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);

  const updateFn = (t: number) => {
    points.rotation.y -= 0.00015;
    const currentColors = geo.attributes.color.array as Float32Array;

    for (let i = 0; i < numStars; i += 1) {
      const p = positions[i];
      const bright = p.update(t);
      const col = new THREE.Color().setHSL(0.6, 0.2, bright);

      currentColors[i * 3] = col.r;
      currentColors[i * 3 + 1] = col.g;
      currentColors[i * 3 + 2] = col.b;
    }
    geo.attributes.color.needsUpdate = true;
  };

  return { points, updateFn };
}

const Starfield = memo(function Starfield() {
  const ref = useRef<THREE.Points>(null);

  const { points, updateFn } = useMemo(() => {
    return getPoints({ numStars: 500 });
  }, []);

  useFrame((state) => {
    if (updateFn) {
      updateFn(state.clock.elapsedTime);
    }
  });

  return <primitive object={points} ref={ref} />;
});

export default Starfield;
import * as THREE from 'three';

export function getSunDirection() {
  const now = new Date();
  
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = (now as any) - (start as any);
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const declination = 23.44 * Math.sin((2 * Math.PI / 365.25) * (dayOfYear - 80)) * (Math.PI / 180);

  return new THREE.Vector3(
    0,
    Math.sin(declination),
    Math.cos(declination)
  ).normalize();
}
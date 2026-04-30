// src/utils/coordinateConversion.ts
import * as THREE from 'three';

const EARTH_RADIUS = 2; 
const REAL_EARTH_RADIUS_KM = 6371;

export function geodeticToVec3(lat: number, lng: number, alt: number): THREE.Vector3 {
  const scaledAlt = (alt / REAL_EARTH_RADIUS_KM) * EARTH_RADIUS;
  const r = EARTH_RADIUS + scaledAlt;

  // Umrechnung in Radiant
  const phi = (90 - lat) * (Math.PI / 180);
  // WICHTIG: lng * -1 sorgt für die richtige Ausrichtung auf der Standard-Sphere
  const theta = (lng) * (Math.PI / 180); 

  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    -r * Math.sin(phi) * Math.sin(theta)
  );
}
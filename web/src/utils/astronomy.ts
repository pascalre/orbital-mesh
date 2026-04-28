import * as THREE from 'three';

export function getSunDirection() {
  const now = new Date();
  
  // 1. Tag des Jahres
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = (now as any) - (start as any);
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // 2. Deklination (Saisonaler Neigungswinkel)
  // Korrekt berechnet für den 19. April (Frühling auf der Nordhalbkugel)
  const declination = 23.44 * Math.sin((2 * Math.PI / 365.25) * (dayOfYear - 80)) * (Math.PI / 180);

  // 3. Zeit-Korrektur (Equation of Time)
  // Diese Formel korrigiert die "vorauslaufende" Sonne
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364;
  const equationOfTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  
  // 4. Stundenwinkel berechnen
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  
  // Wir korrigieren die UTC Zeit um die Equation of Time (in Stunden umgerechnet)
  const correctedUtcHours = utcHours + (equationOfTime / 60);

  // Der Längengrad, über dem die Sonne steht (in Radiant)
  // 15 Grad pro Stunde. 12:00 UTC ist der Ankerpunkt.
  const sunLongitude = (12 - correctedUtcHours) * 15 * (Math.PI / 180);

  return new THREE.Vector3(
    Math.sin(sunLongitude) * Math.cos(declination),
    Math.sin(declination),
    Math.cos(sunLongitude) * Math.cos(declination)
  ).normalize();
}
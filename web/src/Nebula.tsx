import * as THREE from "three";
import { memo, useMemo } from "react";

// Der Loader sollte außerhalb der Komponente liegen, 
// damit er nicht bei jedem Render-Versuch neu instanziiert wird.
const loader = new THREE.TextureLoader();

/**
 * Erstellt ein einzelnes Sprite für den Nebel.
 */
function getSprite({ hasFog, color, opacity, path, pos, size }: any) {
  const spriteMat = new THREE.SpriteMaterial({
    color,
    fog: hasFog,
    map: loader.load(path),
    transparent: true,
    opacity,
    // Blending sorgt für ein schöneres "Leuchten", wenn sich Sprites überlagern
    blending: THREE.AdditiveBlending, 
    depthWrite: false, // Verhindert unschöne Kanten bei Überlagerung
  });

  // Zufällige leichte Farbvariation für mehr Realismus
  spriteMat.color.offsetHSL(0, 0, Math.random() * 0.2 - 0.1);

  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(pos.x, -pos.y, pos.z);
  
  const finalSize = size + (Math.random() - 0.5);
  sprite.scale.set(finalSize, finalSize, finalSize);
  
  return sprite;
}

/**
 * Erstellt die gesamte Gruppe von Sprites.
 */
function getSprites({
  hasFog = true,
  hue = 0.65,
  numSprites = 8,
  opacity = 0.2,
  path = "./rad-grad.png",
  radius = 10,
  sat = 0.5,
  size = 24,
  z = -10.5,
} = {}) {
  const layerGroup = new THREE.Group();
  for (let i = 0; i < numSprites; i += 1) {
    const angle = (i / numSprites) * Math.PI * 2;
    const pos = new THREE.Vector3(
      Math.cos(angle) * Math.random() * radius,
      Math.sin(angle) * Math.random() * radius,
      z + Math.random()
    );

    const color = new THREE.Color().setHSL(hue, 1, sat);
    const sprite = getSprite({ hasFog, color, opacity, path, pos, size });
    layerGroup.add(sprite);
  }
  return layerGroup;
}

/**
 * Die Nebula-Komponente.
 * memo() verhindert Rerenders von außen (z.B. durch App-State).
 */
const Nebula = memo(function Nebula() {
  // useMemo stellt sicher, dass die Sprites nur EINMAL generiert werden.
  // Ohne dies würde Math.random() bei jedem Klick in der UI neue Positionen würfeln.
  const sprites = useMemo(() => {
    console.log("🌌 Nebula: Sprites generiert.");
    return getSprites({
      numSprites: 8,
      radius: 10,
      z: -10.5,
      size: 24,
      opacity: 0.2,
      path: "./rad-grad.png",
    });
  }, []); // Keine Abhängigkeiten = wird nie neu berechnet

  return <primitive object={sprites} />;
});

export default Nebula;
import * as THREE from 'three';
import { useMemo } from 'react';
import { geodeticToVec3 } from '../utils/coordinateConversion';
import { getRegion, regionOutlineEdges } from '../utils/geoGrid';

// Draw the outline above the surface so it sits clearly on the globe (Earth
// radius is 2; geodeticToVec3 places alt=0 at radius 2). A modest altitude plus
// depthTest:false keeps the silhouette readable and clear of the Earth texture.
const GRID_ALT_KM = 350; // lifts the outline to a visible shell above the surface
const SEG_PER_EDGE = 8; // subdivisions per edge so the outline curves with the sphere

interface RegionGridProps {
  regionKey: string;
}

export function RegionGrid({ regionKey }: RegionGridProps) {
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#00f2ff',
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        depthTest: false, // always draw over the globe so the region reads clearly
      }),
    [],
  );

  const lineObject = useMemo(() => {
    const region = getRegion(regionKey);
    if (!region || region.key === 'all') return null;

    // Outer silhouette of the exact subscribed cells — no interior square lines.
    const edges = regionOutlineEdges(region);
    if (edges.length === 0) return null;

    const positions: number[] = [];
    for (const edge of edges) {
      let prev: THREE.Vector3 | null = null;
      for (let s = 0; s <= SEG_PER_EDGE; s++) {
        const t = s / SEG_PER_EDGE;
        const lat = edge.lat0 + (edge.lat1 - edge.lat0) * t;
        const lng = edge.lng0 + (edge.lng1 - edge.lng0) * t;
        const v = geodeticToVec3(lat, lng, GRID_ALT_KM);
        if (prev) {
          positions.push(prev.x, prev.y, prev.z, v.x, v.y, v.z);
        }
        prev = v;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const segments = new THREE.LineSegments(geometry, material);
    segments.renderOrder = 999; // draw after the globe
    return segments;
  }, [regionKey, material]);

  if (!lineObject) return null;

  return <primitive object={lineObject} />;
}

export default RegionGrid;

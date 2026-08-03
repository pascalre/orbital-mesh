import * as THREE from 'three';
import { useMemo } from 'react';
import { geodeticToVec3 } from '../utils/coordinateConversion';
import { CELL_SIZE_DEG, cellsForRegion, getRegion, regionOutlineEdges } from '../utils/geoGrid';

// Draw the outline above the surface so it sits clearly on the globe (Earth
// radius is 2; geodeticToVec3 places alt=0 at radius 2). A modest altitude plus
// depthTest:false keeps the silhouette readable and clear of the Earth texture.
const GRID_ALT_KM = 350; // lifts the outline to a visible shell above the surface
const FILL_ALT_KM = 320; // just below the outline so the border stays crisp on top
const SEG_PER_EDGE = 8; // subdivisions per edge so the outline curves with the sphere
const FILL_SEG = 2; // per-cell subdivisions so the translucent fill hugs the sphere

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

  const fillMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#00f2ff',
        transparent: true,
        opacity: 0.12, // light tint so the region reads without hiding the map
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );

  // Translucent fill over the exact subscribed cells, sitting just under the
  // outline. Each cell is rasterized into a small subdivided grid of quads so it
  // curves with the sphere; drawn before the outline so the border stays crisp.
  const fillObject = useMemo(() => {
    const region = getRegion(regionKey);
    if (!region || region.key === 'all') return null;

    const cells = cellsForRegion(region);
    if (cells.length === 0) return null;

    const positions: number[] = [];
    const pushTri = (
      aLat: number, aLng: number,
      bLat: number, bLng: number,
      cLat: number, cLng: number,
    ) => {
      const a = geodeticToVec3(aLat, aLng, FILL_ALT_KM);
      const b = geodeticToVec3(bLat, bLng, FILL_ALT_KM);
      const c = geodeticToVec3(cLat, cLng, FILL_ALT_KM);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    };

    for (const { latIdx, lngIdx } of cells) {
      const lat0 = latIdx * CELL_SIZE_DEG - 90;
      const lng0 = lngIdx * CELL_SIZE_DEG - 180;
      for (let i = 0; i < FILL_SEG; i++) {
        for (let j = 0; j < FILL_SEG; j++) {
          const la0 = lat0 + (i / FILL_SEG) * CELL_SIZE_DEG;
          const la1 = lat0 + ((i + 1) / FILL_SEG) * CELL_SIZE_DEG;
          const ln0 = lng0 + (j / FILL_SEG) * CELL_SIZE_DEG;
          const ln1 = lng0 + ((j + 1) / FILL_SEG) * CELL_SIZE_DEG;
          pushTri(la0, ln0, la1, ln0, la1, ln1);
          pushTri(la0, ln0, la1, ln1, la0, ln1);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mesh = new THREE.Mesh(geometry, fillMaterial);
    mesh.renderOrder = 998; // under the outline (999)
    return mesh;
  }, [regionKey, fillMaterial]);

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

  return (
    <>
      {fillObject && <primitive object={fillObject} />}
      <primitive object={lineObject} />
    </>
  );
}

export default RegionGrid;

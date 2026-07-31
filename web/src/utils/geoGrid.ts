// Fixed-degree geo-grid. Mirrors the Go emitter (services/orbital-emitter/
// internal/emitter/geocell.go) — keep the two in sync.
//
// The topic gains two trailing levels:
//   earth/sat/tracked/{orbit}/{provider}/{noradId}/{latCell}/{lngCell}
// so subscribers can filter by geographic region and draw the matching grid.

export const CELL_SIZE_DEG = 3;

export const LAT_CELLS = 180 / CELL_SIZE_DEG; // 60
export const LNG_CELLS = 360 / CELL_SIZE_DEG; // 120

export function latCell(lat: number): number {
  const cell = Math.floor((lat + 90) / CELL_SIZE_DEG);
  return clamp(cell, 0, LAT_CELLS - 1);
}

export function lngCell(lng: number): number {
  const cell = Math.floor((lng + 180) / CELL_SIZE_DEG);
  return clamp(cell, 0, LNG_CELLS - 1);
}

/** Lower-left geodetic corner (lat, lng) of a given cell. */
export function cellToLatLng(latIdx: number, lngIdx: number): { lat: number; lng: number } {
  return {
    lat: latIdx * CELL_SIZE_DEG - 90,
    lng: lngIdx * CELL_SIZE_DEG - 180,
  };
}

/**
 * One latitude band's coverage: the band whose south edge is `lat` degrees,
 * spanning longitudes [lngMin, lngMax). Each row is a single contiguous run, so
 * a region built from rows can never contain interior holes.
 */
export interface RegionRow {
  /** South edge of the 5° band, in degrees (must be a multiple of CELL_SIZE_DEG). */
  lat: number;
  lngMin: number;
  lngMax: number;
}

/**
 * A region is a stack of per-latitude rows that approximate a continent's land
 * outline. Rows are contiguous in latitude and each row is one contiguous
 * longitude run — this guarantees a clean, gap-free grid (verified in
 * geoGrid.test.ts) while still tracing the coastline.
 */
export interface Region {
  key: string;
  label: string;
  rows: RegionRow[];
}

// Land outlines as coastline control points: for a given latitude, the land's
// [lngMin, lngMax] span. Between consecutive control points the span is linearly
// interpolated onto the cell grid, so the outline follows the coast at whatever
// CELL_SIZE_DEG resolution is set. Spans avoid the ±180 seam.
export const REGIONS: Region[] = [
  { key: 'all', label: 'All (no grid)', rows: [] },
  {
    key: 'europe',
    label: 'Europe',
    rows: [
      { lat: 35, lngMin: -10, lngMax: 30 },
      { lat: 40, lngMin: -10, lngMax: 45 },
      { lat: 45, lngMin: -5, lngMax: 45 },
      { lat: 50, lngMin: -10, lngMax: 45 },
      { lat: 55, lngMin: -10, lngMax: 45 },
      { lat: 60, lngMin: 5, lngMax: 45 },
      { lat: 65, lngMin: 5, lngMax: 40 },
    ],
  },
  {
    key: 'africa',
    label: 'Africa',
    rows: [
      { lat: -35, lngMin: 15, lngMax: 30 },
      { lat: -30, lngMin: 10, lngMax: 35 },
      { lat: -25, lngMin: 10, lngMax: 50 },
      { lat: -20, lngMin: 10, lngMax: 50 },
      { lat: -15, lngMin: 10, lngMax: 50 },
      { lat: -10, lngMin: 10, lngMax: 45 },
      { lat: -5, lngMin: 5, lngMax: 45 },
      { lat: 0, lngMin: 0, lngMax: 45 },
      { lat: 5, lngMin: -15, lngMax: 50 },
      { lat: 10, lngMin: -15, lngMax: 50 },
      { lat: 15, lngMin: -20, lngMax: 45 },
      { lat: 20, lngMin: -20, lngMax: 40 },
      { lat: 25, lngMin: -15, lngMax: 35 },
      { lat: 30, lngMin: -10, lngMax: 35 },
      { lat: 35, lngMin: -10, lngMax: 15 },
    ],
  },
  {
    key: 'namerica',
    label: 'North America',
    rows: [
      { lat: 10, lngMin: -90, lngMax: -75 },
      { lat: 15, lngMin: -110, lngMax: -75 },
      { lat: 20, lngMin: -110, lngMax: -75 },
      { lat: 25, lngMin: -115, lngMax: -75 },
      { lat: 30, lngMin: -120, lngMax: -75 },
      { lat: 35, lngMin: -125, lngMax: -75 },
      { lat: 40, lngMin: -125, lngMax: -70 },
      { lat: 45, lngMin: -130, lngMax: -60 },
      { lat: 50, lngMin: -130, lngMax: -55 },
      { lat: 55, lngMin: -135, lngMax: -60 },
      { lat: 60, lngMin: -150, lngMax: -65 },
      { lat: 65, lngMin: -165, lngMax: -65 },
      { lat: 70, lngMin: -165, lngMax: -70 },
    ],
  },
  {
    key: 'samerica',
    label: 'South America',
    rows: [
      { lat: -55, lngMin: -75, lngMax: -65 },
      { lat: -50, lngMin: -75, lngMax: -65 },
      { lat: -45, lngMin: -75, lngMax: -60 },
      { lat: -40, lngMin: -75, lngMax: -55 },
      { lat: -35, lngMin: -75, lngMax: -50 },
      { lat: -30, lngMin: -75, lngMax: -45 },
      { lat: -25, lngMin: -75, lngMax: -40 },
      { lat: -20, lngMin: -75, lngMax: -35 },
      { lat: -15, lngMin: -80, lngMax: -35 },
      { lat: -10, lngMin: -80, lngMax: -35 },
      { lat: -5, lngMin: -80, lngMax: -35 },
      { lat: 0, lngMin: -80, lngMax: -50 },
      { lat: 5, lngMin: -80, lngMax: -60 },
      { lat: 10, lngMin: -75, lngMax: -60 },
    ],
  },
  {
    key: 'asia',
    label: 'Asia',
    rows: [
      { lat: 5, lngMin: 95, lngMax: 120 },
      { lat: 10, lngMin: 75, lngMax: 125 },
      { lat: 15, lngMin: 70, lngMax: 125 },
      { lat: 20, lngMin: 65, lngMax: 125 },
      { lat: 25, lngMin: 60, lngMax: 130 },
      { lat: 30, lngMin: 45, lngMax: 145 },
      { lat: 35, lngMin: 40, lngMax: 145 },
      { lat: 40, lngMin: 40, lngMax: 150 },
      { lat: 45, lngMin: 40, lngMax: 155 },
      { lat: 50, lngMin: 45, lngMax: 160 },
      { lat: 55, lngMin: 50, lngMax: 165 },
      { lat: 60, lngMin: 55, lngMax: 175 },
      { lat: 65, lngMin: 60, lngMax: 180 },
      { lat: 70, lngMin: 65, lngMax: 180 },
    ],
  },
  {
    key: 'oceania',
    label: 'Oceania',
    rows: [
      { lat: -45, lngMin: 165, lngMax: 180 },
      { lat: -40, lngMin: 115, lngMax: 180 },
      { lat: -35, lngMin: 115, lngMax: 155 },
      { lat: -30, lngMin: 115, lngMax: 155 },
      { lat: -25, lngMin: 113, lngMax: 155 },
      { lat: -20, lngMin: 113, lngMax: 155 },
      { lat: -15, lngMin: 120, lngMax: 150 },
      { lat: -10, lngMin: 130, lngMax: 155 },
    ],
  },
];

export function getRegion(key: string): Region | undefined {
  return REGIONS.find((r) => r.key === key);
}

export interface GridCell {
  latIdx: number;
  lngIdx: number;
}

/**
 * The set of grid cells a region covers.
 *
 * The region's rows are coastline control points sorted by latitude. For every
 * cell-grid latitude band between the first and last control point, the
 * [lngMin, lngMax] span is linearly interpolated from the surrounding control
 * points, then rasterized to cells. This makes the coverage follow the coast at
 * the current CELL_SIZE_DEG resolution regardless of how coarsely the rows were
 * authored.
 *
 * Each band's span is one contiguous run (no horizontal gaps), and we then
 * "close" vertical gaps per longitude column, so the result has no interior
 * holes on either axis — a clean, solid region. Verified in geoGrid.test.mjs.
 *
 * Drives BOTH the Solace subscriptions and the drawn overlay, so they can never
 * drift apart.
 */
export function cellsForRegion(region: Region): GridCell[] {
  if (region.rows.length === 0) return [];

  const rows = [...region.rows].sort((a, b) => a.lat - b.lat);
  const latIdxMin = latCell(clampLat(rows[0].lat));
  const latIdxMax = latCell(clampLat(rows[rows.length - 1].lat));

  // Interpolated [lngMin, lngMax] at a given band-center latitude.
  const spanAt = (lat: number): { lngMin: number; lngMax: number } => {
    if (lat <= rows[0].lat) return rows[0];
    if (lat >= rows[rows.length - 1].lat) return rows[rows.length - 1];
    for (let i = 0; i < rows.length - 1; i++) {
      const a = rows[i];
      const b = rows[i + 1];
      if (lat >= a.lat && lat <= b.lat) {
        const t = (lat - a.lat) / (b.lat - a.lat);
        return {
          lngMin: a.lngMin + (b.lngMin - a.lngMin) * t,
          lngMax: a.lngMax + (b.lngMax - a.lngMax) * t,
        };
      }
    }
    return rows[rows.length - 1];
  };

  const colBands = new Map<number, { min: number; max: number }>();
  for (let latIdx = latIdxMin; latIdx <= latIdxMax; latIdx++) {
    const bandCenterLat = latIdx * CELL_SIZE_DEG - 90 + CELL_SIZE_DEG / 2;
    const { lngMin, lngMax } = spanAt(bandCenterLat);
    const lngStart = lngCell(clampLng(lngMin));
    const lngEnd = lngCell(clampLng(lngMax - 1e-9)); // exclusive right edge
    for (let lngIdx = lngStart; lngIdx <= lngEnd; lngIdx++) {
      const cur = colBands.get(lngIdx);
      if (cur) {
        if (latIdx < cur.min) cur.min = latIdx;
        if (latIdx > cur.max) cur.max = latIdx;
      } else {
        colBands.set(lngIdx, { min: latIdx, max: latIdx });
      }
    }
  }

  // Emit every band between each column's min and max (vertical hole close).
  const cells: GridCell[] = [];
  for (const [lngIdx, { min, max }] of colBands) {
    for (let latIdx = min; latIdx <= max; latIdx++) {
      cells.push({ latIdx, lngIdx });
    }
  }
  return cells;
}

/**
 * A boundary edge of the cell region, expressed in geodetic degrees as a
 * segment between two grid-line corners. Interior edges (shared by two covered
 * cells) are dropped, leaving the outer silhouette of the exact cell set — so
 * the drawn outline equals the subscribed cells.
 */
export interface GeoEdge {
  lat0: number;
  lng0: number;
  lat1: number;
  lng1: number;
}

const gridLat = (latIdx: number) => latIdx * CELL_SIZE_DEG - 90;
const gridLng = (lngIdx: number) => lngIdx * CELL_SIZE_DEG - 180;

/**
 * The outer boundary of a region's cell set, as geodetic edge segments. An edge
 * is on the boundary iff the cell on the other side of it is not in the set.
 */
export function regionOutlineEdges(region: Region): GeoEdge[] {
  const cells = cellsForRegion(region);
  const set = new Set(cells.map((c) => `${c.latIdx}/${c.lngIdx}`));
  const has = (la: number, ln: number) => set.has(`${la}/${ln}`);

  const edges: GeoEdge[] = [];
  for (const { latIdx, lngIdx } of cells) {
    const s = gridLat(latIdx); // south edge
    const n = gridLat(latIdx + 1); // north edge
    const w = gridLng(lngIdx); // west edge
    const e = gridLng(lngIdx + 1); // east edge

    if (!has(latIdx - 1, lngIdx)) edges.push({ lat0: s, lng0: w, lat1: s, lng1: e }); // bottom
    if (!has(latIdx + 1, lngIdx)) edges.push({ lat0: n, lng0: w, lat1: n, lng1: e }); // top
    if (!has(latIdx, lngIdx - 1)) edges.push({ lat0: s, lng0: w, lat1: n, lng1: w }); // left
    if (!has(latIdx, lngIdx + 1)) edges.push({ lat0: s, lng0: e, lat1: n, lng1: e }); // right
  }
  return edges;
}

/** Broker subscription topics for a region (one per cell). */
export function topicsForRegion(region: Region): string[] {
  if (region.key === 'all') {
    // Match the two extra levels with a multi-level wildcard.
    return ['earth/sat/tracked/>'];
  }
  return cellsForRegion(region).map(
    (c) => `earth/sat/tracked/*/*/*/${c.latIdx}/${c.lngIdx}`,
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}
function clampLat(v: number): number {
  return clamp(v, -90, 90);
}
function clampLng(v: number): number {
  return clamp(v, -180, 180);
}

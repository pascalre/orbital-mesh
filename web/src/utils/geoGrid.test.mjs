// Standalone validity check for region grid coverage. Run with:
//   node src/utils/geoGrid.test.mjs
// Exits non-zero if any region has an interior hole (missing stripe).
//
// Mirrors geoGrid.ts's cell math AND its interpolating cellsForRegion. If you
// change CELL_SIZE_DEG or the region rows, keep this in sync and re-run to prove
// the coverage is still gap-free.

const CELL = 3;
const LAT_CELLS = 180 / CELL;
const LNG_CELLS = 360 / CELL;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const clampLat = (v) => clamp(v, -90, 90);
const clampLng = (v) => clamp(v, -180, 180);
const latCell = (lat) => clamp(Math.floor((lat + 90) / CELL), 0, LAT_CELLS - 1);
const lngCell = (lng) => clamp(Math.floor((lng + 180) / CELL), 0, LNG_CELLS - 1);

// Keep these rows identical to REGIONS in geoGrid.ts.
const REGIONS = {
  europe: [
    { lat: 35, lngMin: -10, lngMax: 30 }, { lat: 40, lngMin: -10, lngMax: 45 },
    { lat: 45, lngMin: -5, lngMax: 45 }, { lat: 50, lngMin: -10, lngMax: 45 },
    { lat: 55, lngMin: -10, lngMax: 45 }, { lat: 60, lngMin: 5, lngMax: 45 },
    { lat: 65, lngMin: 5, lngMax: 40 },
  ],
  africa: [
    { lat: -35, lngMin: 15, lngMax: 30 }, { lat: -30, lngMin: 10, lngMax: 35 },
    { lat: -25, lngMin: 10, lngMax: 50 }, { lat: -20, lngMin: 10, lngMax: 50 },
    { lat: -15, lngMin: 10, lngMax: 50 }, { lat: -10, lngMin: 10, lngMax: 45 },
    { lat: -5, lngMin: 5, lngMax: 45 }, { lat: 0, lngMin: 0, lngMax: 45 },
    { lat: 5, lngMin: -15, lngMax: 50 }, { lat: 10, lngMin: -15, lngMax: 50 },
    { lat: 15, lngMin: -20, lngMax: 45 }, { lat: 20, lngMin: -20, lngMax: 40 },
    { lat: 25, lngMin: -15, lngMax: 35 }, { lat: 30, lngMin: -10, lngMax: 35 },
    { lat: 35, lngMin: -10, lngMax: 15 },
  ],
  namerica: [
    { lat: 10, lngMin: -90, lngMax: -75 }, { lat: 15, lngMin: -110, lngMax: -75 },
    { lat: 20, lngMin: -110, lngMax: -75 }, { lat: 25, lngMin: -115, lngMax: -75 },
    { lat: 30, lngMin: -120, lngMax: -75 }, { lat: 35, lngMin: -125, lngMax: -75 },
    { lat: 40, lngMin: -125, lngMax: -70 }, { lat: 45, lngMin: -130, lngMax: -60 },
    { lat: 50, lngMin: -130, lngMax: -55 }, { lat: 55, lngMin: -135, lngMax: -60 },
    { lat: 60, lngMin: -150, lngMax: -65 }, { lat: 65, lngMin: -165, lngMax: -65 },
    { lat: 70, lngMin: -165, lngMax: -70 },
  ],
  samerica: [
    { lat: -55, lngMin: -75, lngMax: -65 }, { lat: -50, lngMin: -75, lngMax: -65 },
    { lat: -45, lngMin: -75, lngMax: -60 }, { lat: -40, lngMin: -75, lngMax: -55 },
    { lat: -35, lngMin: -75, lngMax: -50 }, { lat: -30, lngMin: -75, lngMax: -45 },
    { lat: -25, lngMin: -75, lngMax: -40 }, { lat: -20, lngMin: -75, lngMax: -35 },
    { lat: -15, lngMin: -80, lngMax: -35 }, { lat: -10, lngMin: -80, lngMax: -35 },
    { lat: -5, lngMin: -80, lngMax: -35 }, { lat: 0, lngMin: -80, lngMax: -50 },
    { lat: 5, lngMin: -80, lngMax: -60 }, { lat: 10, lngMin: -75, lngMax: -60 },
  ],
  asia: [
    { lat: 5, lngMin: 95, lngMax: 120 }, { lat: 10, lngMin: 75, lngMax: 125 },
    { lat: 15, lngMin: 70, lngMax: 125 }, { lat: 20, lngMin: 65, lngMax: 125 },
    { lat: 25, lngMin: 60, lngMax: 130 }, { lat: 30, lngMin: 45, lngMax: 145 },
    { lat: 35, lngMin: 40, lngMax: 145 }, { lat: 40, lngMin: 40, lngMax: 150 },
    { lat: 45, lngMin: 40, lngMax: 155 }, { lat: 50, lngMin: 45, lngMax: 160 },
    { lat: 55, lngMin: 50, lngMax: 165 }, { lat: 60, lngMin: 55, lngMax: 175 },
    { lat: 65, lngMin: 60, lngMax: 180 }, { lat: 70, lngMin: 65, lngMax: 180 },
  ],
  oceania: [
    { lat: -45, lngMin: 165, lngMax: 180 }, { lat: -40, lngMin: 115, lngMax: 180 },
    { lat: -35, lngMin: 115, lngMax: 155 }, { lat: -30, lngMin: 115, lngMax: 155 },
    { lat: -25, lngMin: 113, lngMax: 155 }, { lat: -20, lngMin: 113, lngMax: 155 },
    { lat: -15, lngMin: 120, lngMax: 150 }, { lat: -10, lngMin: 130, lngMax: 155 },
  ],
};

// Mirror of cellsForRegion in geoGrid.ts: interpolate spans onto each band,
// then vertical hole close.
function cellsForRegion(rowsInput) {
  const rows = [...rowsInput].sort((a, b) => a.lat - b.lat);
  const latIdxMin = latCell(clampLat(rows[0].lat));
  const latIdxMax = latCell(clampLat(rows[rows.length - 1].lat));

  const spanAt = (lat) => {
    if (lat <= rows[0].lat) return rows[0];
    if (lat >= rows[rows.length - 1].lat) return rows[rows.length - 1];
    for (let i = 0; i < rows.length - 1; i++) {
      const a = rows[i], b = rows[i + 1];
      if (lat >= a.lat && lat <= b.lat) {
        const t = (lat - a.lat) / (b.lat - a.lat);
        return { lngMin: a.lngMin + (b.lngMin - a.lngMin) * t, lngMax: a.lngMax + (b.lngMax - a.lngMax) * t };
      }
    }
    return rows[rows.length - 1];
  };

  const colBands = new Map();
  for (let la = latIdxMin; la <= latIdxMax; la++) {
    const center = la * CELL - 90 + CELL / 2;
    const { lngMin, lngMax } = spanAt(center);
    const l0 = lngCell(clampLng(lngMin));
    const l1 = lngCell(clampLng(lngMax - 1e-9));
    for (let ln = l0; ln <= l1; ln++) {
      const cur = colBands.get(ln);
      if (cur) { if (la < cur.min) cur.min = la; if (la > cur.max) cur.max = la; }
      else colBands.set(ln, { min: la, max: la });
    }
  }
  const set = new Set();
  for (const [ln, { min, max }] of colBands) {
    for (let la = min; la <= max; la++) set.add(la + ',' + ln);
  }
  return set;
}

let failures = 0;
for (const [name, rows] of Object.entries(REGIONS)) {
  const set = cellsForRegion(rows);
  let laMin = 999, laMax = -999, lnMin = 999, lnMax = -999;
  for (const k of set) {
    const [la, ln] = k.split(',').map(Number);
    laMin = Math.min(laMin, la); laMax = Math.max(laMax, la);
    lnMin = Math.min(lnMin, ln); lnMax = Math.max(lnMax, ln);
  }

  let rowHoles = 0;
  for (let la = laMin; la <= laMax; la++) {
    const cols = [];
    for (let ln = lnMin; ln <= lnMax; ln++) if (set.has(la + ',' + ln)) cols.push(ln);
    if (cols.length) for (let ln = cols[0]; ln <= cols[cols.length - 1]; ln++) if (!set.has(la + ',' + ln)) rowHoles++;
  }
  let colHoles = 0;
  for (let ln = lnMin; ln <= lnMax; ln++) {
    const rws = [];
    for (let la = laMin; la <= laMax; la++) if (set.has(la + ',' + ln)) rws.push(la);
    if (rws.length) for (let la = rws[0]; la <= rws[rws.length - 1]; la++) if (!set.has(la + ',' + ln)) colHoles++;
  }
  let emptyBands = 0;
  for (let la = laMin; la <= laMax; la++) {
    let any = false;
    for (let ln = lnMin; ln <= lnMax; ln++) if (set.has(la + ',' + ln)) { any = true; break; }
    if (!any) emptyBands++;
  }

  const ok = rowHoles === 0 && colHoles === 0 && emptyBands === 0;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: cells=${set.size} rowHoles=${rowHoles} colHoles=${colHoles} emptyBands=${emptyBands}`);
}

if (failures) {
  console.error(`\n${failures} region(s) have grid holes.`);
  process.exit(1);
}
console.log('\nAll regions are gap-free.');

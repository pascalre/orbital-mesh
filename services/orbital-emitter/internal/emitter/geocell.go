package emitter

import "math"

// Fixed-degree geo-grid used to encode a satellite's ground position into the
// topic string. Cells are CellSizeDeg × CellSizeDeg degrees.
//
// The same math is mirrored in the frontend (web/src/utils/geoGrid.ts) — keep
// the two in sync.
const CellSizeDeg = 3.0

// LatCell maps a latitude in [-90, 90] to a band index (0..59 for 3° cells).
// Values are clamped so the poles fall in the last valid band.
func LatCell(lat float64) int {
	cell := int(math.Floor((lat + 90.0) / CellSizeDeg))
	maxCell := int(180.0/CellSizeDeg) - 1
	return clampCell(cell, maxCell)
}

// LngCell maps a longitude in [-180, 180] to a band index (0..119 for 3° cells).
// Values are clamped so +180 falls in the last valid band.
func LngCell(lng float64) int {
	cell := int(math.Floor((lng + 180.0) / CellSizeDeg))
	maxCell := int(360.0/CellSizeDeg) - 1
	return clampCell(cell, maxCell)
}

func clampCell(cell, maxCell int) int {
	if cell < 0 {
		return 0
	}
	if cell > maxCell {
		return maxCell
	}
	return cell
}

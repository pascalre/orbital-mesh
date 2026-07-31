package emitter

import "testing"

// Cells are 3°: lat bands 0..59, lng bands 0..119.
func TestLatCell(t *testing.T) {
	cases := []struct {
		lat  float64
		want int
	}{
		{-90, 0},   // south pole -> first band
		{-88, 0},   // within first band
		{0, 30},    // equator -> band 30 (floor(90/3))
		{35, 41},   // Europe south edge
		{69.9, 53}, // Europe north edge
		{90, 59},   // north pole clamps into last band (59), not 60
	}
	for _, c := range cases {
		if got := LatCell(c.lat); got != c.want {
			t.Errorf("LatCell(%v) = %d, want %d", c.lat, got, c.want)
		}
	}
}

func TestLngCell(t *testing.T) {
	cases := []struct {
		lng  float64
		want int
	}{
		{-180, 0},  // antimeridian west -> first band
		{-10, 56},  // Europe west edge
		{0, 60},    // prime meridian
		{39.9, 73}, // Europe east edge
		{180, 119}, // antimeridian east clamps into last band (119), not 120
	}
	for _, c := range cases {
		if got := LngCell(c.lng); got != c.want {
			t.Errorf("LngCell(%v) = %d, want %d", c.lng, got, c.want)
		}
	}
}

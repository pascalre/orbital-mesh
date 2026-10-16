package emitter

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync/atomic"

	"github.com/akhenakh/sgp4"
)

// Publisher sends one message to a topic. platform.SolaceClient implements it.
type Publisher interface {
	PublishDirectMessage(topic, messageBody string) error
}

type Emitter struct {
	// The catalog is swapped as a whole when a new snapshot arrives, so the
	// 1 Hz emit loop and the background refresh never need a lock.
	satellites atomic.Pointer[[]Satellite]
	publisher  Publisher
	group      string
}

type Satellite struct {
	provider string
	orbit    Orbit
	meta     *sgp4.TLE
}

const unknown = "UNKNOWN"

// After this many consecutive publish errors a tick is abandoned: the broker
// is obviously not reachable and trying the remaining satellites is pointless.
const maxConsecutivePublishErrors = 10

func (s Satellite) getProvider() string {
	i := strings.IndexAny(s.meta.Name, " -")

	if i != -1 {
		if _, err := strconv.Atoi(s.meta.Name[:i]); err == nil {
			return unknown
		}
		return s.meta.Name[:i]
	}
	return s.meta.Name
}

func NewEmitter(publisher Publisher, group string) *Emitter {
	return &Emitter{publisher: publisher, group: group}
}

// SetCatalog replaces the satellite catalog with the given TLE entries
// (3 lines each). Entries that cannot be parsed are skipped, never fatal.
func (e *Emitter) SetCatalog(tleEntries []string) {
	satellites := make([]Satellite, 0, len(tleEntries))
	skipped := 0

	for _, entry := range tleEntries {
		tle, err := parseTLE(entry)
		if err != nil {
			skipped++
			continue
		}
		satellites = append(satellites, Satellite{
			provider: e.group,
			orbit:    GetOrbit(tle.MeanMotion, tle.Eccentricity, tle.Inclination),
			meta:     tle,
		})
	}

	e.satellites.Store(&satellites)
	log.Printf("Satellite catalog updated: %d satellites (%d unparsable entries skipped)", len(satellites), skipped)
}

// EmitCoordinates publishes the current position of every satellite. It never
// panics or exits: problems are reported through the returned error.
func (e *Emitter) EmitCoordinates() error {
	catalog := e.satellites.Load()
	if catalog == nil {
		return nil
	}

	var published, failed, consecutive int
	var firstErr error

	for _, sat := range *catalog {
		coordinates, err := getGeodeticCoordinates(sat.meta)
		if err != nil {
			// Decayed or otherwise unpropagatable satellite: skip it quietly,
			// the next catalog refresh will most likely drop it.
			continue
		}

		// Topic carries the ground position as fixed-degree grid cells so
		// subscribers can filter by geographic region:
		//   earth/sat/tracked/{orbit}/{provider}/{noradId}/{latCell}/{lngCell}
		topic := fmt.Sprintf(
			"earth/sat/tracked/%s/%s/%d/%d/%d",
			sat.orbit.toString(),
			strings.ToLower(sat.getProvider()),
			sat.meta.SatelliteNumber,
			LatCell(coordinates.Latitude),
			LngCell(coordinates.Longitude),
		)

		if err := e.publisher.PublishDirectMessage(topic, buildMessage(sat, coordinates)); err != nil {
			failed++
			consecutive++
			if firstErr == nil {
				firstErr = err
			}
			if consecutive >= maxConsecutivePublishErrors {
				return fmt.Errorf("giving up this tick after %d consecutive publish errors (%d published, first error: %w)",
					consecutive, published, firstErr)
			}
			continue
		}
		consecutive = 0
		published++
	}

	if failed > 0 {
		return fmt.Errorf("%d of %d publishes failed, first error: %w", failed, published+failed, firstErr)
	}
	return nil
}

func buildMessage(sat Satellite, coordinates GeodeticCoordinates) string {
	satelliteData := map[string]interface{}{
		"lat":        coordinates.Latitude,
		"lng":        coordinates.Longitude,
		"alt":        coordinates.Altitude,
		"name":       sat.meta.Name,
		"id":         sat.meta.SatelliteNumber,
		"launchYear": GetLaunchYear(sat.meta.International),
		"inc":        sat.meta.Inclination,
		"ecc":        sat.meta.Eccentricity,
	}
	jsonData, _ := json.Marshal(satelliteData)

	return string(jsonData)
}

type GeodeticCoordinates struct {
	Latitude  float64
	Longitude float64
	Altitude  float64
}

func GetLaunchYear(designator string) int {
	if len(designator) < 2 {
		return 0
	}
	yearPart, err := strconv.Atoi(designator[:2])
	if err != nil {
		return 0
	}

	// TLE logic:
	// years 58-99 -> 1950s to 1990s
	// years 00-57 -> 2000s to 2057
	if yearPart >= 58 {
		return 1900 + yearPart
	}
	return 2000 + yearPart
}

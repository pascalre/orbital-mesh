package emitter

import (
	"encoding/json"
	"fmt"
	"log"
	"orbital_emitter/internal/platform"
	"strconv"
	"strings"

	"github.com/akhenakh/sgp4"
)

type Emitter struct {
	satelliteCache []Satellite
	solaceClient   *platform.SolaceClient
}

type Satellite struct {
	provider string
	orbit    Orbit
	meta     *sgp4.TLE
}

const unknown = "UNKNOWN"

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

func NewEmitter(client *platform.SolaceClient) *Emitter {
	return &Emitter{
		satelliteCache: []Satellite{},
		solaceClient:   client,
	}
}

func (e *Emitter) GetSatellites() {
	provider := "ACTIVE"
	satellites := platform.GetSatellitesForGroupAsTLE(provider)

	for _, sat := range satellites {
		tle := parseTLE(sat)
		e.satelliteCache = append(e.satelliteCache, Satellite{
			provider: provider,
			orbit:    GetOrbit(tle.MeanMotion, tle.Eccentricity, tle.Inclination),
			meta:     tle,
		})
	}
}

func (e *Emitter) EmitCoordinates() {
	for _, sat := range e.satelliteCache {
		coordinates, err := getGeodeticCoordinates(sat.meta)
		if err != nil {
			log.Printf("Skipping sat %d: %v", sat.meta.SatelliteNumber, err)
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

		message := buildMessage(sat, coordinates)

		e.solaceClient.PublishDirectMessage(topic, message)
	}
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
	yearPartStr := designator[:2]
	yearPart, _ := strconv.Atoi(yearPartStr)

	// TLE logic:
	// years 58-99 -> 1950s to 1990s
	// years 00-57 -> 2000s to 2057
	var fullYear int
	if yearPart >= 58 {
		fullYear = 1900 + yearPart
	} else {
		fullYear = 2000 + yearPart
	}

	return fullYear
}

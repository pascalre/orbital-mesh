package emitter

import (
	"log"
	"time"

	"github.com/akhenakh/sgp4"
)

func parseTLE(tleStr string) *sgp4.TLE {
	tle, err := sgp4.ParseTLE(tleStr)
	if err != nil {
		log.Fatalf("Failed to parse TLE: %v", err)
	}
	return tle
}

func getGeodeticCoordinates(tle *sgp4.TLE) GeodeticCoordinates {
	eciState, err := tle.FindPositionAtTime(time.Now())
	if err != nil {
		log.Fatalf("Failed to propagate position: %v", err)
	}

	lat, lon, alt := eciState.ToGeodetic()

	return GeodeticCoordinates{
		Latitude:  lat,
		Longitude: lon,
		Altitude:  alt,
	}
}

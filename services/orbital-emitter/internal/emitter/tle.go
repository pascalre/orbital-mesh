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

func getGeodeticCoordinates(tle *sgp4.TLE) (GeodeticCoordinates, error) {
	eciState, err := tle.FindPositionAtTime(time.Now())
	if err != nil {
		log.Printf("Warning: Skipping satellite due to SGP4 error: %v", err)
		return GeodeticCoordinates{}, err
	}

	lat, lon, alt := eciState.ToGeodetic()

	return GeodeticCoordinates{
		Latitude:  lat,
		Longitude: lon,
		Altitude:  alt,
	}, nil
}

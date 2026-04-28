package emitter

import (
	"fmt"
	"log"
	"time"

	"github.com/akhenakh/sgp4"
)

func parseTLE(tleStr string) *sgp4.TLE {
	tle, err := sgp4.ParseTLE(tleStr)
	if err != nil {
		log.Fatalf("Failed to parse TLE: %v", err)
	}
	fmt.Printf("Successfully parsed TLE for: %s\n", tle.Name)
	fmt.Printf("Epoch Time: %v\n", tle.EpochTime())
	return tle
}

func getGeodeticCoordinates(tle *sgp4.TLE) (coordinates GeodeticCoordinates) {
	// Propagate to a specific time
	// targetTime := tle.EpochTime().Add(60 * time.Minute)

	//eciState, err := tle.FindPositionAtTime(targetTime)
	eciState, err := tle.FindPositionAtTime(time.Now())
	// Or propagate by minutes from epoch:
	// eciState, err := tle.FindPosition(60.0)
	if err != nil {
		log.Fatalf("Failed to propagate position: %v", err)
	}

	// Convert to Geodetic
	lat, lon, alt := eciState.ToGeodetic()

	if tle.IsGeostationary() {
		fmt.Printf("%s is likely a geostationary satellite.\n", tle.Name)
	} else {
		fmt.Printf("%s is not classified as geostationary by this check.\n", tle.Name)
	}

	return GeodeticCoordinates{
		Latitude:  lat,
		Longitude: lon,
		Altitude:  alt,
	}
}

package emitter

import (
	"time"

	"github.com/akhenakh/sgp4"
)

func parseTLE(tleStr string) (*sgp4.TLE, error) {
	return sgp4.ParseTLE(tleStr)
}

func getGeodeticCoordinates(tle *sgp4.TLE) (GeodeticCoordinates, error) {
	eciState, err := tle.FindPositionAtTime(time.Now())
	if err != nil {
		return GeodeticCoordinates{}, err
	}

	lat, lon, alt := eciState.ToGeodetic()

	return GeodeticCoordinates{
		Latitude:  lat,
		Longitude: lon,
		Altitude:  alt,
	}, nil
}

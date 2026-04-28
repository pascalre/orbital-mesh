package platform

import (
	"context"
	"log"
	"os"
	"strings"

	"github.com/avyayk/celestrak-go/celestrak"
)

func GetSatellitesForGroupAsTLE(group string) []string {
	client, err := celestrak.NewClient(nil)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}

	ctx := context.Background()
	query := celestrak.QueryByGROUP(group, celestrak.FormatTLE)

	data, err := client.FetchGP(ctx, query)
	if err != nil {
		log.Printf("Error fetching Celestrek API: %v", err)
		os.Exit(1)
	}

	return parse(string(data))
}

func parse(multilineTLE string) []string {
	lines := strings.Split(strings.TrimSpace(multilineTLE), "\n")

	var tleEntries []string
	for i := 0; i < len(lines); i += 3 {
		if i+2 < len(lines) {
			entry := strings.Join(lines[i:i+3], "\n")
			tleEntries = append(tleEntries, entry)
		}
	}
	return tleEntries
}

/*

type OrbitalElements struct {
	Group       string  `json:"GROUP"`
	ObjectName  string  `json:"OBJECT_NAME"`
	ObjectID    string  `json:"OBJECT_ID"`
	Epoch       string  `json:"EPOCH"`
	MeanMotion  float64 `json:"MEAN_MOTION"`
	Inclination float64 `json:"INCLINATION"`
	NoradID     int     `json:"NORAD_CAT_ID"`
}

func GetSatellitesForGroupAsJson(group string) []OrbitalElements {
	client, err := celestrak.NewClient(nil)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}

	ctx := context.Background()
	query := celestrak.QueryByGROUP(group, celestrak.FormatJSON)

	data, err := client.FetchGP(ctx, query)
	if err != nil {
		log.Printf("Error fetching ISS data: %v", err)
		os.Exit(1)
	}

	// Da das JSON mit [ beginnt, definieren wir ein Slice unseres Structs
	var satellites []OrbitalElements

	// Umwandeln des Strings in Bytes und "Unmarshaling" in das Objekt
	json.Unmarshal([]byte(data), &satellites)

	// Zugriff auf die Daten (hier auf das erste Element im Slice)
	if len(satellites) > 0 {
		iss := satellites[0]
		fmt.Printf("Satellit: %s\n", iss.ObjectName)
		fmt.Printf("NORAD ID: %d\n", iss.NoradID)
		fmt.Printf("Inklination: %.4f°\n", iss.Inclination)
		fmt.Printf("Epoche: %s\n", iss.Epoch)
	}
	fmt.Println(string(data))
	// Output:
	// ISS (ZARYA)
	// 1 25544U 98067A   26020.17509289  .00021194  00000+0  38548-3 0  9998
	// 2 25544  51.6334 312.1983 0007785  38.3265 321.8276 15.49442598548811

	return satellites
}
*/

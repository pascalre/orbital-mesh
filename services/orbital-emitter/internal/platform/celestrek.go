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

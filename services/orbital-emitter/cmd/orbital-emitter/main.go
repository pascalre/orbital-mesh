package main

import (
	"context"
	"log"
	"orbital_emitter/internal/catalog"
	"orbital_emitter/internal/celestrak"
	"orbital_emitter/internal/emitter"
	"orbital_emitter/internal/engine"
	"orbital_emitter/internal/health"
	"orbital_emitter/internal/platform"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	group := envOr("CELESTRAK_GROUP", "ACTIVE")

	// The cache directory should be a persistent Docker volume so the satellite
	// catalog survives restarts and CelesTrak is not asked again.
	store, err := catalog.NewStore(envOr("CACHE_DIR", "/data"), group)
	if err != nil {
		log.Fatalf("Cannot use cache directory: %v", err)
	}
	catalogManager := catalog.NewManager(catalog.Config{
		Group:           group,
		RefreshInterval: envDuration("CATALOG_REFRESH_INTERVAL", 24*time.Hour),
		RetryBase:       envDuration("CATALOG_RETRY_BASE", 2*time.Hour),
		RetryMax:        envDuration("CATALOG_RETRY_MAX", 12*time.Hour),
	}, store, celestrak.FetchGroupTLE)

	status := health.New(30 * time.Second)
	go status.Serve(ctx, envOr("HEALTH_ADDR", ":8080"))

	client, err := platform.NewSolaceClient()
	if err != nil {
		log.Fatalf("Failed to connect to Solace: %v", err)
	}
	defer client.Close()
	status.SetBrokerCheck(client.IsConnected)

	em := emitter.NewEmitter(client, group)
	eng := engine.NewEngine(em, catalogManager, status, envDuration("EMIT_INTERVAL", time.Second))

	log.Println("Engine is starting...")
	eng.Start(ctx)

	log.Println("Main: Application exited cleanly.")
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil || d <= 0 {
		log.Printf("Ignoring invalid %s=%q, using %s", key, v, fallback)
		return fallback
	}
	return d
}

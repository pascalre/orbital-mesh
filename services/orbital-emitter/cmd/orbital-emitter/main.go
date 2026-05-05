package main

import (
	"context"
	"log"
	"orbital_emitter/internal/emitter"
	"orbital_emitter/internal/engine"
	"orbital_emitter/internal/platform"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	client, err := platform.NewSolaceClient()
	if err != nil {
		log.Fatalf("Failed to connect to Solace: %v", err)
	}

	emitter := emitter.NewEmitter(client)
	engine := engine.NewEngine(emitter)

	log.Println("Engine is starting...")
	engine.Start(ctx)

	log.Println("Main: Application exited cleanly.")
}

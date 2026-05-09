package engine

import (
	"context"
	"log"
	"orbital_emitter/internal/emitter"
	"time"
)

type Engine struct {
	emitter *emitter.Emitter
}

func NewEngine(e *emitter.Emitter) *Engine {
	return &Engine{emitter: e}
}

func (eng *Engine) Start(ctx context.Context) {
	eng.emitter.GetSatellites()

	telemetryTicker := time.NewTicker(10 * time.Second)
	catalogRefreshTicker := time.NewTicker(24 * time.Hour)
	defer telemetryTicker.Stop()
	defer catalogRefreshTicker.Stop()

	log.Println("Started orbital emitter engine...")

	for {
		select {
		case <-telemetryTicker.C:
			eng.emitter.EmitCoordinates()

		case <-catalogRefreshTicker.C:
			log.Println("Refresh satellite cache from Celestrak...")
			eng.emitter.GetSatellites()

		case <-ctx.Done():
			log.Println("Shutdown...")
			return
		}
	}
}

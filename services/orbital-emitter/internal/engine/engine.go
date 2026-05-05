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

	fastTicker := time.NewTicker(1 * time.Second)
	slowTicker := time.NewTicker(2*time.Hour + 1*time.Minute)
	defer fastTicker.Stop()
	defer slowTicker.Stop()

	log.Println("Started orbital emitter engine...")

	for {
		select {
		case <-fastTicker.C:
			eng.emitter.EmitCoordinates()

		case <-slowTicker.C:
			log.Println("Refresh satellite cache from Celestrak...")
			eng.emitter.GetSatellites()

		case <-ctx.Done():
			log.Println("Shutdown...")
			return
		}
	}
}

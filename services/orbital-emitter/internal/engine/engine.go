package engine

import (
	"context"
	"fmt"
	"log"
	"orbital_emitter/internal/catalog"
	"time"
)

// Emitter turns the satellite catalog into position events.
type Emitter interface {
	SetCatalog(tleEntries []string)
	// EmitCoordinates publishes one position per satellite. A non-nil error
	// means some or all publishes failed; it never means "stop".
	EmitCoordinates() error
}

// Catalog provides the satellite data and keeps it fresh.
type Catalog interface {
	LoadCached() (catalog.Snapshot, bool)
	Run(ctx context.Context, onUpdate func(catalog.Snapshot))
}

// Beat is notified about progress (used for the liveness/readiness probes).
type Beat interface {
	MarkTick()
	SetCatalogLoaded()
}

type Engine struct {
	emitter  Emitter
	catalog  Catalog
	beat     Beat
	interval time.Duration
}

func NewEngine(e Emitter, c Catalog, b Beat, interval time.Duration) *Engine {
	return &Engine{emitter: e, catalog: c, beat: b, interval: interval}
}

const errorLogInterval = 30 * time.Second

func (eng *Engine) Start(ctx context.Context) {
	eng.useSnapshot(eng.loadCached())

	// CelesTrak is polled in the background and only when the cache is due, so
	// a slow or failing download never delays or interrupts the telemetry.
	catalogDone := make(chan struct{})
	go func() {
		defer close(catalogDone)
		eng.catalog.Run(ctx, eng.useSnapshot)
	}()

	ticker := time.NewTicker(eng.interval)
	defer ticker.Stop()

	log.Println("Started orbital emitter engine...")

	var lastErrLog time.Time
	for {
		eng.beat.MarkTick()
		select {
		case <-ticker.C:
			if err := eng.safeEmit(); err != nil && time.Since(lastErrLog) > errorLogInterval {
				log.Printf("Emit failed (logged at most every %s): %v", errorLogInterval, err)
				lastErrLog = time.Now()
			}

		case <-ctx.Done():
			log.Println("Shutdown...")
			<-catalogDone
			return
		}
	}
}

func (eng *Engine) loadCached() catalog.Snapshot {
	snap, ok := eng.catalog.LoadCached()
	if !ok {
		log.Println("No cached satellite catalog; waiting for the first CelesTrak download")
		return catalog.Snapshot{}
	}
	log.Printf("Loaded cached satellite catalog from %s", snap.FetchedAt.Format(time.RFC3339))
	return snap
}

func (eng *Engine) useSnapshot(snap catalog.Snapshot) {
	if snap.TLE == "" {
		return
	}
	eng.emitter.SetCatalog(catalog.ParseTLEs(snap.TLE))
	eng.beat.SetCatalogLoaded()
}

// safeEmit makes sure that a panic inside the SGP4 library for one odd
// satellite cannot take the whole process down.
func (eng *Engine) safeEmit() error {
	var err error
	func() {
		defer func() {
			if r := recover(); r != nil {
				err = fmt.Errorf("recovered from panic while emitting: %v", r)
			}
		}()
		err = eng.emitter.EmitCoordinates()
	}()
	return err
}

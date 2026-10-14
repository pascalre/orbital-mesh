// Package health exposes liveness and readiness endpoints (for container orchestrators or manual checks).
//
//	/healthz  liveness:  the telemetry loop is still ticking
//	/readyz   readiness: a satellite catalog is loaded and the broker is connected
package health

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sync/atomic"
	"time"
)

type Status struct {
	staleAfter    time.Duration
	lastTick      atomic.Int64 // unix nanos, 0 = loop not started yet
	catalogLoaded atomic.Bool
	brokerCheck   atomic.Pointer[func() bool]
	now           func() time.Time
}

// New creates a Status. The liveness probe fails once the telemetry loop has
// not ticked for staleAfter.
func New(staleAfter time.Duration) *Status {
	return &Status{staleAfter: staleAfter, now: time.Now}
}

// MarkTick is called by the telemetry loop on every iteration.
func (s *Status) MarkTick() { s.lastTick.Store(s.now().UnixNano()) }

func (s *Status) SetCatalogLoaded() { s.catalogLoaded.Store(true) }

// SetBrokerCheck registers the function used to ask whether the broker
// connection is currently up.
func (s *Status) SetBrokerCheck(f func() bool) { s.brokerCheck.Store(&f) }

func (s *Status) live() error {
	last := s.lastTick.Load()
	if last == 0 {
		return nil // still starting; the startupProbe covers this phase
	}
	if age := s.now().Sub(time.Unix(0, last)); age > s.staleAfter {
		return fmt.Errorf("telemetry loop stalled for %s", age.Round(time.Second))
	}
	return nil
}

func (s *Status) ready() error {
	if !s.catalogLoaded.Load() {
		return errors.New("satellite catalog not loaded yet")
	}
	if check := s.brokerCheck.Load(); check == nil || !(*check)() {
		return errors.New("not connected to broker")
	}
	return nil
}

func (s *Status) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", probe(s.live))
	mux.HandleFunc("/readyz", probe(s.ready))
	return mux
}

func probe(check func() error) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		if err := check(); err != nil {
			http.Error(w, err.Error(), http.StatusServiceUnavailable)
			return
		}
		fmt.Fprintln(w, "ok")
	}
}

// Serve runs the HTTP server until ctx is cancelled.
func (s *Status) Serve(ctx context.Context, addr string) {
	srv := &http.Server{Addr: addr, Handler: s.Handler(), ReadHeaderTimeout: 5 * time.Second}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	log.Printf("Health endpoints listening on %s", addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Printf("health server stopped: %v", err)
	}
}

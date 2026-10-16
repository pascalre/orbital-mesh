package engine

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"orbital_emitter/internal/catalog"
)

type fakeEmitter struct {
	mu      sync.Mutex
	entries []string
	emits   atomic.Int32
	panics  bool
	err     error
}

func (f *fakeEmitter) SetCatalog(e []string) { f.mu.Lock(); f.entries = e; f.mu.Unlock() }
func (f *fakeEmitter) EmitCoordinates() error {
	f.emits.Add(1)
	if f.panics {
		panic("sgp4 exploded")
	}
	return f.err
}
func (f *fakeEmitter) catalogSize() int { f.mu.Lock(); defer f.mu.Unlock(); return len(f.entries) }

type fakeCatalog struct {
	cached  *catalog.Snapshot
	updates chan catalog.Snapshot
}

func (c *fakeCatalog) LoadCached() (catalog.Snapshot, bool) {
	if c.cached == nil {
		return catalog.Snapshot{}, false
	}
	return *c.cached, true
}

func (c *fakeCatalog) Run(ctx context.Context, onUpdate func(catalog.Snapshot)) {
	for {
		select {
		case s := <-c.updates:
			onUpdate(s)
		case <-ctx.Done():
			return
		}
	}
}

type fakeBeat struct {
	ticks  atomic.Int32
	loaded atomic.Bool
}

func (b *fakeBeat) MarkTick()         { b.ticks.Add(1) }
func (b *fakeBeat) SetCatalogLoaded() { b.loaded.Store(true) }

const oneSat = "ISS (ZARYA)\n1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9990\n2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.49560000 00009\n"

func run(t *testing.T, e *fakeEmitter, c *fakeCatalog, b *fakeBeat) (stop func()) {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel) // also cancelled by stop(); cancel is idempotent
	done := make(chan struct{})
	go func() { NewEngine(e, c, b, 5*time.Millisecond).Start(ctx); close(done) }()
	return func() {
		cancel()
		select {
		case <-done:
		case <-time.After(2 * time.Second):
			t.Fatal("engine did not shut down")
		}
	}
}

func TestStartsFromCacheAndAcceptsUpdates(t *testing.T) {
	t.Parallel()
	e, b := &fakeEmitter{}, &fakeBeat{}
	c := &fakeCatalog{cached: &catalog.Snapshot{TLE: oneSat, FetchedAt: time.Now()}, updates: make(chan catalog.Snapshot)}
	stop := run(t, e, c, b)
	defer stop()

	waitFor(t, func() bool { return e.emits.Load() >= 3 && e.catalogSize() == 1 && b.loaded.Load() })

	c.updates <- catalog.Snapshot{TLE: oneSat + oneSat}
	waitFor(t, func() bool { return e.catalogSize() == 2 })
}

func TestNoCacheEmitsNothingUntilCatalogArrives(t *testing.T) {
	t.Parallel()
	e, b := &fakeEmitter{}, &fakeBeat{}
	c := &fakeCatalog{updates: make(chan catalog.Snapshot)}
	stop := run(t, e, c, b)
	defer stop()

	waitFor(t, func() bool { return b.ticks.Load() >= 3 })
	if b.loaded.Load() || e.catalogSize() != 0 {
		t.Fatal("catalog must not be marked loaded without data")
	}
	c.updates <- catalog.Snapshot{TLE: oneSat}
	waitFor(t, func() bool { return b.loaded.Load() })
}

func TestPanicsAndErrorsDoNotStopTheLoop(t *testing.T) {
	t.Parallel()
	e, b := &fakeEmitter{panics: true}, &fakeBeat{}
	c := &fakeCatalog{updates: make(chan catalog.Snapshot)}
	stop := run(t, e, c, b)
	defer stop()
	waitFor(t, func() bool { return e.emits.Load() >= 5 })

	e2 := &fakeEmitter{err: errors.New("broker down")}
	stop2 := run(t, e2, &fakeCatalog{updates: make(chan catalog.Snapshot)}, &fakeBeat{})
	defer stop2()
	waitFor(t, func() bool { return e2.emits.Load() >= 5 })
}

func waitFor(t *testing.T, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatal("condition not met in time")
		}
		time.Sleep(2 * time.Millisecond)
	}
}

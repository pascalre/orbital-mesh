// Package catalog keeps the satellite catalog (TLE data from CelesTrak) in a
// persistent cache and decides when – and only when – CelesTrak may be asked
// for new data.
//
// The rules are deliberately conservative because CelesTrak blocks clients
// that poll too often:
//
//   - A cached snapshot that is younger than RefreshInterval is used as is;
//     restarting the process or the container never triggers a download.
//   - The time of every attempt is persisted *before* the request is made, so
//     even a crash-looping process cannot exceed the allowed request rate.
//   - Failed attempts are retried with exponential backoff (RetryBase,
//     doubling, capped at RetryMax). While waiting, the last good snapshot
//     stays in use.
//   - A downloaded payload only replaces the cache if it looks sane.
package catalog

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"
)

// FetchFunc downloads the raw TLE export for a CelesTrak group.
type FetchFunc func(ctx context.Context, group string) (string, error)

type Config struct {
	Group           string
	RefreshInterval time.Duration // how old a snapshot may get before a refresh (default 24h)
	RetryBase       time.Duration // minimum wait after a failed attempt (default 1h)
	RetryMax        time.Duration // upper bound for the backoff (default 12h)
	FetchTimeout    time.Duration // per-request timeout (default 60s)
}

func (c *Config) applyDefaults() {
	if c.RefreshInterval <= 0 {
		c.RefreshInterval = 24 * time.Hour
	}
	if c.RetryBase <= 0 {
		c.RetryBase = time.Hour
	}
	if c.RetryMax <= 0 {
		c.RetryMax = 12 * time.Hour
	}
	if c.RetryMax < c.RetryBase {
		c.RetryMax = c.RetryBase
	}
	if c.FetchTimeout <= 0 {
		c.FetchTimeout = 60 * time.Second
	}
}

type Manager struct {
	cfg   Config
	store *Store
	fetch FetchFunc
	now   func() time.Time

	mu    sync.Mutex
	snap  *Snapshot
	state State
}

func NewManager(cfg Config, store *Store, fetch FetchFunc) *Manager {
	cfg.applyDefaults()
	return &Manager{cfg: cfg, store: store, fetch: fetch, now: time.Now}
}

// LoadCached reads snapshot and state from disk. It never talks to CelesTrak.
// Unreadable files are logged and treated as missing.
func (m *Manager) LoadCached() (Snapshot, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	snap, err := m.store.LoadSnapshot()
	if err != nil {
		log.Printf("catalog: ignoring unreadable cached snapshot: %v", err)
	}
	m.snap = snap

	st, err := m.store.LoadState()
	if err != nil {
		log.Printf("catalog: ignoring unreadable fetch state: %v", err)
	}
	m.state = st

	if m.snap == nil {
		return Snapshot{}, false
	}
	return *m.snap, true
}

// NextAttempt is the earliest time at which CelesTrak may be contacted again.
func (m *Manager) NextAttempt() time.Time {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.nextAttemptLocked()
}

func (m *Manager) nextAttemptLocked() time.Time {
	var due time.Time // zero value: "right now"
	if m.snap != nil {
		due = m.snap.FetchedAt.Add(m.cfg.RefreshInterval)
	}
	if !m.state.LastAttempt.IsZero() {
		// Never closer to the previous attempt than the backoff allows. This
		// also covers a lost snapshot file: no immediate re-download.
		wait := m.backoff(max(m.state.Failures, 1))
		if retryAt := m.state.LastAttempt.Add(wait); retryAt.After(due) {
			due = retryAt
		}
	}
	// A clock that jumped backwards must not park us for days.
	if limit := m.now().Add(max(m.cfg.RefreshInterval, m.cfg.RetryMax)); due.After(limit) {
		due = limit
	}
	return due
}

func (m *Manager) backoff(failures int) time.Duration {
	d := m.cfg.RetryBase
	for i := 1; i < failures && d < m.cfg.RetryMax; i++ {
		d *= 2
	}
	return min(d, m.cfg.RetryMax)
}

// RefreshIfDue downloads new data if – and only if – it is due. The returned
// snapshot is the one currently in use; updated tells whether it is new.
func (m *Manager) RefreshIfDue(ctx context.Context) (Snapshot, bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := m.now()
	if now.Before(m.nextAttemptLocked()) {
		return m.currentLocked(), false, nil
	}

	// Record the attempt first (see package doc).
	m.state = State{LastAttempt: now, Failures: m.state.Failures + 1, LastError: m.state.LastError}
	m.persistState()

	raw, err := m.download(ctx)
	if err == nil {
		err = validate(raw, m.snap)
	}
	if err != nil {
		m.state.LastError = err.Error()
		m.persistState()
		return m.currentLocked(), false, fmt.Errorf("refresh %s from CelesTrak: %w (next attempt not before %s)",
			m.cfg.Group, err, m.nextAttemptLocked().Format(time.RFC3339))
	}

	snap := Snapshot{Group: m.cfg.Group, FetchedAt: now, TLE: raw}
	// A failing disk must not cost us the data we just downloaded.
	if err := m.store.SaveSnapshot(snap); err != nil {
		log.Printf("catalog: WARNING could not persist snapshot, it will not survive a restart: %v", err)
	}
	m.snap = &snap
	m.state = State{LastAttempt: now}
	m.persistState()
	return snap, true, nil
}

func (m *Manager) download(ctx context.Context) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, m.cfg.FetchTimeout)
	defer cancel()
	return m.fetch(ctx, m.cfg.Group)
}

func (m *Manager) currentLocked() Snapshot {
	if m.snap == nil {
		return Snapshot{}
	}
	return *m.snap
}

func (m *Manager) persistState() {
	if err := m.store.SaveState(m.state); err != nil {
		log.Printf("catalog: WARNING could not persist fetch state: %v", err)
	}
}

// Run blocks until ctx is cancelled and keeps the catalog fresh, calling
// onUpdate for every new snapshot. Failures are logged and retried according
// to the backoff; they never terminate the loop.
func (m *Manager) Run(ctx context.Context, onUpdate func(Snapshot)) {
	for {
		wait := time.Until(m.NextAttempt())
		if wait > 0 {
			log.Printf("catalog: next CelesTrak refresh in %s", wait.Round(time.Second))
		}
		timer := time.NewTimer(max(wait, 0))
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
		}

		snap, updated, err := m.RefreshIfDue(ctx)
		switch {
		case err != nil:
			log.Printf("catalog: %v", err)
		case updated:
			log.Printf("catalog: refreshed %s from CelesTrak (%d satellites)", snap.Group, len(ParseTLEs(snap.TLE)))
			onUpdate(snap)
		}
	}
}

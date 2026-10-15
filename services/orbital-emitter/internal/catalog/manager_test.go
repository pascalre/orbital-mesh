package catalog

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const sampleTLE = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9990
2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.49560000 00009
STARLINK-1007
1 44713U 19074A   24001.50000000  .00001000  00000-0  10000-4 0  9991
2 44713  53.0000 100.0000 0001000  90.0000 270.0000 15.06000000 00001
`

type fakeFetcher struct {
	calls int
	data  string
	err   error
}

func (f *fakeFetcher) fetch(context.Context, string) (string, error) {
	f.calls++
	return f.data, f.err
}

type env struct {
	dir string
	now time.Time
}

func newEnv() *env {
	return &env{dir: "", now: time.Date(2026, 10, 12, 8, 0, 0, 0, time.UTC)}
}

// manager simulates one "container lifetime": a fresh Manager on the same cache dir.
func (e *env) manager(t *testing.T, f *fakeFetcher) *Manager {
	t.Helper()
	if e.dir == "" {
		e.dir = t.TempDir()
	}
	store, err := NewStore(e.dir, "ACTIVE")
	if err != nil {
		t.Fatal(err)
	}
	m := NewManager(Config{Group: "ACTIVE", RetryBase: time.Hour}, store, f.fetch)
	m.now = func() time.Time { return e.now }
	m.LoadCached()
	return m
}

func TestParseTLEs(t *testing.T) {
	t.Parallel()

	got := ParseTLEs(strings.ReplaceAll(sampleTLE, "\n", "\r\n"))
	if len(got) != 2 {
		t.Fatalf("want 2 entries, got %d", len(got))
	}
	if !strings.HasPrefix(got[0], "ISS (ZARYA)\n1 25544U") {
		t.Errorf("unexpected first entry: %q", got[0])
	}
	if n := len(ParseTLEs("No GP data found")); n != 0 {
		t.Errorf("garbage must yield no entries, got %d", n)
	}
}

func TestFirstStartFetchesAndPersists(t *testing.T) {
	t.Parallel()
	e, f := newEnv(), &fakeFetcher{data: sampleTLE}

	m := e.manager(t, f)
	snap, updated, err := m.RefreshIfDue(context.Background())
	if err != nil || !updated || f.calls != 1 {
		t.Fatalf("updated=%v err=%v calls=%d", updated, err, f.calls)
	}
	if snap.FetchedAt != e.now {
		t.Errorf("FetchedAt = %v", snap.FetchedAt)
	}
	if _, err := os.Stat(filepath.Join(e.dir, "ACTIVE.snapshot.json")); err != nil {
		t.Errorf("snapshot not persisted: %v", err)
	}
}

func TestRestartWithFreshCacheDoesNotFetch(t *testing.T) {
	t.Parallel()
	e, f := newEnv(), &fakeFetcher{data: sampleTLE}
	if _, _, err := e.manager(t, f).RefreshIfDue(context.Background()); err != nil {
		t.Fatal(err)
	}

	// Container restarts 3 times within an hour.
	for i := 0; i < 3; i++ {
		e.now = e.now.Add(20 * time.Minute)
		m := e.manager(t, f)
		if _, ok := m.LoadCached(); !ok {
			t.Fatal("cached snapshot should be available after restart")
		}
		if _, updated, err := m.RefreshIfDue(context.Background()); updated || err != nil {
			t.Fatalf("restart %d: updated=%v err=%v", i, updated, err)
		}
	}
	if f.calls != 1 {
		t.Fatalf("CelesTrak was contacted %d times, want 1", f.calls)
	}
}

func TestRefreshesAfterRefreshInterval(t *testing.T) {
	t.Parallel()
	e, f := newEnv(), &fakeFetcher{data: sampleTLE}
	if _, _, err := e.manager(t, f).RefreshIfDue(context.Background()); err != nil {
		t.Fatal(err)
	}

	e.now = e.now.Add(23*time.Hour + 59*time.Minute)
	if _, updated, _ := e.manager(t, f).RefreshIfDue(context.Background()); updated {
		t.Fatal("must not refresh before 24h")
	}
	e.now = e.now.Add(2 * time.Minute)
	if _, updated, err := e.manager(t, f).RefreshIfDue(context.Background()); !updated || err != nil {
		t.Fatalf("must refresh after 24h: updated=%v err=%v", updated, err)
	}
	if f.calls != 2 {
		t.Fatalf("calls = %d, want 2", f.calls)
	}
}

func TestFailedRefreshKeepsOldSnapshotAndBacksOffAcrossRestarts(t *testing.T) {
	t.Parallel()
	e, f := newEnv(), &fakeFetcher{data: sampleTLE}
	if _, _, err := e.manager(t, f).RefreshIfDue(context.Background()); err != nil {
		t.Fatal(err)
	}
	first := e.now

	e.now = e.now.Add(25 * time.Hour)
	f.err = errors.New("403 forbidden")
	m := e.manager(t, f)
	snap, updated, err := m.RefreshIfDue(context.Background())
	if err == nil || updated {
		t.Fatalf("expected failure, got updated=%v err=%v", updated, err)
	}
	if snap.FetchedAt != first {
		t.Error("old snapshot must stay in use after a failed refresh")
	}
	if f.calls != 2 {
		t.Fatalf("calls = %d", f.calls)
	}

	// A crash-looping container must not retry before the backoff (1h) is over.
	for i := 0; i < 5; i++ {
		e.now = e.now.Add(5 * time.Minute)
		if _, _, err := e.manager(t, f).RefreshIfDue(context.Background()); err != nil {
			t.Fatalf("no attempt expected inside backoff, got %v", err)
		}
	}
	if f.calls != 2 {
		t.Fatalf("calls inside backoff = %d, want 2", f.calls)
	}

	// After 1h: second attempt, now the backoff doubles to 2h.
	e.now = e.now.Add(time.Hour)
	_, _, _ = e.manager(t, f).RefreshIfDue(context.Background())
	if f.calls != 3 {
		t.Fatalf("calls = %d, want 3", f.calls)
	}
	e.now = e.now.Add(90 * time.Minute)
	_, _, _ = e.manager(t, f).RefreshIfDue(context.Background())
	if f.calls != 3 {
		t.Fatalf("backoff did not double: calls = %d", f.calls)
	}

	// Recovery.
	f.err = nil
	e.now = e.now.Add(time.Hour)
	if _, updated, err := e.manager(t, f).RefreshIfDue(context.Background()); !updated || err != nil {
		t.Fatalf("recovery failed: updated=%v err=%v", updated, err)
	}
}

func TestAttemptIsRecordedBeforeTheRequest(t *testing.T) {
	t.Parallel()
	e := newEnv()
	crashed := &fakeFetcher{}
	m := e.manager(t, crashed)
	m.fetch = func(context.Context, string) (string, error) {
		// Simulate the process dying mid-request: look at the disk state.
		st, err := m.store.LoadState()
		if err != nil || st.LastAttempt != e.now {
			t.Errorf("attempt not persisted before request: %+v %v", st, err)
		}
		return "", errors.New("killed")
	}
	_, _, _ = m.RefreshIfDue(context.Background())
}

func TestInvalidPayloadNeverReplacesCache(t *testing.T) {
	t.Parallel()
	e, f := newEnv(), &fakeFetcher{data: sampleTLE}
	if _, _, err := e.manager(t, f).RefreshIfDue(context.Background()); err != nil {
		t.Fatal(err)
	}

	e.now = e.now.Add(25 * time.Hour)
	f.data = "Invalid query: \"GROUP=ACTIVEE\""
	snap, updated, err := e.manager(t, f).RefreshIfDue(context.Background())
	if err == nil || updated {
		t.Fatalf("garbage must be rejected, updated=%v err=%v", updated, err)
	}
	if !strings.Contains(snap.TLE, "ISS (ZARYA)") {
		t.Error("cache was overwritten with garbage")
	}
}

func TestTruncatedPayloadIsRejected(t *testing.T) {
	t.Parallel()
	prev := &Snapshot{TLE: sampleTLE + sampleTLE}
	one := strings.Join(strings.Split(sampleTLE, "\n")[:3], "\n")
	if err := validate(one, prev); err == nil {
		t.Error("payload with <50% of the previous entries must be rejected")
	}
	if err := validate(sampleTLE+sampleTLE, prev); err != nil {
		t.Errorf("same-size payload must pass: %v", err)
	}
}

func TestCorruptCacheFilesAreIgnored(t *testing.T) {
	t.Parallel()
	e, f := newEnv(), &fakeFetcher{data: sampleTLE}
	e.dir = t.TempDir()
	if err := os.WriteFile(filepath.Join(e.dir, "ACTIVE.snapshot.json"), []byte("{broken"), 0o600); err != nil {
		t.Fatal(err)
	}
	m := e.manager(t, f)
	if _, ok := m.LoadCached(); ok {
		t.Fatal("corrupt snapshot must be treated as missing")
	}
	if _, updated, err := m.RefreshIfDue(context.Background()); !updated || err != nil {
		t.Fatalf("expected a fresh download: updated=%v err=%v", updated, err)
	}
}

func TestInvalidGroupIsRejected(t *testing.T) {
	t.Parallel()
	if _, err := NewStore(t.TempDir(), "../etc"); err == nil {
		t.Fatal("path traversal in group name must be rejected")
	}
}

func TestBackoffIsCapped(t *testing.T) {
	t.Parallel()
	m := NewManager(Config{Group: "ACTIVE", RetryBase: time.Hour}, nil, nil)
	if got := m.backoff(1); got != time.Hour {
		t.Errorf("backoff(1) = %v", got)
	}
	if got := m.backoff(100); got != 12*time.Hour {
		t.Errorf("backoff(100) = %v", got)
	}
}

func TestNon200HaltsForeverAcrossRestarts(t *testing.T) {
	t.Parallel()
	e, f := newEnv(), &fakeFetcher{data: sampleTLE}
	if _, _, err := e.manager(t, f).RefreshIfDue(context.Background()); err != nil {
		t.Fatal(err)
	}

	e.now = e.now.Add(25 * time.Hour)
	f.err = fmt.Errorf("%w: HTTP 403", ErrHalt)
	m := e.manager(t, f)
	snap, updated, err := m.RefreshIfDue(context.Background())
	if err == nil || updated || !strings.Contains(snap.TLE, "ISS") {
		t.Fatalf("want error and old snapshot, got updated=%v err=%v", updated, err)
	}
	if halted, reason := m.Halted(); !halted || !strings.Contains(reason, "403") {
		t.Fatalf("halted=%v reason=%q", halted, reason)
	}
	calls := f.calls

	// Neither time nor restarts may cause another request.
	for i := 0; i < 10; i++ {
		e.now = e.now.Add(48 * time.Hour)
		if _, _, err := e.manager(t, f).RefreshIfDue(context.Background()); err != nil {
			t.Fatalf("halted manager must be silent, got %v", err)
		}
	}
	if f.calls != calls {
		t.Fatalf("%d requests after halt, want 0", f.calls-calls)
	}

	// A human removes the state file: requests resume.
	if err := os.Remove(filepath.Join(e.dir, "ACTIVE.state.json")); err != nil {
		t.Fatal(err)
	}
	f.err = nil
	if _, updated, err := e.manager(t, f).RefreshIfDue(context.Background()); !updated || err != nil {
		t.Fatalf("resume failed: updated=%v err=%v", updated, err)
	}
}

func TestReloadHaltStatePicksUpClearedHalt(t *testing.T) {
	t.Parallel()
	e, f := newEnv(), &fakeFetcher{err: fmt.Errorf("%w: HTTP 503", ErrHalt)}
	m := e.manager(t, f)
	_, _, _ = m.RefreshIfDue(context.Background())
	if halted, _ := m.Halted(); !halted {
		t.Fatal("expected halt")
	}
	m.reloadHaltState() // state file still says halted
	if halted, _ := m.Halted(); !halted {
		t.Fatal("halt must stay while the state file says so")
	}
	if err := os.Remove(filepath.Join(e.dir, "ACTIVE.state.json")); err != nil {
		t.Fatal(err)
	}
	m.reloadHaltState()
	if halted, _ := m.Halted(); halted {
		t.Fatal("halt must be cleared after the state file is removed")
	}
}

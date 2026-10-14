package health

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func get(h http.Handler, path string) int {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec.Code
}

func TestLiveness(t *testing.T) {
	t.Parallel()
	now := time.Now()
	s := New(30 * time.Second)
	s.now = func() time.Time { return now }
	h := s.Handler()

	if got := get(h, "/healthz"); got != http.StatusOK {
		t.Errorf("before first tick: %d, want 200", got)
	}
	s.MarkTick()
	now = now.Add(10 * time.Second)
	if got := get(h, "/healthz"); got != http.StatusOK {
		t.Errorf("fresh tick: %d, want 200", got)
	}
	now = now.Add(31 * time.Second)
	if got := get(h, "/healthz"); got != http.StatusServiceUnavailable {
		t.Errorf("stalled loop: %d, want 503", got)
	}
}

func TestReadiness(t *testing.T) {
	t.Parallel()
	s := New(time.Minute)
	h := s.Handler()

	if got := get(h, "/readyz"); got != http.StatusServiceUnavailable {
		t.Errorf("nothing ready: %d", got)
	}
	s.SetCatalogLoaded()
	if got := get(h, "/readyz"); got != http.StatusServiceUnavailable {
		t.Errorf("no broker check: %d", got)
	}
	connected := false
	s.SetBrokerCheck(func() bool { return connected })
	if got := get(h, "/readyz"); got != http.StatusServiceUnavailable {
		t.Errorf("broker down: %d", got)
	}
	connected = true
	if got := get(h, "/readyz"); got != http.StatusOK {
		t.Errorf("all ready: %d", got)
	}
}

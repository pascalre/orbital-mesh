package celestrak

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"orbital_emitter/internal/catalog"
)

func serve(t *testing.T, handler http.HandlerFunc) *atomic.Int32 {
	t.Helper()
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		handler(w, r)
	}))
	t.Cleanup(srv.Close)
	old := baseURL
	baseURL = srv.URL
	t.Cleanup(func() { baseURL = old })
	return &hits
}

// These tests change a package variable and therefore must not run in parallel.

func TestSuccess(t *testing.T) { //nolint:paralleltest
	var gotUA, gotQuery string
	hits := serve(t, func(w http.ResponseWriter, r *http.Request) {
		gotUA, gotQuery = r.UserAgent(), r.URL.RawQuery
		_, _ = w.Write([]byte("DATA"))
	})
	got, err := FetchGroupTLE(context.Background(), "ACTIVE")
	if err != nil || got != "DATA" {
		t.Fatalf("got %q, %v", got, err)
	}
	if hits.Load() != 1 || gotUA != userAgent || gotQuery != "FORMAT=tle&GROUP=ACTIVE" {
		t.Errorf("hits=%d ua=%q query=%q", hits.Load(), gotUA, gotQuery)
	}
}

func TestNon200HaltsAndIsNeverRetried(t *testing.T) { //nolint:paralleltest
	for _, status := range []int{301, 403, 404, 500, 503} {
		hits := serve(t, func(w http.ResponseWriter, r *http.Request) {
			if status == 301 {
				w.Header().Set("Location", "/elsewhere")
			}
			w.WriteHeader(status)
			_, _ = w.Write([]byte("nope"))
		})
		_, err := FetchGroupTLE(context.Background(), "ACTIVE")
		if !errors.Is(err, catalog.ErrHalt) {
			t.Errorf("status %d: want ErrHalt, got %v", status, err)
		}
		if hits.Load() != 1 {
			t.Errorf("status %d: %d requests sent, want exactly 1", status, hits.Load())
		}
	}
}

func TestNetworkErrorDoesNotHalt(t *testing.T) { //nolint:paralleltest
	serve(t, func(http.ResponseWriter, *http.Request) {})
	baseURL = "http://127.0.0.1:1" // nothing listens here
	_, err := FetchGroupTLE(context.Background(), "ACTIVE")
	if err == nil || errors.Is(err, catalog.ErrHalt) {
		t.Fatalf("want a plain error, got %v", err)
	}
}

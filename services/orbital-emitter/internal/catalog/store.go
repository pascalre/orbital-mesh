package catalog

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"time"
)

// Snapshot is one successfully downloaded and validated CelesTrak response.
type Snapshot struct {
	Group     string    `json:"group"`
	FetchedAt time.Time `json:"fetchedAt"`
	TLE       string    `json:"tle"`
}

// State remembers fetch attempts across restarts. It is what keeps a
// crash-looping container from hammering CelesTrak: an attempt is recorded *before*
// the request is sent.
type State struct {
	LastAttempt time.Time `json:"lastAttempt"`
	Failures    int       `json:"failures"`
	LastError   string    `json:"lastError,omitempty"`

	// Halted is set when CelesTrak answered with anything but HTTP 200. No
	// further requests are made until a human removes the state file.
	Halted     bool   `json:"halted,omitempty"`
	HaltReason string `json:"haltReason,omitempty"`
}

var groupPattern = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)

// Store persists snapshot and state as JSON files in a directory (a Docker volume
// in production). Writes are atomic (temp file + rename), so a container killed in the
// middle of a write never leaves a corrupt cache behind.
type Store struct {
	dir   string
	group string
}

func NewStore(dir, group string) (*Store, error) {
	if !groupPattern.MatchString(group) {
		return nil, fmt.Errorf("invalid CelesTrak group %q", group)
	}
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return nil, fmt.Errorf("create cache dir: %w", err)
	}
	return &Store{dir: dir, group: group}, nil
}

func (s *Store) snapshotPath() string { return filepath.Join(s.dir, s.group+".snapshot.json") }
func (s *Store) statePath() string    { return filepath.Join(s.dir, s.group+".state.json") }

// LoadSnapshot returns (nil, nil) if no snapshot exists yet.
func (s *Store) LoadSnapshot() (*Snapshot, error) {
	var snap Snapshot
	ok, err := readJSON(s.snapshotPath(), &snap)
	if err != nil || !ok {
		return nil, err
	}
	if snap.TLE == "" || snap.FetchedAt.IsZero() {
		return nil, errors.New("snapshot file is incomplete")
	}
	return &snap, nil
}

func (s *Store) SaveSnapshot(snap Snapshot) error { return writeJSONAtomic(s.snapshotPath(), snap) }

// LoadState returns a zero State if none has been written yet.
func (s *Store) LoadState() (State, error) {
	var st State
	_, err := readJSON(s.statePath(), &st)
	return st, err
}

func (s *Store) SaveState(st State) error { return writeJSONAtomic(s.statePath(), st) }

func readJSON(path string, v any) (bool, error) {
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if err := json.Unmarshal(data, v); err != nil {
		return false, fmt.Errorf("decode %s: %w", filepath.Base(path), err)
	}
	return true, nil
}

func writeJSONAtomic(path string, v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}

	tmp, err := os.CreateTemp(filepath.Dir(path), filepath.Base(path)+".tmp-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName) // no-op after a successful rename

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}

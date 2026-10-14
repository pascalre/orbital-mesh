package catalog

import (
	"fmt"
	"strings"
)

// ParseTLEs splits a CelesTrak 3-line TLE export (name, line 1, line 2) into
// one string per satellite. It is tolerant towards CRLF line endings, trailing
// whitespace and stray lines, and only returns well-formed entries.
func ParseTLEs(raw string) []string {
	lines := strings.Split(raw, "\n")
	for i := range lines {
		lines[i] = strings.TrimRight(lines[i], " \t\r")
	}

	var entries []string
	for i := 1; i+1 < len(lines); i++ {
		if strings.HasPrefix(lines[i], "1 ") && strings.HasPrefix(lines[i+1], "2 ") {
			name := strings.TrimSpace(lines[i-1])
			if name == "" || strings.HasPrefix(name, "1 ") || strings.HasPrefix(name, "2 ") {
				continue
			}
			entries = append(entries, name+"\n"+lines[i]+"\n"+lines[i+1])
			i++ // line 2 is consumed
		}
	}
	return entries
}

// validate makes sure a freshly downloaded payload is plausible before it is
// allowed to replace the cached snapshot. CelesTrak sometimes answers with an
// HTTP 200 and a plain-text error message; that must never poison the cache.
func validate(raw string, previous *Snapshot) error {
	count := len(ParseTLEs(raw))
	if count == 0 {
		return fmt.Errorf("payload contains no TLE entries (%d bytes)", len(raw))
	}
	if previous != nil {
		if prevCount := len(ParseTLEs(previous.TLE)); prevCount > 0 && count*2 < prevCount {
			return fmt.Errorf("payload looks truncated: %d entries, previous snapshot had %d", count, prevCount)
		}
	}
	return nil
}

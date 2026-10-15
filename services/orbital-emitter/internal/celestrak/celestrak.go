// Package celestrak downloads GP data from CelesTrak, following its usage
// policy (https://celestrak.org/usage-policy.php):
//
//   - exactly ONE request per call, no automatic retries,
//   - redirects are not followed,
//   - every response other than HTTP 200 is reported as catalog.ErrHalt, which
//     makes the caller stop querying CelesTrak until a human has looked at it.
//
// Network-level failures (timeout, DNS, connection refused) are returned as
// ordinary errors: no request reached CelesTrak, so the normal backoff applies.
package celestrak

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"orbital_emitter/internal/catalog"
)

// baseURL is a variable so tests can point it at a local server.
var baseURL = "https://celestrak.org/NORAD/elements/gp.php"

const (
	userAgent    = "orbital-mesh-emitter (+https://github.com/pascalre/orbital-mesh)"
	maxBodyBytes = 64 << 20
)

// The default transport honours HTTPS_PROXY; only redirects are disabled.
var client = &http.Client{
	CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
}

// FetchGroupTLE downloads the TLE export of a CelesTrak group.
func FetchGroupTLE(ctx context.Context, group string) (string, error) {
	query := url.Values{"GROUP": {group}, "FORMAT": {"tle"}}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"?"+query.Encode(), nil)
	if err != nil {
		return "", fmt.Errorf("build CelesTrak request: %w", err)
	}
	req.Header.Set("User-Agent", userAgent)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request CelesTrak group %s: %w", group, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		snippet, _ := io.ReadAll(io.LimitReader(resp.Body, 300))
		return "", fmt.Errorf("%w: HTTP %d for group %s: %s",
			catalog.ErrHalt, resp.StatusCode, group, strings.TrimSpace(string(snippet)))
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes))
	if err != nil {
		return "", fmt.Errorf("read CelesTrak response: %w", err)
	}
	return string(body), nil
}

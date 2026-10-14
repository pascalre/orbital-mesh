package platform

import (
	"context"
	"fmt"

	"github.com/avyayk/celestrak-go/celestrak"
)

// FetchGroupTLE downloads the TLE export of a CelesTrak group. It performs
// exactly one request and returns an error instead of exiting the process;
// deciding *when* to call it is the job of the catalog package.
func FetchGroupTLE(ctx context.Context, group string) (string, error) {
	client, err := celestrak.NewClient(nil)
	if err != nil {
		return "", fmt.Errorf("create CelesTrak client: %w", err)
	}

	data, err := client.FetchGP(ctx, celestrak.QueryByGROUP(group, celestrak.FormatTLE))
	if err != nil {
		return "", fmt.Errorf("fetch CelesTrak group %s: %w", group, err)
	}
	return string(data), nil
}

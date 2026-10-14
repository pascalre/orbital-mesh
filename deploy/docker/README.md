# Running the emitter with Docker

See the comments in `compose.yaml` for the setup steps.

## How the emitter treats CelesTrak

CelesTrak blocks clients that poll too often, so **restarts and updates never
cause a download**:

| Situation | Behaviour |
|---|---|
| Container (re)starts, cache younger than 24h | Cache is loaded from the volume, **no request** |
| Cache older than 24h | One download, then the cache is rewritten (atomically) |
| Download fails / returns garbage | Old cache stays in use; retry after 1h, then 2h, 4h ... max 12h |
| Container crash-loops | The time of each attempt is stored *before* the request, so the backoff still applies |
| No cache and download fails | Emitter idles (no events) and retries with the same backoff |

The cache lives in `CACHE_DIR` (`/data`, the `emitter-cache` volume) as
`<GROUP>.snapshot.json` and `<GROUP>.state.json`. To force a refresh, delete
both files and restart the container - do this sparingly.

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `SOLACE_HOST`, `SOLACE_VPN`, `SOLACE_USERNAME`, `SOLACE_PASSWORD` | - | Broker connection (`.env`) |
| `CACHE_DIR` | `/data` | Persistent cache directory |
| `CELESTRAK_GROUP` | `ACTIVE` | CelesTrak group |
| `CATALOG_REFRESH_INTERVAL` | `24h` | Max age of the cache |
| `CATALOG_RETRY_BASE` / `CATALOG_RETRY_MAX` | `1h` / `12h` | Backoff after failed downloads |
| `EMIT_INTERVAL` | `1s` | Position update rate |
| `HEALTH_ADDR` | `:8080` | `/healthz`, `/readyz` (not exposed by default) |

The Solace connection reconnects forever, and publish errors no longer
terminate the process.

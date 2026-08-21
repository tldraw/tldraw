# tail-worker

Tail consumer for `tldraw-multiplayer`. Cloudflare hands it a `TraceItem[]` for every sync worker and
durable object invocation. It does two things with them:

- **Errors → Grafana Loki.** Every invocation whose outcome is not `ok` / `canceled` /
  `responseStreamDisconnected` is pushed with its stack, its captured console output, and the handler
  it came from. This is the channel that did not exist before: `TLFileDurableObject` wraps only
  `fetch()` in Sentry, so `alarm()`, the WebSocket hibernation handlers and the RPC effect methods
  all rethrow into nothing.
- **Everything → Analytics Engine (`TAIL`).** One aggregate row per
  `(scriptName, entrypoint, handler, outcome)` bucket per flush, feeding a RED dashboard.

Registered via `tail_consumers` in `apps/dotcom/sync-worker/wrangler.toml`, staging and production
only. Deployed by `internal/scripts/deploy-dotcom.ts`, which deploys it _before_ the sync worker
because `tail_consumers` names a service that has to already exist.

This exists because `tldraw-multiplayer` has no `[observability]` block, and most of its handlers
rethrow uncaught, so without a tail consumer those errors reach no telemetry channel at all. Errors go
through this worker rather than Cloudflare's native OTLP log export because that export is
head-sampled — blind to outcome — while an errored invocation is exactly the thing this needs to see
every time.

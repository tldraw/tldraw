# Browser Run thumbnails and MCP screenshots

Issues:

- https://github.com/tldraw/tldraw/issues/9502
- https://github.com/tldraw/tldraw/issues/9497

tldraw.com can capture PNG thumbnails of public boards by pointing Cloudflare Browser Run at a tldraw-owned render page. There are two consumers, both served by the sync worker:

- an image-only MCP tool, `get_shared_board_screenshot`, at `POST /api/app/mcp`, which captures synchronously because the image must be returned in-band, and
- a board OG image endpoint, `GET /api/app/og-image/:kind/:slug`, built for high-traffic paths (link unfurls, crawlers): it serves only from the R2 cache and delegates rendering to a queue consumer, so a request never waits on Browser Run.

The screenshot pipeline never hands Browser Run a user-provided URL. The worker resolves the board, verifies it is publicly viewable (a published board, or a file shared via link), mints a short-lived signed render job, and Browser Run only ever visits the internal render page with that token. The MCP surface is image-only: it exposes no board metadata, document structure, shape listing, arbitrary selectors, arbitrary URLs, or access to files that are not publicly shared.

## Architecture

1. A client calls the MCP tool with a public board URL — a published board (`https://www.tldraw.com/p/:slug`) or an anonymously-shared file (`https://www.tldraw.com/f/:slug`) — a viewport, and bounded dimensions (200-1600px) and theme.
2. The sync worker validates the URL shape and host allowlist, then resolves the board by kind. Published boards resolve the slug through `SNAPSHOT_SLUG_TO_PARENT_SLUG` and the `file` row (`getPublishedFileInfo`) and must be published. Shared files resolve the slug directly as the `file.id` (`getSharedFileInfo`) and must pass the same anonymous-view gate the live file room enforces: the file exists, is not deleted, and is `shared` via link (`isFileAnonymouslyViewable`). `sharedLinkType` (`view` vs `edit`) is irrelevant to viewing; test-slug files are refused because they require admin auth the anonymous tool never has. Unknown, unpublished, or private boards fail without spending any Browser Run capacity.
3. The worker builds an R2 cache key from board identity, a content version, viewport, dimensions, and theme. The version is the file's `lastPublished` for published boards and the persisted room snapshot's R2 etag for shared files, so republishing or editing rotates the key and thumbnails track the latest content. Cache hits in the `THUMBNAILS` bucket return immediately.
4. On a miss, the worker mints an HMAC-signed render token (`renderTokens.ts`) containing the board identity and render parameters with a 5 minute expiry, and calls Browser Run's `/screenshot` Quick Action against `{MCP_SCREENSHOT_RENDER_ORIGIN}/__thumbnail-render?token=...`.
5. The render page (`apps/dotcom/client/src/pages/thumbnail-render.tsx`) exchanges the token for snapshot data at `GET /api/app/thumbnail-snapshot`, which verifies the signature and expiry before returning records, schema, and render params. Published boards read a frozen R2 snapshot; shared files read the live persisted room snapshot from R2 (`env.ROOMS`) and re-check the share gate here, not just when the token was minted, so a board un-shared during the token's 5 minute window stops resolving. The page renders a hidden-UI, read-only editor and sets `data-thumbnail-ready` once fonts have settled, image assets have loaded, and the editor's `<img>` elements are stable. Browser Run waits on that selector.
6. The PNG is stored in the `THUMBNAILS` bucket and returned as an MCP image content item.

### OG images (queue-backed async rendering)

`GET /api/app/og-image/:kind/:slug` (`:kind` is `p` for published boards or `f` for shared files) serves a 1200x630 light-theme, content-fit PNG for use in `og:image` tags; `GET /api/app/og-html/:kind/:slug` serves crawler metadata pointing at it. The request path never invokes Browser Run:

1. The board is resolved through the same gates as the MCP tool. Private, deleted, unpublished, or unknown boards redirect (302) to the default tldraw OG image.
2. If the cached image in R2 matches the board's current content version - or is younger than one hour, which caps one board's Browser Run spend at roughly one render per hour no matter how often it changes or is crawled - it is served as a hit with `max-age=3600`.
3. Otherwise the worker enqueues an `og-image-render` job on the existing sync-worker queue (guarded by a per-board rate limit and a two-minute pending marker in R2 that dedupes concurrent enqueues) and serves the previous image marked stale with `max-age=300`, or the default-image redirect with `max-age=60` if the board has never been rendered. Scrapers pick up the fresh render on their next visit.
4. The queue consumer (`ogImageQueue.ts`, dispatched from the worker's `queue()` handler) re-resolves the board at render time: a board un-shared while queued is dropped and its cached OG image deleted, and the version is re-read so bursts of enqueues coalesce into one capture of the newest content. It checks the shared global Browser Run rate limit (requeueing when capacity is busy), mints a render token with `camera: 'content'`, captures through Browser Run, and writes the PNG back to the cache key the route reads. Transient failures retry up to three times with backoff, then drop.

### Request limits

- Per IP: ~20 tool calls per minute (`MCP_SCREENSHOT_RATE_LIMITER`).
- Per board: ~20 Browser Run captures per minute, applied only on cache misses.
- Global: ~60 Browser Run captures per minute across all callers (`MCP_SCREENSHOT_BROWSER_RATE_LIMITER`).

The Cloudflare rate limit bindings are declared in `wrangler.toml` for every environment. When a binding is absent (local dev, tests) the route falls back to an isolate-local guard with the same limits.

### Telemetry and monitoring

All three surfaces write `mcp_shared_board_screenshot` events with the same blob layout, so one dashboard covers everything; the source blob distinguishes `mcp` (the tool), `og` (the OG image route), and `queue` (the async consumer). Events record hashed IP, hashed board slug, cache hit/stale/miss, Browser Run duration, `X-Browser-Ms-Used`, output dimensions, failure reason (including which rate limit blocked a request), and rate-limit decisions. Column layout in the Analytics Engine dataset (`MEASURE`): `blob1` event name, `blob2` worker name, `blob3` source, `blob4` cache status, `blob5` failure reason, `blob6` rate-limit decision, `blob7` hashed IP, `double3` Browser Run duration ms, `double4` browser ms used, `index1` hashed board slug.

`internal/scripts/fetch-screenshot-metrics.ts` queries the Analytics Engine SQL API and reports request volume, failure rate, timeout rate, cache hit rate, rate-limit blocks, and Browser Run spend per source:

```bash
CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_ANALYTICS_API_TOKEN=... \
npx tsx internal/scripts/fetch-screenshot-metrics.ts --last 24h --worker main-tldraw-multiplayer
```

For alerting, run it with `--check` on a schedule (cron CI job or any monitor that can run a command); it exits non-zero when a threshold is breached:

```bash
npx tsx internal/scripts/fetch-screenshot-metrics.ts --last 1h --check \
  --max-failure-rate 0.2 --max-timeout-rate 0.1 --max-browser-minutes 60
```

The API token only needs the "Account Analytics: Read" permission. Ad-hoc dashboard queries can use the same SQL API, e.g. failure breakdown over the last day:

```sql
SELECT blob3 AS source, blob5 AS failure, SUM(_sample_interval) AS requests
FROM MEASURE
WHERE blob1 = 'mcp_shared_board_screenshot' AND timestamp > NOW() - INTERVAL '24' HOUR
GROUP BY source, failure
ORDER BY requests DESC
```

## Configuration

The sync worker needs:

- `CLOUDFLARE_ACCOUNT_ID` (deploy var) - account that owns Browser Run.
- `BROWSER_RENDERING_API_TOKEN` (deploy var, GitHub secret) - API token with only the `Browser Rendering - Edit` permission. Do not reuse the deploy token.
- `MCP_SCREENSHOT_TOKEN_SECRET` (deploy var, GitHub secret) - HMAC secret for render tokens. Local dev uses the placeholder in `[env.dev.vars]`.
- `MCP_SCREENSHOT_RENDER_ORIGIN` - set in `wrangler.toml` for dev (`http://localhost:3000`), staging, and production. Preview deploys have no `wrangler.toml` entry, so `deploy-dotcom.ts` injects the preview's own client origin (`https://${previewId}-preview-deploy.tldraw.com`) as a deploy var.
- `THUMBNAILS` R2 bucket binding - `thumbnails-preview` in dev/preview/staging and `thumbnails` in production.

One-time ops setup before the first deploy of this feature:

1. Create the R2 buckets: `wrangler r2 bucket create thumbnails-preview` and `wrangler r2 bucket create thumbnails`.
2. Add the `BROWSER_RENDERING_API_TOKEN` and `MCP_SCREENSHOT_TOKEN_SECRET` GitHub secrets. Until they exist the deploy passes empty strings and the MCP tool returns a configuration error instead of failing the deploy.

## Local development

Start the dotcom app from the repo root:

```bash
yarn dev-app
```

The dev-only fixture page renders allowlisted example snapshots without a worker, published file, or token:

```
/dev/browser-run-thumbnail?fixture=layer-panel&x=340&y=120&z=0.82&width=1200&height=630&theme=dark
```

Capture it locally without Cloudflare credentials:

```bash
yarn workspace dotcom browser-run-thumbnail \
  --mode local \
  --base-url http://127.0.0.1:3000 \
  --fixture snapshot-example \
  --output tmp/browser-run-thumbnail/local-thumbnail.png
```

To capture through real Browser Run, use a preview/dev deployment or a tunnel (Browser Run cannot reach `127.0.0.1`):

```bash
CLOUDFLARE_ACCOUNT_ID=... \
CLOUDFLARE_API_TOKEN=... \
yarn workspace dotcom browser-run-thumbnail \
  --mode browser-run \
  --base-url https://your-dev-or-preview-origin.example \
  --fixture layer-panel \
  --output tmp/browser-run-thumbnail/browser-run-thumbnail.png
```

When tunnelling with Vite's host checks, start the client with:

```bash
VITE_ALLOWED_HOSTS=your-tunnel-host.example yarn workspace dotcom exec vite dev --host 127.0.0.1 --port 3000 --strictPort
```

The production path (`/__thumbnail-render` plus `/api/app/thumbnail-snapshot`) can be exercised locally against a locally published file: call `POST /app/mcp` on the local sync worker with `tools/call`; the returned render URL can be opened directly in a browser while the token is valid.

## MCP tool

```ts
get_shared_board_screenshot({
	url: string,
	viewport: { x: number; y: number; z: number },
	width?: number,
	height?: number,
	theme?: 'light' | 'dark',
})
```

The tool accepts public tldraw.com URLs on `tldraw.com`, `www.tldraw.com`, and `staging.tldraw.com`, plus the deployment's own render origin (so a preview accepts its own `${previewId}-preview-deploy.tldraw.com` board URLs and local dev accepts `localhost`). It accepts published boards (`https://www.tldraw.com/p/:slug`) and anonymously-shared files (`https://www.tldraw.com/f/:slug`). A `/f/:slug` file is only rendered when it is currently shared via link; private (unshared) files, deleted files, and test files are refused. It also rejects external hosts, invite URLs, and unsupported route shapes. The result is an MCP image content item with PNG data.

The screenshot layer lives in the dotcom sync worker rather than the interactive `apps/mcp-app` canvas worker because it needs real tldraw.com published-file resolution and storage, not a live editor bridge.

## Remaining follow-up work

- Schedule `fetch-screenshot-metrics.ts --check` somewhere (cron CI job or an external monitor) and point a dashboard at the SQL queries above; the script and queries exist, the scheduling is an ops decision.
- Shared files render the last persisted room snapshot from R2, which can lag in-memory edits by the persist debounce. If near-real-time accuracy is ever required, add a `getCurrentSnapshot` RPC on `TLFileDurableObject` (modeled on `onDownloadTldr`) instead of reading R2.
- Keep private (unshared) files, board metadata, document structure, current-viewport screenshots, and selected-shape screenshots out of the MCP scope.

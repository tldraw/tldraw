# Browser Run thumbnails and MCP screenshots

Issues:

- <https://github.com/tldraw/tldraw/issues/9502>
- <https://github.com/tldraw/tldraw/issues/9497>

tldraw.com can capture PNG thumbnails of public boards by taking a Cloudflare Browser Rendering `/screenshot` of a tldraw-owned render page, called straight through the `BROWSER` binding's `quickAction` Quick Actions method — no `@cloudflare/puppeteer` and no API token (requires `compatibility_date >= 2026-03-24`). There are two consumers, both served by the sync worker:

- an MCP server at `POST /api/app/mcp` exposing two tools: `get_board_info` lists a board's pages (name, 0-based index, and whether each has content), and `get_shared_board_screenshot` returns a content-fit PNG of a single page. Each screenshot renders exactly one page, so an agent lists pages first and then requests the ones it wants; and
- a board OG image endpoint, `GET /api/app/social-preview/:prefix/:slug/image`, built for high-traffic paths (link unfurls, crawlers): it serves only from the R2 cache and delegates rendering to a queue consumer, so a request never waits on Browser Run. It lives under the `social-preview` route family alongside the crawler HTML that references it.

Rendering runs through the Browser Rendering `/screenshot` Quick Action, invoked from the worker via the `BROWSER` binding's `quickAction` method (`env.BROWSER.quickAction('screenshot', …)`). Chrome runs in Cloudflare's Browser Rendering fleet, not in the worker isolate. The pipeline never hands the browser a user-provided URL: the worker resolves the board, verifies it is publicly viewable (a published board, or a file shared via link), mints a short-lived signed render job, and the screenshot only ever targets the internal render page with that token. The MCP surface exposes page metadata (names, counts) and page screenshots only: no document structure, shape listing, arbitrary selectors, arbitrary URLs, or access to files that are not publicly shared.

## Architecture

1. A client calls `get_shared_board_screenshot` with a board id — the `:slug` of a published board (`https://www.tldraw.com/p/:slug`) or of an anonymously-shared file (`https://www.tldraw.com/f/:slug`) — a 0-based `page` ordinal (default 0), and an optional theme (default light). It usually calls `get_board_info` first to discover the board's pages.
2. The sync worker resolves the id as a shared file first and as a published-board slug second, so callers never need to know which kind of board they hold. Shared files resolve the id directly as the `file.id` (`getSharedFileInfo`) and must pass the same anonymous-view gate the live file room enforces: the file exists, is not deleted, and is `shared` via link (`isFileAnonymouslyViewable`). `sharedLinkType` (`view` vs `edit`) is irrelevant to viewing; test-slug files are refused because they require admin auth the anonymous tool never has. Published boards resolve through the `file` row (`getPublishedFileInfo`) and must be published. Unknown, unpublished, or private boards fail without spending any Browser Rendering capacity.
3. The worker builds a per-page R2 cache key from board identity, a content version, the fixed 1200x630 output size, theme, and the page ordinal (`mcp/{kind}/{slug}/{version}/1200x630/{theme}/page-{n}.png`), with the page name in object metadata. The version is the file's `lastPublished` for published boards and the persisted room snapshot's R2 etag for shared files, so republishing or editing rotates every page's key. A cache hit in the `THUMBNAILS` bucket returns immediately — without even loading the board snapshot, since the ordinal alone keys the object and the page name rides in its metadata.
4. On a miss, the worker loads the board's room snapshot to resolve the ordinal to a real page (its `TLPageId` and name) and to validate the range, then mints an HMAC-signed render token (`renderTokens.ts`) carrying the board identity, that `pageId`, and render parameters with a 5 minute expiry. Page enumeration is capped at `MAX_THUMBNAIL_PAGES` (40), so `pageCount` and the addressable ordinals stop there on very large boards. The snapshot route re-checks that `pageId` still exists at render time: a page deleted inside the token's window fails the render rather than returning a different page's image under the original page's name.
5. The worker calls the Browser Rendering `/screenshot` Quick Action through `env.BROWSER.quickAction`, targeting `{MCP_SCREENSHOT_RENDER_ORIGIN}/__thumbnail-render?token=...`. The render page (`apps/dotcom/client/src/pages/thumbnail-render.tsx`) exchanges the token for snapshot data at `GET /api/app/thumbnail-render/snapshot`, which verifies the signature and expiry before returning records, schema, and render params. Published boards read a frozen R2 snapshot; shared files read the live persisted room snapshot from R2 (`env.ROOMS`) and re-check the share gate here, not just when the token was minted, so a board un-shared during the token's 5 minute window stops resolving. The page selects the requested `pageId`, content-fits it with margins once fonts and image assets have settled, exports it with `editor.toImage`, and then displays that PNG as a full-viewport `<img>` and sets `data-thumbnail-ready` — so the screenshot captures the exact export rather than the live editor canvas. Any failure (bad token, snapshot load, export, image decode) sets `data-thumbnail-error` instead. The Quick Action waits for _either_ terminal marker and captures `body[data-thumbnail-ready="true"]`, which only exists on the success path — so a failed render returns as soon as it errors rather than holding Browser Run capacity for the whole timeout. The render and settle budgets (`THUMBNAIL_RENDER_TIMEOUT_MS` 45s, `THUMBNAIL_SETTLE_TIMEOUT_MS` 10s) live in `@tldraw/dotcom-shared` so the worker's deadline and the page's can't drift.
6. The screenshot response body is the PNG bytes. The worker writes them to the page's cache key in R2 (for future hits) and returns two MCP content items: a text item with the page name, followed by the image.

### OG images (queue-backed async rendering)

`GET /api/app/social-preview/:prefix/:slug/image` (`:prefix` is `p` for published boards or `f` for shared files) serves a 1200x630 light-theme, content-fit PNG for use in `og:image` tags. The crawler HTML that references it is the existing worker route `/app/social-preview/:prefix/:slug` (`getSocialPreview`, which Vercel routes crawler user-agents to), which puts the board name in the title and bounces human visitors back to the board. It only emits the board `og:image` (and `summary_large_image`) when the board resolves through the same gate the image route applies; for private, deleted, or unpublished boards it keeps the static site-wide preview image, because crawlers that don't follow `og:image` redirects (notably X) would otherwise render a broken card. The request path never invokes Browser Run:

1. The board is resolved through the same gates as the MCP tool. Private, deleted, unpublished, or unknown boards get the default tldraw OG image (see the fallback below).
2. If the cached image in R2 matches the board's current content version - or is younger than one hour, which caps one board's Browser Run spend at roughly one render per hour no matter how often it changes or is crawled - it is served as a hit with `max-age=3600`.
3. Otherwise the worker enqueues an `og-image-render` job on the existing sync-worker queue (guarded by a per-board rate limit and a pending marker in R2 that dedupes concurrent enqueues) and serves the previous image marked stale with `max-age=300`, or the default-image fallback with `max-age=60` if the board has never been rendered. Scrapers pick up the fresh render on their next visit. The route is registered with `.all`, because crawlers probe with HEAD before (or instead of) GET: a HEAD gets the same cache headers from an R2 `head`, but never reads the body and never enqueues, so a probe can't spend Browser Run.
4. The queue consumer (`ogImageQueue.ts`, dispatched from the worker's `queue()` handler) re-resolves the board at render time: a board un-shared while queued is dropped and its cached OG image deleted, and the version is re-read so bursts of enqueues coalesce into one capture of the newest content. It loads the snapshot to pick the first page that _has content_ (so a board with an empty first page still unfurls with a meaningful image), mints a render token with `camera: 'content'` and that `pageId`, screenshots it through the same `env.BROWSER.quickAction` path as the MCP tool, and writes the PNG to the cache key the route reads. If the snapshot can't be read it fails there and then rather than paying for a capture that would fail on the render page for the same reason. Genuine transient failures retry up to three times with backoff, then drop. There is no capacity check: thumbnail rendering is uncapped (see "Request limits").

#### Default-image fallback

A board with no usable cached image is served the site-wide default (`/social-og.png`, 1200x630, the size the `og:image:width`/`height` meta advertises) as a **200 `image/png`**, not a redirect. Crawlers cache the first response they see for days, and X does not follow an `og:image` redirect at all, so a 302 on the first unfurl permanently poisons the card even though the queued render lands seconds later. The fallback carries `cache-control: public, max-age=60` with no `s-maxage` and no `stale-while-revalidate`, so nothing pins the default under a board's permanent image URL once the real render arrives. The bytes are fetched from the client origin once per isolate and memoized (failures aren't memoized, so a blip doesn't wedge an isolate); if that fetch fails the route falls back to the old 302 rather than erroring. Telemetry separates the two: `served_fallback` for the 200, `not_rendered_yet` for the residual redirect.

### Keeping the thumbnail current

Rendering on crawler demand alone means the first share of a board is always the cold one. Three triggers ahead of the crawler close that gap, all of them enqueueing onto the same queue and consumer, and all of them subject to the same re-resolve, version check, and share gate at render time. Every queue message carries a `reason` (`crawler`, `publish`, `edit`) that rides through to telemetry.

- **Publish.** The `publish` effect in `TLPostgresReplicator` enqueues a render right after `publishSnapshot` writes the frozen R2 snapshot, so a published board's image is being made before its link is pasted anywhere. `unpublish` deletes the cached image and pending marker instead, and a new `unshare` effect (`shared` true → false in `getEffects`) does the same for shared files — edit-triggered rendering covers many more boards than crawler demand did, so lingering images need a real cleanup path rather than waiting for a queue message to happen to process.
- **On edit.** `TLFileDurableObject.persistToDatabase` calls `enqueueOgImageRenderForEdit` fire-and-forget on a persist that actually advanced the document clock. The only gate is the share check: the file record says `shared` (an unknown record proceeds; the consumer's resolve will drop it). There is no sampling and no staleness window — a persist means the board's saved content genuinely differs from what the cached thumbnail shows, which is exactly when a re-render is warranted.

  Deduplication is the queue's job rather than the durable object's. `enqueueOgImageRender`'s pending marker collapses the 8-second persist cadence (`PERSIST_INTERVAL_MS`) into roughly one render per marker TTL, and anything that slips past it is absorbed at consume time by the version check: the system's real idempotency key is `(board, version)`.

- **Pending markers are the only throttle.** With no rate limiter on this path, `PENDING_MARKER_TTL_MS` (2 minutes) is what stops one continuously edited board enqueueing hundreds of messages an hour that would all render near-identical content. It is dedupe rather than a budget, but it does set the effective render cadence, and it is the knob to turn if that cadence needs to change.

### Request limits

Thumbnail rendering is **uncapped**, deliberately. It is our own derived artifact, triggered by things that already happened (a publish, an edit persisting, a crawler arriving) rather than by anything a caller can drive, so a rate limiter there would only ever mean "serve a stale thumbnail to save a render we intend to do anyway". The queue consumer performs no capacity check at all.

The limits below therefore exist for the **MCP endpoint** specifically — the one Browser Run-spending surface an outside caller can drive directly, where a rogue or looping agent is the threat being bounded:

- Per IP: ~2 calls per minute each for `get_board_info` (`ip-info:`) and `get_shared_board_screenshot` (`ip-shot:`), on separate keys of `MCP_SCREENSHOT_RATE_LIMITER`. They are separate because `get_board_info` spends no Browser Run, and sharing one budget would let the usual "list once, then screenshot pages" flow burn its allowance on the free call.
- Per board: ~2 Browser Run captures per minute, applied only on cache misses. The OG route applies the same limit to its own key (`og-board:`) to bound queue enqueues per board.
- Global: ~6 Browser Run captures per minute across all MCP callers (`MCP_SCREENSHOT_BROWSER_RATE_LIMITER`, key `global`).

The Cloudflare rate limit bindings are declared in `wrangler.toml` for every environment. When a binding is absent (local dev, tests) the route falls back to an isolate-local guard with the same limits. Changing the global cap means moving the `MCP_SCREENSHOT_BROWSER_RATE_LIMITER` bindings in `wrangler.toml` (one per environment) and the isolate-local fallback constant `GLOBAL_BROWSER_RUN_RATE_LIMIT` in `sharedBoardScreenshotMcp.ts` together.

The thing to watch instead of a cap is Browser Rendering's own account limits: a render can hold a session for the full 45s `THUMBNAIL_RENDER_TIMEOUT_MS`, so sustained edit volume is bounded in practice by concurrent-session and new-session-per-minute limits rather than by anything in this worker. Browser Rendering bills by browser duration, so thumbnail spend now scales with editing activity. `fetch-screenshot-metrics.ts` (below) is how that gets watched.

### Telemetry and monitoring

All three surfaces write `mcp_shared_board_screenshot` events with the same blob layout, so one dashboard covers everything; the source blob distinguishes `mcp` (the tool), `og` (the OG image route), and `queue` (the async consumer). Events record hashed board slug, cache hit/stale/miss, render duration (wall-clock around the browser session), output dimensions, failure reason, rate-limit decisions, a hashed IP, and the trigger that asked for the render. Two dimensions are deliberately kept low-cardinality: the failure reason is always a bounded reason code (`invalid_input`, `not_found`, `board_empty`, `no_pages`, `page_out_of_range`, `rate_limited_ip`/`board`/`global`, `board_not_viewable`, `served_fallback`, `not_rendered_yet`, `browser_failed`, `browser_timeout`, `empty_render`, `not_configured`, `render_error`), never raw `error.message` text; and the hashed IP is written only on failed or rate-limited events (where it's useful for abuse analysis) — successful events carry `ip:none`, so the per-client IP dimension never lands on the common success path. Column layout in the Analytics Engine dataset (`MEASURE`): `blob1` event name, `blob2` worker name, `blob3` source, `blob4` cache status, `blob5` failure reason, `blob6` rate-limit decision, `blob7` hashed IP (or `none`), `blob8` render trigger (`crawler`, `publish`, `edit`, or `none` on the surfaces that have no trigger), `double1`/`double2` output width/height, `double3` render duration ms, `double4` browser ms used, `double5` rate-limit allowed (1/0), `index1` hashed board slug. (The `quickAction` screenshot response includes an `X-Browser-Ms-Used` header, but the worker does not currently read it — telemetry uses wall-clock render duration in `double3` as the spend proxy and writes `double4` as -1. Wiring the header into `double4` is a possible follow-up.)

Bounded reason codes say _that_ a board stopped rendering, never _why_, and every one of these surfaces deliberately swallows its own errors (the OG route falls back to the default image, the snapshot route 404s, the MCP tools return a tool error, the queue retries or drops). So each swallow point also reports the underlying error to Sentry through `reportThumbnailError` (`thumbnailShared.ts`), tagged `thumbnail_surface` with a closed set of values: `og_route`, `og_queue`, `thumbnail_snapshot`, `mcp_board_info`, `mcp_screenshot`. Reporting rides on the handler's `waitUntil` and is itself failure-proof — a missing Sentry env var must never turn a degraded-but-fine response into a 500.

`internal/scripts/fetch-screenshot-metrics.ts` queries the Analytics Engine SQL API and reports request volume, failure rate, timeout rate, cache hit rate, rate-limit blocks, and Browser Run render time per source (wall-clock `double3`, summed over rows that actually rendered — `double4` billed ms is not currently recorded, always -1):

```bash
CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_ANALYTICS_API_TOKEN=... \
npx tsx internal/scripts/fetch-screenshot-metrics.ts --last 24h --worker main-tldraw-multiplayer
```

For alerting, run it with `--check` on a schedule (cron CI job or any monitor that can run a command); it exits non-zero when a threshold is breached:

```bash
npx tsx internal/scripts/fetch-screenshot-metrics.ts --last 1h --check \
  --max-failure-rate 0.2 --max-timeout-rate 0.1 --max-render-minutes 60
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

- `BROWSER` binding - the Cloudflare Browser Rendering binding, declared per environment in `wrangler.toml` (`[env.<env>.browser]`). The worker calls its `quickAction` Quick Actions method (`env.BROWSER.quickAction('screenshot', …)`) directly — no `@cloudflare/puppeteer`, no API token. This requires `compatibility_date` `2026-03-24` or later, which the deployed envs use; `[env.dev]` pins an older date the local workerd supports (see Local development). The dev binding is deliberately not `remote`, so plain `wrangler dev` (and the credential-free e2e stack) boots without a `CLOUDFLARE_API_TOKEN`; the binding is then a non-functional local one and the render path fails closed. Real local captures need `wrangler dev --remote` with credentials, or a preview deploy.
- `MCP_SCREENSHOT_ENABLED` - kill switch for the MCP server (`POST /app/mcp`), set to `"true"` in `wrangler.toml` for dev, staging, and production. The worker reads it per request, so setting it to anything else takes the endpoint down (it 404s, including the `initialize` handshake) without a rebuild or a code deploy — flip it in the Cloudflare dashboard under the worker's variables, and it applies to the next request. The next deploy overwrites the dashboard value from `wrangler.toml`, so follow an emergency flip with a config change. An unset var counts as enabled, so preview deploys (which don't set it) behave as they always have. Only the MCP server is gated: OG image rendering has its own path and keeps running.
- `MCP_SCREENSHOT_TOKEN_SECRET` (deploy var, GitHub secret) - HMAC secret for render tokens. Local dev uses the placeholder in `[env.dev.vars]`.
- `MCP_SCREENSHOT_RENDER_ORIGIN` - set in `wrangler.toml` for dev (`http://localhost:3000`), staging, and production. Preview deploys have no `wrangler.toml` entry, so `deploy-dotcom.ts` injects the preview's own client origin (`https://${previewId}-preview-deploy.tldraw.com`) as a deploy var.
- `THUMBNAILS` R2 bucket binding - board thumbnails / OG images (`og/…` keys) and their pending markers. `thumbnails-preview` in dev/preview/staging, `thumbnails` in production.
- `MCP_SCREENSHOTS` R2 bucket binding - MCP tool screenshots (`mcp/…` keys). `mcp-screenshots-preview` in dev/preview/staging, `mcp-screenshots` in production.

### Why two buckets

Both key spaces used to live in `thumbnails`, separated only by prefix. They are now separate buckets for two reasons:

- **Domain.** `MCP_SCREENSHOTS` is where the MCP surface puts what it produces, and that won't stay limited to board thumbnails. Keying the bucket to the tool rather than to the artifact means the next MCP output type lands somewhere that already fits, instead of accreting inside a bucket named for something it isn't.
- **Retention.** The two caches want opposite lifetimes:
  - **`og/…`** keys carry no version, so each render overwrites the same object in place and a board costs exactly one object for as long as it exists. `deleteOgImageCache` removes it when the board stops being public. Nothing accumulates, and the current thumbnail must outlive any lifecycle window — so `THUMBNAILS` gets **no expiration rule**.
  - **`mcp/…`** keys include the board's content version (`mcp/{kind}/{slug}/{version}/{w}x{h}/{theme}/page-{n}.png`), so every edit strands the previous object and the set grows without bound. A pure regenerable cache, so `MCP_SCREENSHOTS` gets an **expiration rule**.

A prefix-scoped lifecycle rule on a single bucket would also work (`wrangler r2 bucket lifecycle add` takes a prefix positionally), and has the nice property of ageing out the existing backlog in place. It was rejected because a future rule added without a prefix, or with a typo'd one, would silently delete every board's live thumbnail, and R2 expiration has no undo. Separate buckets make that mistake impossible.

One-time ops setup before the first deploy of this feature:

1. Create the R2 buckets:

   ```bash
   wrangler r2 bucket create thumbnails-preview
   wrangler r2 bucket create thumbnails
   wrangler r2 bucket create mcp-screenshots-preview
   wrangler r2 bucket create mcp-screenshots
   ```

2. Add the expiration rule to the MCP screenshot buckets only (30 days is a starting point — these are a regenerable cache, so the only cost of expiring one is a re-render the next time an agent asks for that exact board version):

   ```bash
   wrangler r2 bucket lifecycle add mcp-screenshots-preview expire-screenshots --expire-days 30 -y
   wrangler r2 bucket lifecycle add mcp-screenshots expire-screenshots --expire-days 30 -y
   ```

   Verify with `wrangler r2 bucket lifecycle list mcp-screenshots`. Do **not** add an equivalent rule to `thumbnails`.

3. Enable Browser Rendering on the Cloudflare account (the `BROWSER` binding needs it) and add the `MCP_SCREENSHOT_TOKEN_SECRET` GitHub secret. Until the secret exists the deploy passes an empty string and the MCP tool returns a configuration error instead of failing the deploy.

Migration note: MCP screenshots previously lived under `mcp/…` in the `thumbnails` bucket, where nothing ever deleted them. Those objects are now orphaned — the tool reads and writes the new bucket, and the version in the key means nothing will ever hit them again. Clear them out with a one-off prefix-scoped rule (`wrangler r2 bucket lifecycle add thumbnails expire-legacy-mcp mcp/ --expire-days 1 -y`, removed once the prefix is empty) or by deleting the `mcp/` folder from the dashboard.

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

The production path (`/__thumbnail-render` plus `/api/app/thumbnail-render/snapshot`) can be exercised locally against a locally published file by calling `POST /app/mcp` on the local sync worker with `tools/call`. The tool returns the page name and the PNG itself, not the render URL — the URL is internal to the worker, so to open the render page in a browser you have to mint a token yourself (`mintThumbnailRenderToken`, using the `MCP_SCREENSHOT_TOKEN_SECRET` from `[env.dev.vars]`) and build `/__thumbnail-render?token=…` by hand.

To drive the full worker render path locally — the MCP tool or OG queue actually taking a screenshot — run `wrangler dev --remote` with Cloudflare credentials (`CLOUDFLARE_ACCOUNT_ID` and an API token with `Browser Rendering` access) so the `BROWSER` binding reaches the real remote Browser Rendering service. The dev binding is deliberately NOT marked `remote = true` in `[env.dev.browser]`: a remote binding makes plain `wrangler dev` require a `CLOUDFLARE_API_TOKEN`, which the credential-free process-compose e2e stack does not have, so it would fail to boot. Under plain `wrangler dev` the `BROWSER` binding is a non-functional local binding and the render path fails closed with a config error — fine for everything except real captures, which need `--remote` or a preview deploy. Note also that `[env.dev]` pins `compatibility_date` to `2025-06-05` (the deployed envs use `2026-03-24`, required for `quickAction`, but that is newer than the workerd bundled with our pinned wrangler, so local `wrangler dev` can't use it — real local captures therefore need a preview deploy until the toolchain catches up).

## MCP tools

```ts
get_board_info({
 boardId: string,
})
// → { name: string | null, pageCount: number, pages: { index: number, name: string, hasContent: boolean }[] }

get_shared_board_screenshot({
 boardId: string,
 page?: number, // 0-based page index (see get_board_info). default 0
 theme?: 'light' | 'dark', // default 'light'
})
// → text (page name) + a 1200x630 content-fit PNG of that one page
```

Both tools accept the id of a public tldraw.com board: the `:slug` of a published board URL (`https://www.tldraw.com/p/:slug`) or of an anonymously-shared file URL (`https://www.tldraw.com/f/:slug`). The id is resolved as a shared file first and a published slug second. A shared file is only served when it is currently shared via link; private (unshared) files, deleted files, and test files are refused.

`get_shared_board_screenshot` renders exactly one page per call, so an agent typically calls `get_board_info` once to enumerate pages (using `hasContent` to skip blank ones), then requests screenshots for the pages it wants — each cached independently. This keeps every screenshot to a single Browser Rendering `/screenshot` call regardless of how many pages a board has.

The screenshot layer lives in the dotcom sync worker rather than the interactive `apps/mcp-app` canvas worker because it needs real tldraw.com published-file resolution and storage, not a live editor bridge.

## Remaining follow-up work

- Schedule `fetch-screenshot-metrics.ts --check` somewhere (cron CI job or an external monitor) and point a dashboard at the SQL queries above; the script and queries exist, the scheduling is an ops decision.
- Shared files render the last persisted room snapshot from R2, which can lag in-memory edits by the persist debounce. If near-real-time accuracy is ever required, add a `getCurrentSnapshot` RPC on `TLFileDurableObject` (modeled on `onDownloadTldr`) instead of reading R2.
- Keep private (unshared) files, board metadata, document structure, current-viewport screenshots, and selected-shape screenshots out of the MCP scope.

## System map

The pixels come from `editor.toImage` on the render page. The worker calls the Browser Rendering `/screenshot` Quick Action through `env.BROWSER.quickAction`, which navigates the render page, waits for either terminal marker, and captures the success-only `body[data-thumbnail-ready="true"]` element (so `data-thumbnail-error` returns a render failure immediately instead of waiting out the timeout). The render page renders one page, exports it with `editor.toImage`, and displays that PNG as a full-viewport `<img>` — so the screenshot is the exact export. The screenshot response body is the PNG, which the worker writes to R2 and returns. No puppeteer, no API token, no page-side upload endpoint.

```mermaid
flowchart TB
    subgraph entry ["Entry points (sync worker)"]
        BI["get_board_info<br/>(POST /api/app/mcp — no browser)"]
        MCP["get_shared_board_screenshot<br/>(POST /api/app/mcp — one page per call)"]
        OGR["GET /api/app/social-preview/:prefix/:slug/image<br/>(serves R2 cache only, never waits)"]
        SP["GET /app/social-preview/:prefix/:slug<br/>(crawler HTML: board name + og:image)"]
        QC["Queue consumer<br/>og-image-render (async refresh)"]
    end

    subgraph warm ["Refresh triggers (ahead of the first crawler)"]
        PUB["publish effect<br/>(TLPostgresReplicator)"]
        SPEC["persist on edit<br/>(TLFileDurableObject,<br/>every advancing clock)"]
    end

    SP -->|og:image references| OGR
    OGR -->|stale / missing → enqueue| QC
    PUB -->|reason: publish| QC
    SPEC -->|reason: edit| QC

    BI --> GATE["Resolve board + share gate<br/>(published or link-shared only)"]
    MCP --> GATE
    QC --> GATE

    GATE --> SNAP2["Load room snapshot<br/>(enumerate pages; board-info returns here)"]
    SNAP2 -->|name, page list| BI
    SNAP2 --> TOKEN["Mint HMAC render token<br/>(board identity, pageId, 5 min expiry)"]
    TOKEN --> BR["env.BROWSER.quickAction<br/>(navigate → wait data-thumbnail-ready → PNG)"]

    BR --> PAGE["/__thumbnail-render (client render page)"]
    PAGE --> SNAP["GET /api/app/thumbnail-render/snapshot<br/>token → records + schema + render params"]
    PAGE --> EXPORT["setCurrentPage(pageId) · editor.toImage()<br/>content-fit · display as full-viewport img"]
    EXPORT -->|screenshot captures the img| BR

    BR -->|PNG bytes| WORKER["Worker writes R2 + returns image"]
    WORKER --> R2[("THUMBNAILS bucket (og/… keys)<br/>MCP_SCREENSHOTS bucket (mcp/… keys,<br/>expiring)")]
    WORKER -->|image in hand| MCP
    R2 -->|serve cached| OGR
    R2 -->|serve cached| MCP
```

### Follow-up work

The MCP/OG rework and the Browser Rendering binding migration described above are implemented. Since then:

- Done: the board image endpoint is `GET /api/app/social-preview/:prefix/:slug/image` (worker route `/app/social-preview/:prefix/:slug/image`), so the crawler HTML and its image share one route family.
- Done: `GET /app/og-html/:kind/:slug` and its Vercel route are removed. `getSocialPreview` supersedes it (board name in the title, human bounce-back), which also fixed the live bug where crawler-UA in-app browsers (WhatsApp, Pinterest) bounced back with the bypass param fell through the og-html stub (no redirect) and never reached the board, and made `SOCIAL_PREVIEW_DISABLED` a complete kill switch.
- Done: the shared thumbnail dimension constants (default 1200x630, clamp 200-1600) live in `@tldraw/dotcom-shared`; the worker and the client render page both import them.

Not doing:

- `useThumbnailPageSize` stays in `thumbnail-render.tsx`. It is load-bearing for the production render page, not dev-only: the render page displays the export as a full-viewport `<img>` and Browser Run takes a viewport screenshot of it, and the dotcom client has no global `body { margin: 0 }` reset (only `#root { width/height: 100% }` in `index.html`), so without the hook's `margin: 0` the browser's default 8px body margin would offset the image and the screenshot would show a white border and clip the bottom-right of every thumbnail.

## Real thumbnails on first share

Status: phases 1, 2 and 3 are implemented and on; phase 4 is still conditional. The phase numbers are the layer numbers in the table below. The mechanics of what shipped are documented above — "Default-image fallback" under the OG images section, "Keeping the thumbnail current" for the publish and edit triggers, and "Request limits" for why the render path is uncapped. This section keeps the rationale and the outstanding work.

### Problem

The first crawler to unfurl a board hits a cold OG-image cache, gets the default image, and platforms cache that unfurl card on their side for days — so the first share is permanently wrong even though the queued render lands seconds later. X is the worst case: it does not follow an `og:image` redirect at all, and it poison-caches whatever it sees first. Serving the default as a 302 made this unavoidable; the fallback-200 removes it.

### Strategy

Make the thumbnail exist before the first crawler arrives, and make every residual miss degrade gracefully. No synchronous rendering on crawler paths; the pending marker and the queue stay load-bearing as dedupe.

| Layer                          | Covers                                                | Cost                                      | Status      |
| ------------------------------ | ----------------------------------------------------- | ----------------------------------------- | ----------- |
| 1. Fallback-200 instead of 302 | every residual miss; fixes X broken cards             | ~zero                                     | done        |
| 2. Publish hook                | explicit publish/republish, always fresh              | negligible                                | done        |
| 3. Render on every persist     | the create → draw → share flow and revived old boards | ~1 render per edited board per marker TTL | done        |
| 4. Hop-1 warming (optional)    | immediate shares, never-edited-again boards           | negligible                                | not started |

The existing on-miss enqueue and stale-serve behavior in `getOgImage` remains the universal backstop, unchanged.

### Beyond OG images

This isn't just a crawler fix. The result is a board thumbnail that's reliably current in R2 — kept fresh by publish and edit triggers rather than rendered synchronously per request — for every shared board, not only the ones a crawler happens to hit. That's the same primitive other surfaces need: board previews in a folder or workspace view, for instance, which today would otherwise need their own render-on-demand path or ship without a real thumbnail. Those surfaces can just read the cached image.

### Phase 0 — measure (still worth doing, no longer a gate)

Pull two numbers from existing telemetry (`mcp_shared_board_screenshot` dataset via `internal/scripts/fetch-screenshot-metrics.ts`; `room_empty`/persist log events):

- daily unique boards with contentful edit sessions
- daily unique boards receiving og-image fetches

This was originally the gate on turning edit-triggered rendering on, because it sized the sampling percentage and the raised global cap. Neither exists now: rendering is uncapped and runs for every board. The numbers are still the ones to watch, but as observation rather than a precondition — they say what thumbnail rendering actually costs per day and whether Browser Rendering's account-level session limits are anywhere near being the binding constraint.

### Full path, from first edit to first-share cache hit

```mermaid
flowchart TB
    EDIT["t=0 — a change lands<br/>in TLFileDurableObject"]
    EDIT --> PERSIST["t≤8s — persist tick advances the<br/>document clock (persistToDatabase)"]
    PERSIST --> GATE{"enqueueOgImageRenderForEdit<br/>(fire-and-forget, never<br/>blocks persistence)"}

    GATE -->|"file record not shared"| SKIP["skip"]
    GATE -->|"shared or unknown"| MARK{"pending marker<br/>set within last 2 min?"}

    MARK -->|"yes"| DEDUPE["already_pending — no message<br/>(collapses the 8s persist cadence)"]
    MARK -->|"no"| ENQ["write marker + enqueue<br/>reason: edit"]

    ENQ --> QUEUE[("queue")]

    QUEUE --> CONSUMER["consumer delivery"]
    CONSUMER -->|"board no longer viewable"| DROPV["drop + delete cached image"]
    CONSUMER -->|"cached version already current"| ACK["ack without rendering<br/>((board, version) idempotency)"]
    CONSUMER -->|"otherwise"| RENDER["re-resolve → render CURRENT content<br/>(no capacity check)"]

    RENDER --> R2[("THUMBNAILS R2<br/>og/… key, version + createdAt")]
    R2 --> SHARE["first share: crawler og:image<br/>fetch is a cache hit"]
```

The one constant left to tune is `PENDING_MARKER_TTL_MS` (2 minutes, `ogImageQueue.ts`). It sets how fresh a continuously edited board's thumbnail stays, and — since it is the only thing collapsing the persist cadence — how much Browser Run a single actively edited board can consume.

### Phase 4 (conditional) — hop-1 warming

- `getBoardOgImageUrl` in `getSocialPreview.ts` already resolves the board; add: if no fresh cached image (one R2 `head` plus version compare, extracted from `getOgImage`'s check), `ctx.waitUntil(enqueueOgImageRender(...))`. Thread `ctx` into the route.
- Ship only if phase-3 telemetry shows first-fetch misses are still meaningful (dormant never-edited boards, mostly — the delay that immediate sharers used to beat is gone).

### Explicitly not doing

- Synchronous wait in `getOgImage` — the queue's ~5s default batch linger means a short wait mostly misses, and the layers above remove the need. Revisit only with data showing otherwise.
- An `isEmpty`-based trigger — the `file.isEmpty` column is vestigial (written `true` at creation, never flipped by client or server), so there is no replicator-visible first-content transition.
- A DO-owned render single-flight — the advisory pending marker plus the consumer's version check is the accepted model and stays adequate at these volumes.
- A cap on thumbnail rendering — see "Request limits". Capping our own derived artifact only buys staler thumbnails; the caps belong on the MCP endpoint, which is the surface an outside caller can actually drive.

### Metrics to watch

- og-route cache hit rate on the first fetch per board (should be high — every shared, edited board should already have an image)
- `served_fallback` rate (should fall to near-zero for edited boards)
- renders/day by `reason`, and total Browser Run minutes — this is now the real spend signal, since nothing caps it
- queue depth, especially through the first days after deploy, when every actively edited board renders for the first time

### Open questions

1. `PENDING_MARKER_TTL_MS` (2 min) is now the only dial on render frequency. Whether that is the right freshness/spend trade-off wants real numbers behind it.
2. Whether Browser Rendering's account-level concurrent-session and new-session-per-minute limits become the practical ceiling under real edit volume — and what the failure mode looks like when they do, since there is no limiter absorbing it first.

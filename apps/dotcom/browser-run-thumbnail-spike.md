# Browser Run thumbnail and MCP screenshot spike

Issues:

- https://github.com/tldraw/tldraw/issues/9502
- https://github.com/tldraw/tldraw/issues/9497

This spike adds a dev-only thumbnail render page for tldraw-owned content, a small script that calls Cloudflare Browser Run's `/screenshot` Quick Action against that page, and a prototype dotcom-backed MCP screenshot surface. Both the script and the MCP tool construct the render URL from a fixed internal path and bounded parameters, so this is not an arbitrary URL screenshot endpoint.

The MCP screenshot layer is image-only. It exposes no board metadata, document structure, shape listing, arbitrary selectors, arbitrary URLs, or private-file access.

## What changed

- `apps/dotcom/client/src/pages/dev-browser-run-thumbnail.tsx` renders a hidden-UI tldraw canvas from an allowlisted snapshot fixture. It defaults to 1200x630 and clamps requested dimensions to 200-1600px.
- `apps/dotcom/client/src/routes.tsx` exposes the render page only when dev routes are enabled.
- `apps/dotcom/client/scripts/browser-run-thumbnail-spike.ts` builds the internal render URL and captures a PNG using Cloudflare Browser Run. It also has a local Playwright mode for validating the render page without Cloudflare credentials.
- `apps/dotcom/sync-worker/src/routes/tla/sharedBoardScreenshotMcp.ts` adds a prototype MCP JSON-RPC endpoint at `/app/mcp` with one tool, `get_shared_board_screenshot`.
- `apps/dotcom/sync-worker/src/routes/tla/sharedBoardScreenshotMcp.test.ts` covers URL rejection, bounded input parsing, and construction of the fixed Browser Run render target.
- `apps/dotcom/client/package.json` adds `yarn workspace dotcom browser-run-thumbnail-spike`.
- This document layers the MCP server follow-up on the same render primitive, rather than treating MCP screenshots as a separate arbitrary browser automation service.

## How to run

Start the dotcom client from the repo root:

```bash
yarn dev-app
```

Generate a real Browser Run thumbnail:

```bash
CLOUDFLARE_ACCOUNT_ID=... \
CLOUDFLARE_API_TOKEN=... \
yarn workspace dotcom browser-run-thumbnail-spike \
  --mode browser-run \
  --base-url https://your-dev-or-preview-origin.example \
  --fixture layer-panel \
  --output tmp/browser-run-thumbnail-spike/browser-run-thumbnail.png
```

The API token needs Cloudflare's `Browser Rendering - Edit` permission. Browser Run runs in Cloudflare, so it cannot reach `127.0.0.1` directly. Use a preview/dev deployment, or expose the local dev server with a temporary tunnel. When using a tunnel with Vite's host checks, start the client with:

```bash
VITE_ALLOWED_HOSTS=your-tunnel-host.example yarn workspace dotcom exec vite dev --host 127.0.0.1 --port 3000 --strictPort
```

For local validation without Browser Run credentials:

```bash
yarn workspace dotcom browser-run-thumbnail-spike \
  --mode local \
  --base-url http://127.0.0.1:3000 \
  --fixture snapshot-example \
  --width 1200 \
  --height 630 \
  --theme light \
  --output tmp/browser-run-thumbnail-spike/local-thumbnail.png
```

Representative render inputs:

- `/dev/browser-run-thumbnail?fixture=snapshot-example&x=310&y=120&z=0.55&width=1200&height=630&theme=light`
- `/dev/browser-run-thumbnail?fixture=layer-panel&x=340&y=120&z=0.82&width=1200&height=630&theme=dark`

## MCP screenshot layer

The existing `apps/mcp-app` worker is an interactive MCP canvas app: it owns its own canvas session, widget, checkpoints, `exec` tool, rate limiter, and analytics. This spike puts the screenshot tool in the dotcom sync worker instead because the production version needs to resolve real tldraw.com shared-board permissions and snapshots, not expose a live editor bridge.

The prototype MCP endpoint is `/api/app/mcp` in deployed dotcom routing, or `/app/mcp` on the sync worker directly. It speaks enough JSON-RPC MCP for initialization, `tools/list`, `tools/call`, and `ping`.

The v1 MCP tool is image-only:

```ts
get_shared_board_screenshot({
	url: string,
	viewport: { x: number; y: number; z: number },
	width?: number,
	height?: number,
	theme?: 'light' | 'dark',
})
```

For this spike, the tool accepts published tldraw.com URLs shaped like `https://www.tldraw.com/p/:slug` or `https://tldraw.com/p/:slug`. It rejects external hosts, private `/f/:slug` file URLs, invite URLs, and unsupported route shapes. Published URLs currently resolve to an allowlisted fixture render so the Browser Run path is working while production snapshot lookup is still being wired.

The production resolver should replace the fixture mapping. It should normalize the URL to a file id, published slug, or readonly slug; reject private or invite-only files; verify `file.shared` or `file.published`; and then mint the same short-lived render token used by thumbnail generation. The MCP server should continue to avoid tools for listing shapes, reading records, discovering file metadata, arbitrary selectors, arbitrary URLs, or current-user private files in v1.

The tool result returns an MCP image content item with PNG data. The prototype always records cache status as `miss` and invokes Browser Run directly. The production cache key should include the normalized board identity, document version or published snapshot id, viewport, dimensions, theme, and source `mcp`. Arbitrary viewport screenshots are in scope for v1, but dimensions stay bounded to 200-1600px in the prototype.

The MCP route should reuse dotcom's existing shared-file and published-file resolution paths where possible. Published screenshots can build on `getPublishedRoomSnapshot`; shared live-file screenshots need an internal snapshot resolver that checks shared-link visibility without requiring a logged-in user. Both should feed a signed internal render page rather than handing Browser Run the public board URL directly.

Rate limits are stricter than the general MCP app's session limiter because this endpoint spends Browser Run capacity. The code has a concrete per-IP enforcement point at about 20 screenshot requests per minute. It uses an optional `MCP_SCREENSHOT_RATE_LIMITER` Cloudflare binding when configured and falls back to an isolate-local guard for the spike. Production should add per-board and global Browser Run concurrency caps.

Telemetry hooks are in `mcp_shared_board_screenshot` events and include source `mcp`, hashed IP, normalized board id hash when available, cache hit/miss, Browser Run duration, `X-Browser-Ms-Used`, output dimensions, failure reason, and rate-limit decisions.

To exercise the MCP tool against a dev render origin, configure the sync worker with:

```bash
CLOUDFLARE_ACCOUNT_ID=... \
CLOUDFLARE_API_TOKEN=... \
MCP_SCREENSHOT_RENDER_ORIGIN=https://your-dev-or-preview-origin.example
```

Then call `/app/mcp` with `tools/call` and `name: "get_shared_board_screenshot"`. Browser Run receives only the fixed `/dev/browser-run-thumbnail` URL built by the worker, not the user-provided board URL.

## Known limitations

- The render page's `data-thumbnail-ready` marker waits for `document.fonts.ready` and two animation frames, but it does not wait for image shapes to finish decoding. A fixture with raster content can be captured before those assets paint. The production render target must gate the ready marker on asset and canvas stability (see below), not just fonts.
- Board resolution maps a published slug to a fixed fixture rather than loading the real snapshot, so the MCP prototype renders representative content, not the actual board.

## Proposed production architecture

Use a dedicated tldraw.com thumbnail worker path that accepts only signed render jobs. The app server verifies the user or published-file permission, resolves the file snapshot from existing tldraw storage, signs a short-lived render token containing file id, document version, page id, viewport, theme, dimensions, and expiry, then queues or invokes the render.

The render target should be a tldraw-owned internal page, not a user-supplied URL. It accepts the signed token, fetches the snapshot through an internal API, renders tldraw with UI hidden, waits for fonts/assets/canvas stability, sets a ready marker, and is captured by Browser Run at 1200x630 or another allowlisted output size.

Cache generated thumbnails in R2 under a key derived from file id, published slug or permission scope, page id, viewport, dimensions, theme, and document version. Reads should return R2 hits immediately with immutable cache headers. Cache misses should enqueue async generation and return a placeholder or stale thumbnail; blocking generation should be limited to low-traffic share/OG paths with a strict timeout.

Request limits should include per-user, per-IP, per-file, and global Browser Run concurrency/rate caps. Enforce an allowlist for output dimensions and reject unbounded full-page screenshots, external URLs, arbitrary selectors, or large viewport requests.

Telemetry should record cache hits/misses, render queue latency, Browser Run duration, `X-Browser-Ms-Used`, file size bucket, output dimensions, request source, failure reason, and whether stale content was served. Alert on elevated failure rates, timeout rates, or usage spikes.

Failure handling should use timeouts at every stage, retry transient Browser Run or asset failures with a small capped backoff, store failure metadata separately from successful thumbnails, and fall back to stale cached thumbnails when possible. User-facing hot paths should not wait on repeated failures.

## Remaining production work

- Replace fixture loading with signed snapshot lookup through existing dotcom auth and permission checks.
- Add an R2 thumbnail bucket and cache key helper.
- Add a queue-backed async generation path and stale/placeholder response behavior.
- Replace the isolate-local rate-limit fallback with a Cloudflare `MCP_SCREENSHOT_RATE_LIMITER` binding and add per-board/global concurrency caps.
- Add dashboards and alerts for the telemetry events.
- Extend the image-only MCP tool to shared-live tldraw.com URLs once the resolver can verify shared-link permissions.
- Decide whether this remains a dotcom sync-worker route or moves to a sibling dotcom worker after production auth/cache/queue ownership is clear.
- Keep private files, board metadata, document structure, current viewport screenshots, and selected-shape screenshots out of the v1 MCP scope.
- Run the production path in Cloudflare preview/dev resources before any production deployment.

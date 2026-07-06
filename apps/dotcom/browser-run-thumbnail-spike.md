# Browser Run thumbnail and MCP screenshot spike

Issues:

- https://github.com/tldraw/tldraw/issues/9502
- https://github.com/tldraw/tldraw/issues/9497

This spike adds a dev-only thumbnail render page for tldraw-owned content and a small script that calls Cloudflare Browser Run's `/screenshot` Quick Action against that page. The script constructs the render URL from a fixed internal path and an allowlisted fixture name, so it is not an arbitrary URL screenshot endpoint.

The MCP screenshot issue should build on the same primitive. Its first version should expose an image-only tool for public/shared tldraw.com boards, with no board metadata or document-structure access.

## What changed

- `apps/dotcom/client/src/pages/dev-browser-run-thumbnail.tsx` renders a 1200x630 hidden-UI tldraw canvas from an allowlisted snapshot fixture.
- `apps/dotcom/client/src/routes.tsx` exposes the render page only when dev routes are enabled.
- `apps/dotcom/client/scripts/browser-run-thumbnail-spike.ts` builds the internal render URL and captures a PNG using Cloudflare Browser Run. It also has a local Playwright mode for validating the render page without Cloudflare credentials.
- `apps/dotcom/client/package.json` adds `yarn workspace dotcom browser-run-thumbnail-spike`.
- This document layers the MCP server follow-up on the same signed render job architecture, rather than treating MCP screenshots as a separate arbitrary browser automation service.

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
  --output tmp/browser-run-thumbnail-spike/local-thumbnail.png
```

Representative render inputs:

- `/dev/browser-run-thumbnail?fixture=snapshot-example&x=310&y=120&z=0.55`
- `/dev/browser-run-thumbnail?fixture=layer-panel&x=340&y=120&z=0.82`

## MCP screenshot layer

The existing `apps/mcp-app` worker is an interactive MCP canvas app: it owns its own canvas session, widget, checkpoints, `exec` tool, rate limiter, and analytics. The tldraw.com screenshot server should be a separate dotcom-backed MCP surface because it needs to resolve real shared-board permissions and snapshots, not expose a live editor bridge.

The v1 MCP tool should be image-only:

```ts
get_shared_board_screenshot({
	url: string,
	viewport: { x: number; y: number; z: number },
	width?: 1200,
	height?: 630,
	theme?: 'light' | 'dark',
})
```

Inputs should accept tldraw.com shared-board URLs only, such as shared live files and published snapshot URLs. The resolver should normalize the URL to a file id, published slug, or readonly slug; reject private or invite-only files; verify `file.shared` or `file.published`; and then mint the same short-lived render token used by thumbnail generation. The MCP server should not expose tools for listing shapes, reading records, discovering file metadata, arbitrary selectors, arbitrary URLs, or current-user private files in v1.

The tool result should return an image content item from R2 when cached, or trigger a bounded Browser Run render on a cache miss. The cache key should include the normalized board identity, document version or published snapshot id, viewport, dimensions, theme, and source `mcp`. Arbitrary viewport screenshots are in scope for v1, but dimensions should stay allowlisted and bounded.

The MCP route should reuse dotcom's existing shared-file and published-file resolution paths where possible. Published screenshots can build on `getPublishedRoomSnapshot`; shared live-file screenshots need an internal snapshot resolver that checks shared-link visibility without requiring a logged-in user. Both should feed a signed internal render page rather than handing Browser Run the public board URL directly.

Rate limits should be stricter than the general MCP app's session limiter because this endpoint spends Browser Run capacity. Use a per-IP sanity check around 20 screenshot requests per minute, plus per-board and global Browser Run concurrency caps. Telemetry should log source `mcp`, hashed IP, normalized board id hash, cache hit or miss, Browser Run duration, `X-Browser-Ms-Used`, output dimensions, failure reason, and rate-limit decisions.

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
- Add abuse limits, telemetry events, dashboards, and alerts.
- Implement the image-only MCP tool for shared and published tldraw.com URLs using the same signed render job path.
- Decide whether the MCP server lives in a new dotcom worker route or a sibling worker; avoid coupling it to the existing interactive `apps/mcp-app` session/widget server unless there is a product reason to combine them.
- Keep private files, board metadata, document structure, current viewport screenshots, and selected-shape screenshots out of the v1 MCP scope.
- Run the production path in Cloudflare preview/dev resources before any production deployment.

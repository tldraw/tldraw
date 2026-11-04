// The render worker's API: the RPC surface it exposes over the RENDER_WORKER service binding, and
// the request/result types that cross it. This file is the worker's public contract — `worker.ts`
// implements `RenderWorkerRpc`, and its one consumer (sync-worker) imports these types to type the
// binding as `Service<RenderWorkerRpc>`. The caller uses `import type` only, so nothing of the worker
// is bundled into it; the service binding is the sole runtime link between the two.
//
// Division of labour (see apps/dotcom/browser-run-thumbnails.md, "A private screenshot and measure
// worker"):
//
// - sync-worker keeps auth, board resolution, snapshot loading, rate limits, R2 caching, and the
//   request-level `mcp_shared_board_screenshot` telemetry.
// - the render worker owns the render page, the Browser Run calls, the render deadline, result
//   parsing, and the session-level `browser_run_session` spend ledger. It has no public routes — it
//   is reached only through the binding — and it is handed no board identity, so the "No board
//   identifier leaves this pipeline" rule holds by construction here too.

import { ThumbnailShapeMeasurement, ThumbnailSnapshotResponseBody } from '@tldraw/dotcom-shared'

/**
 * What the worker is asked to render: the same self-describing payload the render page reads today,
 * built by sync-worker's `thumbnailSnapshotBodyFor`. It carries the records, the schema, and the
 * `renderParams` (page, shapes, theme, viewport, `mode`, `capture`), so the worker needs nothing
 * else to drive the page — and because it is the exact body a pulled page would have fetched, a
 * pushed render and a (former) fetched one cannot differ.
 *
 * There is no token and no pull path. The service-binding RPC that carries this payload has the same
 * 32 MiB ceiling as the Browser Run push, so a board too large to push is also too large to hand to
 * this worker in the first place — it is refused upstream, in sync-worker, before any RPC. That is
 * why this is the `error: false` arm only: an unresolvable or oversize board never becomes a render
 * request.
 */
export type RenderPayload = Extract<ThumbnailSnapshotResponseBody, { error: false }>

/**
 * What a board holds, as numbers, for the `browser_run_session` ledger. Numbers only: doubles carry
 * no cardinality and none of these can identify a board. Computed sync-side by `summarizeSnapshotContent`
 * from the full room snapshot (the worker only sees the sliced push payload), and handed over so the
 * worker can write it onto the one event it owns.
 */
export interface RenderContentSummary {
	records: number
	/** Shapes parented directly to the rendered page. */
	pageShapes: number
	/** Image and video asset records in the document, whichever page uses them. */
	mediaAssets: number
	bboxWidth: number
	bboxHeight: number
}

/** Who a session is for on the spend ledger, and what it drew — the session-level dimensions. */
export interface RenderTelemetry {
	/** Stamped as `source:` on `browser_run_session`. The surface that asked. */
	source: 'mcp' | 'og' | 'queue'
	/** The queue trigger (`reason:`), on sessions the queue runs; request-path sessions omit it. */
	reason?: 'crawler' | 'publish' | 'edit'
	/**
	 * What the board holds, for the ledger's content doubles. Required on both calls: a measure can
	 * supply it too (sync-worker holds the snapshot either way), where today measures write zeros.
	 */
	content: RenderContentSummary
}

/**
 * The bounded failure codes the worker returns. sync-worker writes them straight onto
 * `mcp_shared_board_screenshot`'s failure-reason blob; the worker reports the underlying Browser Run
 * detail (status, body, timeout budget) to its own Sentry, never over this boundary. This is the
 * subset of `classifyScreenshotFailure`'s vocabulary reachable inside the worker — the codes for
 * board resolution and snapshot reading can't occur here, because that work stays in sync-worker.
 */
export type RenderFailureReason =
	| 'browser_failed'
	| 'browser_timeout'
	| 'empty_render'
	| 'page_error'
	| 'not_configured'
	| 'render_error'

export interface ScreenshotRequest {
	payload: RenderPayload
	telemetry: RenderTelemetry
}

/**
 * The PNG comes back as raw bytes, never base64 — keep it this way even though the MCP tool hands the
 * agent base64 and MCP is the volume expected to grow. Returning base64 to save the MCP response an
 * encode looks like the optimization and is the opposite, because every capture is also written to
 * the R2 cache, which needs bytes:
 *
 * - return bytes  → the R2 write is direct; one base64 at the MCP content-item boundary. One encode.
 * - return base64 → encode here, a ~33% larger RPC message, then a decode in sync-worker for the R2
 *   write. One encode + one decode + the larger message.
 *
 * MCP growth makes bytes *more* right, not less: as the cache warms, a cache hit is served from R2
 * and never calls this worker, so the return type matters only on a miss — a render — which is
 * exactly where the base64 round trip would be paid. `Uint8Array` crosses the binding natively via
 * structured clone.
 */
export type ScreenshotResult =
	| { ok: true; png: Uint8Array }
	| { ok: false; reason: RenderFailureReason }

export interface MeasureRequest {
	payload: RenderPayload
	telemetry: RenderTelemetry
}

/**
 * The page's measured geometry, keyed by shape id, in the page's own `{ x, y, w, h, text? }` form —
 * the worker parses it out of the `/content` HTML and drops any non-finite box. sync-worker adapts it
 * to its clustering coordinates (`ShapeMeasurement`), which stays sync-side with the clustering code.
 */
export type MeasureResult =
	| { ok: true; measurements: Record<string, ThumbnailShapeMeasurement> }
	| { ok: false; reason: RenderFailureReason }

/**
 * The service-binding surface. sync-worker types its `RENDER_WORKER` binding as
 * `Service<RenderWorkerRpc>`; the worker's `WorkerEntrypoint` subclass satisfies this.
 *
 * Both methods choose their Browser Run action and their result parser from the method itself
 * (`screenshot` → `/screenshot` → PNG; `measure` → `/content` → geometry), which must agree with the
 * payload's `renderParams.mode` — and does, by construction, since sync-worker builds the payload
 * from the same job that picks the method. The worker reads the viewport from `renderParams`.
 */
export interface RenderWorkerRpc {
	screenshot(request: ScreenshotRequest): Promise<ScreenshotResult>
	measure(request: MeasureRequest): Promise<MeasureResult>
}

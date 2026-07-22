import { createSentry } from '@tldraw/worker-shared'
import { Environment } from '../../types'

// Leaf helpers shared by the board-reading and thumbnail/OG-image surfaces
// (get{Published,SharedFile}, sharedBoardScreenshotMcp.ts, the OG route, and the OG queue
// consumer). This module imports nothing from those route files so it can be depended on from any
// of them without creating an import cycle.

// A board's snapshot could not be read: Postgres, R2, or a malformed payload. Distinct from a
// render failure so telemetry can tell "the database is down" apart from "Chrome fell over" — the
// two have entirely different causes and fixes, and previously landed on the same reason code.
export class BoardSnapshotReadError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options)
		this.name = 'BoardSnapshotReadError'
	}
}

// Hex SHA-256 of a string. Used to hash IPs and board slugs before they reach telemetry, so raw
// identifiers are never written to the analytics dataset.
export async function sha256(value: string) {
	const bytes = new TextEncoder().encode(value)
	const digest = await crypto.subtle.digest('SHA-256', bytes)
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Maps an arbitrary render error to a bounded set of reason codes for the `failure` telemetry
// blob. Raw `error.message` strings (Postgres/R2/network/browser errors) are unbounded and would
// blow up that dimension's cardinality, so they must never be written to the dataset directly.
// Keep this a small, stable vocabulary. The typed case is matched first and by type: a failed
// snapshot read is not a render that failed, and filing it under a render reason code sends whoever
// reads the dashboard looking at the wrong subsystem.
//
// A board un-shared or unpublished between a surface resolving it and reading its snapshot lands in
// `snapshot_read_error` along with everything else the readers throw. That race is a few
// milliseconds wide, so separating it out is not worth a dedicated error type threaded through
// every reporting path.
export function classifyScreenshotFailure(error: unknown): string {
	if (error instanceof BoardSnapshotReadError) return 'snapshot_read_error'
	const message = error instanceof Error ? error.message : String(error)
	if (/not configured/i.test(message)) return 'not_configured'
	if (/timeout|timed out/i.test(message)) return 'browser_timeout'
	if (/empty screenshot/i.test(message)) return 'empty_render'
	if (/Browser Rendering screenshot failed/i.test(message)) return 'browser_failed'
	return 'render_error'
}

// Caller-facing explanation for a classified failure, as a clause to follow a tool's own prefix.
// Derived from the bounded reason code and never from `error.message`: these tools answer anonymous,
// unauthenticated callers, and Postgres and R2 errors carry internal hostnames, ports, and database
// usernames (the pool is built from BOTCOM_POSTGRES_POOLED_CONNECTION_STRING). The unbounded
// original still reaches Sentry through reportThumbnailError, which is where it is useful.
export function describeThumbnailFailure(reason: string): string {
	switch (reason) {
		case 'snapshot_read_error':
			return "the board's saved content could not be read"
		case 'not_configured':
			return 'rendering is not configured'
		case 'browser_timeout':
			return 'rendering timed out'
		default:
			return 'the render failed'
	}
}

// Which swallowing surface an error came from. Set as a Sentry tag so they can be filtered apart,
// and kept a closed union so the tag's values stay a small, stable set.
export type ThumbnailErrorSurface =
	| 'og_route'
	| 'og_queue'
	| 'thumbnail_snapshot'
	| 'mcp_board_info'
	| 'mcp_screenshot'
	// Kept apart from 'mcp_screenshot': the render succeeded and the caller still got their PNG, so
	// this never means "screenshots are broken" — it means the cache isn't absorbing them and every
	// call is re-spending Browser Run.
	| 'mcp_screenshot_cache_write'

// Every thumbnail/OG surface deliberately swallows its own errors: the OG route falls back to the
// default image, the render page's snapshot route 404s, the MCP tools return a tool error, and the
// queue consumer retries or drops. That is right for callers, but it means the only trace a real
// failure leaves is a bounded telemetry reason code, which says a board stopped rendering and
// nothing about why. Report the underlying error here so these paths stay diagnosable.
//
// `ctx` supplies the waitUntil that lets the report outlive the response — route handlers get one
// from the router, the queue consumer from the worker entrypoint. Without one (unit tests) we log
// instead, since createSentry throws when SENTRY_DSN and friends are unset.
export function reportThumbnailError(
	error: unknown,
	{
		ctx,
		env,
		request,
		surface,
		extras,
	}: {
		ctx: ExecutionContext | undefined
		env: Environment
		request?: Request
		surface: ThumbnailErrorSurface
		extras?: Record<string, unknown>
	}
) {
	try {
		const sentry = ctx ? createSentry(ctx, env, request) : null
		if (!sentry) {
			console.error(`[thumbnails:${surface}]`, extras ?? {}, error)
			return
		}
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		sentry.withScope((scope) => {
			scope.setTag('thumbnail_surface', surface)
			if (extras) scope.setExtras(extras)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			sentry.captureException(error)
		})
	} catch (_e) {
		// Reporting runs inside handlers whose whole point is to swallow failure, so it must never be
		// the thing that throws: a missing Sentry env var would otherwise turn a degraded-but-fine
		// response into a 500.
	}
}

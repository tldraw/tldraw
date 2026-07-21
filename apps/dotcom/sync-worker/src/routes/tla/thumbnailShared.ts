import { createSentry } from '@tldraw/worker-shared'
import { Environment } from '../../types'

// Leaf helpers shared by the thumbnail/OG-image surfaces (sharedBoardScreenshotMcp.ts, the OG
// route, and the OG queue consumer). This module imports nothing from those route files so it can
// be depended on from any of them without creating an import cycle.

// Hex SHA-256 of a string. Used to hash IPs and board slugs before they reach telemetry, so raw
// identifiers are never written to the analytics dataset.
export async function sha256(value: string) {
	const bytes = new TextEncoder().encode(value)
	const digest = await crypto.subtle.digest('SHA-256', bytes)
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Maps an arbitrary render error to a bounded set of reason codes for the `failure` telemetry
// blob. Raw `error.message` strings (Postgres/R2/network/browser errors) are unbounded and would
// blow up that dimension's cardinality, so they must never be written to the dataset directly — the
// full message goes to the caller-facing error text instead. Keep this a small, stable vocabulary.
export function classifyScreenshotFailure(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error)
	if (/not configured/i.test(message)) return 'not_configured'
	if (/timeout|timed out/i.test(message)) return 'browser_timeout'
	if (/empty screenshot/i.test(message)) return 'empty_render'
	if (/Browser Rendering screenshot failed/i.test(message)) return 'browser_failed'
	return 'render_error'
}

// Which swallowing surface an error came from. Set as a Sentry tag so the four can be filtered
// apart, and kept a closed union so the tag's values stay a small, stable set.
export type ThumbnailErrorSurface =
	| 'og_route'
	| 'og_queue'
	| 'thumbnail_snapshot'
	| 'mcp_board_info'

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

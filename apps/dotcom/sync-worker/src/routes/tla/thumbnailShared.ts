import { createSentry } from '@tldraw/worker-shared'
import { Environment } from '../../types'

// Leaf helpers shared by the board-reading and thumbnail/OG-image surfaces
// (get{Published,SharedFile}, the render core in thumbnailRender.ts, sharedBoardScreenshotMcp.ts,
// the OG route, and the OG queue consumer). This module imports nothing from those files so it can
// be depended on from any of them without creating an import cycle.

// A board's snapshot could not be read: Postgres, R2, or a malformed payload. Distinct from a render
// failure so telemetry can tell "the database is down" apart from "Chrome fell over".
export class BoardSnapshotReadError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options)
		this.name = 'BoardSnapshotReadError'
	}
}

// A Browser Run `/screenshot` call that came back non-OK. The status alone says almost nothing:
// Cloudflare answers 422 for every "the page did not cooperate" outcome — a crashed page, an
// out-of-memory render, any Quick Action timer expiring — and our own render page marking
// `data-thumbnail-error` lands there too, because the capture selector only exists on the success
// path. What separates them is the response body and how much of the timeout budget the call spent,
// so both are carried here rather than in the message.
//
// `message` stays exactly `Browser Rendering screenshot failed (<status>)`. Sentry groups on it, so a
// varying detail string there would shatter one recurring issue into a stream of new ones;
// `reportThumbnailError` lifts these fields into the event's context instead.
export class BrowserRenderError extends Error {
	readonly status: number
	readonly detail: string | undefined
	readonly durationMs: number
	readonly timeoutMs: number

	constructor(options: {
		status: number
		detail: string | undefined
		durationMs: number
		timeoutMs: number
	}) {
		super(`Browser Rendering screenshot failed (${options.status})`)
		this.name = 'BrowserRenderError'
		this.status = options.status
		this.detail = options.detail
		this.durationMs = options.durationMs
		this.timeoutMs = options.timeoutMs
	}
}

// Maps an arbitrary render error to a bounded set of reason codes for the `failure` telemetry blob.
// Raw `error.message` strings are unbounded and must never reach that dimension, so keep this a
// small, stable vocabulary. The typed cases are matched first and by type: a failed snapshot read is
// not a render that failed, and filing it as one sends a dashboard reader to the wrong subsystem.
//
// A board deleted or unpublished between a surface resolving it and reading its snapshot lands in
// `snapshot_read_error` with everything else the readers throw. That race is a few milliseconds wide,
// so separating it out isn't worth a dedicated error type threaded through every reporting path.
export function classifyScreenshotFailure(error: unknown): string {
	if (error instanceof BoardSnapshotReadError) return 'snapshot_read_error'
	if (error instanceof BrowserRenderError) return classifyBrowserRenderFailure(error)
	const message = error instanceof Error ? error.message : String(error)
	if (/not configured/i.test(message)) return 'not_configured'
	if (/timeout|timed out/i.test(message)) return 'browser_timeout'
	if (/empty screenshot/i.test(message)) return 'empty_render'
	if (/Browser Rendering screenshot failed/i.test(message)) return 'browser_failed'
	return 'render_error'
}

// Splits a Browser Run failure into `browser_timeout` and `browser_failed`, which the status cannot
// do (see BrowserRenderError). Reads the response body, which usually names the timer, and falls back
// to how much of the budget the call spent: one that used essentially the whole timeout waited a timer
// out, one that returned early failed for another reason. Note the message is no use here — a Browser
// Run failure's never contains the word "timeout", so matching on it reports a timeout rate of zero.
const BROWSER_TIMEOUT_DURATION_FRACTION = 0.9
function classifyBrowserRenderFailure(error: BrowserRenderError): string {
	if (/timeout|timed out|timed-out/i.test(error.detail ?? '')) return 'browser_timeout'
	if (error.durationMs >= error.timeoutMs * BROWSER_TIMEOUT_DURATION_FRACTION) {
		return 'browser_timeout'
	}
	return 'browser_failed'
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
	// The cluster index cache in the file's Durable Object. Neither of these is ever a caller-visible
	// failure — both fall back to measuring the page — but both mean the clustering tools are paying
	// for a browser session per call again, which is the thing that cache exists to stop.
	| 'mcp_cluster_index_read'
	| 'mcp_cluster_index_write'

// Every thumbnail/OG surface swallows its own errors — the OG route falls back to the default image,
// the snapshot route 404s, the MCP tools return a tool error, the queue retries or drops. Right for
// callers, but it leaves a bounded telemetry reason code as the only trace, which says a board stopped
// rendering and nothing about why. Reporting here is what keeps these paths diagnosable.
//
// `ctx` supplies the waitUntil that lets the report outlive the response — route handlers get one from
// the router, the queue consumer from the worker entrypoint. Without one (unit tests) we log instead,
// since createSentry throws when SENTRY_DSN and friends are unset.
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
		const context = {
			...extras,
			...safeRequestContext(request),
			...browserRenderContextOf(error),
		}
		// `request` is deliberately NOT handed to createSentry, which passes one straight to Toucan with
		// `allowedSearchParams: /(.*)/` — recording the full URL and every query parameter. On these
		// routes the URL is the sensitive part: `/app/social-preview/f/<id>/image` carries a link-shared
		// file's id, and the render-snapshot route carries a signed token that can read the board's whole
		// contents until it expires. safeRequestContext takes what is useful instead.
		const sentry = ctx ? createSentry(ctx, env) : null
		if (!sentry) {
			console.error(`[thumbnails:${surface}]`, context, error)
			return
		}
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		sentry.withScope((scope) => {
			scope.setTag('thumbnail_surface', surface)
			scope.setExtras(context)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			sentry.captureException(error)
		})
	} catch (_e) {
		// Reporting runs inside handlers whose whole point is to swallow failure, so it must never be
		// the thing that throws: a missing Sentry env var would otherwise turn a degraded-but-fine
		// response into a 500.
	}
}

// The parts of a request worth attaching that carry no board identity. The URL is excluded (see the
// call site); the user agent is kept because on the OG route it names the crawler that tripped over
// the board, and the method because a HEAD probe and a GET behave differently there. Not the client
// IP — telemetry records a hash of that, on failures only, which is where it earns its keep.
function safeRequestContext(request: Request | undefined): Record<string, unknown> | null {
	if (!request) return null
	return {
		request_method: request.method,
		request_user_agent: request.headers.get('user-agent') ?? 'none',
	}
}

// The fields BrowserRenderError keeps out of its message, lifted into the event context so they don't
// file a new Sentry issue per distinct detail string. Without them an event says only "Browser
// Rendering screenshot failed (422)", which is true of a crash, an OOM render and a timeout alike.
function browserRenderContextOf(error: unknown): Record<string, unknown> | null {
	if (!(error instanceof BrowserRenderError)) return null
	return {
		browser_render_status: error.status,
		// Cloudflare's own explanation of the failure, verbatim (truncated at the throw site). Absent
		// when the response carried no body, which is itself worth being able to see.
		browser_render_detail: error.detail ?? '(no response body)',
		browser_render_duration_ms: error.durationMs,
		browser_render_timeout_ms: error.timeoutMs,
		browser_render_reason: classifyScreenshotFailure(error),
	}
}

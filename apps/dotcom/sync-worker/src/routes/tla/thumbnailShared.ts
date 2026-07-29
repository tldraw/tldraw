import { createSentry } from '@tldraw/worker-shared'
import { Environment } from '../../types'
import { getRoomDurableObjectId } from '../../utils/durableObjects'

// Leaf helpers shared by the board-reading and thumbnail/OG-image surfaces
// (get{Published,SharedFile}, the render core in thumbnailRender.ts, sharedBoardScreenshotMcp.ts,
// the OG route, and the OG queue consumer). This module imports nothing from those files so it can
// be depended on from any of them without creating an import cycle.

// A board's snapshot could not be read: Postgres, R2, or a malformed payload. Distinct from a
// render failure so telemetry can tell "the database is down" apart from "Chrome fell over" — the
// two have entirely different causes and fixes, and previously landed on the same reason code.
export class BoardSnapshotReadError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options)
		this.name = 'BoardSnapshotReadError'
	}
}

// A Browser Run `/screenshot` call that came back non-OK. The status alone says almost nothing:
// Cloudflare answers 422 for every "the page did not cooperate" outcome — a page that crashed, one
// that ran out of memory rendering, and any of the Quick Action timers expiring — and our own render
// page marking `data-thumbnail-error` lands there too, because the capture selector only exists on
// the success path. What separates them is the response body (which names the real cause) and how
// much of the timeout budget the call spent, so both are carried here.
//
// `message` stays exactly `Browser Rendering screenshot failed (<status>)` and the specifics ride on
// the fields: Sentry groups on the message, so putting a varying detail string in it would shatter
// one recurring issue into a stream of new ones. `reportThumbnailError` lifts the fields into the
// event's context instead, which is where they are readable without splitting the group.
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

/**
 * A board's durable object id — the only form a board identifier may take in telemetry, in a log
 * line, or in a Sentry event.
 *
 * `idFromName` is one-way, so this names a board without carrying the ability to open it, which a
 * raw identifier does. For a link-shared file the slug *is* the file id and `tldraw.com/f/<id>` is
 * the capability to view it, so writing one into an account-readable dataset or a log sink hands out
 * working access to a board somebody chose to share by link rather than publish.
 *
 * It is also the value `TLFileDurableObject.writeEvent` stamps on its events, so a Sentry event and
 * the `mcp_shared_board_screenshot` datapoints for the same board line up.
 *
 * Resolution in the useful direction still works from an id you already hold —
 * `env.TLDR_DOC.idFromName('/r/' + slug)` — so "is this the board that keeps failing?" stays
 * answerable for a board in hand, while the record alone names none.
 *
 * Prefer the **file** id where there is one: a published board's slug addresses no durable object,
 * so passing one mints a well-formed id that joins to nothing. Passing it is still far better than
 * recording it raw.
 */
export function boardDurableObjectId(env: Environment, id: string | undefined): string | undefined {
	if (!id) return undefined
	try {
		return getRoomDurableObjectId(env, id).toString()
	} catch {
		// Never break a render path, or an error report, for the sake of an identifier. The binding is
		// present in every deployed environment; this covers unconfigured ones.
		return undefined
	}
}

// Hex SHA-256 of a string. Used to hash client IPs before they reach telemetry, so a raw address is
// never written to the analytics dataset. Boards are identified there by their durable object id
// instead, which is already one-way (see boardDurableObjectId above).
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
	if (error instanceof BrowserRenderError) return classifyBrowserRenderFailure(error)
	const message = error instanceof Error ? error.message : String(error)
	if (/not configured/i.test(message)) return 'not_configured'
	if (/timeout|timed out/i.test(message)) return 'browser_timeout'
	if (/empty screenshot/i.test(message)) return 'empty_render'
	if (/Browser Rendering screenshot failed/i.test(message)) return 'browser_failed'
	return 'render_error'
}

// Splits a Browser Run failure into `browser_timeout` and `browser_failed`. The status can't do it —
// 422 is Cloudflare's answer to a crashed page, an out-of-memory render, and every one of its timers
// expiring alike — so this reads the response body it carries, which usually names the timer, and
// falls back to how much of the budget the call spent when it doesn't. A call that came back having
// used essentially the whole timeout waited a timer out; one that returned early failed for some
// other reason.
//
// Getting this right matters beyond the label: the surfaces used to classify on `error.message`
// alone, which for a Browser Run failure never contains the word "timeout", so every timeout was
// filed as `browser_failed` and the dashboard's timeout rate was structurally always zero.
const BROWSER_TIMEOUT_DURATION_FRACTION = 0.9
function classifyBrowserRenderFailure(error: BrowserRenderError): string {
	if (/timeout|timed out|timed-out/i.test(error.detail ?? '')) return 'browser_timeout'
	if (error.durationMs >= error.timeoutMs * BROWSER_TIMEOUT_DURATION_FRACTION) {
		return 'browser_timeout'
	}
	return 'browser_failed'
}

// The Browser Run time a failed capture still spent, for the surfaces' telemetry. A render that
// throws has already created a browser and held it — often for the whole timeout — so leaving this
// off the failure datapoint understated what an uncapped render path actually costs, which is the
// one number the design relies on watching. Undefined for failures that never reached the capture
// (an unreadable snapshot, an empty board): those spent nothing, and recording nothing is right.
export function browserRunDurationOf(error: unknown): number | undefined {
	return error instanceof BrowserRenderError ? error.durationMs : undefined
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
		const context = {
			...extras,
			...safeRequestContext(request),
			...browserRenderContextOf(error),
		}
		// `request` is deliberately NOT handed to createSentry. It passes one straight to Toucan with
		// `allowedSearchParams: /(.*)/`, which records the full URL and every query parameter — and on
		// these routes the URL is the sensitive part. `/app/social-preview/f/<id>/image` carries a
		// link-shared file's id in its path, and the render-snapshot route carries a signed render token
		// in its query string, which is a live capability to read that board's entire contents until it
		// expires. Neither belongs in an error tracker. What the request usefully contributes is taken
		// by safeRequestContext instead, and the `thumbnail_surface` tag already says which endpoint
		// this was.
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

// The fields a BrowserRenderError deliberately keeps out of its message, so they reach the Sentry
// event as context rather than as a new issue per distinct detail string. Without these an event
// says only "Browser Rendering screenshot failed (422)", which is true of a crashed page, an
// out-of-memory render, and a timeout alike — everything that would tell them apart is here.
// The parts of a request that are worth attaching and carry no board identity. The URL is excluded
// on purpose (see the note at the call site); the user agent is kept because on the OG route it says
// which crawler tripped over the board, and the method because a HEAD probe and a GET behave
// differently there. The client IP is not taken: telemetry records a hash of it, and only on
// failures, which is the one place it earns its keep.
function safeRequestContext(request: Request | undefined): Record<string, unknown> | null {
	if (!request) return null
	return {
		request_method: request.method,
		request_user_agent: request.headers.get('user-agent') ?? 'none',
	}
}

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

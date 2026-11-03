import { ThumbnailRenderPhase } from '@tldraw/dotcom-shared'

// Render failure types and classifier, copied from sync-worker's thumbnailShared.ts and trimmed to
// what can occur inside this worker: it renders a payload it is handed, so there is no board
// resolution or snapshot read here, and the rate-limiter and snapshot-read error cases are gone.

// A Browser Run call that came back non-OK. The status alone says almost nothing: Cloudflare answers
// 422 for every "the page did not cooperate" outcome — a crashed page, an out-of-memory render, any
// Quick Action timer expiring — and our own render page marking `data-thumbnail-error` lands there
// too, because the capture selector only exists on the success path. What separates them is the
// response body and how much of the timeout budget the call spent, so both are carried here.
//
// `message` stays exactly `Browser Rendering screenshot failed (<status>)`. Sentry groups on it, so a
// varying detail string there would shatter one recurring issue into a stream of new ones;
// `browserRenderContextOf` lifts these fields into the event's context instead.
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

// The render page's own `data-thumbnail-error`, read off a measure's `/content` response. The page's
// message stays out of `message` for the same Sentry grouping reason as BrowserRenderError.
export class RenderPageError extends Error {
	readonly detail: string
	/** Absent when read off `/content`, which carries the message but not how far the page got. */
	readonly phase?: ThumbnailRenderPhase

	constructor(options: { detail: string; phase?: ThumbnailRenderPhase }) {
		super('Render page failed')
		this.name = 'RenderPageError'
		this.detail = options.detail
		this.phase = options.phase
	}
}

// Maps a render error to a bounded reason code for the `failure` telemetry blob. Raw `error.message`
// strings are unbounded and must never reach that dimension, so this stays a small, stable
// vocabulary. The typed cases are matched first and by type.
export function classifyScreenshotFailure(error: unknown): string {
	if (error instanceof BrowserRenderError) return classifyBrowserRenderFailure(error)
	if (error instanceof RenderPageError) return 'page_error'
	const message = error instanceof Error ? error.message : String(error)
	if (/not configured/i.test(message)) return 'not_configured'
	if (/timeout|timed out/i.test(message)) return 'browser_timeout'
	if (/empty screenshot/i.test(message)) return 'empty_render'
	if (/Browser Rendering screenshot failed/i.test(message)) return 'browser_failed'
	return 'render_error'
}

// Splits a Browser Run failure into `browser_timeout` and `browser_failed`, which the status cannot
// do. Reads the response body, which usually names the timer, and falls back to how much of the
// budget the call spent: one that used essentially the whole timeout waited a timer out, one that
// returned early failed for another reason. The message is no use here — a Browser Run failure's
// never contains the word "timeout", so matching on it reports a timeout rate of zero.
const BROWSER_TIMEOUT_DURATION_FRACTION = 0.9
function classifyBrowserRenderFailure(error: BrowserRenderError): string {
	if (/timeout|timed out|timed-out/i.test(error.detail ?? '')) return 'browser_timeout'
	if (error.durationMs >= error.timeoutMs * BROWSER_TIMEOUT_DURATION_FRACTION) {
		return 'browser_timeout'
	}
	return 'browser_failed'
}

// The fields the error types keep out of their message, lifted into the Sentry event context so they
// don't file a new issue per distinct detail string.
export function browserRenderContextOf(error: unknown): Record<string, unknown> | null {
	if (error instanceof RenderPageError) {
		return { render_page_error: error.detail, render_page_phase: error.phase }
	}
	if (!(error instanceof BrowserRenderError)) return null
	return {
		browser_render_status: error.status,
		browser_render_detail: error.detail ?? '(no response body)',
		browser_render_duration_ms: error.durationMs,
		browser_render_timeout_ms: error.timeoutMs,
		browser_render_reason: classifyScreenshotFailure(error),
	}
}

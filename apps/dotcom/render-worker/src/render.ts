import {
	getThumbnailContentRequestBody,
	getThumbnailScreenshotRequestBody,
	renderPushScript,
	THUMBNAIL_MEASURE_RESULT_ID,
	THUMBNAIL_RENDER_PATH,
	THUMBNAIL_RENDER_TIMEOUT_MS,
	ThumbnailShapeMeasurement,
} from '@tldraw/dotcom-shared'
import { RenderContentSummary, RenderPayload } from './api'
import { BrowserRenderError, classifyScreenshotFailure, RenderPageError } from './errors'
import { Environment } from './types'

// The render session, copied from sync-worker's thumbnailRender.ts and reduced to this worker's job:
// it is handed a payload and renders it. There is no token, no board resolution, and only one
// transport — push — because a board too large to push is refused upstream (see api.ts). So the
// transport fork, the oversize fetch fallback, the timeout marker, and the page-reach stamp all fall
// away; a pushed session's page never fetches, so page reach is `reached` on a capture and `unknown`
// on a dead session.

type BrowserRunAction = 'screenshot' | 'content'
type ThumbnailRenderRequestBody =
	| ReturnType<typeof getThumbnailScreenshotRequestBody>
	| ReturnType<typeof getThumbnailContentRequestBody>

/** What a browser session was created for, stamped on its `browser_run_session` datapoint. */
export interface BrowserRunSessionContext {
	source: 'mcp' | 'og' | 'queue'
	mode: 'measure' | 'screenshot'
	/** The queue trigger, on sessions the queue runs. Request-path sessions have none. */
	reason?: 'crawler' | 'publish' | 'edit'
	/** `live` when the render was asked to rasterize the live canvas; absent means the page exports. */
	capture?: 'live'
}

// A capture that came back OK, fully read, and how long the whole thing took. The transports read the
// body themselves rather than handing back a Response: the read has to happen inside
// abandonAtRenderTimeout's deadline, or a body stream that stalls after a 200's headers would hold
// the call unbounded.
interface TimedCapture {
	buffer: ArrayBuffer
	durationMs: number
	/** Browser wall clock billed for the session, or 0 where the transport has none (local dev). */
	browserMsUsed: number
}

// Where Browser Run points: the render page, no token (the records are pushed). The shared request
// builder adds `?push=1` when an injected script is present.
function buildRenderUrl(env: Environment): string {
	if (!env.RENDER_PAGE_ORIGIN) {
		throw new Error(
			`RENDER_PAGE_ORIGIN is not configured. It must point at an origin that serves the ${THUMBNAIL_RENDER_PATH} render page.`
		)
	}
	return new URL(THUMBNAIL_RENDER_PATH, env.RENDER_PAGE_ORIGIN).toString()
}

/**
 * One Browser Run session against the render page: a `/screenshot` returning the PNG for a
 * screenshot, a `/content` returning the page's HTML for a measure. Writes the session to the
 * `browser_run_session` spend ledger at this choke point — ok, or the session-level failure code for
 * a session that died — then returns the raw bytes, or throws for the caller to classify.
 */
export async function runRenderSession(
	env: Environment,
	{
		session,
		payload,
		content,
	}: { session: BrowserRunSessionContext; payload: RenderPayload; content: RenderContentSummary }
): Promise<{ buffer: ArrayBuffer; durationMs: number }> {
	const { width, height } = payload.renderParams
	const action: BrowserRunAction = session.mode === 'measure' ? 'content' : 'screenshot'
	const pushScript = renderPushScript(payload)
	const pushChars = pushScript.length
	// Built by one function so the wait strategy, capture target and timeout cannot drift between
	// Browser Run and its development stand-in.
	const requestBody = (
		action === 'content' ? getThumbnailContentRequestBody : getThumbnailScreenshotRequestBody
	)({
		renderUrl: buildRenderUrl(env),
		width,
		height,
		timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
		injectedScript: pushScript,
	})

	const startedAt = Date.now()
	const callCapture = () =>
		env.LOCAL_SCREENSHOT_SERVICE_URL
			? callLocalScreenshotService(env.LOCAL_SCREENSHOT_SERVICE_URL, action, requestBody)
			: callBrowserRun(env, action, requestBody)

	let timed: TimedCapture
	try {
		timed = await abandonAtRenderTimeout(callCapture(), startedAt)
	} catch (error) {
		// A BrowserRenderError is a session that existed and died, so it lands on the ledger with the
		// time it held its browser. Anything else never created a session and records nothing.
		if (error instanceof BrowserRenderError) {
			writeBrowserRunSessionTelemetry(env, session, {
				outcome: classifyScreenshotFailure(error),
				durationMs: error.durationMs,
				width,
				height,
				// A pushed page never fetches, so a dead session leaves no stamp to say it reached.
				page: 'unknown',
				browserMsUsed: 0,
				pushChars,
				content,
			})
		}
		throw error
	}

	const buffer = timed.buffer
	const pageError = action === 'content' ? readRenderPageError(buffer) : undefined
	if (pageError !== undefined) {
		writeBrowserRunSessionTelemetry(env, session, {
			outcome: 'page_error',
			durationMs: timed.durationMs,
			width,
			height,
			page: 'reached',
			browserMsUsed: timed.browserMsUsed,
			pushChars,
			content,
		})
		throw new RenderPageError({ detail: pageError })
	}
	if (buffer.byteLength === 0) {
		// The session ran to completion — the spend is real — it just produced nothing usable.
		writeBrowserRunSessionTelemetry(env, session, {
			outcome: 'empty_render',
			durationMs: timed.durationMs,
			width,
			height,
			page: 'reached',
			browserMsUsed: timed.browserMsUsed,
			pushChars,
			content,
		})
		throw new Error('Render produced an empty screenshot')
	}

	writeBrowserRunSessionTelemetry(env, session, {
		outcome: 'ok',
		durationMs: timed.durationMs,
		width,
		height,
		page: 'reached',
		browserMsUsed: timed.browserMsUsed,
		pushChars,
		content,
	})
	return { buffer, durationMs: timed.durationMs }
}

// The page's result element out of a `/content` response, in the page's own `{ x, y, w, h, text? }`
// form; sync-worker adapts it to clustering coordinates. Malformed boxes are dropped rather than
// kept: a non-finite value would produce NaN distances and silently detach that shape downstream.
export function readMeasureResult(buffer: ArrayBuffer): Record<string, ThumbnailShapeMeasurement> {
	const html = new TextDecoder().decode(buffer)
	const match = new RegExp(
		`<script[^>]*\\bid="${THUMBNAIL_MEASURE_RESULT_ID}"[^>]*>([\\s\\S]*?)</script>`
	).exec(html)
	if (!match) throw new Error('The render page did not report any measurements')
	const reported = JSON.parse(match[1]) as Record<string, ThumbnailShapeMeasurement>

	const bounds: Record<string, ThumbnailShapeMeasurement> = {}
	for (const [shapeId, box] of Object.entries(reported)) {
		if (
			!Number.isFinite(box?.x) ||
			!Number.isFinite(box?.y) ||
			!Number.isFinite(box?.w) ||
			!Number.isFinite(box?.h)
		) {
			continue
		}
		bounds[shapeId] = {
			x: box.x,
			y: box.y,
			w: box.w,
			h: box.h,
			...(typeof box.text === 'string' && box.text ? { text: box.text } : null),
		}
	}
	return bounds
}

// --- Browser Run transports ---------------------------------------------------------------------

async function callBrowserRun(
	env: Environment,
	action: BrowserRunAction,
	requestBody: ThumbnailRenderRequestBody
): Promise<TimedCapture> {
	if (!env.BROWSER) {
		throw new Error(
			'Browser Rendering is not configured. Set the BROWSER binding (local dev needs Cloudflare credentials).'
		)
	}

	const startedAt = Date.now()
	// A Browser Rendering Quick Action, invoked straight through the binding (no puppeteer, no API
	// token). Requires compatibility_date >= 2026-03-24 for `quickAction`.
	const response = await env.BROWSER.quickAction(action, requestBody)
	const durationMs = Date.now() - startedAt

	if (!response.ok) {
		throw new BrowserRenderError({
			status: response.status,
			detail: await readBrowserErrorDetail(response),
			durationMs,
			timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
		})
	}
	// A body stream that fails is still a session that existed and spent, so it is wrapped into the
	// error type the ledger recognises rather than escaping as a raw stream error.
	const buffer = await response.arrayBuffer().catch((error) => {
		throw new BrowserRenderError({
			status: response.status,
			detail: `Reading the capture body failed: ${error instanceof Error ? error.message : String(error)}`,
			durationMs: Date.now() - startedAt,
			timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
		})
	})
	return {
		buffer: action === 'content' ? unwrapContentResult(buffer, response.status, startedAt) : buffer,
		durationMs: Date.now() - startedAt,
		browserMsUsed: browserMsUsedOf(response),
	}
}

// Development stand-in for the Browser Rendering call above. Sent the same request body, and its
// response decoded by the same code, so everything either side of the call is the production path.
// The browser is a local Playwright one, not Browser Run, so a render that works here is not evidence
// that it works in production.
async function callLocalScreenshotService(
	serviceUrl: string,
	action: BrowserRunAction,
	requestBody: ThumbnailRenderRequestBody
): Promise<TimedCapture> {
	const startedAt = Date.now()
	const url = new URL(serviceUrl)
	url.searchParams.set('action', action)
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(requestBody),
	})

	if (!response.ok) {
		throw new Error(
			`Local screenshot service failed (${response.status}): ${await response.text()}`
		)
	}
	// A dev server that has not loaded the screenshot plugin answers this path with the client's
	// index.html — a 200 full of bytes that would otherwise be cached as if it were a thumbnail. For
	// the same reason the page's HTML comes back wrapped in JSON rather than as text/html.
	const expected = action === 'content' ? 'application/json' : 'image/png'
	const contentType = response.headers.get('content-type') ?? ''
	if (!contentType.includes(expected)) {
		throw new Error(
			`Local screenshot service returned ${contentType || 'no content type'}, expected ${expected}. Is the client dev server running with the thumbnail screenshot plugin?`
		)
	}
	const buffer =
		action === 'content'
			? (new TextEncoder().encode(((await response.json()) as { html: string }).html)
					.buffer as ArrayBuffer)
			: await response.arrayBuffer()
	return { buffer, durationMs: Date.now() - startedAt, browserMsUsed: browserMsUsedOf(response) }
}

// `/content` answers `{ success, result: "<html>…" }` rather than the HTML itself. Anything else is a
// session that ran and gave nothing usable, so it fails the way a broken capture body does.
function unwrapContentResult(buffer: ArrayBuffer, status: number, startedAt: number): ArrayBuffer {
	let parsed: unknown
	try {
		parsed = JSON.parse(new TextDecoder().decode(buffer))
	} catch {
		parsed = undefined
	}
	// `null` and scalars are valid JSON too; they must fail as a BrowserRenderError, which is what puts
	// the session on the ledger, not as a TypeError reading `.success`.
	const body = (parsed && typeof parsed === 'object' ? parsed : {}) as {
		success?: unknown
		result?: unknown
		errors?: unknown
	}
	if (body.success !== true || typeof body.result !== 'string') {
		throw new BrowserRenderError({
			status,
			detail: truncate(`Unusable content response: ${JSON.stringify(body.errors ?? parsed)}`),
			durationMs: Date.now() - startedAt,
			timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
		})
	}
	return new TextEncoder().encode(body.result).buffer as ArrayBuffer
}

// The request cannot cap its own total: `gotoOptions.timeout` and `waitForSelector.timeout` are
// sequential phases that each get the full render budget, so a page that stalls through both holds
// the call for roughly twice THUMBNAIL_RENDER_TIMEOUT_MS. The pipeline prices a capture at the single
// budget, so it is enforced here on the whole call. The abandoned browser session is Cloudflare's to
// reap and still spends its remainder — this bounds the call, not the spend.
async function abandonAtRenderTimeout(
	capture: Promise<TimedCapture>,
	startedAt: number
): Promise<TimedCapture> {
	let timer: ReturnType<typeof setTimeout> | undefined
	try {
		return await Promise.race([
			capture,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => {
					reject(
						new BrowserRenderError({
							// No response was received, so there is no status; the detail is what classifies this
							// as a browser_timeout.
							status: 0,
							detail: `Capture abandoned by the worker at the ${THUMBNAIL_RENDER_TIMEOUT_MS} ms render timeout`,
							durationMs: Date.now() - startedAt,
							timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
						})
					)
				}, THUMBNAIL_RENDER_TIMEOUT_MS)
			}),
		])
	} finally {
		clearTimeout(timer)
	}
}

// The page's `data-thumbnail-error` from a `/content` response, or undefined if it has none. Read off
// <html>, which the page marks along with <body> and never clears.
function readRenderPageError(buffer: ArrayBuffer): string | undefined {
	const html = new TextDecoder().decode(buffer)
	const tag = /<html\b[^>]*>/i.exec(html)?.[0]
	if (!tag) return undefined
	const attribute = /\sdata-thumbnail-error(?:="([^"]*)")?/.exec(tag)
	return attribute ? decodeHtmlAttribute(attribute[1] ?? '') || '(no message)' : undefined
}

function decodeHtmlAttribute(value: string) {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
}

// Both transports read the billing header through this, so the ledger column means one thing.
function browserMsUsedOf(response: Response) {
	return Number(response.headers.get('X-Browser-Ms-Used')) || 0
}

// How much of Cloudflare's error body to keep. It is a short JSON object in practice; the cap stops a
// proxy's HTML error page putting a document into a Sentry event.
const MAX_BROWSER_ERROR_DETAIL_LENGTH = 500

// Reads why Browser Run refused, which the status cannot say on its own. Failure-proof: this runs on a
// path that is already failing, so a body that won't read or parse degrades to "no detail".
async function readBrowserErrorDetail(response: Response): Promise<string | undefined> {
	try {
		const text = (await response.text()).trim()
		if (!text) return undefined
		return truncate(extractBrowserErrorMessages(text) ?? text)
	} catch {
		return undefined
	}
}

// Cloudflare's error body is `{"success":false,"errors":[{"code":…,"message":"…"}]}`, and the messages
// are the whole readable part. Anything else falls back to the raw text.
function extractBrowserErrorMessages(text: string): string | undefined {
	try {
		const body = JSON.parse(text)
		if (!Array.isArray(body?.errors)) return undefined
		const messages = body.errors
			.map((error: unknown) => (error as { message?: unknown } | null)?.message)
			.filter((message: unknown): message is string => typeof message === 'string' && !!message)
		return messages.length > 0 ? messages.join('; ') : undefined
	} catch {
		return undefined
	}
}

function truncate(text: string) {
	return text.length > MAX_BROWSER_ERROR_DETAIL_LENGTH
		? `${text.slice(0, MAX_BROWSER_ERROR_DETAIL_LENGTH)}…`
		: text
}

// --- Spend ledger -------------------------------------------------------------------------------

// One datapoint per browser session actually created, written here at the choke point every session
// flows through. The SAME event and blob/double layout as sync-worker's `browser_run_session`, with
// `transport` pinned to `push` (this worker only pushes) and `blob2` now this worker's name. Carries
// no board identity.
function writeBrowserRunSessionTelemetry(
	env: Environment,
	session: BrowserRunSessionContext,
	{
		outcome,
		durationMs,
		width,
		height,
		page,
		browserMsUsed,
		pushChars,
		content,
	}: {
		outcome: string
		durationMs: number
		width: number
		height: number
		page: 'reached' | 'unreached' | 'unknown'
		browserMsUsed: number
		pushChars: number
		content: RenderContentSummary
	}
) {
	writeDataPoint(env.MEASURE, env.WORKER_NAME, 'browser_run_session', {
		blobs: [
			`source:${session.source}`,
			`mode:${session.mode}`,
			`outcome:${outcome}`,
			`reason:${session.reason ?? 'none'}`,
			`page:${page}`,
			`capture:${session.mode === 'measure' ? 'none' : (session.capture ?? 'export')}`,
			`transport:push`,
		],
		doubles: [
			width,
			height,
			durationMs,
			browserMsUsed,
			content.records,
			content.pageShapes,
			content.mediaAssets,
			content.bboxWidth,
			content.bboxHeight,
			pushChars,
		],
	})
}

// The analytics writer, copied from sync-worker's utils/analytics.ts. The worker name goes in the
// second blob for legacy reasons — it was the only field when analytics were introduced, so the
// position is fixed. Swallows its own failure: telemetry must never turn a good render into an error.
function writeDataPoint(
	measure: Environment['MEASURE'],
	workerName: string | undefined,
	name: string,
	{ blobs, doubles }: { blobs?: string[]; doubles?: number[] }
) {
	try {
		measure?.writeDataPoint({
			blobs: [name, workerName ?? 'development-tldraw-render-worker', ...(blobs ?? [])],
			doubles,
		})
	} catch {
		// Deliberately swallowed.
	}
}

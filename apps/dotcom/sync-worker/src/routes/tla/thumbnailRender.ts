import {
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	THUMBNAIL_RENDER_PATH,
	THUMBNAIL_RENDER_TIMEOUT_MS,
	getThumbnailScreenshotRequestBody,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { THUMBNAIL_RENDER_TOKEN_TTL_MS } from '../../config'
import { getR2KeyForRoom } from '../../r2'
import {
	Environment,
	OgImageRenderReason,
	ThumbnailBoardAccess,
	ThumbnailBoardKind,
	ThumbnailBoardRef,
	ThumbnailRenderSurface,
} from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { arrayBufferToBase64, base64ToArrayBuffer } from '../../utils/base64'
import {
	ThumbnailRenderJob,
	deleteMintedRenderToken,
	mintThumbnailRenderToken,
	recordMintedRenderToken,
} from '../../utils/renderTokens'
import { ShapeMeasurement } from './boardTools'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import {
	SharedFileInfo,
	getSharedFileInfo,
	getSharedFileRoomSnapshot,
	isFileViewableFor,
} from './getSharedFile'
import {
	BoardSnapshotReadError,
	BrowserRenderError,
	classifyScreenshotFailure,
} from './thumbnailShared'

// The render-and-cache core shared by every Browser Run screenshot surface: the MCP screenshot
// tool (sharedBoardScreenshotMcp.ts), the OG image route (getOgImage.ts), and the OG render queue
// consumer (ogImageQueue.ts). Owns board resolution, snapshot loading, page enumeration, the
// Browser Rendering invocation, and the shared telemetry writer. The surfaces own their own protocol
// handling, cache keys, and retry/backoff policies.
//
// Owns no rate limiting: the pipeline's only limiters live in sharedBoardScreenshotMcp.ts, so a new
// surface built on these helpers cannot pick one up by accident.

// A board a screenshot surface has resolved. Whether it is *publicly viewable* depends on the access
// the caller asked for — see ThumbnailBoardAccess. The version rotates when the rendered content
// changes (lastPublished for published boards, the persisted room snapshot's R2 etag for shared
// files), so it can key the thumbnail caches.
export interface ResolvedThumbnailBoard extends ThumbnailBoardRef {
	version: string | number
	/**
	 * The file this board's content belongs to: the slug itself for a shared file, and the parent file
	 * a published slug resolves to for a published board.
	 *
	 * Carried because the file's Durable Object is addressed by it, and that object is where the MCP
	 * server caches a page's cluster index (see mcpClusterIndex.ts). Kept off `ThumbnailBoardRef`,
	 * which is the *identity* of a board and keys its caches: two kinds can share a file id, so a key
	 * built from this would collide a published board's index with its file's.
	 */
	fileId: string
	/**
	 * The gate this board was resolved under, carried so a render cannot be minted under a weaker one
	 * than the resolution used. `captureThumbnailScreenshot` signs it into the job, and the snapshot
	 * route reads the board back under it.
	 */
	access: ThumbnailBoardAccess
	/**
	 * The `file` row this resolution gated on, for `shared_file` boards only. Carried so a caller that
	 * reads the snapshot in the same breath can hand it back to `loadBoardSnapshot` instead of asking
	 * Postgres the same question twice — see the `file` option on `getSharedFileRoomSnapshot` for when
	 * that is and is not appropriate. Never signed into a render job: the job carries the gate, and a
	 * row that travelled inside a token could not be re-checked on the way back.
	 */
	file?: SharedFileInfo
}

export type ResolveThumbnailBoardResult =
	| { ok: true; board: ResolvedThumbnailBoard }
	| { ok: false; reason: 'not_found' | 'board_empty' }

/**
 * Resolves a board slug of a known kind, applying the gate the caller asked for (see
 * `ThumbnailBoardAccess`). `access: 'public'` is the only thing standing between a private board and
 * the public internet, and it is re-applied per request rather than inferred from what is in R2 —
 * necessarily, since nothing deletes a thumbnail when a board stops being public.
 *
 * `board_empty` means the board passed its gate but has no persisted room content; `not_found` covers
 * everything the gate refused.
 */
export async function resolveThumbnailBoard(
	env: Environment,
	kind: ThumbnailBoardKind,
	slug: string,
	{
		access,
		file: knownFile,
	}: {
		access: ThumbnailBoardAccess
		/**
		 * The row a caller has *just* read for this same file, to be gated again rather than fetched a
		 * second time. The MCP path's access check reads `file` and this then selects a strict subset of
		 * the same columns microseconds later, so without this every tool call opens two Postgres pools
		 * for one row — three when the published fallback runs. Opt in per call site, like the same
		 * option on `loadBoardSnapshot`: the gate below is applied either way, so what a caller takes on
		 * is the staleness of the row, not a weaker check.
		 */
		file?: SharedFileInfo
	}
): Promise<ResolveThumbnailBoardResult> {
	if (kind === 'published') {
		// A published board's whole identity is its published slug, so there is no weaker gate to
		// apply: an unpublished board has no published snapshot to render in the first place.
		const publishedFile = await getPublishedFileInfo(env, slug)
		if (!publishedFile?.published) return { ok: false, reason: 'not_found' }
		return {
			ok: true,
			board: {
				kind,
				slug,
				version: publishedFile.lastPublished,
				access,
				// The row this published slug resolved through, which is the file that owns the snapshot.
				fileId: publishedFile.id,
			},
		}
	}

	const file = knownFile ?? (await getSharedFileInfo(env, slug))
	if (!isFileViewableFor(file, access)) return { ok: false, reason: 'not_found' }

	// The persisted room's R2 etag rotates when the board content changes, so it keys the
	// thumbnail cache without a separate content-version field.
	const persisted = await env.ROOMS.head(getR2KeyForRoom({ slug, isApp: true }))
	if (!persisted) return { ok: false, reason: 'board_empty' }

	return { ok: true, board: { kind, slug, version: persisted.etag, access, file, fileId: file.id } }
}

// Reads a resolved board's snapshot, keeping the two outcomes callers must tell apart distinct.
// `null` means one thing only: an empty board, with no persisted room content. Anything the readers
// throw — Postgres, R2, a malformed payload, or the gate they re-check as they read — is wrapped as a
// BoardSnapshotReadError, so a database outage reaches telemetry under its own reason code instead of
// as an empty board.
export async function loadBoardSnapshot(
	env: Environment,
	board: ThumbnailBoardRef,
	{
		access,
		file,
	}: {
		access: ThumbnailBoardAccess
		/**
		 * The row a caller has *just* resolved this board against, to be gated again rather than
		 * re-fetched. Opt in per call site rather than reading it off `board`, so a surface takes the
		 * staleness that comes with it deliberately. See `getSharedFileRoomSnapshot`.
		 */
		file?: SharedFileInfo
	}
): Promise<RoomSnapshot | null> {
	try {
		const snapshot =
			board.kind === 'published'
				? await getPublishedRoomSnapshot(env, board.slug)
				: await getSharedFileRoomSnapshot(env, board.slug, { access, file })
		return snapshot ?? null
	} catch (error) {
		// Keep the original message in the wrapper's own text as well as its `cause`, so the Sentry
		// event title still names the real failure rather than reading as a generic read error.
		throw new BoardSnapshotReadError(
			`Could not read board snapshot: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error }
		)
	}
}

/**
 * Mints a render job's token and records it as ours, in one step because the two halves must not be
 * separable.
 *
 * A token minted without a record fails its own check at the snapshot route and surfaces as a generic
 * render failure — and the way that arrived the first time was exactly this: a second mint site that
 * did the first half only, leaving every measure token unrecorded. Both mint sites go through here so
 * a third cannot repeat it.
 *
 * Recorded before the browser can present the token, so the snapshot route can tell one we minted from
 * one merely signed with our secret. Awaited, not fired off: the render is about to depend on it
 * having landed. A no-op for `public` jobs — see recordMintedRenderToken.
 */
async function mintRecordedRenderToken(env: Environment, job: ThumbnailRenderJob) {
	const token = await mintThumbnailRenderToken(env, job)
	await recordMintedRenderToken(env, job, token)
	return token
}

export function buildThumbnailRenderUrl(renderOrigin: string, token: string) {
	const url = new URL(THUMBNAIL_RENDER_PATH, renderOrigin)
	url.searchParams.set('token', token)
	return url.toString()
}

function getRenderOrigin(env: Environment) {
	// Staging and production set this in wrangler.toml to their own client origin. Local dev sets it
	// to the local client; previews configure it explicitly when they need to exercise this path.
	if (!env.MCP_SCREENSHOT_RENDER_ORIGIN) {
		throw new Error(
			`MCP_SCREENSHOT_RENDER_ORIGIN is not configured. It must point at an origin that serves the ${THUMBNAIL_RENDER_PATH} render page.`
		)
	}
	return env.MCP_SCREENSHOT_RENDER_ORIGIN
}

// Renders one content-fit page of a resolved board through the render page and returns the PNG.
// Mints the short-lived signed render job, so the browser session only ever visits the
// tldraw-owned render page; callers decide where (and whether) to cache the result.
export async function captureThumbnailScreenshot(
	env: Environment,
	board: ResolvedThumbnailBoard,
	{
		surface,
		pageId,
		shapeIds,
		theme,
		width,
		height,
		telemetry,
	}: {
		/** Which pipeline is asking. Signed into the job; namespaces the minted-token record. */
		surface: ThumbnailRenderSurface
		/**
		 * The single page to render. When omitted, the render page exports whichever page the
		 * snapshot opens to (used by OG images).
		 */
		pageId?: string
		/**
		 * Restricts the export to these shapes rather than the whole page: the render page fits the
		 * camera to their common bounds and draws only them.
		 */
		shapeIds?: string[]
		theme: 'light' | 'dark'
		width: number
		height: number
		/**
		 * Who this session is for on the spend ledger. Required so a new caller cannot create
		 * browser sessions that never appear on it; `mode` is stamped here, since this path is by
		 * definition a screenshot render.
		 */
		telemetry: { source: BrowserRunSessionContext['source']; reason?: OgImageRenderReason }
	}
): Promise<{ base64: string; durationMs: number }> {
	const job: ThumbnailRenderJob = {
		v: 1,
		kind: board.kind,
		slug: board.slug,
		version: board.version,
		// Taken from the resolution rather than the caller, so a surface cannot ask for a board under
		// one gate and render it under another.
		access: board.access,
		surface,
		camera: 'content',
		...(pageId ? { pageId } : null),
		...(shapeIds?.length ? { shapeIds } : null),
		// Ignored while `camera` is 'content', which is what every surface mints; carried because the
		// job type keeps the explicit-viewport path available (see ThumbnailRenderJob).
		x: 0,
		y: 0,
		z: 1,
		width,
		height,
		theme,
		exp: Date.now() + THUMBNAIL_RENDER_TOKEN_TTL_MS,
	}
	const token = await mintRecordedRenderToken(env, job)
	try {
		return await runRenderSession(env, buildThumbnailRenderUrl(getRenderOrigin(env), token), {
			width,
			height,
			session: { source: telemetry.source, mode: 'screenshot', reason: telemetry.reason },
		})
	} finally {
		// The MCP surface keys its records by token, so nothing later overwrites this one and it has to
		// be dropped here — the same cleanup a measure gets, for the same reason. In `finally` because a
		// failed render leaves exactly the orphan a successful one would, and the snapshot fetch the
		// record guards is over either way by the time the session ends. A no-op for OG, whose per-board
		// key must outlive the capture; see deleteMintedRenderToken.
		await deleteMintedRenderToken(env, job, token)
	}
}

/** What a browser session was created for, stamped on its `browser_run_session` datapoint. */
export interface BrowserRunSessionContext {
	source: 'mcp' | 'og' | 'queue'
	mode: 'measure' | 'screenshot'
	/** The queue trigger, on sessions the queue runs. Request-path sessions have none. */
	reason?: OgImageRenderReason
}

// The Browser Run spend ledger: one datapoint per browser session actually created, written here at
// the choke point every session flows through rather than by each surface's own bookkeeping. This is
// deliberately a separate event from `mcp_shared_board_screenshot`, which stays request-level: that
// event answers cache and refusal questions, this one answers spend. Analytics Engine cannot join,
// so each event carries the dimensions its own questions need — `mode` is what separates a measure
// render from a screenshot render, which the request event cannot express.
function writeBrowserRunSessionTelemetry(
	env: Environment,
	session: BrowserRunSessionContext,
	{
		outcome,
		durationMs,
		width,
		height,
	}: {
		/** `ok`, or the bounded browser failure code for a session that died. */
		outcome: string
		durationMs: number
		width: number
		height: number
	}
) {
	writeDataPoint(undefined, env.MEASURE, env, 'browser_run_session', {
		blobs: [
			`source:${session.source}`,
			`mode:${session.mode}`,
			`outcome:${outcome}`,
			`reason:${session.reason ?? 'none'}`,
		],
		doubles: [width, height, durationMs],
	})
}

// One Browser Run session against the render page, returning whatever the Quick Action captured.
// Only the capture path wants those pixels: they are editor.toImage's output, which the page
// displays as a full-viewport image to be caught. A measure runs no export and discards the image —
// the session is only how the page gets to run, and its answer comes back through the result
// endpoint.
//
// A failed render marks an error state rather than the ready one, so it returns as a failure
// immediately instead of burning the timeout (see THUMBNAIL_SETTLED_SELECTOR /
// THUMBNAIL_CAPTURE_SELECTOR in @tldraw/dotcom-shared).
async function runRenderSession(
	env: Environment,
	renderUrl: string,
	{ width, height, session }: { width: number; height: number; session: BrowserRunSessionContext }
): Promise<{ base64: string; durationMs: number }> {
	// Built once and handed to whichever transport runs, so the wait strategy, capture target and
	// timeout cannot drift between Browser Run and its development stand-in.
	const requestBody = getThumbnailScreenshotRequestBody({
		renderUrl,
		width,
		height,
		timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
	})

	// Local dev has no route to Browser Run, so it points this at a screenshot service instead (the
	// client's dev server, which can drive Playwright). Selected on the var being set rather than on
	// an environment name, so only an environment that configures one can take this path.
	let timed: TimedCapture
	const startedAt = Date.now()
	try {
		const capture = env.LOCAL_SCREENSHOT_SERVICE_URL
			? callLocalScreenshotService(env.LOCAL_SCREENSHOT_SERVICE_URL, requestBody)
			: callBrowserRun(env, requestBody)
		// Measures are exempt from the worker-side deadline, and it is the *result* that makes them
		// so: the render page POSTs its measurements before signalling ready, and the result route
		// accepts any unexpired signed token, so abandoning the wait early would let that POST land
		// after measurePageShapes' cleanup has already deleted the result key — stranding an object
		// in a bucket that must never get a lifecycle rule. The deadline exists for the OG pipeline's
		// invariants, which never price a measure; a measure stays bounded by the quick action's own
		// per-phase timers.
		timed = await (session.mode === 'measure'
			? capture
			: abandonAtRenderTimeout(capture, startedAt))
	} catch (error) {
		// A BrowserRenderError is a session that existed and died, so it lands on the ledger with the
		// time it held its browser. Anything else never created a session and records nothing.
		if (error instanceof BrowserRenderError) {
			writeBrowserRunSessionTelemetry(env, session, {
				outcome: classifyScreenshotFailure(error),
				durationMs: error.durationMs,
				width,
				height,
			})
		}
		throw error
	}

	const buffer = timed.buffer
	if (buffer.byteLength === 0) {
		// The session ran to completion — the spend is real — it just produced nothing usable.
		writeBrowserRunSessionTelemetry(env, session, {
			outcome: 'empty_render',
			durationMs: timed.durationMs,
			width,
			height,
		})
		throw new Error('Render produced an empty screenshot')
	}

	writeBrowserRunSessionTelemetry(env, session, {
		outcome: 'ok',
		durationMs: timed.durationMs,
		width,
		height,
	})
	return { base64: arrayBufferToBase64(buffer), durationMs: timed.durationMs }
}

type ThumbnailScreenshotRequestBody = ReturnType<typeof getThumbnailScreenshotRequestBody>

// A capture that came back OK, fully read, and how long the whole thing took. The transports read
// the body themselves rather than handing back a Response: the read has to happen inside
// abandonAtRenderTimeout's deadline, or a body stream that stalls after a 200's headers would hold
// the delivery unbounded — past every bound the pipeline prices a capture at. Each transport throws
// its own kind of failure; only Browser Run's carries the status, body detail and timeout budget
// that BrowserRenderError exists to hold.
interface TimedCapture {
	buffer: ArrayBuffer
	durationMs: number
}

async function callBrowserRun(
	env: Environment,
	requestBody: ThumbnailScreenshotRequestBody
): Promise<TimedCapture> {
	if (!env.BROWSER) {
		throw new Error(
			'Browser Rendering is not configured. Set the BROWSER binding (local dev needs Cloudflare credentials).'
		)
	}

	const startedAt = Date.now()
	// Browser Rendering `/screenshot` Quick Action, invoked straight through the binding (no
	// puppeteer, no API token). Requires compatibility_date >= 2026-03-24 for `quickAction`.
	const response = await env.BROWSER.quickAction('screenshot', requestBody)
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
	// error type the ledger recognises rather than escaping as a raw stream error and vanishing from
	// the spend record.
	const buffer = await response.arrayBuffer().catch((error) => {
		throw new BrowserRenderError({
			status: response.status,
			detail: `Reading the capture body failed: ${error instanceof Error ? error.message : String(error)}`,
			durationMs: Date.now() - startedAt,
			timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
		})
	})
	return { buffer, durationMs: Date.now() - startedAt }
}

// The request cannot cap its own total: `gotoOptions.timeout` and `waitForSelector.timeout` are
// sequential phases that each get the full render budget (see getThumbnailScreenshotRequestBody),
// so a page that stalls through both holds the call for roughly twice THUMBNAIL_RENDER_TIMEOUT_MS.
// Everything sized against "a capture takes at most the render timeout" — the pending-marker TTL
// against the retry chain, the edit debounce outlasting a capture, both pinned in
// ogImageQueue.test.ts — needs the single budget to be a real ceiling, so it is enforced here on
// the whole call. The abandoned browser session is Cloudflare's to reap and still spends its
// remainder — this bounds the delivery, not the spend.
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
							// No response was received, so there is no status; the detail is what classifies
							// this as a browser_timeout (see classifyBrowserRenderFailure).
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
		// Only the timer needs cleanup: an abandoned capture's eventual rejection is already handled,
		// since Promise.race subscribes to every input.
		clearTimeout(timer)
	}
}

// How much of Cloudflare's error body to keep. It is a short JSON object in practice; the cap is
// there so a proxy's HTML error page can't put a document into a Sentry event.
const MAX_BROWSER_ERROR_DETAIL_LENGTH = 500

// Reads why Browser Run refused, which the status cannot say on its own (see BrowserRenderError).
// Failure-proof by construction: this runs on a path that is already failing, so a body that won't
// read or won't parse must degrade to "no detail" rather than replace the status we do have with a
// second error.
async function readBrowserErrorDetail(response: Response): Promise<string | undefined> {
	try {
		const text = (await response.text()).trim()
		if (!text) return undefined
		return truncate(extractBrowserErrorMessages(text) ?? text)
	} catch {
		return undefined
	}
}

// Cloudflare's error body is `{"success":false,"errors":[{"code":…,"message":"…"}]}`, and the
// messages are the whole readable part. Anything else — a proxy's HTML, a plain string, a shape we
// don't recognise — falls back to the raw text.
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

// Development stand-in for the Browser Rendering call above. Sent the same request body, and its
// response decoded by the same code, so everything either side of the call is the production path.
// The browser is a local Playwright one though, not Browser Run, so a render that works here is not
// evidence that it works in production.
async function callLocalScreenshotService(
	serviceUrl: string,
	requestBody: ThumbnailScreenshotRequestBody
): Promise<TimedCapture> {
	const startedAt = Date.now()
	const response = await fetch(serviceUrl, {
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
	// index.html — a 200 full of bytes that would otherwise be cached as if it were a thumbnail.
	const contentType = response.headers.get('content-type') ?? ''
	if (!contentType.includes('image/png')) {
		throw new Error(
			`Local screenshot service returned ${contentType || 'no content type'}, expected image/png. Is the client dev server running with the thumbnail screenshot plugin?`
		)
	}
	const buffer = await response.arrayBuffer()
	return { buffer, durationMs: Date.now() - startedAt }
}

// Writes one rendered PNG to a thumbnail cache, stamping the content version (so a stale version
// can be detected) alongside any surface-specific metadata.
// --- Measuring a page in a real editor ----------------------------------------------------------
//
// A Worker cannot size a shape: autosizing text needs font metrics, and several shapes store no size
// at all. So when clustering needs geometry, the render page is driven in `measure` mode — it loads
// the same snapshot, waits for fonts, reads editor.getShapePageBounds for every shape, and POSTs the
// result back. Stashed under the job's own token and read once, so it is a rendezvous for a single
// in-flight render rather than a cache with a lifetime to manage.

function getRenderResultKey(token: string) {
	return `render-result/${encodeURIComponent(token)}.json`
}

export async function putRenderResult(
	env: Environment,
	token: string,
	bounds: Record<string, ShapeMeasurement>
) {
	if (!env.THUMBNAILS) return
	await env.THUMBNAILS.put(getRenderResultKey(token), JSON.stringify(bounds), {
		httpMetadata: { contentType: 'application/json' },
	})
}

/**
 * Measures every shape on a page through a real editor, returning `shapeId -> bounds and text`.
 *
 * Costs one Browser Rendering session, the same as a screenshot — there is no cheaper way to get
 * geometry the Worker cannot compute. Callers own the rate limiting that implies; the session
 * itself lands on the `browser_run_session` spend ledger with `mode:measure`, written at the render
 * choke point rather than by callers.
 */
export async function measurePageShapes(
	env: Environment,
	board: ResolvedThumbnailBoard,
	pageId: string,
	{ surface }: { surface: ThumbnailRenderSurface }
): Promise<Record<string, ShapeMeasurement>> {
	const job: ThumbnailRenderJob = {
		v: 1,
		kind: board.kind,
		slug: board.slug,
		version: board.version,
		// Taken from the resolution rather than the caller, same as captureThumbnailScreenshot: a
		// measure token for a private board reads the whole document through the snapshot route, so it
		// carries the gate the board resolved under rather than defaulting to `public`.
		access: board.access,
		surface,
		mode: 'measure',
		pageId,
		x: 0,
		y: 0,
		z: 1,
		// Nothing is exported, but the viewport still has to be a sane size: shapes are measured
		// against a laid-out document, not a zero-sized one.
		width: DEFAULT_THUMBNAIL_WIDTH,
		height: DEFAULT_THUMBNAIL_HEIGHT,
		theme: 'light',
		exp: Date.now() + THUMBNAIL_RENDER_TOKEN_TTL_MS,
	}
	// Checked before the render rather than after it: the read below cannot work without the bucket, and
	// discovering that once a full browser session has already been spent makes the failure cost a
	// capture it was never going to use.
	if (!env.THUMBNAILS) throw new Error('THUMBNAILS bucket is not configured')

	const token = await mintRecordedRenderToken(env, job)
	const key = getRenderResultKey(token)

	try {
		// Awaited for the ready signal, not for the image it returns; see runRenderSession.
		await runRenderSession(env, buildThumbnailRenderUrl(getRenderOrigin(env), token), {
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
			// The measure runs only on the MCP surface today; `surface` names the render pipeline for the
			// signed job, not the telemetry source, so this is stated rather than derived.
			session: { source: 'mcp', mode: 'measure' },
		})

		const stored = await env.THUMBNAILS.get(key)
		if (!stored) throw new Error('The render page did not report any measurements')
		return JSON.parse(await stored.text())
	} finally {
		// Both of this capture's leftovers, dropped on the failure path as well as the success one.
		//
		// The record is keyed by its own token, so concurrent measures of one page cannot invalidate each
		// other — which also means nothing later overwrites it. The result object is keyed the same way,
		// and the render page POSTs it *before* signalling ready: a Quick Action that then times out —
		// chronically a few percent of renders — leaves an object nothing will ever read or overwrite, in
		// a bucket that deliberately carries no lifecycle rule.
		//
		// Best effort on the result key, and not for the sake of a tidy bucket: throwing here would
		// replace a measure's real answer, or its real error, with a cleanup failure.
		await deleteMintedRenderToken(env, job, token)
		try {
			await env.THUMBNAILS.delete(key)
		} catch {
			// Ignored — see above.
		}
	}
}

export async function putThumbnailPng(
	bucket: R2Bucket,
	key: string,
	base64: string,
	version: string | number,
	extraMetadata?: Record<string, string>
) {
	await bucket.put(key, base64ToArrayBuffer(base64), {
		httpMetadata: { contentType: 'image/png' },
		customMetadata: {
			version: String(version),
			createdAt: String(Date.now()),
			...extraMetadata,
		},
	})
}

// The request-level datapoint writer for every screenshot surface, so they share a dataset and blob
// layout and one dashboard covers them all; the source blob distinguishes mcp (the tool), og (the
// GET route) and queue (the render consumer). The dataset name covers all three despite its mcp_
// prefix, and must keep doing so: renaming it would split the dashboard's history.
//
// This event answers cache and refusal questions — hit rates by source, who was refused and why,
// what was rate-limited. What requests *spend* lives on the separate `browser_run_session` event
// (see writeBrowserRunSessionTelemetry): one request can hold zero, one, or two browser sessions,
// so durations on request rows could only ever be sums that answer neither ledger cleanly.
//
// Carries **no board identity**: no index, no slug, no hash, no derived id. Not an omission — these
// datapoints answer aggregate cache and failure-rate questions, and the cost of that choice is a
// dataset that cannot say which board is failing. See "No board identifier leaves this pipeline" in
// browser-run-thumbnails.md.
export function writeScreenshotTelemetry(
	env: Environment,
	data: {
		source: 'mcp' | 'og' | 'queue'
		/**
		 * Which trigger asked for this render — what attributes a render to publishing or editing.
		 * Only meaningful on queue datapoints; the request paths have no trigger and record `none`.
		 */
		reason?: OgImageRenderReason
		/**
		 * Whether this delivery is the follow-up a completed render enqueues when a `published` board —
		 * the only kind that follows up — moved during its capture (see `enqueueFollowUpIfBoardMoved`),
		 * rather than the ask a trigger made. Separates
		 * the two halves of render spend, which `reason` cannot: a follow-up inherits the reason of the
		 * job it follows, so both land in the same bucket. Only meaningful on queue datapoints; the
		 * request paths have no follow-up and record `none`.
		 */
		followUp?: boolean
		/**
		 * What the PNG cache did for this request. `none` when the request never consulted it: the
		 * info tools have no cache at all, and a screenshot request refused before the cache read
		 * (bad input, rate-limited caller, unresolvable board) says nothing about cache health.
		 * Excluding `none` is what keeps a hit-rate-by-source panel honest.
		 */
		cacheStatus: 'hit' | 'stale' | 'miss' | 'none'
		/**
		 * What the MCP cluster index cache did, which decides whether the call ran a measure render.
		 * Its own dimension rather than part of `cacheStatus`, which is the PNG cache: the two save
		 * different things, and one blob mixing them would make either hit rate unreadable. `none` on
		 * every OG row and on any MCP row that never reached the clustering step.
		 */
		clusterCacheStatus?: 'hit' | 'miss' | 'none'
		/**
		 * Hashed identity of whoever asked, for surfaces that have one. Recorded only on rate-limited
		 * rows — see below.
		 *
		 * This is a hashed user id on the MCP surface, which now requires authentication; it replaced
		 * a hashed client IP, and holds the same blob position so the dashboard panels reading it did
		 * not have to move. The OG surfaces have no caller at all and leave it unset.
		 */
		callerHash?: string
		failureReason?: string
		rateLimitAllowed?: boolean
	}
) {
	const rateLimitAllowed = data.rateLimitAllowed ?? true
	// Only on rate-limited rows, which is the whole question a per-caller blob answers: who to look at
	// when spend spikes or a limit keeps firing.
	//
	// Deliberately narrower than "any failure". Cardinality is about distinct *values*, not row count,
	// and the failure set is mostly routine model mistakes — a wrong board id, a stale cluster id, a
	// page that moved. Nearly every caller produces one of those eventually, so gating on failure
	// would leave the number of distinct callers converging on the number of users, which is the cost
	// the gate exists to avoid. Rate limits fire rarely and only for callers worth naming.
	writeDataPoint(undefined, env.MEASURE, env, 'mcp_shared_board_screenshot', {
		blobs: [
			`source:${data.source}`,
			`cache:${data.cacheStatus}`,
			`failure:${data.failureReason ?? 'none'}`,
			`rate_limit:${rateLimitAllowed ? 'allowed' : 'blocked'}`,
			`caller:${!rateLimitAllowed && data.callerHash ? data.callerHash : 'none'}`,
			// Appended rather than slotted in beside `source`, so the existing blob positions (and the
			// dashboard panels reading them) don't shift.
			`reason:${data.reason ?? 'none'}`,
			// Appended for the same reason. `none` rather than `false` for the surfaces that have no
			// follow-up concept at all, so a query for triggered renders can say `followup:false` and mean
			// it, instead of sweeping up every og and mcp datapoint too.
			`followup:${data.followUp ?? 'none'}`,
			// Appended, like the two above, so nothing shifts. Only the MCP clustering tools ever set it.
			`clusters:${data.clusterCacheStatus ?? 'none'}`,
		],
		doubles: [
			DEFAULT_THUMBNAIL_WIDTH,
			DEFAULT_THUMBNAIL_HEIGHT,
			// Durations moved to the browser_run_session event; the sentinel holds this position (and
			// the ones after it) so historical rows and the panels reading them keep their meaning.
			-1,
			-1,
			rateLimitAllowed ? 1 : 0,
		],
	})
}

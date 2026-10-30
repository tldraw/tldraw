import {
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	THUMBNAIL_MEASURE_RESULT_ID,
	THUMBNAIL_RENDER_GLOBAL,
	THUMBNAIL_RENDER_PATH,
	THUMBNAIL_RENDER_TIMEOUT_MS,
	ThumbnailShapeMeasurement,
	getThumbnailContentRequestBody,
	getThumbnailScreenshotRequestBody,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { RENDER_PUSH_FALLBACK_TTL_MS, THUMBNAIL_RENDER_TOKEN_TTL_MS } from '../../config'
import { getR2KeyForRoom } from '../../r2'
import {
	Environment,
	OgImageRenderReason,
	ThumbnailBoardAccess,
	ThumbnailBoardKind,
	ThumbnailBoardRef,
	ThumbnailRenderSurface,
	envFlagWord,
} from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { arrayBufferToBase64, base64ToArrayBuffer } from '../../utils/base64'
import {
	RenderPageReach,
	ThumbnailRenderJob,
	deleteMintedRenderToken,
	mintThumbnailRenderToken,
	recordMintedRenderToken,
	wasRenderTokenServedSince,
} from '../../utils/renderTokens'
import { ShapeMeasurement } from './boardTools'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import {
	SharedFileInfo,
	getSharedFileInfo,
	getSharedFileRoomSnapshot,
	isFileViewableFor,
} from './getSharedFile'
import { thumbnailSnapshotBodyFor } from './getThumbnailSnapshot'
import {
	BoardSnapshotReadError,
	BrowserRenderError,
	RenderPageError,
	classifyScreenshotFailure,
} from './thumbnailShared'

// The render-and-cache core shared by every Browser Run screenshot surface: the MCP screenshot
// tool (mcpServer.ts), the OG image route (getOgImage.ts), and the OG render queue
// consumer (ogImageQueue.ts). Owns board resolution, snapshot loading, page enumeration, the
// Browser Rendering invocation, and the shared telemetry writer. The surfaces own their own protocol
// handling, cache keys, and retry/backoff policies.
//
// Owns no rate limiting: the pipeline's only limiters live in mcpServer.ts, so a new
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

/**
 * How a session's page gets its records. `push` sends them in the screenshot request, so the page
 * never fetches. `pull` leaves the page to fetch them with its token: push is off, the caller had no
 * snapshot, or the job is an error the snapshot route reports. `push_fallback` had the records and
 * sent none: too big for the RPC message, or a push of this board timed out recently.
 */
type RenderTransport =
	| { kind: 'pull' | 'push_fallback'; pushChars: number }
	| { kind: 'push'; pushChars: number; script: string; board: ThumbnailBoardRef }

const PULL: RenderTransport = { kind: 'pull', pushChars: 0 }

async function renderTransportFor(
	env: Environment,
	snapshot: RoomSnapshot | undefined,
	job: ThumbnailRenderJob
): Promise<RenderTransport> {
	// The trial's kill switch: off, every render fetches, as before push existed.
	if (!snapshot || envFlagWord(env.THUMBNAIL_RENDER_PUSH) !== 'true') return PULL
	if (await didPushTimeOutRecently(env, job)) return { kind: 'push_fallback', pushChars: 0 }
	// Built by the snapshot route's own function, so a pushed render and a fetched one cannot differ.
	const body = thumbnailSnapshotBodyFor(snapshot, job)
	if (body.error) return PULL
	// Parsed rather than evaluated as an object literal: a literal turns a record's `"__proto__"` key
	// into its prototype, so a board that loads by fetch would fail validation by push. addScriptTag
	// sets the script's text rather than parsing it as HTML, so board text cannot close the tag early.
	const script = `window.${THUMBNAIL_RENDER_GLOBAL}=JSON.parse(${JSON.stringify(JSON.stringify(body))})`
	if (script.length > PUSH_SCRIPT_BUDGET_CHARS) {
		return { kind: 'push_fallback', pushChars: script.length }
	}
	return { kind: 'push', pushChars: script.length, script, board: job }
}

// The page waits for a push as long as the capture lasts, so a push that never lands is a
// browser_timeout. One switches the board to fetching for RENDER_PUSH_FALLBACK_TTL_MS, so the next
// attempt (the OG queue's retry, an agent's next call) falls back. Per board, not per surface: the
// cause is the board's payload. THUMBNAILS has no lifecycle rule, so deleteBoardThumbnails removes it.
export function getRenderPushFallbackKey(board: ThumbnailBoardRef) {
	return `push-fallback/${board.kind}/${board.slug}`
}

async function didPushTimeOutRecently(env: Environment, board: ThumbnailBoardRef) {
	// Fails open to pushing: a marker that cannot be read costs at most one more timeout.
	const marker = await env.THUMBNAILS?.head(getRenderPushFallbackKey(board)).catch(() => null)
	const expiresAt = Number(marker?.customMetadata?.expiresAt)
	return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

async function markPushTimedOut(env: Environment, board: ThumbnailBoardRef) {
	await env.THUMBNAILS?.put(getRenderPushFallbackKey(board), new Uint8Array(), {
		customMetadata: { expiresAt: String(Date.now() + RENDER_PUSH_FALLBACK_TTL_MS) },
	}).catch(() => {})
}

// The binding serializes the whole request into one RPC message, capped at 32 MiB (measured
// 2026-08-21: 25.6 MB pushes, 32 MB is refused). A script with any non-Latin-1 character serializes
// at two bytes a character, so this budget can still overshoot; isRpcOversizeError catches that, and
// the refusal comes before any session exists.
const PUSH_SCRIPT_BUDGET_CHARS = 31 * 1024 * 1024

// A plain Error, so the message is all there is to match. Kept narrow: nothing else may be mistaken
// for "too big" and silently downgraded to a fetch.
function isRpcOversizeError(error: unknown) {
	return error instanceof Error && /Serialized RPC .*limited to/i.test(error.message)
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
		capture,
		content,
		snapshot,
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
		/**
		 * `live` skips the in-page export and lets the screenshot rasterize the live canvas, after the
		 * page has pruned it to the requested shapes. Signed into the job so the render page reads it
		 * with the rest of its parameters. See ThumbnailRenderParams.
		 */
		capture?: 'live'
		/** What the board holds, for the ledger (see summarizeSnapshotContent). Never identifies it. */
		content?: RenderContentSummary
		/** The board the caller already read, to push into the page; see renderTransportFor. */
		snapshot?: RoomSnapshot
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
		...(capture ? { capture } : null),
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
	// Minted even for a push: the page still beacons with it.
	const token = await mintRecordedRenderToken(env, job)
	try {
		const { buffer, durationMs } = await runRenderSession(
			env,
			buildThumbnailRenderUrl(getRenderOrigin(env), token),
			{
				width,
				height,
				session: {
					source: telemetry.source,
					mode: 'screenshot',
					reason: telemetry.reason,
					capture,
				},
				transport: await renderTransportFor(env, snapshot, job),
				content,
				pageReached: (since) => wasRenderTokenServedSince(env, job, token, since),
			}
		)
		return { base64: arrayBufferToBase64(buffer), durationMs }
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
	/** `live` when the render was asked to rasterize the live canvas; absent means the page exports. */
	capture?: 'live'
}

/**
 * What a board holds, as numbers, for the session ledger. Numbers only: doubles carry no cardinality,
 * and none of these can identify a board (see "No board identifier leaves this pipeline" in
 * browser-run-thumbnails.md). Sizes come straight off the records, so the box is the union of top-level
 * shapes' positions and stored sizes — rotation ignored, sizeless shapes (draw strokes) counted as
 * points. A proxy, not geometry; the question it answers is whether render time and failure track
 * what is on the board, which a proxy resolves.
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

const EMPTY_CONTENT_SUMMARY: RenderContentSummary = {
	records: 0,
	pageShapes: 0,
	mediaAssets: 0,
	bboxWidth: 0,
	bboxHeight: 0,
}

export function summarizeSnapshotContent(
	snapshot: RoomSnapshot,
	pageId: string | undefined
): RenderContentSummary {
	let pageShapes = 0
	let mediaAssets = 0
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const { state } of snapshot.documents) {
		const record = state as {
			typeName?: string
			type?: string
			parentId?: string
			x?: number
			y?: number
			props?: { w?: unknown; h?: unknown }
		}
		if (record.typeName === 'asset') {
			if (record.type === 'image' || record.type === 'video') mediaAssets++
			continue
		}
		if (record.typeName !== 'shape' || (pageId && record.parentId !== pageId)) continue
		pageShapes++
		const x = record.x ?? 0
		const y = record.y ?? 0
		const w = typeof record.props?.w === 'number' ? record.props.w : 0
		const h = typeof record.props?.h === 'number' ? record.props.h : 0
		minX = Math.min(minX, x)
		minY = Math.min(minY, y)
		maxX = Math.max(maxX, x + w)
		maxY = Math.max(maxY, y + h)
	}
	return {
		records: snapshot.documents.length,
		pageShapes,
		mediaAssets,
		bboxWidth: pageShapes ? maxX - minX : 0,
		bboxHeight: pageShapes ? maxY - minY : 0,
	}
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
		page,
		browserMsUsed,
		transport,
		content = EMPTY_CONTENT_SUMMARY,
	}: {
		/** `ok`, or the bounded browser failure code for a session that died. */
		outcome: string
		durationMs: number
		width: number
		height: number
		/** `reached` on every session that produced a capture; see wasRenderTokenServedSince for the rest. */
		page: RenderPageReach
		/** See TimedCapture.browserMsUsed; 0 for sessions that died before a response. */
		browserMsUsed: number
		transport: RenderTransport
		content?: RenderContentSummary
	}
) {
	writeDataPoint(undefined, env.MEASURE, env, 'browser_run_session', {
		blobs: [
			`source:${session.source}`,
			`mode:${session.mode}`,
			`outcome:${outcome}`,
			`reason:${session.reason ?? 'none'}`,
			// Appended: existing blob positions must not shift.
			`page:${page}`,
			// Appended after `page:` for the same reason. `none` on measures, which draw nothing; a
			// screenshot render exports unless it asked for live.
			`capture:${session.mode === 'measure' ? 'none' : (session.capture ?? 'export')}`,
			// Appended after `capture:`. What the worker sent; what the page used is `acquired:` on
			// render_page_timings.
			`transport:${transport.kind}`,
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
			// Appended. The push script's length in characters; for a fallback, the length refused.
			transport.pushChars,
		],
	})
}

// Page reach is the stamp the snapshot route leaves on a fetch. A pushed page never fetches, so a
// missing stamp says nothing about it: `unknown`, not `unreached`.
function pageReachOf(
	transport: RenderTransport,
	reach: RenderPageReach | undefined
): RenderPageReach {
	if (!reach) return 'unknown'
	return transport.kind === 'push' && reach === 'unreached' ? 'unknown' : reach
}

// One Browser Run session against the render page: a `/screenshot` returning the PNG for a
// screenshot, a `/content` returning the page's HTML for a measure (see THUMBNAIL_MEASURE_RESULT_ID).
//
// A failed render marks an error state rather than the ready one, so it returns as a failure
// immediately instead of burning the timeout (see THUMBNAIL_SETTLED_SELECTOR /
// THUMBNAIL_CAPTURE_SELECTOR in @tldraw/dotcom-shared). A screenshot sees that as Browser Run failing
// the capture; a measure gets the error page back and throws RenderPageError with its message.
async function runRenderSession(
	env: Environment,
	renderUrl: string,
	{
		width,
		height,
		session,
		transport: plannedTransport,
		content,
		pageReached,
	}: {
		width: number
		height: number
		session: BrowserRunSessionContext
		transport: RenderTransport
		content?: RenderContentSummary
		/** Asked only for a session that died, with the session's start; see RenderPageReach. */
		pageReached?(since: number): Promise<RenderPageReach>
	}
): Promise<{ buffer: ArrayBuffer; durationMs: number }> {
	const action: BrowserRunAction = session.mode === 'measure' ? 'content' : 'screenshot'
	// Built by one function and handed to whichever transport runs, so the wait strategy, capture
	// target and timeout cannot drift between Browser Run and its development stand-in, or between a
	// pushed request and its fallback.
	const requestBody = (injectedScript?: string) =>
		(action === 'content' ? getThumbnailContentRequestBody : getThumbnailScreenshotRequestBody)({
			renderUrl,
			width,
			height,
			timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
			injectedScript,
		})
	let transport = plannedTransport

	// Local dev has no route to Browser Run, so it points this at a screenshot service instead (the
	// client's dev server, which can drive Playwright). Selected on the var being set rather than on
	// an environment name, so only an environment that configures one can take this path.
	let timed: TimedCapture
	const startedAt = Date.now()
	const callCapture = (body: ThumbnailRenderRequestBody) =>
		env.LOCAL_SCREENSHOT_SERVICE_URL
			? callLocalScreenshotService(env.LOCAL_SCREENSHOT_SERVICE_URL, action, body)
			: callBrowserRun(env, action, body)
	try {
		// The binding refuses an oversize request before any browser session exists, so falling back
		// to the fetch costs nothing. Only that refusal falls back; any other error is the render's.
		const capture =
			plannedTransport.kind === 'push'
				? callCapture(requestBody(plannedTransport.script)).catch((error) => {
						if (!isRpcOversizeError(error)) throw error
						transport = { kind: 'push_fallback', pushChars: plannedTransport.pushChars }
						return callCapture(requestBody())
					})
				: callCapture(requestBody())
		timed = await abandonAtRenderTimeout(capture, startedAt)
	} catch (error) {
		// A BrowserRenderError is a session that existed and died, so it lands on the ledger with the
		// time it held its browser. Anything else never created a session and records nothing.
		if (error instanceof BrowserRenderError) {
			const outcome = classifyScreenshotFailure(error)
			if (transport.kind === 'push' && outcome === 'browser_timeout') {
				await markPushTimedOut(env, transport.board)
			}
			writeBrowserRunSessionTelemetry(env, session, {
				outcome,
				durationMs: error.durationMs,
				width,
				height,
				page: pageReachOf(transport, await pageReached?.(startedAt)),
				browserMsUsed: 0,
				transport,
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
			transport,
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
			transport,
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
		transport,
		content,
	})
	return { buffer, durationMs: timed.durationMs }
}

type BrowserRunAction = 'screenshot' | 'content'
type ThumbnailRenderRequestBody =
	| ReturnType<typeof getThumbnailScreenshotRequestBody>
	| ReturnType<typeof getThumbnailContentRequestBody>

// The page's `data-thumbnail-error` from a `/content` response, or undefined if it has none. Read
// off <html>, which the page marks along with <body> and never clears.
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
		.replace(/&nbsp;/g, '\u00a0')
		.replace(/&amp;/g, '&')
}

// A capture that came back OK, fully read, and how long the whole thing took. The transports read
// the body themselves rather than handing back a Response: the read has to happen inside
// abandonAtRenderTimeout's deadline, or a body stream that stalls after a 200's headers would hold
// the delivery unbounded — past every bound the pipeline prices a capture at. Each transport throws
// its own kind of failure; only Browser Run's carries the status, body detail and timeout budget
// that BrowserRenderError exists to hold.
interface TimedCapture {
	buffer: ArrayBuffer
	durationMs: number
	/** Browser wall clock billed for the session, or 0 where the transport has none (local dev). */
	browserMsUsed: number
}

// Both transports read the billing header through this, so the ledger column means one thing.
function browserMsUsedOf(response: Response) {
	return Number(response.headers.get('X-Browser-Ms-Used')) || 0
}

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
	return {
		buffer: action === 'content' ? unwrapContentResult(buffer, response.status, startedAt) : buffer,
		durationMs: Date.now() - startedAt,
		browserMsUsed: browserMsUsedOf(response),
	}
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
	// `null` and scalars are valid JSON too; they must fail as a BrowserRenderError, which is what
	// puts the session on the ledger, not as a TypeError reading `.success`.
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

// Writes one rendered PNG to a thumbnail cache, stamping the content version (so a stale version
// can be detected) alongside any surface-specific metadata.
// --- Measuring a page in a real editor ----------------------------------------------------------
//
// A Worker cannot size a shape: autosizing text needs font metrics, and several shapes store no size
// at all. So when clustering needs geometry, the render page is driven in `measure` mode — it loads
// the same snapshot, waits for fonts, reads editor.getShapePageBounds for every shape, and leaves the
// result in its own HTML for the worker's `/content` read.

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
	{ surface, snapshot }: { surface: ThumbnailRenderSurface; snapshot?: RoomSnapshot }
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
	// Minted even for a push: a board too big to push falls back to fetching with it.
	const token = await mintRecordedRenderToken(env, job)

	try {
		const { buffer } = await runRenderSession(
			env,
			buildThumbnailRenderUrl(getRenderOrigin(env), token),
			{
				width: DEFAULT_THUMBNAIL_WIDTH,
				height: DEFAULT_THUMBNAIL_HEIGHT,
				// The measure runs only on the MCP surface today; `surface` names the render pipeline for the
				// signed job, not the telemetry source, so this is stated rather than derived.
				session: { source: 'mcp', mode: 'measure' },
				transport: await renderTransportFor(env, snapshot, job),
				pageReached: (since) => wasRenderTokenServedSince(env, job, token, since),
			}
		)

		return readMeasureResult(buffer)
	} finally {
		// The record is keyed by its own token, so concurrent measures of one page cannot invalidate each
		// other — which also means nothing later overwrites it, and it has to be dropped here.
		await deleteMintedRenderToken(env, job, token)
	}
}

// The page's result element out of a `/content` response. Malformed boxes are dropped rather than
// kept: a non-finite value would produce NaN distances and silently detach that shape from the
// minimum spanning tree.
function readMeasureResult(buffer: ArrayBuffer): Record<string, ShapeMeasurement> {
	const html = new TextDecoder().decode(buffer)
	const match = new RegExp(
		`<script[^>]*\\bid="${THUMBNAIL_MEASURE_RESULT_ID}"[^>]*>([\\s\\S]*?)</script>`
	).exec(html)
	if (!match) throw new Error('The render page did not report any measurements')
	const reported = JSON.parse(match[1]) as Record<string, ThumbnailShapeMeasurement>

	const bounds: Record<string, ShapeMeasurement> = {}
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
			minX: box.x,
			minY: box.y,
			maxX: box.x + box.w,
			maxY: box.y + box.h,
			...(typeof box.text === 'string' && box.text ? { text: box.text } : null),
		}
	}
	return bounds
}

// Writes one rendered PNG to a thumbnail cache, stamping the content version (so a stale version
// can be detected) alongside any surface-specific metadata.
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
		// 'board_view' is the authenticated owner-facing thumbnail route (getBoardThumbnail.ts): kept
		// apart from 'og' because the two surfaces have different cache populations and different
		// callers, and folding them together would make the OG hit-rate panel unreadable.
		source: 'mcp' | 'og' | 'queue' | 'board_view'
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

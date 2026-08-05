import {
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	MAX_THUMBNAIL_PAGES,
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
} from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { arrayBufferToBase64, base64ToArrayBuffer } from '../../utils/base64'
import {
	ThumbnailRenderJob,
	mintThumbnailRenderToken,
	recordMintedRenderToken,
} from '../../utils/renderTokens'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import { getSharedFileInfo, getSharedFileRoomSnapshot, isFileViewableFor } from './getSharedFile'
import { BoardSnapshotReadError, BrowserRenderError } from './thumbnailShared'

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
	 * The gate this board was resolved under, carried so a render cannot be minted under a weaker one
	 * than the resolution used. `captureThumbnailScreenshot` signs it into the job, and the snapshot
	 * route reads the board back under it.
	 */
	access: ThumbnailBoardAccess
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
	{ access }: { access: ThumbnailBoardAccess }
): Promise<ResolveThumbnailBoardResult> {
	if (kind === 'published') {
		// A published board's whole identity is its published slug, so there is no weaker gate to
		// apply: an unpublished board has no published snapshot to render in the first place.
		const file = await getPublishedFileInfo(env, slug)
		if (!file?.published) return { ok: false, reason: 'not_found' }
		return { ok: true, board: { kind, slug, version: file.lastPublished, access } }
	}

	const file = await getSharedFileInfo(env, slug)
	if (!isFileViewableFor(file, access)) return { ok: false, reason: 'not_found' }

	// The persisted room's R2 etag rotates when the board content changes, so it keys the
	// thumbnail cache without a separate content-version field.
	const persisted = await env.ROOMS.head(getR2KeyForRoom({ slug, isApp: true }))
	if (!persisted) return { ok: false, reason: 'board_empty' }

	return { ok: true, board: { kind, slug, version: persisted.etag, access } }
}

// Reads a resolved board's snapshot, keeping the two outcomes callers must tell apart distinct.
// `null` means one thing only: an empty board, with no persisted room content. Anything the readers
// throw — Postgres, R2, a malformed payload, or the gate they re-check as they read — is wrapped as a
// BoardSnapshotReadError, so a database outage reaches telemetry under its own reason code instead of
// as an empty board.
export async function loadBoardSnapshot(
	env: Environment,
	board: ThumbnailBoardRef,
	{ access }: { access: ThumbnailBoardAccess }
): Promise<RoomSnapshot | null> {
	try {
		const snapshot =
			board.kind === 'published'
				? await getPublishedRoomSnapshot(env, board.slug)
				: await getSharedFileRoomSnapshot(env, board.slug, { access })
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

// A board page in stable board order. `index` is the 0-based ordinal callers pass to the screenshot
// tool; `id` is the internal TLPageId used to drive the render page.
export interface EnumeratedPage {
	index: number
	id: string
	name: string
	hasContent: boolean
}

// Lists a board's pages in the same order the editor shows them. tldraw page indexes are fractional
// indexes that sort lexicographically, so a plain string sort matches the editor's ordering. A page
// "has content" when at least one shape sits directly on it (nested shapes always have a top-level
// ancestor on their page, so checking direct children is sufficient).
export function enumerateBoardPages(snapshot: RoomSnapshot): EnumeratedPage[] {
	const records = snapshot.documents.map((d) => d.state) as any[]
	const pageRecords = records.filter((r) => r?.typeName === 'page')
	pageRecords.sort((a, b) => (a.index < b.index ? -1 : a.index > b.index ? 1 : 0))
	const parentIdsWithShapes = new Set(
		records.filter((r) => r?.typeName === 'shape').map((s) => s.parentId)
	)
	return pageRecords.slice(0, MAX_THUMBNAIL_PAGES).map((p, index) => ({
		index,
		id: String(p.id),
		name: typeof p.name === 'string' && p.name.length > 0 ? p.name : `Page ${index + 1}`,
		hasContent: parentIdsWithShapes.has(p.id),
	}))
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
		pageId,
		theme,
		width,
		height,
	}: {
		/**
		 * The single page to render. When omitted, the render page exports whichever page the
		 * snapshot opens to (used by OG images).
		 */
		pageId?: string
		theme: 'light' | 'dark'
		width: number
		height: number
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
		camera: 'content',
		...(pageId ? { pageId } : null),
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
	const token = await mintThumbnailRenderToken(env, job)
	// Record it as ours before the browser can present it, so the snapshot route can tell a token we
	// minted from one merely signed with our secret. Awaited, not fired off: the render is about to
	// depend on this having landed. A no-op for `public` jobs — see recordMintedRenderToken.
	await recordMintedRenderToken(env, job, token)
	return renderThumbnailScreenshot(env, buildThumbnailRenderUrl(getRenderOrigin(env), token), {
		width,
		height,
	})
}

// The pixels come from editor.toImage on the render page, which displays its own export as a
// full-viewport image for the Quick Action to capture. A failed render marks an error state rather
// than the ready one, so it returns as a failure immediately instead of burning the timeout (see
// THUMBNAIL_SETTLED_SELECTOR / THUMBNAIL_CAPTURE_SELECTOR in @tldraw/dotcom-shared).
async function renderThumbnailScreenshot(
	env: Environment,
	renderUrl: string,
	{ width, height }: { width: number; height: number }
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
	const { response, durationMs } = env.LOCAL_SCREENSHOT_SERVICE_URL
		? await callLocalScreenshotService(env.LOCAL_SCREENSHOT_SERVICE_URL, requestBody)
		: await callBrowserRun(env, requestBody)

	const buffer = await response.arrayBuffer()
	if (buffer.byteLength === 0) {
		throw new Error('Render produced an empty screenshot')
	}
	return { base64: arrayBufferToBase64(buffer), durationMs }
}

type ThumbnailScreenshotRequestBody = ReturnType<typeof getThumbnailScreenshotRequestBody>

// A capture that came back OK, and how long it took. Each transport times its own call and throws
// its own kind of failure — only Browser Run's carries the status, body detail and timeout budget
// that BrowserRenderError exists to hold — so what reaches the shared decode above is always a
// response worth reading.
interface TimedCapture {
	response: Response
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
	return { response, durationMs }
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
	const durationMs = Date.now() - startedAt

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
	return { response, durationMs }
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

// One datapoint writer for every screenshot surface, so they share a dataset and blob layout and one
// dashboard covers them all; the source blob distinguishes mcp (the tool), og (the GET route) and
// queue (the render consumer). The dataset name covers all three despite its mcp_ prefix, and must
// keep doing so: renaming it would split the dashboard's history.
//
// Carries **no board identity**: no index, no slug, no hash, no derived id. Not an omission — these
// datapoints answer aggregate spend and failure-rate questions, and the cost of that choice is a
// dataset that cannot say which board is failing. See "No board identifier leaves this pipeline" in
// browser-run-thumbnails.md.
export function writeScreenshotTelemetry(
	env: Environment,
	data: {
		source: 'mcp' | 'og' | 'queue'
		/**
		 * Which trigger asked for this render — what attributes spend to publishing or editing. Only
		 * meaningful on queue datapoints; the request paths have no trigger and record `none`.
		 */
		reason?: OgImageRenderReason
		cacheStatus: 'hit' | 'stale' | 'miss'
		/** Hashed client IP, for surfaces that have one. Recorded only on failures — see below. */
		ipHash?: string
		browserRunDurationMs?: number
		failureReason?: string
		rateLimitAllowed?: boolean
	}
) {
	const rateLimitAllowed = data.rateLimitAllowed ?? true
	// Only on failed or rate-limited events, where it's useful for abuse analysis. On the common
	// success path a per-IP blob is one distinct dimension value per client, per request — a large
	// cardinality cost for no query benefit.
	const isFailure = data.failureReason !== undefined || !rateLimitAllowed
	writeDataPoint(undefined, env.MEASURE, env, 'mcp_shared_board_screenshot', {
		blobs: [
			`source:${data.source}`,
			`cache:${data.cacheStatus}`,
			`failure:${data.failureReason ?? 'none'}`,
			`rate_limit:${rateLimitAllowed ? 'allowed' : 'blocked'}`,
			`ip:${isFailure && data.ipHash ? data.ipHash : 'none'}`,
			// Appended rather than slotted in beside `source`, so the existing blob positions (and the
			// dashboard panels reading them) don't shift.
			`reason:${data.reason ?? 'none'}`,
		],
		doubles: [
			DEFAULT_THUMBNAIL_WIDTH,
			DEFAULT_THUMBNAIL_HEIGHT,
			data.browserRunDurationMs ?? -1,
			// Billed browser ms, which the BROWSER binding does not surface, so it is always the sentinel.
			// The slot stays occupied to hold the doubles positions after it — and the dashboard panels
			// reading them — in place; double3 above is the spend proxy.
			-1,
			rateLimitAllowed ? 1 : 0,
		],
	})
}

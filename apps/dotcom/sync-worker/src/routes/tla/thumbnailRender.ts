import {
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	MAX_THUMBNAIL_PAGES,
	THUMBNAIL_RENDER_PATH,
	THUMBNAIL_RENDER_TIMEOUT_MS,
	getThumbnailScreenshotRequestBody,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { getR2KeyForRoom } from '../../r2'
import { Environment, OgImageRenderReason, ThumbnailBoardKind } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { arrayBufferToBase64, base64ToArrayBuffer } from '../../utils/base64'
import { getRoomDurableObjectId } from '../../utils/durableObjects'
import {
	THUMBNAIL_RENDER_TOKEN_TTL_MS,
	ThumbnailRenderJob,
	mintThumbnailRenderToken,
} from '../../utils/renderTokens'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import {
	getSharedFileInfo,
	getSharedFileRoomSnapshot,
	isFileAnonymouslyViewable,
} from './getSharedFile'
import { BoardSnapshotReadError, BrowserRenderError } from './thumbnailShared'

// The render-and-cache core shared by every Browser Run screenshot surface: the MCP screenshot
// tool (sharedBoardScreenshotMcp.ts), the OG image route (getOgImage.ts), and the OG render queue
// consumer (ogImageQueue.ts). Owns board resolution, snapshot loading, page enumeration, the
// Browser Rendering invocation, and the shared telemetry writer. The surfaces own their own protocol
// handling, cache keys, and retry/backoff policies.
//
// Deliberately owns no rate limiting. The only surface that limits anything is the MCP server, and
// only on the calls there that actually spend Browser Run — it is the one Browser Run-spending
// endpoint an outside caller can drive directly, so a rogue or looping agent is the threat being
// bounded. Everything else here renders our own derived artifact in response to our own writes, where
// a limiter would only ever mean serving a stale thumbnail to save a render we intend to do anyway.
// The limiters therefore live in sharedBoardScreenshotMcp.ts rather than in this shared core, so a
// new surface built on these helpers cannot pick one up by accident.

// A publicly viewable board a screenshot surface has resolved. The version rotates when the
// rendered content changes (lastPublished for published boards, the persisted room snapshot's R2
// etag for shared files), so it can key the thumbnail caches.
export interface ResolvedThumbnailBoard {
	kind: ThumbnailBoardKind
	slug: string
	/**
	 * The underlying file's id, which is the room id its durable object is addressed by. For a shared
	 * file this is the same string as `slug`; for a published board it is emphatically not — the slug
	 * there is the published slug, and the file id is what it resolves to. Carried separately so
	 * telemetry can key on the room without every caller having to know which kind it is holding.
	 */
	fileId: string
	version: string | number
}

export type ResolveThumbnailBoardResult =
	| { ok: true; board: ResolvedThumbnailBoard }
	| { ok: false; reason: 'not_found' | 'board_empty' }

// Resolves a board slug of a known kind, applying the public-view gates every screenshot surface
// shares: published boards must be published, shared files must currently be shared via link and
// have persisted content. `board_empty` means the board passed its gate but has no persisted room
// content; `not_found` covers unknown, private, deleted, and unpublished boards alike.
export async function resolveThumbnailBoard(
	env: Environment,
	kind: ThumbnailBoardKind,
	slug: string
): Promise<ResolveThumbnailBoardResult> {
	if (kind === 'published') {
		const file = await getPublishedFileInfo(env, slug)
		if (!file?.published) return { ok: false, reason: 'not_found' }
		// `slug` here is the published slug; `file.id` is the file behind it, which is the room.
		return { ok: true, board: { kind, slug, fileId: file.id, version: file.lastPublished } }
	}

	const file = await getSharedFileInfo(env, slug)
	if (!isFileAnonymouslyViewable(file)) return { ok: false, reason: 'not_found' }

	// The persisted room's R2 etag rotates when the board content changes, so it keys the
	// thumbnail cache without a separate content-version field.
	const persisted = await env.ROOMS.head(getR2KeyForRoom({ slug, isApp: true }))
	if (!persisted) return { ok: false, reason: 'board_empty' }

	return { ok: true, board: { kind, slug, fileId: file.id, version: persisted.etag } }
}

// Reads a resolved board's snapshot, distinguishing the two outcomes callers need to tell apart.
// `null` means one thing only: the board has no persisted room content, an empty board. Anything
// the readers throw — Postgres, R2, a malformed payload, or the publish/share gate they re-check as
// they read — is wrapped as a BoardSnapshotReadError so telemetry can name it. Collapsing both into
// null, as this used to, filed database outages under "empty board" and left the real cause with no
// trace anywhere.
export async function loadBoardSnapshot(
	env: Environment,
	board: { kind: ThumbnailBoardKind; slug: string }
): Promise<RoomSnapshot | null> {
	try {
		const snapshot =
			board.kind === 'published'
				? await getPublishedRoomSnapshot(env, board.slug)
				: await getSharedFileRoomSnapshot(env, board.slug)
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
	return renderThumbnailScreenshot(env, buildThumbnailRenderUrl(getRenderOrigin(env), token), {
		width,
		height,
	})
}

// The thumbnail pixels come from editor.toImage on the render page: the page exports the target page
// itself and displays it as a full-viewport image, and the Browser Rendering `/screenshot` Quick
// Action (called straight through the BROWSER binding, no puppeteer, no API token) captures exactly
// that. Chrome runs in Cloudflare's fleet, not in this isolate. A render that fails marks an error
// state instead of the ready one, so the Quick Action returns quickly and surfaces as a render
// failure (see THUMBNAIL_SETTLED_SELECTOR / THUMBNAIL_CAPTURE_SELECTOR in @tldraw/dotcom-shared)
// rather than burning the timeout.
async function renderThumbnailScreenshot(
	env: Environment,
	renderUrl: string,
	{ width, height }: { width: number; height: number }
): Promise<{ base64: string; durationMs: number }> {
	// Local dev has no route to Browser Run, so it points this at a screenshot service instead (the
	// client's dev server, which can drive Playwright). Selected on the var being set rather than on
	// an environment name, so only an environment that configures one can take this path.
	if (env.LOCAL_SCREENSHOT_SERVICE_URL) {
		return renderViaLocalScreenshotService(env.LOCAL_SCREENSHOT_SERVICE_URL, renderUrl, {
			width,
			height,
		})
	}

	if (!env.BROWSER) {
		throw new Error(
			'Browser Rendering is not configured. Set the BROWSER binding (local dev needs Cloudflare credentials).'
		)
	}

	const startedAt = Date.now()
	// Browser Rendering `/screenshot` Quick Action, invoked straight through the binding (no
	// puppeteer, no API token). Requires compatibility_date >= 2026-03-24 for `quickAction`.
	const response = await env.BROWSER.quickAction(
		'screenshot',
		getThumbnailScreenshotRequestBody({
			renderUrl,
			width,
			height,
			timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
		})
	)
	const durationMs = Date.now() - startedAt

	if (!response.ok) {
		throw new BrowserRenderError({
			status: response.status,
			detail: await readBrowserErrorDetail(response),
			durationMs,
			timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
		})
	}
	const buffer = await response.arrayBuffer()
	if (buffer.byteLength === 0) {
		throw new Error('Render produced an empty screenshot')
	}
	return { base64: arrayBufferToBase64(buffer), durationMs }
}

// How much of Cloudflare's error body to keep. It is a short JSON object in practice; the cap is
// there so a proxy's HTML error page can't put a document into a Sentry event.
const MAX_BROWSER_ERROR_DETAIL_LENGTH = 500

// Reads why Browser Run refused. The status on its own is close to useless — 422 is what Cloudflare
// answers for a page that crashed, a render that exhausted the container's memory, and every one of
// its Quick Action timers expiring, and our own render page marking `data-thumbnail-error` arrives
// as one too (the capture selector exists only on the success path). The body names which, and this
// used to be dropped on the floor, leaving every one of those failures indistinguishable in Sentry.
//
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

// Cloudflare's error body is `{"success":false,"errors":[{"code":…,"message":"…"}]}`. Pull the
// messages out when it parses, since that is the whole readable part; anything else (a proxy's HTML,
// a plain string, a shape we don't recognise) falls back to the raw text, which is still better than
// nothing.
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

// Development stand-in for the Browser Rendering call above. It is sent the very same request body,
// so the wait strategy, capture target, and timeout cannot drift between the two, and it returns the
// same PNG bytes — everything either side of this call is the production path. The browser is a
// local Playwright one though, not Browser Run, so a render that works here is not evidence that it
// works in production.
async function renderViaLocalScreenshotService(
	serviceUrl: string,
	renderUrl: string,
	{ width, height }: { width: number; height: number }
): Promise<{ base64: string; durationMs: number }> {
	const startedAt = Date.now()
	const response = await fetch(serviceUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(
			getThumbnailScreenshotRequestBody({
				renderUrl,
				width,
				height,
				timeoutMs: THUMBNAIL_RENDER_TIMEOUT_MS,
			})
		),
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
	const buffer = await response.arrayBuffer()
	if (buffer.byteLength === 0) {
		throw new Error('Render produced an empty screenshot')
	}
	return { base64: arrayBufferToBase64(buffer), durationMs }
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

// One datapoint writer for every screenshot surface, so they share a dataset and blob/doubles
// layout and one dashboard covers them all; the source blob distinguishes mcp (the tool), og (the
// GET route), and queue (the OG render consumer). The dataset name's mcp_ prefix predates the OG
// surfaces; renaming it would split the dashboard's history, so it stays.
export function writeScreenshotTelemetry(
	env: Environment,
	data: {
		source: 'mcp' | 'og' | 'queue'
		/**
		 * Which trigger asked for this render. Only meaningful on queue datapoints — the request paths
		 * have no trigger of their own and record `none` — but it is what attributes render spend to
		 * crawler demand, publishing, or editing.
		 */
		reason?: OgImageRenderReason
		/**
		 * The board's file id, when the surface has one. Becomes the datapoint's index — see
		 * `boardIndexOf`. Pass the file id, never a published slug.
		 */
		fileId?: string
		cacheStatus: 'hit' | 'stale' | 'miss'
		/** Hashed client IP, for surfaces that have one. Recorded only on failures — see below. */
		ipHash?: string
		browserRunDurationMs?: number
		browserMsUsed?: number | null
		failureReason?: string
		rateLimitAllowed?: boolean
	}
) {
	const rateLimitAllowed = data.rateLimitAllowed ?? true
	// Record the hashed IP only on failed or rate-limited events, where it's useful for abuse
	// analysis. Successful calls are the common case, and a per-IP blob there is one distinct
	// dimension value per client on every request — a large cardinality cost for no query benefit.
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
		indexes: boardIndexOf(env, data.fileId),
		doubles: [
			DEFAULT_THUMBNAIL_WIDTH,
			DEFAULT_THUMBNAIL_HEIGHT,
			data.browserRunDurationMs ?? -1,
			data.browserMsUsed ?? -1,
			rateLimitAllowed ? 1 : 0,
		],
	})
}

/**
 * The datapoint's index: the board's durable object id, the same value `TLFileDurableObject.writeEvent`
 * stamps on every event it writes. That is what makes a render joinable to the persists that caused
 * it — renders-per-persist is otherwise two unrelated aggregate counts.
 *
 * Deliberately the durable object id rather than the board slug or a hash of it. `idFromName` is
 * one-way, and for an app file the slug *is* the authority of `tldraw.com/f/<id>`, which has no
 * business in a dataset that is account-readable and exported to Grafana. (These events previously
 * carried a sha256 of the slug, which nothing queried.)
 *
 * Always computed from the **file** id: a published board's slug addresses no durable object, so
 * indexing on it would mint a plausible-looking id that joins to nothing.
 *
 * Absent when the surface has no resolved board — a malformed MCP argument, or a board that failed
 * its share gate. An index is optional, and no index is better than a wrong one.
 */
function boardIndexOf(env: Environment, fileId: string | undefined): [string] | undefined {
	if (!fileId) return undefined
	try {
		return [getRoomDurableObjectId(env, fileId).toString()]
	} catch {
		// Telemetry must never break a render path. The binding is present in every deployed
		// environment; this covers unconfigured ones.
		return undefined
	}
}

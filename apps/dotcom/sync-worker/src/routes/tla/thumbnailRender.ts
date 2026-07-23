import {
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	MAX_THUMBNAIL_PAGES,
	THUMBNAIL_RENDER_PATH,
	THUMBNAIL_RENDER_TIMEOUT_MS,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { getR2KeyForRoom } from '../../r2'
import { Environment, ThumbnailBoardKind } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { arrayBufferToBase64, base64ToArrayBuffer } from '../../utils/base64'
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
import { BoardSnapshotReadError } from './thumbnailShared'

// The render-and-cache core shared by every Browser Run screenshot surface: the MCP screenshot
// tool (sharedBoardScreenshotMcp.ts), the OG image route (getOgImage.ts), and the OG render queue
// consumer (ogImageQueue.ts). Owns board resolution, snapshot loading, page enumeration, the
// Browser Rendering invocation, rate limiting, and the shared telemetry writer. The surfaces own
// their own protocol handling, cache keys, and retry/backoff policies.

// Bounds both navigation and the render-page settle+export wait inside the Browser Rendering
// screenshot Quick Action. Shared with the render page (which sizes its own settle budget under this)
// via @tldraw/dotcom-shared so the two deadlines can't drift.
const RENDER_TIMEOUT_MS = THUMBNAIL_RENDER_TIMEOUT_MS
// The render page marks a terminal state on <body>/<html>: success sets data-thumbnail-ready once the
// exported image has painted; any failure (bad token, snapshot load, export, or image decode) sets
// data-thumbnail-error. The screenshot Quick Action waits for EITHER, so a failed render returns as
// soon as it errors instead of burning the whole RENDER_TIMEOUT_MS holding scarce Browser Run
// capacity.
const RENDER_SETTLED_SELECTOR = '[data-thumbnail-ready="true"], [data-thumbnail-error]'
// The element the Quick Action actually captures. It exists only on the success path, so when the
// wait above resolves on a failure there is nothing to screenshot and the Quick Action returns an
// error immediately (surfaced as a render failure) rather than capturing the error page. Scoped to
// <body> so it resolves to a single element (both <html> and <body> carry the ready marker).
const RENDER_CAPTURE_SELECTOR = 'body[data-thumbnail-ready="true"]'

// The single limiter key every Browser Run-spending surface (the MCP tool and the OG queue
// consumer) passes, so they draw from one shared global cap instead of separate per-key buckets.
export const GLOBAL_BROWSER_RATE_LIMIT_KEY = 'global'
export const GLOBAL_BROWSER_RUN_RATE_LIMIT = 6
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_FALLBACK = new Map<string, { count: number; resetAt: number }>()

// A publicly viewable board a screenshot surface has resolved. The version rotates when the
// rendered content changes (lastPublished for published boards, the persisted room snapshot's R2
// etag for shared files), so it can key the thumbnail caches.
export interface ResolvedThumbnailBoard {
	kind: ThumbnailBoardKind
	slug: string
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
		return { ok: true, board: { kind, slug, version: file.lastPublished } }
	}

	const file = await getSharedFileInfo(env, slug)
	if (!isFileAnonymouslyViewable(file)) return { ok: false, reason: 'not_found' }

	// The persisted room's R2 etag rotates when the board content changes, so it keys the
	// thumbnail cache without a separate content-version field.
	const persisted = await env.ROOMS.head(getR2KeyForRoom({ slug, isApp: true }))
	if (!persisted) return { ok: false, reason: 'board_empty' }

	return { ok: true, board: { kind, slug, version: persisted.etag } }
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

export function getRenderOrigin(env: Environment) {
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
		x: 0,
		y: 0,
		z: 1,
		width,
		height,
		theme,
		exp: Date.now() + THUMBNAIL_RENDER_TOKEN_TTL_MS,
	}
	const token = await mintThumbnailRenderToken(env, job)
	return renderThumbnailScreenshot(buildThumbnailRenderUrl(getRenderOrigin(env), token), env)
}

// The thumbnail pixels come from editor.toImage on the render page: the page exports the target page
// itself and displays it as a full-viewport image, and the Browser Rendering `/screenshot` Quick
// Action (called straight through the BROWSER binding, no puppeteer, no API token) captures exactly
// that. Chrome runs in Cloudflare's fleet, not in this isolate. A render that fails marks an error
// state instead of the ready one, so the Quick Action returns quickly and surfaces as a render
// failure (see RENDER_SETTLED_SELECTOR / RENDER_CAPTURE_SELECTOR) rather than burning the timeout.
export async function renderThumbnailScreenshot(
	renderUrl: string,
	env: Environment
): Promise<{ base64: string; durationMs: number }> {
	if (!env.BROWSER) {
		throw new Error(
			'Browser Rendering is not configured. Set the BROWSER binding (local dev needs Cloudflare credentials).'
		)
	}

	const startedAt = Date.now()
	// Browser Rendering `/screenshot` Quick Action, invoked straight through the binding (no
	// puppeteer, no API token). Requires compatibility_date >= 2026-03-24 for `quickAction`.
	const response = await env.BROWSER.quickAction('screenshot', getScreenshotRequestBody(renderUrl))
	const durationMs = Date.now() - startedAt

	if (!response.ok) {
		throw new Error(`Browser Rendering screenshot failed (${response.status})`)
	}
	const buffer = await response.arrayBuffer()
	if (buffer.byteLength === 0) {
		throw new Error('Render produced an empty screenshot')
	}
	return { base64: arrayBufferToBase64(buffer), durationMs }
}

function getScreenshotRequestBody(renderUrl: string) {
	const headers = getExtraHeaders(renderUrl)
	return {
		url: renderUrl,
		...(headers ? { setExtraHTTPHeaders: headers } : null),
		viewport: {
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
			deviceScaleFactor: 1,
		},
		// Waiting for a terminal selector is the real completion signal; waiting on network activity is
		// fragile because background app requests (e.g. replicator-status polling) can keep the network
		// busy indefinitely. `load` is a milder form of that same trap, so it stops here at
		// domcontentloaded: `load` does not fire until every subresource settles, and one stalled image
		// request is enough to hold it open until this timeout — at which point the quick action fails
		// without ever reaching the waitForSelector below, even though the page had marked itself ready
		// long before. A board whose bookmark preview image points back at that board's own OG image
		// route does exactly this. Nothing is lost by not waiting for `load`: the render page's settle
		// wait (THUMBNAIL_SETTLE_TIMEOUT_MS) and the SDK's asset-inlining delay (maxExportDelayMs) are
		// separately bounded, so the page reaches a terminal state on its own schedule regardless.
		gotoOptions: {
			waitUntil: 'domcontentloaded',
			timeout: RENDER_TIMEOUT_MS,
		},
		// Resolve as soon as the render page reaches either terminal state (ready or error), so a
		// failed render doesn't hold Browser Run capacity for the full timeout.
		waitForSelector: {
			selector: RENDER_SETTLED_SELECTOR,
			timeout: RENDER_TIMEOUT_MS,
		},
		// Capture the success-only element (it fills the viewport, so this matches the old full-viewport
		// screenshot). On a failure it's absent, so the Quick Action errors out immediately instead of
		// screenshotting the error page. `selector` targets an element without waiting (waitForSelector
		// above is the wait), so a missing element fails fast rather than re-waiting the timeout.
		selector: RENDER_CAPTURE_SELECTOR,
		screenshotOptions: {
			type: 'png',
		},
	}
}

function getExtraHeaders(renderUrl: string) {
	const { hostname } = new URL(renderUrl)
	if (hostname.endsWith('.ngrok-free.dev')) {
		return {
			'ngrok-skip-browser-warning': 'true',
		}
	}
	return null
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

export async function isRateLimited(
	limiter: RateLimit | undefined,
	key: string,
	{ fallbackLimit }: { fallbackLimit: number }
): Promise<boolean> {
	const rateLimitKey = `mcp-shared-board-screenshot:${key}`
	if (limiter) {
		const { success } = await limiter.limit({ key: rateLimitKey })
		return !success
	}

	// Isolate-local fallback for local dev and tests; deployments configure the Cloudflare rate
	// limit bindings in wrangler.toml.
	const now = Date.now()
	const existing = RATE_LIMIT_FALLBACK.get(rateLimitKey)
	if (!existing || existing.resetAt <= now) {
		RATE_LIMIT_FALLBACK.set(rateLimitKey, {
			count: 1,
			resetAt: now + RATE_LIMIT_WINDOW_MS,
		})
		return false
	}
	existing.count++
	return existing.count > fallbackLimit
}

// The isolate-local fallback map is module state that persists across a test file's cases. Tests
// that exercise rendering must reset it between cases, or accumulated counts (especially on the
// shared `global` key) would trip the low limits and rate-limit later cases' happy paths.
export function resetRateLimitFallbackForTests() {
	RATE_LIMIT_FALLBACK.clear()
}

// One datapoint writer for every screenshot surface, so they share a dataset and blob/doubles
// layout and one dashboard covers them all; the source blob distinguishes mcp (the tool), og (the
// GET route), and queue (the OG render consumer).
export function writeScreenshotTelemetry(
	env: Environment,
	data: {
		source: 'mcp' | 'og' | 'queue'
		boardHash: string
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
		],
		indexes: [data.boardHash],
		doubles: [
			DEFAULT_THUMBNAIL_WIDTH,
			DEFAULT_THUMBNAIL_HEIGHT,
			data.browserRunDurationMs ?? -1,
			data.browserMsUsed ?? -1,
			rateLimitAllowed ? 1 : 0,
		],
	})
}

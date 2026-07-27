import { DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_WIDTH } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { getR2KeyForRoom } from '../../r2'
import { Environment, OgImageRenderQueueMessage, OgImageRenderReason } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import {
	THUMBNAIL_RENDER_TOKEN_TTL_MS,
	ThumbnailRenderJob,
	mintThumbnailRenderToken,
} from '../../utils/renderTokens'
import { getPublishedFileInfo } from './getPublishedFile'
import { getSharedFileInfo, isFileAnonymouslyViewable } from './getSharedFile'
import {
	base64ToArrayBuffer,
	buildThumbnailRenderUrl,
	enumerateBoardPages,
	getRenderOrigin,
	loadBoardSnapshot,
	renderThumbnailScreenshot,
} from './sharedBoardScreenshotMcp'
import { classifyScreenshotFailure, reportThumbnailError, sha256 } from './thumbnailShared'

// Queue-backed async board thumbnail generation. The GET og-image route never blocks a request on
// Browser Run: it serves whatever is cached (fresh or stale) or the default OG image, and enqueues a
// render job here. This consumer performs the capture out of band and refreshes the R2 cache the
// route reads. The synchronous MCP tool does not use this path: it must return the image in-band, so
// it captures inline and caches under its own `mcp/` keys in a different bucket.
//
// Thumbnail rendering is deliberately uncapped. It is our own derived artifact, triggered by things
// that already happened (a publish, an edit persisting, a crawler arriving) rather than by anything a
// caller can drive, so a rate limiter here would only ever mean "serve a stale thumbnail to save a
// render we intend to do anyway". The abuse surface is the public MCP endpoint, and that keeps its
// per-IP, per-board and global caps — see sharedBoardScreenshotMcp.ts.

export const OG_IMAGE_WIDTH = DEFAULT_THUMBNAIL_WIDTH
export const OG_IMAGE_HEIGHT = DEFAULT_THUMBNAIL_HEIGHT

// A pending marker suppresses duplicate enqueues while a render is queued or in flight. It is
// advisory only: it expires on its own so a crashed consumer cannot wedge a board permanently.
//
// With no rate limiter left, this is the only thing bounding how often a board renders: a board being
// drawn on persists every PERSIST_INTERVAL_MS (8s), and each persist asks for a thumbnail, so without
// the marker one board would enqueue hundreds of messages an hour that all render near-identical
// content. It is dedupe rather than a budget, but it does set the effective cadence — roughly one
// render per board per marker TTL while editing is continuous. This is the knob to turn if that
// cadence needs to change.
const PENDING_MARKER_TTL_MS = 2 * 60_000
// Retries are bounded by max_retries in wrangler.toml too; this lower cap keeps thumbnail jobs from
// burning Browser Run capacity on a persistently failing board.
const MAX_RENDER_ATTEMPTS = 3
const RETRY_DELAY_SECONDS = 30

export type OgBoardKind = 'published' | 'shared_file'

export interface ResolvedOgBoard {
	kind: OgBoardKind
	slug: string
	version: string | number
}

// Mirrors the resolution + anonymous-view gates of the MCP tool: published boards must be
// published, shared files must currently be shared via link, and the content version keys the
// cache (lastPublished for published boards, the persisted room snapshot's R2 etag for shared
// files).
export async function resolveOgBoardInfo(
	env: Environment,
	kind: OgBoardKind,
	slug: string
): Promise<ResolvedOgBoard | null> {
	if (kind === 'published') {
		const file = await getPublishedFileInfo(env, slug)
		if (!file?.published) return null
		return {
			kind,
			slug,
			version: file.lastPublished,
		}
	}

	const file = await getSharedFileInfo(env, slug)
	if (!isFileAnonymouslyViewable(file)) return null

	const persisted = await env.ROOMS.head(getR2KeyForRoom({ slug, isApp: true }))
	if (!persisted) return null

	return {
		kind,
		slug,
		version: persisted.etag,
	}
}

// OG images render a single page as the unfurl preview. Pick the first page (in board order) that
// has content, so a board whose first page is empty still gets a meaningful image; fall back to the
// first page when none have content (the render degrades to a blank, as it did before).
function pickOgImagePageId(snapshot: RoomSnapshot): string | undefined {
	const pages = enumerateBoardPages(snapshot)
	if (pages.length === 0) return undefined
	return (pages.find((page) => page.hasContent) ?? pages[0]).id
}

export function getOgImageCacheKey(board: Pick<ResolvedOgBoard, 'kind' | 'slug'>) {
	return `og/${board.kind}/${board.slug}/${OG_IMAGE_WIDTH}x${OG_IMAGE_HEIGHT}/light.png`
}

export type EnqueueOgImageResult = 'enqueued' | 'already_pending' | 'unavailable'

function getOgImagePendingKey(board: { kind: 'published' | 'shared_file'; slug: string }) {
	return `og/${board.kind}/${board.slug}/${OG_IMAGE_WIDTH}x${OG_IMAGE_HEIGHT}/light.pending`
}

export async function enqueueOgImageRender(
	env: Environment,
	board: { kind: 'published' | 'shared_file'; slug: string },
	opts: { reason?: OgImageRenderReason } = {}
): Promise<EnqueueOgImageResult> {
	if (!env.THUMBNAILS || !env.QUEUE) return 'unavailable'
	const { reason = 'crawler' } = opts

	const pendingKey = getOgImagePendingKey(board)
	const existing = await env.THUMBNAILS.head(pendingKey)
	if (existing) {
		const expiresAt = Number(existing.customMetadata?.expiresAt)
		if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
			return 'already_pending'
		}
	}

	await env.THUMBNAILS.put(pendingKey, new Uint8Array(), {
		customMetadata: {
			expiresAt: String(Date.now() + PENDING_MARKER_TTL_MS),
		},
	})

	const message: OgImageRenderQueueMessage = {
		type: 'og-image-render',
		kind: board.kind,
		slug: board.slug,
		reason,
	}
	await env.QUEUE.send(message)
	return 'enqueued'
}

/**
 * Asks for a board's thumbnail to be refreshed because its content just changed. Called from the file
 * durable object on a persist that advanced the document clock.
 *
 * There is no sampling, staleness window or budget check here on purpose: a persist means the board's
 * saved content is genuinely different from what the cached thumbnail shows, which is exactly when a
 * re-render is warranted. The duplicate-suppression that remains is `enqueueOgImageRender`'s pending
 * marker (so an 8-second persist cadence doesn't become an 8-second render cadence) and the
 * consumer's `(board, version)` check, which acks without rendering if the cache already matches.
 */
export async function enqueueOgImageRenderForEdit(
	env: Environment,
	board: { kind: OgBoardKind; slug: string },
	{ isShared }: { isShared: boolean | undefined }
): Promise<EnqueueOgImageResult | 'skipped_not_shared'> {
	// `undefined` means the caller doesn't know: go ahead and let the consumer's resolve drop the
	// board, rather than skipping one that may well be public.
	if (isShared === false) return 'skipped_not_shared'
	return enqueueOgImageRender(env, board, { reason: 'edit' })
}

export function getOgImageAge(cached: R2Object, now: number) {
	const createdAt = Number(cached.customMetadata?.createdAt ?? cached.uploaded?.getTime() ?? 0)
	return Number.isFinite(createdAt) ? now - createdAt : Infinity
}

// Drops a board's cached OG image and any pending render marker. Called when a board stops being
// publicly viewable (unpublished or unshared): the image is a copy of content that is no longer
// public, and the marker would otherwise suppress the next legitimate enqueue after it is reshared.
export async function deleteOgImageCache(
	env: Environment,
	board: { kind: OgBoardKind; slug: string }
): Promise<void> {
	if (!env.THUMBNAILS) return
	await Promise.all([
		env.THUMBNAILS.delete(getOgImageCacheKey(board)).catch(() => {}),
		env.THUMBNAILS.delete(getOgImagePendingKey(board)).catch(() => {}),
	])
}

// Queue consumer. Re-resolves the board at render time rather than trusting the enqueued state:
// the share gate is re-checked (a board un-shared while queued is dropped without rendering, and
// its cached OG image is deleted) and the version is re-read so the render always captures the
// newest content, coalescing bursts of enqueues for a fast-changing board into one capture.
export async function handleOgImageRenderMessage(
	env: Environment,
	message: Message<OgImageRenderQueueMessage>,
	ctx?: ExecutionContext
): Promise<void> {
	const { kind, slug } = message.body
	// Messages enqueued before the field existed are all crawler misses.
	const reason = message.body.reason ?? 'crawler'
	const boardHash = await sha256(slug)
	const cacheKey = getOgImageCacheKey({ kind, slug })
	const clearPending = async () => {
		await env.THUMBNAILS?.delete(getOgImagePendingKey({ kind, slug })).catch(() => {})
	}
	// The board went private, was deleted, or was unpublished. Terminal, not transient: drop the
	// cached image so no-longer-public content does not linger in the OG cache, and ack rather than
	// retry, since no number of retries will make the board public again. Reached from the resolve
	// below — a board that goes private after that point fails its snapshot read instead, and the
	// retry lands back here on the next delivery.
	const dropNoLongerViewable = async () => {
		await deleteOgImageCache(env, { kind, slug })
		writeOgImageTelemetry(env, {
			source: 'queue',
			reason,
			boardHash,
			cacheStatus: 'miss',
			failureReason: 'board_not_viewable',
		})
		message.ack()
	}

	try {
		const board = await resolveOgBoardInfo(env, kind, slug)
		if (!board) {
			await dropNoLongerViewable()
			return
		}

		// Another consumer (or an earlier retry) may already have rendered this version.
		const cached = await env.THUMBNAILS?.head(cacheKey)
		if (cached?.customMetadata?.version === String(board.version)) {
			await clearPending()
			writeOgImageTelemetry(env, { source: 'queue', reason, boardHash, cacheStatus: 'hit' })
			message.ack()
			return
		}

		if (!env.THUMBNAILS) {
			throw new Error('THUMBNAILS bucket is not configured')
		}

		// No capacity check: thumbnail rendering is uncapped by design (see the note at the top of this
		// file). The version check above is what stops redundant work — a burst of enqueues for one
		// board coalesces into a single render of the newest content, and everything past this point is
		// a board whose cached thumbnail genuinely no longer matches its saved content.

		// Target the first page that has content so a board whose first page is empty still gets a
		// meaningful unfurl image (the render page otherwise exports whichever page the snapshot opens
		// to, typically the first).
		const snapshot = await loadBoardSnapshot(env, board)
		if (!snapshot) {
			// The board has no persisted content. The render page loads the snapshot from the same
			// sources through the same functions (getThumbnailSnapshot ->
			// get{Published,SharedFile}RoomSnapshot), so it would 404, mark its error state, and come
			// back as a render failure — after spending a Browser Run slot to discover what we already
			// know. Fail now instead. retryOrDrop still backs off and retries, in case content lands
			// shortly after the enqueue. A read that *fails* throws rather than landing here; the catch
			// below reports it and retries the same way, so that path spends no Browser Run either.
			retryOrDrop(env, message, boardHash, 'board_empty')
			return
		}
		const pageId = pickOgImagePageId(snapshot)

		const job: ThumbnailRenderJob = {
			v: 1,
			kind,
			slug,
			version: board.version,
			camera: 'content',
			...(pageId ? { pageId } : null),
			x: 0,
			y: 0,
			z: 1,
			width: OG_IMAGE_WIDTH,
			height: OG_IMAGE_HEIGHT,
			theme: 'light',
			exp: Date.now() + THUMBNAIL_RENDER_TOKEN_TTL_MS,
		}
		const token = await mintThumbnailRenderToken(env, job)
		const renderUrl = buildThumbnailRenderUrl(getRenderOrigin(env), token)
		// The render page exports the chosen page; the worker screenshots it through the BROWSER
		// binding and writes the PNG to the cache key the OG route reads.
		const render = await renderThumbnailScreenshot(renderUrl, env)
		await env.THUMBNAILS.put(cacheKey, base64ToArrayBuffer(render.base64), {
			httpMetadata: { contentType: 'image/png' },
			customMetadata: {
				version: String(board.version),
				createdAt: String(Date.now()),
			},
		})
		await clearPending()

		writeOgImageTelemetry(env, {
			source: 'queue',
			reason,
			boardHash,
			cacheStatus: 'miss',
			browserRunDurationMs: render.durationMs,
			browserMsUsed: null,
		})
		message.ack()
	} catch (error) {
		// Bounded reason code only — raw error.message would blow up the failure blob's cardinality.
		// Sentry gets the unbounded original, since the reason code alone can't explain why a board
		// burned through its retries.
		reportThumbnailError(error, {
			ctx,
			env,
			surface: 'og_queue',
			extras: { kind, slug, attempts: message.attempts },
		})
		// A board that went private between the resolve above and the snapshot read is retried rather
		// than dropped here, because a plain read failure looks the same from this catch. That costs
		// one extra delivery, not one extra render: the retry re-resolves at the top of the handler,
		// finds the board no longer viewable, and drops it before spending any Browser Run.
		retryOrDrop(env, message, boardHash, classifyScreenshotFailure(error))
	}
}

function retryOrDrop(
	env: Environment,
	message: Message<OgImageRenderQueueMessage>,
	boardHash: string,
	failureReason: string
) {
	// attempts counts this delivery, so attempts >= MAX means this was the final try. The pending
	// marker is left in place either way; it expires on its own and then requests re-enqueue.
	if (message.attempts < MAX_RENDER_ATTEMPTS) {
		message.retry({ delaySeconds: RETRY_DELAY_SECONDS * message.attempts })
		return
	}
	writeOgImageTelemetry(env, {
		source: 'queue',
		reason: message.body.reason,
		boardHash,
		cacheStatus: 'miss',
		failureReason,
	})
	message.ack()
}

// Written to the same dataset and blob layout as the MCP tool's telemetry
// (mcp_shared_board_screenshot) so one dashboard covers every screenshot surface; the source blob
// distinguishes mcp (the tool), og (the GET route), and queue (this consumer).
export function writeOgImageTelemetry(
	env: Environment,
	data: {
		source: 'og' | 'queue'
		// Which trigger asked for this render. Only meaningful on queue datapoints; the request path has
		// no trigger of its own, so it records `none`.
		reason?: OgImageRenderReason
		boardHash: string
		cacheStatus: 'hit' | 'stale' | 'miss'
		browserRunDurationMs?: number
		browserMsUsed?: number | null
		failureReason?: string
		rateLimitAllowed?: boolean
	}
) {
	const rateLimitAllowed = data.rateLimitAllowed ?? true
	writeDataPoint(undefined, env.MEASURE, env, 'mcp_shared_board_screenshot', {
		blobs: [
			`source:${data.source}`,
			`cache:${data.cacheStatus}`,
			`failure:${data.failureReason ?? 'none'}`,
			`rate_limit:${rateLimitAllowed ? 'allowed' : 'blocked'}`,
			'ip:none',
			`reason:${data.reason ?? 'none'}`,
		],
		indexes: [data.boardHash],
		doubles: [
			OG_IMAGE_WIDTH,
			OG_IMAGE_HEIGHT,
			data.browserRunDurationMs ?? -1,
			data.browserMsUsed ?? -1,
			rateLimitAllowed ? 1 : 0,
		],
	})
}

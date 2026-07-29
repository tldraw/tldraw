import { DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_WIDTH } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { Environment, OgImageRenderQueueMessage, ThumbnailBoardKind } from '../../types'
import {
	ResolvedThumbnailBoard,
	captureThumbnailScreenshot,
	enumerateBoardPages,
	isGlobalBrowserRunRateLimited,
	loadBoardSnapshot,
	putThumbnailPng,
	resolveThumbnailBoard,
	writeScreenshotTelemetry,
} from './thumbnailRender'
import { classifyScreenshotFailure, reportThumbnailError, sha256 } from './thumbnailShared'

// Queue-backed async OG image generation. The GET og-image route never blocks a request on
// Browser Run: it serves whatever is cached (fresh or stale) or redirects to the default OG image,
// and enqueues a render job here. This consumer performs the capture out of band and refreshes the
// R2 cache the route reads. The synchronous MCP tool does not use this path: it must return the
// image in-band, so it captures inline and caches under its own `mcp/` keys.

// A pending marker suppresses duplicate enqueues while a render is queued or in flight. It is
// advisory only: it expires on its own so a crashed consumer cannot wedge a board permanently.
const PENDING_MARKER_TTL_MS = 2 * 60_000
// Retries are also bounded by max_retries in wrangler.toml; this lower cap keeps OG jobs from
// burning Browser Run capacity on a persistently failing board. It counts genuine render failures
// only — global-capacity backpressure re-enqueues a fresh message instead (see requeueForRateLimit),
// so a busy period never exhausts a board's failure budget.
const MAX_RENDER_ATTEMPTS = 3
const RETRY_DELAY_SECONDS = 30

// Rate-limit backpressure gets its own bounded retry budget, kept separate from the render-failure
// budget above. Each rate-limited delivery still spends one slot of the shared global Browser Run
// limiter just to learn it can't render, so an unbounded requeue chain would let the OG queue's own
// capacity checks keep the limiter saturated and starve every render surface (OG and MCP alike). Cap
// the chain and back off so that check rate stays low; after the cap we give up and let the next
// crawler hit re-enqueue once capacity has recovered (the OG route serves stale/default meanwhile).
export const MAX_RATE_LIMIT_REQUEUES = 12
const MAX_REQUEUE_DELAY_SECONDS = 120

// OG images render a single page as the unfurl preview. Pick the first page (in board order) that
// has content, so a board whose first page is empty still gets a meaningful image; fall back to the
// first page when none have content (the render degrades to a blank, as it did before).
function pickOgImagePageId(snapshot: RoomSnapshot): string | undefined {
	const pages = enumerateBoardPages(snapshot)
	if (pages.length === 0) return undefined
	return (pages.find((page) => page.hasContent) ?? pages[0]).id
}

export function getOgImageCacheKey(board: Pick<ResolvedThumbnailBoard, 'kind' | 'slug'>) {
	return `og/${board.kind}/${board.slug}/${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT}/light.png`
}

export type EnqueueOgImageResult = 'enqueued' | 'already_pending' | 'unavailable'

function getOgImagePendingKey(board: { kind: ThumbnailBoardKind; slug: string }) {
	return getOgImageCacheKey(board).replace(/\.png$/, '.pending')
}

export async function enqueueOgImageRender(
	env: Environment,
	board: { kind: ThumbnailBoardKind; slug: string }
): Promise<EnqueueOgImageResult> {
	if (!env.THUMBNAILS || !env.QUEUE) return 'unavailable'

	const pendingKey = getOgImagePendingKey(board)
	const existing = await env.THUMBNAILS.head(pendingKey)
	if (existing) {
		const expiresAt = Number(existing.customMetadata?.expiresAt)
		if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
			return 'already_pending'
		}
	}

	await env.THUMBNAILS.put(pendingKey, new Uint8Array(), {
		customMetadata: { expiresAt: String(Date.now() + PENDING_MARKER_TTL_MS) },
	})

	const message: OgImageRenderQueueMessage = {
		type: 'og-image-render',
		kind: board.kind,
		slug: board.slug,
	}
	await env.QUEUE.send(message)
	return 'enqueued'
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
	const boardHash = await sha256(slug)
	const cacheKey = getOgImageCacheKey({ kind, slug })
	const clearPending = async () => {
		await env.THUMBNAILS?.delete(getOgImagePendingKey({ kind, slug })).catch(() => {})
	}
	// The board went private, was deleted, was unpublished, or has no persisted content. Terminal,
	// not transient: drop the cached image so no-longer-public content does not linger in the OG
	// cache, and ack rather than retry, since no number of retries will make the board public again.
	// Reached from the resolve below — a board that goes private after that point fails its snapshot
	// read instead, and the retry lands back here on the next delivery.
	const dropNoLongerViewable = async () => {
		await env.THUMBNAILS?.delete(cacheKey).catch(() => {})
		await clearPending()
		writeScreenshotTelemetry(env, {
			source: 'queue',
			boardHash,
			cacheStatus: 'miss',
			failureReason: 'board_not_viewable',
		})
		message.ack()
	}

	try {
		const resolved = await resolveThumbnailBoard(env, kind, slug)
		if (!resolved.ok) {
			await dropNoLongerViewable()
			return
		}
		const board = resolved.board

		// Another consumer (or an earlier retry) may already have rendered this version.
		const cached = await env.THUMBNAILS?.head(cacheKey)
		if (cached?.customMetadata?.version === String(board.version)) {
			await clearPending()
			writeScreenshotTelemetry(env, { source: 'queue', boardHash, cacheStatus: 'hit' })
			message.ack()
			return
		}

		if (!env.THUMBNAILS) {
			throw new Error('THUMBNAILS bucket is not configured')
		}

		// Shares the global Browser Run budget with the synchronous surfaces, so the MCP tool and this
		// consumer draw from one cap rather than two independent buckets. When capacity is busy, requeue
		// rather than drop: the request path has already returned, so latency is free here.
		if (await isGlobalBrowserRunRateLimited(env)) {
			await requeueForRateLimit(env, message, boardHash)
			return
		}

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

		// The render page exports the chosen page; the worker screenshots it through the BROWSER
		// binding and writes the PNG to the cache key the OG route reads.
		const render = await captureThumbnailScreenshot(env, board, {
			pageId: pickOgImagePageId(snapshot),
			theme: 'light',
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
		})
		await putThumbnailPng(env.THUMBNAILS, cacheKey, render.base64, board.version)
		await clearPending()

		writeScreenshotTelemetry(env, {
			source: 'queue',
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
	// attempts counts this delivery, so attempts >= MAX means this was the final try. Only genuine
	// render failures reach here (global-capacity backpressure re-enqueues instead), so attempts is a
	// true failure count. The pending marker is left in place either way; it expires on its own and
	// then requests re-enqueue.
	if (message.attempts < MAX_RENDER_ATTEMPTS) {
		message.retry({ delaySeconds: RETRY_DELAY_SECONDS * message.attempts })
		return
	}
	writeScreenshotTelemetry(env, { source: 'queue', boardHash, cacheStatus: 'miss', failureReason })
	message.ack()
}

// Global Browser Run capacity is busy. Re-enqueue this job (on its own bounded rate-limit budget, so
// backpressure never counts against the failure-retry budget in retryOrDrop) and ack this delivery.
// The render still hasn't happened, so no Browser Run capacity was spent on a screenshot; the
// consumer's version check coalesces the eventual retry with any newer enqueues, so a fast-changing
// board still captures only its latest content.
//
// Two things keep this from turning into the runaway it used to be: the requeue counter bounds the
// chain (an un-counted `message.body` reset the attempt count and looped forever), and the pending
// marker is refreshed each time so concurrent crawler hits coalesce onto this one chain instead of
// spawning a fresh parallel chain every time the marker's TTL lapsed.
async function requeueForRateLimit(
	env: Environment,
	message: Message<OgImageRenderQueueMessage>,
	boardHash: string
) {
	const requeues = (message.body.rateLimitRequeues ?? 0) + 1

	writeScreenshotTelemetry(env, {
		source: 'queue',
		boardHash,
		cacheStatus: 'miss',
		rateLimitAllowed: false,
		failureReason:
			requeues > MAX_RATE_LIMIT_REQUEUES ? 'rate_limited_global_exhausted' : 'rate_limited_global',
	})

	if (requeues > MAX_RATE_LIMIT_REQUEUES) {
		// Sustained global backpressure. Stop looping so this chain's capacity checks can't keep the
		// shared limiter saturated; the pending marker is left to expire and the next crawler hit
		// re-enqueues once capacity has recovered.
		message.ack()
		return
	}

	// Exponential backoff (capped) cuts how often a waiting job re-checks the shared limiter, so the OG
	// queue's own checks stop crowding out real renders.
	const delaySeconds = Math.min(
		RETRY_DELAY_SECONDS * 2 ** (requeues - 1),
		MAX_REQUEUE_DELAY_SECONDS
	)
	await refreshOgImagePendingMarker(env, message.body, delaySeconds)
	await env.QUEUE.send({ ...message.body, rateLimitRequeues: requeues }, { delaySeconds })
	message.ack()
}

// Extends the pending marker so it outlives the scheduled redelivery. While a rate-limited job backs
// off, its marker must keep suppressing duplicate enqueues (enqueueOgImageRender), or each TTL lapse
// would let another parallel requeue chain spawn.
async function refreshOgImagePendingMarker(
	env: Environment,
	board: { kind: ThumbnailBoardKind; slug: string },
	delaySeconds: number
) {
	if (!env.THUMBNAILS) return
	const expiresAt = Date.now() + delaySeconds * 1000 + PENDING_MARKER_TTL_MS
	await env.THUMBNAILS.put(getOgImagePendingKey(board), new Uint8Array(), {
		customMetadata: { expiresAt: String(expiresAt) },
	}).catch(() => {})
}

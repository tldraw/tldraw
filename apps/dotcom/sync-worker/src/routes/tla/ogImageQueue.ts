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
	GLOBAL_BROWSER_RATE_LIMIT_KEY,
	GLOBAL_BROWSER_RUN_RATE_LIMIT,
	base64ToArrayBuffer,
	buildThumbnailRenderUrl,
	enumerateBoardPages,
	getRenderOrigin,
	isRateLimited,
	loadBoardSnapshot,
	renderThumbnailScreenshot,
} from './sharedBoardScreenshotMcp'
import { classifyScreenshotFailure, reportThumbnailError, sha256 } from './thumbnailShared'

// Queue-backed async OG image generation. The GET og-image route never blocks a request on
// Browser Run: it serves whatever is cached (fresh or stale) or redirects to the default OG image,
// and enqueues a render job here. This consumer performs the capture out of band and refreshes the
// R2 cache the route reads. The synchronous MCP tool does not use this path: it must return the
// image in-band, so it captures inline and caches under its own `mcp/` keys.

export const OG_IMAGE_WIDTH = DEFAULT_THUMBNAIL_WIDTH
export const OG_IMAGE_HEIGHT = DEFAULT_THUMBNAIL_HEIGHT

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

// Speculative rendering: a board that is being edited will probably be shared, so render its OG image
// before the first crawler asks for it rather than after. The whole cost model rests on the staleness
// window: at most one speculative render per board per window, no matter how much editing happens
// inside it. An infinite window would be one render per board lifetime; a zero window would be one per
// editing session.
export const SPECULATIVE_OG_STALENESS_WINDOW_MS = 12 * 60 * 60_000
// The queue holds the message for this long, so the render captures the first few minutes of drawing
// rather than the first shape. The jitter spreads the one wave that the DO-storage guard can't
// prevent: the first rollout (and each sample-percentage increase), when every actively edited board
// has no stored timestamp yet and fires on its next persist.
export const SPECULATIVE_OG_BASE_DELAY_SECONDS = 180
export const SPECULATIVE_OG_JITTER_SECONDS = 120
// Speculation gets its own limiter key, below the shared global cap, and drops instead of requeueing
// when that budget is spent. Guessing about a board must never delay a render someone is waiting for.
export const GLOBAL_SPECULATIVE_BROWSER_RATE_LIMIT_KEY = 'global-speculative'
export const GLOBAL_SPECULATIVE_BROWSER_RUN_RATE_LIMIT = 3

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
	opts: { delaySeconds?: number; reason?: OgImageRenderReason } = {}
): Promise<EnqueueOgImageResult> {
	if (!env.THUMBNAILS || !env.QUEUE) return 'unavailable'
	const { delaySeconds = 0, reason = 'crawler' } = opts

	const pendingKey = getOgImagePendingKey(board)
	const existing = await env.THUMBNAILS.head(pendingKey)
	if (existing) {
		const expiresAt = Number(existing.customMetadata?.expiresAt)
		if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
			return 'already_pending'
		}
	}

	// The marker has to outlive the delay, not just the render: a delayed message that hasn't been
	// delivered yet is still pending work, and a marker that expired first would let the next crawler
	// miss enqueue a duplicate for the same board. Mirrors refreshOgImagePendingMarker.
	await env.THUMBNAILS.put(pendingKey, new Uint8Array(), {
		customMetadata: {
			expiresAt: String(Date.now() + delaySeconds * 1000 + PENDING_MARKER_TTL_MS),
		},
	})

	const message: OgImageRenderQueueMessage = {
		type: 'og-image-render',
		kind: board.kind,
		slug: board.slug,
		reason,
	}
	await env.QUEUE.send(message, delaySeconds > 0 ? { delaySeconds } : undefined)
	return 'enqueued'
}

export type SpeculativeOgRenderOutcome =
	| EnqueueOgImageResult
	| 'skipped_not_sampled'
	| 'skipped_not_shared'
	| 'skipped_recent_enqueue'
	| 'skipped_fresh_image'

/**
 * Decides whether a board being edited should have its OG image rendered ahead of the first crawler,
 * and enqueues it if so. Called from the file durable object on a persist that advanced the document
 * clock; every input it can't derive itself is passed in, so the decision is testable without a DO.
 *
 * `lastEnqueuedAt` is the caller's durable record of when it last asked (not when a render last
 * succeeded, deliberately): a speculative render that fails or gets dropped for capacity does not
 * retry until the window elapses. The demand path — a crawler missing the cache — remains the retry
 * mechanism, and it has actual urgency behind it.
 */
export async function maybeEnqueueSpeculativeOgRender(
	env: Environment,
	board: { kind: OgBoardKind; slug: string },
	{
		isShared,
		lastEnqueuedAt,
		markEnqueued,
		now = Date.now(),
		jitterSeconds = Math.floor(Math.random() * (SPECULATIVE_OG_JITTER_SECONDS + 1)),
	}: {
		// Whether the board is currently shared via link. `undefined` means the caller doesn't know: we
		// go ahead and let the consumer's resolve drop the board, rather than skipping a board that may
		// well be public.
		isShared: boolean | undefined
		lastEnqueuedAt: number | null
		markEnqueued(at: number): Promise<void>
		now?: number
		jitterSeconds?: number
	}
): Promise<SpeculativeOgRenderOutcome> {
	// Sampling is deterministic per board, so raising the percentage adds boards without reshuffling
	// the ones already covered — coverage climbs monotonically and stays measurable.
	if (!isSpeculativeOgRenderSampled(env, board.slug)) return 'skipped_not_sampled'

	// The cheap, authoritative check: the caller's own record of the last ask.
	if (lastEnqueuedAt !== null && now - lastEnqueuedAt < SPECULATIVE_OG_STALENESS_WINDOW_MS) {
		return 'skipped_recent_enqueue'
	}
	if (isShared === false) return 'skipped_not_shared'

	// A second staleness check, this time across every trigger source: a board a crawler-driven refresh
	// rendered ten minutes ago doesn't need a speculative re-render now. Gated behind the check above,
	// so it costs at most one R2 head per board per window rather than one per persist.
	const cached = await env.THUMBNAILS?.head(getOgImageCacheKey(board))
	if (cached && getOgImageAge(cached, now) < SPECULATIVE_OG_STALENESS_WINDOW_MS) {
		return 'skipped_fresh_image'
	}

	// Stamped before the enqueue, so a failure between the two costs one missed render rather than an
	// unbounded repeat.
	await markEnqueued(now)
	return enqueueOgImageRender(env, board, {
		delaySeconds: SPECULATIVE_OG_BASE_DELAY_SECONDS + jitterSeconds,
		reason: 'speculative',
	})
}

export function getOgImageAge(cached: R2Object, now: number) {
	const createdAt = Number(cached.customMetadata?.createdAt ?? cached.uploaded?.getTime() ?? 0)
	return Number.isFinite(createdAt) ? now - createdAt : Infinity
}

// Rollout dial and kill switch, read per event so it can be flipped in the Cloudflare dashboard
// without a deploy (same pattern as MCP_SCREENSHOT_ENABLED). Unset means off: speculation spends real
// Browser Run capacity, so an environment that never configured it should not start guessing.
export function getSpeculativeOgSamplePct(env: Environment) {
	const parsed = Number(env.OG_SPECULATIVE_SAMPLE_PCT)
	if (!Number.isFinite(parsed)) return 0
	return Math.min(100, Math.max(0, Math.floor(parsed)))
}

function isSpeculativeOgRenderSampled(env: Environment, slug: string) {
	const pct = getSpeculativeOgSamplePct(env)
	if (pct <= 0) return false
	if (pct >= 100) return true
	return hashToBucket(slug) < pct
}

// FNV-1a, folded into 0-99. Only needs to be stable and evenly spread, not cryptographic — the board
// slug is not a secret being protected here, it's a bucket key.
function hashToBucket(value: string) {
	let hash = 2166136261
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i)
		hash = Math.imul(hash, 16777619)
	}
	return (hash >>> 0) % 100
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

		// Speculative renders check their own smaller budget first, and drop rather than requeue on any
		// busy signal. Nobody is waiting on a guess, and a speculative requeue chain would spend global
		// capacity checks that crawler-miss and publish renders need — so speculation is strictly
		// last in line and never enters the backoff chain.
		if (reason === 'speculative') {
			const speculativeBusy = await isRateLimited(
				env.MCP_SCREENSHOT_SPECULATIVE_RATE_LIMITER,
				GLOBAL_SPECULATIVE_BROWSER_RATE_LIMIT_KEY,
				{ fallbackLimit: GLOBAL_SPECULATIVE_BROWSER_RUN_RATE_LIMIT }
			)
			if (speculativeBusy) {
				await dropSpeculativeForRateLimit(env, message, boardHash, 'rate_limited_speculative')
				return
			}
		}

		// Shares the global Browser Run budget with the synchronous surfaces by using the same limiter
		// key (`GLOBAL_BROWSER_RATE_LIMIT_KEY`), so the MCP tool and this consumer draw from one cap
		// rather than two independent buckets. When capacity is busy, requeue rather than drop: the
		// request path has already returned, so latency is free here.
		if (
			await isRateLimited(env.MCP_SCREENSHOT_BROWSER_RATE_LIMITER, GLOBAL_BROWSER_RATE_LIMIT_KEY, {
				fallbackLimit: GLOBAL_BROWSER_RUN_RATE_LIMIT,
			})
		) {
			if (reason === 'speculative') {
				await dropSpeculativeForRateLimit(env, message, boardHash, 'rate_limited_global')
				return
			}
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
	// attempts counts this delivery, so attempts >= MAX means this was the final try. Only genuine
	// render failures reach here (global-capacity backpressure re-enqueues instead), so attempts is a
	// true failure count. The pending marker is left in place either way; it expires on its own and
	// then requests re-enqueue.
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

// Speculative work gives up the moment capacity is contended, rather than backing off and retrying
// like a crawler miss does. Nothing is waiting on it, and the next crawler hit re-enqueues on the
// demand path if the board is actually being looked at. The pending marker is cleared so that hit
// isn't deduped away by this abandoned job.
async function dropSpeculativeForRateLimit(
	env: Environment,
	message: Message<OgImageRenderQueueMessage>,
	boardHash: string,
	failureReason: string
) {
	await env.THUMBNAILS?.delete(getOgImagePendingKey(message.body)).catch(() => {})
	writeOgImageTelemetry(env, {
		source: 'queue',
		reason: 'speculative',
		boardHash,
		cacheStatus: 'miss',
		rateLimitAllowed: false,
		failureReason,
	})
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

	writeOgImageTelemetry(env, {
		source: 'queue',
		reason: message.body.reason,
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
	board: { kind: 'published' | 'shared_file'; slug: string },
	delaySeconds: number
) {
	if (!env.THUMBNAILS) return
	const expiresAt = Date.now() + delaySeconds * 1000 + PENDING_MARKER_TTL_MS
	await env.THUMBNAILS.put(getOgImagePendingKey(board), new Uint8Array(), {
		customMetadata: { expiresAt: String(expiresAt) },
	}).catch(() => {})
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

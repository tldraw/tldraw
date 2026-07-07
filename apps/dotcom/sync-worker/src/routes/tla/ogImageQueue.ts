import { getR2KeyForRoom } from '../../r2'
import { Environment, OgImageRenderQueueMessage } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import {
	THUMBNAIL_RENDER_TOKEN_TTL_MS,
	ThumbnailRenderJob,
	mintThumbnailRenderToken,
} from '../../utils/renderTokens'
import { getPublishedFileInfo } from './getPublishedFile'
import { getSharedFileInfo, isFileAnonymouslyViewable } from './getSharedFile'
import {
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	buildThumbnailRenderUrl,
	captureWithBrowserRun,
	getRenderOrigin,
	isRateLimited,
} from './sharedBoardScreenshotMcp'

// Queue-backed async OG image generation. The GET og-image route never blocks a request on
// Browser Run: it serves whatever is cached (fresh or stale) or redirects to the default OG image,
// and enqueues a render job here. This consumer performs the capture out of band and refreshes the
// R2 cache the route reads. The synchronous MCP tool does not use this path: it must return the
// image in-band, so it captures inline and caches under its own `mcp/` keys.

export const OG_IMAGE_WIDTH = DEFAULT_THUMBNAIL_WIDTH
export const OG_IMAGE_HEIGHT = DEFAULT_THUMBNAIL_HEIGHT

const OG_IMAGE_BROWSER_RATE_LIMIT = 60
// A pending marker suppresses duplicate enqueues while a render is queued or in flight. It is
// advisory only: it expires on its own so a crashed consumer cannot wedge a board permanently.
const PENDING_MARKER_TTL_MS = 2 * 60_000
// Retries are also bounded by max_retries in wrangler.toml; this lower cap keeps OG jobs from
// burning Browser Run capacity on a persistently failing board.
const MAX_RENDER_ATTEMPTS = 3
const RETRY_DELAY_SECONDS = 30

export type OgBoardKind = 'published' | 'shared_file'

export interface ResolvedOgBoard {
	kind: OgBoardKind
	slug: string
	fileId: string
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
			fileId: file.id,
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
		fileId: file.id,
		version: persisted.etag,
	}
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
	board: { kind: 'published' | 'shared_file'; slug: string }
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
	message: Message<OgImageRenderQueueMessage>
): Promise<void> {
	const { kind, slug } = message.body
	const boardHash = await sha256(slug)
	const cacheKey = getOgImageCacheKey({ kind, slug })
	const clearPending = async () => {
		await env.THUMBNAILS?.delete(getOgImagePendingKey({ kind, slug })).catch(() => {})
	}

	try {
		const board = await resolveOgBoardInfo(env, kind, slug)
		if (!board) {
			// The board went private, was deleted, or was unpublished while the job was queued. Drop
			// the cached image too so no-longer-public content does not linger in the OG cache.
			await env.THUMBNAILS?.delete(cacheKey).catch(() => {})
			await clearPending()
			writeOgImageTelemetry(env, {
				source: 'queue',
				boardHash,
				cacheStatus: 'miss',
				failureReason: 'board_not_viewable',
			})
			message.ack()
			return
		}

		// Another consumer (or an earlier retry) may already have rendered this version.
		const cached = await env.THUMBNAILS?.head(cacheKey)
		if (cached?.customMetadata?.version === String(board.version)) {
			await clearPending()
			writeOgImageTelemetry(env, { source: 'queue', boardHash, cacheStatus: 'hit' })
			message.ack()
			return
		}

		// Shares the global Browser Run budget with the synchronous surfaces. When capacity is busy,
		// requeue rather than drop: the request path has already returned, so latency is free here.
		if (
			await isRateLimited(env.MCP_SCREENSHOT_BROWSER_RATE_LIMITER, 'og-global', {
				fallbackLimit: OG_IMAGE_BROWSER_RATE_LIMIT,
			})
		) {
			retryOrDrop(env, message, boardHash, 'rate_limited_global')
			return
		}

		const now = Date.now()
		const job: ThumbnailRenderJob = {
			v: 1,
			kind,
			slug,
			fileId: board.fileId,
			version: board.version,
			camera: 'content',
			x: 0,
			y: 0,
			z: 1,
			width: OG_IMAGE_WIDTH,
			height: OG_IMAGE_HEIGHT,
			theme: 'light',
			exp: now + THUMBNAIL_RENDER_TOKEN_TTL_MS,
		}
		const token = await mintThumbnailRenderToken(env, job)
		const renderUrl = buildThumbnailRenderUrl(getRenderOrigin(env), token)
		const browserRun = await captureWithBrowserRun(
			renderUrl,
			{ width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT },
			env
		)

		await env.THUMBNAILS?.put(cacheKey, browserRun.png, {
			httpMetadata: { contentType: 'image/png' },
			customMetadata: {
				version: String(board.version),
				createdAt: String(now),
			},
		})
		await clearPending()

		writeOgImageTelemetry(env, {
			source: 'queue',
			boardHash,
			cacheStatus: 'miss',
			browserRunDurationMs: browserRun.durationMs,
			browserMsUsed: browserRun.browserMsUsed,
		})
		message.ack()
	} catch (error) {
		retryOrDrop(env, message, boardHash, error instanceof Error ? error.message : String(error))
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
	writeOgImageTelemetry(env, { source: 'queue', boardHash, cacheStatus: 'miss', failureReason })
	message.ack()
}

// Written to the same dataset and blob layout as the MCP tool's telemetry
// (mcp_shared_board_screenshot) so one dashboard covers every screenshot surface; the source blob
// distinguishes mcp (the tool), og (the GET route), and queue (this consumer).
export function writeOgImageTelemetry(
	env: Environment,
	data: {
		source: 'og' | 'queue'
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

export async function sha256(value: string) {
	const bytes = new TextEncoder().encode(value)
	const digest = await crypto.subtle.digest('SHA-256', bytes)
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

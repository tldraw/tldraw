import { IRequest } from 'itty-router'
import { Environment, ThumbnailBoardKind } from '../../types'
import { getPublicOrigin } from '../../utils/getPublicOrigin'
import { enqueueOgImageRender, getOgImageCacheKey } from './ogImageQueue'
import {
	ResolvedThumbnailBoard,
	isRateLimited,
	resolveThumbnailBoard,
	writeScreenshotTelemetry,
} from './thumbnailRender'
import { reportThumbnailError, sha256 } from './thumbnailShared'

// OG images are served entirely from the R2 cache; rendering happens asynchronously through the
// og-image queue consumer (ogImageQueue.ts). A request never waits on Browser Run: it gets the
// cached image (fresh or stale, while a refresh job runs in the background) or a redirect to the
// default tldraw OG image until the first render lands. This is what makes the endpoint safe on
// high-traffic paths like link unfurls.

// A stale-but-recent image is still served as fresh without enqueueing a refresh, so one board
// cannot spend Browser Run capacity more than about once an hour no matter how often it changes
// or is crawled.
const OG_IMAGE_MIN_REFRESH_AGE_MS = 60 * 60_000
const OG_IMAGE_BOARD_RATE_LIMIT = 2
const DEFAULT_OG_IMAGE_PATH = '/social-og.png'
const FRESH_IMAGE_MAX_AGE_SECONDS = 60 * 60
// Stale images and redirects use short TTLs so scrapers and browsers come back for the fresh
// render soon after the queued job completes.
const STALE_IMAGE_MAX_AGE_SECONDS = 5 * 60
const REDIRECT_MAX_AGE_SECONDS = 60

export async function getOgImage(
	request: IRequest,
	env: Environment,
	ctx?: ExecutionContext
): Promise<Response> {
	// Crawlers probe this URL with HEAD before (or instead of) GET, so the route is registered with
	// .all and HEAD must still return the cache/redirect headers. But a HEAD must not spend Browser
	// Run: only a real GET reads the R2 body and enqueues a render. Any non-GET method is treated
	// like a probe (headers only, no enqueue).
	const wantsBody = request.method === 'GET'
	const board = await resolveOgBoard(request, env).catch((error) => {
		// Resolution reads Postgres and R2, so a throw here is infrastructure failing, not a board
		// that isn't public — but both produce the same default-image redirect. Report it, or an
		// outage is indistinguishable from a quiet day of unpublished boards.
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'og_route',
			extras: { prefix: request.params.prefix, slug: request.params.slug },
		})
		return null
	})
	if (!board) return redirectToDefaultOgImage(request, env)

	const boardHash = await sha256(board.slug)
	const cacheKey = getOgImageCacheKey(board)
	const cached = wantsBody
		? await env.THUMBNAILS?.get(cacheKey)
		: await env.THUMBNAILS?.head(cacheKey)
	const now = Date.now()
	if (cached && shouldServeCachedOgImage(cached, board.version, now)) {
		writeScreenshotTelemetry(env, { source: 'og', boardHash, cacheStatus: 'hit' })
		return imageResponse(wantsBody ? await (cached as R2ObjectBody).arrayBuffer() : null, {
			cacheStatus: 'hit',
			maxAgeSeconds: FRESH_IMAGE_MAX_AGE_SECONDS,
			version: cached.customMetadata?.version,
		})
	}

	// Stale or never rendered: a GET kicks off (at most) one background render, then returns the best
	// response we have right now. HEAD probes skip the enqueue so they never spend Browser Run. The
	// per-board limit guards the queue against being flooded on a single board's behalf; enqueue
	// failures degrade to the fallback response rather than a 500.
	if (
		wantsBody &&
		!(await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `og-board:${board.kind}:${board.slug}`, {
			fallbackLimit: OG_IMAGE_BOARD_RATE_LIMIT,
		}))
	) {
		await enqueueOgImageRender(env, board).catch(() => {})
	}

	if (cached) {
		writeScreenshotTelemetry(env, { source: 'og', boardHash, cacheStatus: 'stale' })
		return imageResponse(wantsBody ? await (cached as R2ObjectBody).arrayBuffer() : null, {
			cacheStatus: 'stale',
			maxAgeSeconds: STALE_IMAGE_MAX_AGE_SECONDS,
			version: cached.customMetadata?.version,
		})
	}

	writeScreenshotTelemetry(env, {
		source: 'og',
		boardHash,
		cacheStatus: 'miss',
		failureReason: 'not_rendered_yet',
	})
	return redirectToDefaultOgImage(request, env)
}

function shouldServeCachedOgImage(cached: R2Object, version: string | number, now: number) {
	const cachedVersion = cached.customMetadata?.version
	if (cachedVersion === String(version)) return true

	const createdAt = Number(cached.customMetadata?.createdAt ?? cached.uploaded?.getTime() ?? 0)
	return Number.isFinite(createdAt) && now - createdAt < OG_IMAGE_MIN_REFRESH_AGE_MS
}

async function resolveOgBoard(
	request: IRequest,
	env: Environment
): Promise<ResolvedThumbnailBoard | null> {
	const kind = parseOgKind(request.params.prefix)
	const slug = parseSlug(request.params.slug)
	if (!kind || !slug) return null
	const resolved = await resolveThumbnailBoard(env, kind, slug)
	return resolved.ok ? resolved.board : null
}

function parseOgKind(value: unknown): ThumbnailBoardKind | null {
	if (value === 'p' || value === 'published') return 'published'
	if (value === 'f' || value === 'shared_file') return 'shared_file'
	return null
}

function parseSlug(value: unknown) {
	return typeof value === 'string' && value.length > 0 && !value.includes('/') ? value : null
}

function imageResponse(
	body: ArrayBuffer | null,
	{
		cacheStatus,
		maxAgeSeconds,
		version,
	}: {
		cacheStatus: 'hit' | 'stale'
		maxAgeSeconds: number
		version?: string
	}
) {
	return new Response(body, {
		headers: {
			'content-type': 'image/png',
			'cache-control': `public, max-age=${maxAgeSeconds}, stale-while-revalidate=86400`,
			'x-tldraw-og-cache': cacheStatus,
			...(version ? { 'x-tldraw-og-version': version } : null),
		},
	})
}

function redirectToDefaultOgImage(request: IRequest, env: Environment) {
	return new Response(null, {
		status: 302,
		headers: {
			location: `${getPublicOrigin(request, env)}${DEFAULT_OG_IMAGE_PATH}`,
			'cache-control': `public, max-age=${REDIRECT_MAX_AGE_SECONDS}`,
		},
	})
}

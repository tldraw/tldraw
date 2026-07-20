import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import {
	OgBoardKind,
	ResolvedOgBoard,
	enqueueOgImageRender,
	getOgImageCacheKey,
	resolveOgBoardInfo,
	writeOgImageTelemetry,
} from './ogImageQueue'
import { isRateLimited } from './sharedBoardScreenshotMcp'
import { sha256 } from './thumbnailShared'

// OG images are served entirely from the R2 cache; rendering happens asynchronously through the
// og-image queue consumer (ogImageQueue.ts). A request never waits on Browser Run: it gets the
// cached image (fresh or stale, while a refresh job runs in the background) or a redirect to the
// default tldraw OG image until the first render lands. This is what makes the endpoint safe on
// high-traffic paths like link unfurls.

// A stale-but-recent image is still served as fresh without enqueueing a refresh, so one board
// cannot spend Browser Run capacity more than about once an hour no matter how often it changes
// or is crawled.
const OG_IMAGE_MIN_REFRESH_AGE_MS = 60 * 60_000
const OG_IMAGE_BOARD_RATE_LIMIT = 20
const DEFAULT_OG_IMAGE_PATH = '/social-og.png'
const FRESH_IMAGE_MAX_AGE_SECONDS = 60 * 60
// Stale images and redirects use short TTLs so scrapers and browsers come back for the fresh
// render soon after the queued job completes.
const STALE_IMAGE_MAX_AGE_SECONDS = 5 * 60
const REDIRECT_MAX_AGE_SECONDS = 60

export async function getOgImage(request: IRequest, env: Environment): Promise<Response> {
	const board = await resolveOgBoard(request, env).catch(() => null)
	if (!board) return redirectToDefaultOgImage(request, env)

	const boardHash = await sha256(board.slug)
	const cacheKey = getOgImageCacheKey(board)
	const cached = await env.THUMBNAILS?.get(cacheKey)
	const now = Date.now()
	if (cached && shouldServeCachedOgImage(cached, board.version, now)) {
		writeOgImageTelemetry(env, { source: 'og', boardHash, cacheStatus: 'hit' })
		return imageResponse(await cached.arrayBuffer(), {
			cacheStatus: 'hit',
			maxAgeSeconds: FRESH_IMAGE_MAX_AGE_SECONDS,
			version: cached.customMetadata?.version,
		})
	}

	// Stale or never rendered: kick off (at most) one background render, then return the best
	// response we have right now. The per-board limit guards the queue against being flooded on a
	// single board's behalf; enqueue failures degrade to the fallback response rather than a 500.
	if (
		!(await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `og-board:${board.kind}:${board.slug}`, {
			fallbackLimit: OG_IMAGE_BOARD_RATE_LIMIT,
		}))
	) {
		await enqueueOgImageRender(env, board).catch(() => {})
	}

	if (cached) {
		writeOgImageTelemetry(env, { source: 'og', boardHash, cacheStatus: 'stale' })
		return imageResponse(await cached.arrayBuffer(), {
			cacheStatus: 'stale',
			maxAgeSeconds: STALE_IMAGE_MAX_AGE_SECONDS,
			version: cached.customMetadata?.version,
		})
	}

	writeOgImageTelemetry(env, {
		source: 'og',
		boardHash,
		cacheStatus: 'miss',
		failureReason: 'not_rendered_yet',
	})
	return redirectToDefaultOgImage(request, env)
}

function shouldServeCachedOgImage(cached: R2ObjectBody, version: string | number, now: number) {
	const cachedVersion = cached.customMetadata?.version
	if (cachedVersion === String(version)) return true

	const createdAt = Number(cached.customMetadata?.createdAt ?? cached.uploaded?.getTime() ?? 0)
	return Number.isFinite(createdAt) && now - createdAt < OG_IMAGE_MIN_REFRESH_AGE_MS
}

async function resolveOgBoard(
	request: IRequest,
	env: Environment
): Promise<ResolvedOgBoard | null> {
	const kind = parseOgKind(request.params.prefix)
	const slug = parseSlug(request.params.slug)
	if (!kind || !slug) return null
	return resolveOgBoardInfo(env, kind, slug)
}

function parseOgKind(value: unknown): OgBoardKind | null {
	if (value === 'p' || value === 'published') return 'published'
	if (value === 'f' || value === 'shared_file') return 'shared_file'
	return null
}

function parseSlug(value: unknown) {
	return typeof value === 'string' && value.length > 0 && !value.includes('/') ? value : null
}

function imageResponse(
	body: ArrayBuffer,
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

export function getPublicOrigin(request: IRequest, env: Environment) {
	const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
	const host = forwardedHost ?? request.headers.get('host')
	const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'https'
	if (host && !host.endsWith('.workers.dev')) {
		return `${proto}://${host}`
	}
	if (env.MCP_SCREENSHOT_RENDER_ORIGIN) return env.MCP_SCREENSHOT_RENDER_ORIGIN
	return new URL(request.url).origin
}

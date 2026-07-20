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
const OG_IMAGE_BOARD_RATE_LIMIT = 2
const DEFAULT_OG_IMAGE_PATH = '/social-og.png'
const FRESH_IMAGE_MAX_AGE_SECONDS = 60 * 60
// Stale images and redirects use short TTLs so scrapers and browsers come back for the fresh
// render soon after the queued job completes.
const STALE_IMAGE_MAX_AGE_SECONDS = 5 * 60
const REDIRECT_MAX_AGE_SECONDS = 60

export async function getOgImage(request: IRequest, env: Environment): Promise<Response> {
	// Crawlers probe this URL with HEAD before (or instead of) GET, so the route is registered with
	// .all and HEAD must still return the cache/redirect headers. But a HEAD must not spend Browser
	// Run: only a real GET reads the R2 body and enqueues a render. Any non-GET method is treated
	// like a probe (headers only, no enqueue).
	const wantsBody = request.method === 'GET'
	const board = await resolveOgBoard(request, env).catch(() => null)
	if (!board) return redirectToDefaultOgImage(request, env)

	const boardHash = await sha256(board.slug)
	const cacheKey = getOgImageCacheKey(board)
	const cached = wantsBody
		? await env.THUMBNAILS?.get(cacheKey)
		: await env.THUMBNAILS?.head(cacheKey)
	const now = Date.now()
	if (cached && shouldServeCachedOgImage(cached, board.version, now)) {
		writeOgImageTelemetry(env, { source: 'og', boardHash, cacheStatus: 'hit' })
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
		writeOgImageTelemetry(env, { source: 'og', boardHash, cacheStatus: 'stale' })
		return imageResponse(wantsBody ? await (cached as R2ObjectBody).arrayBuffer() : null, {
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

function shouldServeCachedOgImage(cached: R2Object, version: string | number, now: number) {
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

// The origin used to build the URLs we emit into crawler HTML (og:image, canonical) and 302
// redirect `Location`s. We prefer the configured, trusted client origin so a spoofed
// `x-forwarded-host` / `Host` can't steer those URLs at an attacker origin (open redirect + unfurl
// spoofing). Only when no origin is configured do we fall back to a request-derived host, and only
// if that host is a recognized tldraw/localhost origin.
export function getPublicOrigin(request: IRequest, env: Environment) {
	if (env.MCP_SCREENSHOT_RENDER_ORIGIN) return env.MCP_SCREENSHOT_RENDER_ORIGIN

	const forwardedHost = request.headers.get('x-forwarded-host')?.split(',').at(-1)?.trim()
	const host = forwardedHost ?? request.headers.get('host') ?? undefined
	const proto = request.headers.get('x-forwarded-proto')?.split(',').at(-1)?.trim() ?? 'https'
	if (host && isTrustedPublicHost(host)) {
		return `${proto}://${host}`
	}
	return new URL(request.url).origin
}

// Hosts we're willing to emit into public URLs. Anything else (a spoofed header, a *.workers.dev
// direct hit) falls through to the request's own origin rather than being trusted.
function isTrustedPublicHost(host: string) {
	const hostname = host.split(':')[0].toLowerCase()
	return (
		hostname === 'tldraw.com' ||
		hostname.endsWith('.tldraw.com') ||
		hostname === 'localhost' ||
		hostname === '127.0.0.1'
	)
}

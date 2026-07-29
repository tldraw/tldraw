import { IRequest } from 'itty-router'
import { Environment, ThumbnailBoardKind } from '../../types'
import { getPublicOrigin } from '../../utils/getPublicOrigin'
import { enqueueOgImageRender, getOgImageAge, getOgImageCacheKey } from './ogImageQueue'
import {
	ResolvedThumbnailBoard,
	isRateLimited,
	resolveThumbnailBoard,
	writeScreenshotTelemetry,
} from './thumbnailRender'
import { reportThumbnailError } from './thumbnailShared'

// OG images are served entirely from the R2 cache; rendering happens asynchronously through the
// og-image queue consumer (ogImageQueue.ts). A request never waits on Browser Run: it gets the
// cached image (fresh or stale, while a refresh job runs in the background) or the default tldraw
// OG image until the first render lands. This is what makes the endpoint safe on high-traffic paths
// like link unfurls.

// Only applies to a cached image whose version no longer matches the board's. A version *match* is
// served as a hit indefinitely — the image depicts the current content, so there is nothing to
// refresh however old it is or however often it is crawled (see shouldServeCachedOgImage).
//
// On a mismatch, an image younger than this is still served as a hit without enqueueing, which
// bounds crawler-triggered rendering to about one render per board per hour. That is a bound on this
// path only, not on the board: edit-triggered rendering does not come through here, and is bounded
// instead by the durable object's render debounce (see "Request limits" in browser-run-thumbnails.md).
const OG_IMAGE_MIN_REFRESH_AGE_MS = 60 * 60_000
const OG_IMAGE_BOARD_RATE_LIMIT = 2
const DEFAULT_OG_IMAGE_PATH = '/social-og.png'
const FRESH_IMAGE_MAX_AGE_SECONDS = 60 * 60
// Stale images and fallbacks use short TTLs so scrapers and browsers come back for the fresh
// render soon after the queued job completes.
const STALE_IMAGE_MAX_AGE_SECONDS = 5 * 60
const FALLBACK_MAX_AGE_SECONDS = 60

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
	if (!board) return (await defaultOgImageFallback(request, env, wantsBody)).response

	const cacheKey = getOgImageCacheKey(board)
	const cached = wantsBody
		? await env.THUMBNAILS?.get(cacheKey)
		: await env.THUMBNAILS?.head(cacheKey)
	const now = Date.now()
	if (cached && shouldServeCachedOgImage(cached, board.version, now)) {
		writeScreenshotTelemetry(env, { source: 'og', fileId: board.fileId, cacheStatus: 'hit' })
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
		writeScreenshotTelemetry(env, { source: 'og', fileId: board.fileId, cacheStatus: 'stale' })
		return imageResponse(wantsBody ? await (cached as R2ObjectBody).arrayBuffer() : null, {
			cacheStatus: 'stale',
			maxAgeSeconds: STALE_IMAGE_MAX_AGE_SECONDS,
			version: cached.customMetadata?.version,
		})
	}

	// Never rendered. The default image is served as a 200 under this board's own stable URL rather
	// than redirected to, because the crawlers this endpoint exists for cache the first response they
	// see for days — and X does not follow an og:image redirect at all, so a 302 here shows a broken
	// card that no later render can fix. A 200 with the default bytes is a valid card now, and the
	// short max-age (deliberately no s-maxage) lets the real image take over as soon as it lands.
	const fallback = await defaultOgImageFallback(request, env, wantsBody)
	writeScreenshotTelemetry(env, {
		source: 'og',
		fileId: board.fileId,
		cacheStatus: 'miss',
		// Two distinct outcomes, both of which look like "no image yet" from the outside: the board got
		// a usable default card (served_fallback, the self-healing case worth measuring per platform),
		// or the default bytes were unreachable and it got the old redirect (not_rendered_yet).
		failureReason: fallback.servedBytes ? 'served_fallback' : 'not_rendered_yet',
	})
	return fallback.response
}

function shouldServeCachedOgImage(cached: R2Object, version: string | number, now: number) {
	const cachedVersion = cached.customMetadata?.version
	if (cachedVersion === String(version)) return true

	return getOgImageAge(cached, now) < OG_IMAGE_MIN_REFRESH_AGE_MS
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

// The response for a board with no usable cached image: the site-wide default OG image, served as a
// 200 under the board's own URL. `servedBytes` says whether that worked, because the caller reports
// the two outcomes as different telemetry reasons.
async function defaultOgImageFallback(
	request: IRequest,
	env: Environment,
	wantsBody: boolean
): Promise<{ response: Response; servedBytes: boolean }> {
	const imageUrl = `${getPublicOrigin(request, env)}${DEFAULT_OG_IMAGE_PATH}`
	const bytes = await loadDefaultOgImageBytes(imageUrl)
	if (!bytes) {
		// The default image itself is unreachable. A redirect is worse for the crawlers that don't
		// follow one, but it is what we have, and it degrades no further than the behaviour this
		// fallback replaced.
		return { response: redirectToDefaultOgImage(imageUrl), servedBytes: false }
	}

	return {
		response: new Response(wantsBody ? bytes : null, {
			headers: {
				'content-type': 'image/png',
				// No `s-maxage` and no `stale-while-revalidate`: this URL is a board's permanent OG image
				// address, so an edge must not pin the default under it once the real render lands.
				'cache-control': `public, max-age=${FALLBACK_MAX_AGE_SECONDS}`,
				'x-tldraw-og-cache': 'fallback',
			},
		}),
		servedBytes: true,
	}
}

// The default image is a small static asset on the client origin, identical for every board and
// every request, so it is fetched once per isolate and held in memory rather than re-fetched on each
// cold-cache unfurl. Failures are not memoized (only successes land in the cache), so a transient
// blip doesn't leave an isolate permanently unable to serve the fallback.
const DEFAULT_OG_IMAGE_BYTES = new Map<string, ArrayBuffer>()
const DEFAULT_OG_IMAGE_FETCHES = new Map<string, Promise<ArrayBuffer | null>>()

async function loadDefaultOgImageBytes(imageUrl: string): Promise<ArrayBuffer | null> {
	const cached = DEFAULT_OG_IMAGE_BYTES.get(imageUrl)
	if (cached) return cached

	// Concurrent cold-cache requests share one fetch instead of each issuing their own subrequest.
	let pending = DEFAULT_OG_IMAGE_FETCHES.get(imageUrl)
	if (!pending) {
		pending = fetchDefaultOgImageBytes(imageUrl).finally(() => {
			DEFAULT_OG_IMAGE_FETCHES.delete(imageUrl)
		})
		DEFAULT_OG_IMAGE_FETCHES.set(imageUrl, pending)
	}
	return pending
}

async function fetchDefaultOgImageBytes(imageUrl: string): Promise<ArrayBuffer | null> {
	try {
		const response = await fetch(imageUrl)
		if (!response.ok) return null
		const bytes = await response.arrayBuffer()
		if (bytes.byteLength === 0) return null
		DEFAULT_OG_IMAGE_BYTES.set(imageUrl, bytes)
		return bytes
	} catch {
		return null
	}
}

// Test seam: the memoized bytes are module state that would otherwise leak between test cases.
export function resetDefaultOgImageCacheForTests() {
	DEFAULT_OG_IMAGE_BYTES.clear()
	DEFAULT_OG_IMAGE_FETCHES.clear()
}

function redirectToDefaultOgImage(imageUrl: string) {
	return new Response(null, {
		status: 302,
		headers: {
			location: imageUrl,
			'cache-control': `public, max-age=${FALLBACK_MAX_AGE_SECONDS}`,
		},
	})
}

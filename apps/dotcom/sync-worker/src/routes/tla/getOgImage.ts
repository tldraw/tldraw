import { IRequest } from 'itty-router'
import { Environment, ThumbnailBoardKind } from '../../types'
import { getPublicOrigin } from '../../utils/getPublicOrigin'
import { getOgImageCacheKey } from './ogImageQueue'
import {
	ResolvedThumbnailBoard,
	resolveThumbnailBoard,
	writeScreenshotTelemetry,
} from './thumbnailRender'
import { reportThumbnailError } from './thumbnailShared'

// A pure read. Two questions and nothing else: is this board publicly viewable (published, or shared
// via link), and does a thumbnail for it exist? Both yes, serve it. Anything else, serve the
// site-wide default. No rendering, no enqueueing, no rate limiting, no waiting.
//
// Making the thumbnail exist before the board is ever shared is the job of the publish and edit
// triggers (TLPostgresReplicator, TLFileDurableObject), not of the request that finds it missing:
// unfurl platforms cache a URL's card on first resolve, so a render triggered from here lands after
// the crawler has already taken the default away. Rendering inline is worse still — captures run
// 4-17s, past any crawler's patience. See browser-run-thumbnails.md.
const DEFAULT_OG_IMAGE_PATH = '/social-og.png'
const FRESH_IMAGE_MAX_AGE_SECONDS = 60 * 60
// Stale images and fallbacks use short TTLs so scrapers and browsers come back soon after a publish
// or an edit lands a fresher render.
const STALE_IMAGE_MAX_AGE_SECONDS = 5 * 60
const FALLBACK_MAX_AGE_SECONDS = 60

export async function getOgImage(
	request: IRequest,
	env: Environment,
	ctx?: ExecutionContext
): Promise<Response> {
	// Crawlers probe this URL with HEAD before (or instead of) GET, so the route is registered with
	// .all and HEAD must still return the same cache headers a GET would. Only a real GET reads the
	// R2 body; any other method is treated as a probe and answers headers only.
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
			// The route prefix only. No board identifier reaches an error report: for a link-shared file
			// the slug is the file id, which is the capability to view the board.
			extras: { prefix: request.params.prefix },
		})
		return null
	})
	if (!board) return (await defaultOgImageFallback(request, env, wantsBody)).response

	const cacheKey = getOgImageCacheKey(board)
	const cached = wantsBody
		? await env.THUMBNAILS?.get(cacheKey)
		: await env.THUMBNAILS?.head(cacheKey)

	if (cached) {
		// Whether the image still depicts the board's current content decides the cache lifetime and
		// nothing else — both are served. There is no "too stale to serve": an old picture of this board
		// beats the generic tldraw logo.
		const isCurrent = cached.customMetadata?.version === String(board.version)
		writeScreenshotTelemetry(env, { source: 'og', cacheStatus: isCurrent ? 'hit' : 'stale' })
		return imageResponse(wantsBody ? await (cached as R2ObjectBody).arrayBuffer() : null, {
			cacheStatus: isCurrent ? 'hit' : 'stale',
			maxAgeSeconds: isCurrent ? FRESH_IMAGE_MAX_AGE_SECONDS : STALE_IMAGE_MAX_AGE_SECONDS,
			version: cached.customMetadata?.version,
		})
	}

	// Never rendered. The default is served as a 200 under this board's own URL rather than redirected
	// to: crawlers cache the first response they see for days, and X does not follow an og:image
	// redirect at all, so a 302 here shows a broken card that no later render can fix.
	const fallback = await defaultOgImageFallback(request, env, wantsBody)
	writeScreenshotTelemetry(env, {
		source: 'og',
		cacheStatus: 'miss',
		// Both outcomes look like "no image yet" from outside, but only one is the self-healing case: the
		// board got a usable default card, or the default bytes were unreachable and it got the redirect.
		failureReason: fallback.servedBytes ? 'served_fallback' : 'not_rendered_yet',
	})
	return fallback.response
}

async function resolveOgBoard(
	request: IRequest,
	env: Environment
): Promise<ResolvedThumbnailBoard | null> {
	const kind = parseOgKind(request.params.prefix)
	const slug = parseSlug(request.params.slug)
	if (!kind || !slug) return null
	// 'public' is load-bearing here: since a thumbnail exists for every board and is never deleted, this
	// gate is the only thing keeping a private board's off the public internet.
	const resolved = await resolveThumbnailBoard(env, kind, slug, { access: 'public' })
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
		// The default image itself is unreachable. A redirect is worse for the crawlers that don't follow
		// one, but it is what's left.
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

// The default image is a small static asset, identical for every board and request, so it is fetched
// once per isolate and held rather than re-fetched on each cold-cache unfurl. Only successes are
// memoized, so a transient blip can't leave an isolate permanently unable to serve the fallback.
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

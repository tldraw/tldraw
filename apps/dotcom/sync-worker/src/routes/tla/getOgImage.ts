import { IRequest } from 'itty-router'
import {
	OG_FALLBACK_MAX_AGE_SECONDS,
	OG_FRESH_IMAGE_MAX_AGE_SECONDS,
	OG_STALE_IMAGE_MAX_AGE_SECONDS,
} from '../../config'
import { Environment, ThumbnailBoardKind } from '../../types'
import { getPublicOrigin } from '../../utils/getPublicOrigin'
import { enqueueOgImageRender, getOgImageCacheKey, isOgImageRepairOnCooldown } from './ogImageQueue'
import {
	ResolvedThumbnailBoard,
	resolveThumbnailBoard,
	writeScreenshotTelemetry,
} from './thumbnailRender'
import { reportThumbnailError } from './thumbnailShared'

// Almost a pure read. Two questions and nothing else: is this board publicly viewable (published, or
// shared via link), and does a thumbnail for it exist? Both yes, serve it. Anything else, redirect to
// the site-wide default. No rendering inline, no rate limiting, no waiting.
//
// Making the thumbnail exist before the board is ever shared is the job of the publish and edit
// triggers (the outbox publish effect, TLFileDurableObject), not of the request that finds it missing:
// unfurl platforms cache a URL's card on first resolve, so a render triggered from here lands after
// the crawler has already taken the default away. Rendering inline is worse still — captures run
// 4-17s, past any crawler's patience. See browser-run-thumbnails.md.
//
// The one exception is `repairMissingPublishedImage` below, which asks for a render when a *published*
// board has no image at all — the single case where no other trigger will ever ask again.
const DEFAULT_OG_IMAGE_PATH = '/social-og.png'

export async function getOgImage(
	request: IRequest,
	env: Environment,
	ctx?: ExecutionContext
): Promise<Response> {
	// Crawlers probe this URL with HEAD before (or instead of) GET, so the route is registered with
	// .all and HEAD must still return the same cache headers a GET would. Only a real GET reads the
	// R2 body; any other method is treated as a probe and answers headers only.
	const wantsBody = request.method === 'GET'
	const imageUrl = `${getPublicOrigin(request, env)}${DEFAULT_OG_IMAGE_PATH}`
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
	if (!board) return redirectToDefaultOgImage(imageUrl)

	const cacheKey = getOgImageCacheKey(board)
	// A conditional request needs metadata only: if the etag still matches, the answer is a 304 and the
	// bytes are never read. A HEAD probe needs metadata only for the same reason.
	const ifNoneMatch = request.headers.get('if-none-match')
	let cached =
		wantsBody && !ifNoneMatch
			? await env.THUMBNAILS?.get(cacheKey)
			: await env.THUMBNAILS?.head(cacheKey)

	if (cached) {
		// The caller already holds these bytes. This is the path the short max-age is designed to make
		// common: a cache revalidates for the price of a 304, and every revalidation re-runs the share
		// gate above, so an unshared board stops being served within minutes rather than within a day.
		if (ifNoneMatch && etagMatches(ifNoneMatch, cached.etag)) {
			writeScreenshotTelemetry(env, { source: 'og', cacheStatus: cacheStatusOf(cached, board) })
			return notModifiedResponse(cacheParamsOf(cached, board))
		}

		// A conditional GET whose etag no longer matches: the board has re-rendered since it was cached,
		// so the bytes are needed after all. Every header below is derived from this second read, so a
		// render landing between the two cannot make them describe bytes we did not send.
		if (wantsBody && !('body' in cached)) {
			cached = await env.THUMBNAILS?.get(cacheKey)
			if (!cached) return redirectToDefaultOgImage(imageUrl)
		}

		writeScreenshotTelemetry(env, { source: 'og', cacheStatus: cacheStatusOf(cached, board) })
		return imageResponse(
			wantsBody ? await (cached as R2ObjectBody).arrayBuffer() : null,
			cacheParamsOf(cached, board)
		)
	}

	// Never rendered, so the board has nothing of its own to show and the request is sent to the
	// site-wide default instead. The short max-age is what lets the real image take over as soon as a
	// publish or an edit lands it.
	writeScreenshotTelemetry(env, {
		source: 'og',
		cacheStatus: 'miss',
		failureReason: 'not_rendered_yet',
	})
	await repairMissingPublishedImage(board, env, ctx)
	return redirectToDefaultOgImage(imageUrl)
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

/**
 * The one case where this route asks for a render, and it is a repair rather than a refresh.
 *
 * The two kinds are not symmetric in how many triggers they have. A shared file re-asks on every
 * persist that advances its document clock, so an ask lost to a queue failure or a stale pending
 * marker is made good by the next edit. A published board has exactly one trigger — the publish
 * effect in `publishSnapshots.ts` — and its snapshot is frozen, so nothing ever edits it into
 * asking again. One lost ask there means a generic card until somebody republishes.
 *
 * So this fires only for `published`, and only on a total miss: no image at all, not a stale one.
 * The pending marker dedupes it while a job is alive, and the repair cooldown bounds it after one
 * dies: this is the only render ask an unauthenticated request can cause, so once a crawler-triggered
 * job has burnt its whole retry budget, a board that cannot render costs one retry chain per
 * OG_REPAIR_COOLDOWN_MS rather than one per marker-clear — traffic an outside caller controls must
 * not be able to re-arm it faster than that.
 *
 * This does not undo the reasoning that removed the general on-miss enqueue. That enqueue was
 * pointless because the crawler which triggered it has already cached the default by the time the
 * render lands, and unfurl platforms resolve a card once — both still true. The point here is not to
 * serve *this* request; it is that without it, nothing else will ever ask.
 */
async function repairMissingPublishedImage(
	board: ResolvedThumbnailBoard,
	env: Environment,
	ctx: ExecutionContext | undefined
) {
	if (board.kind !== 'published') return
	if (await isOgImageRepairOnCooldown(env, board)) return
	const enqueued = enqueueOgImageRender(env, board, { reason: 'crawler' }).catch((error) => {
		reportThumbnailError(error, {
			ctx,
			env,
			surface: 'og_route',
			extras: { kind: board.kind, repair: true },
		})
	})
	// Off the response path in production; awaited only when there is no execution context to hand it
	// to, which is tests.
	if (ctx) ctx.waitUntil(enqueued)
	else await enqueued
}

// Whether the image still depicts the board's current content decides the cache lifetime and nothing
// else — both are served. There is no "too stale to serve": an old picture of this board beats the
// generic tldraw logo, so a mismatch only asks callers back sooner.
function cacheStatusOf(cached: R2Object, board: ResolvedThumbnailBoard) {
	return cached.customMetadata?.version === String(board.version) ? 'hit' : 'stale'
}

function cacheParamsOf(cached: R2Object, board: ResolvedThumbnailBoard): CacheParams {
	const cacheStatus = cacheStatusOf(cached, board)
	return {
		cacheStatus,
		maxAgeSeconds:
			cacheStatus === 'hit' ? OG_FRESH_IMAGE_MAX_AGE_SECONDS : OG_STALE_IMAGE_MAX_AGE_SECONDS,
		etag: cached.httpEtag,
		version: cached.customMetadata?.version,
	}
}

interface CacheParams {
	cacheStatus: 'hit' | 'stale'
	maxAgeSeconds: number
	etag?: string
	version?: string
}

// `if-none-match` is a list, each entry optionally weak-prefixed and quoted; R2's `etag` is the bare
// value, so both sides are normalised before comparing.
function etagMatches(ifNoneMatch: string, etag: string) {
	return ifNoneMatch
		.split(',')
		.map((candidate) => candidate.trim().replace(/^W\//, '').replace(/^"|"$/g, ''))
		.some((candidate) => candidate === '*' || candidate === etag)
}

function cacheHeaders({ cacheStatus, maxAgeSeconds, etag, version }: CacheParams) {
	return {
		// No `stale-while-revalidate`: it would let a cache keep serving for a day past expiry, which is
		// a day of serving without the share gate — the same reason the default-image redirect carries
		// none. See OG_FRESH_IMAGE_MAX_AGE_SECONDS in config.ts.
		'cache-control': `public, max-age=${maxAgeSeconds}`,
		'x-tldraw-og-cache': cacheStatus,
		...(etag ? { etag } : null),
		...(version ? { 'x-tldraw-og-version': version } : null),
	}
}

function imageResponse(body: ArrayBuffer | null, params: CacheParams) {
	return new Response(body, {
		headers: { 'content-type': 'image/png', ...cacheHeaders(params) },
	})
}

// A 304 carries no body, and its headers refresh what the caller already holds.
function notModifiedResponse(params: CacheParams) {
	return new Response(null, { status: 304, headers: cacheHeaders(params) })
}

// Sends a request with no board image of its own to the site-wide default. The worker never serves
// those bytes itself: the default is a static asset on the client origin, already cached at the edge,
// and proxying it would put worker egress in front of every unfurl of an unrendered board.
function redirectToDefaultOgImage(imageUrl: string) {
	return new Response(null, {
		status: 302,
		headers: {
			location: imageUrl,
			'cache-control': `public, max-age=${OG_FALLBACK_MAX_AGE_SECONDS}`,
		},
	})
}

import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'
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

const OG_IMAGE_MIN_REFRESH_AGE_MS = 60 * 60_000
const OG_IMAGE_BROWSER_RATE_LIMIT = 60
const OG_IMAGE_BOARD_RATE_LIMIT = 20
const DEFAULT_OG_IMAGE_PATH = '/social-og.png'
const DEFAULT_OG_IMAGE_MAX_AGE_SECONDS = 60 * 60
const OG_IMAGE_MAX_AGE_SECONDS = 60 * 60

type OgBoardKind = 'published' | 'shared_file'

interface ResolvedOgBoard {
	kind: OgBoardKind
	slug: string
	fileId: string
	version: string | number
}

export async function getOgImage(request: IRequest, env: Environment): Promise<Response> {
	const board = await resolveOgBoard(request, env).catch(() => null)
	if (!board) return redirectToDefaultOgImage(request, env)

	const cacheKey = getOgImageCacheKey(board)
	const cached = await env.THUMBNAILS?.get(cacheKey)
	const now = Date.now()
	if (cached && shouldServeCachedOgImage(cached, board.version, now)) {
		return imageResponse(await cached.arrayBuffer(), {
			cacheStatus: 'hit',
			version: cached.customMetadata?.version,
		})
	}

	if (
		(await isRateLimited(env.MCP_SCREENSHOT_RATE_LIMITER, `og-board:${board.kind}:${board.slug}`, {
			fallbackLimit: OG_IMAGE_BOARD_RATE_LIMIT,
		})) ||
		(await isRateLimited(env.MCP_SCREENSHOT_BROWSER_RATE_LIMITER, 'og-global', {
			fallbackLimit: OG_IMAGE_BROWSER_RATE_LIMIT,
		}))
	) {
		if (cached) {
			return imageResponse(await cached.arrayBuffer(), {
				cacheStatus: 'stale',
				version: cached.customMetadata?.version,
			})
		}
		return redirectToDefaultOgImage(request, env)
	}

	try {
		const job: ThumbnailRenderJob = {
			v: 1,
			kind: board.kind,
			slug: board.slug,
			fileId: board.fileId,
			version: board.version,
			camera: 'content',
			x: 0,
			y: 0,
			z: 1,
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
			theme: 'light',
			exp: now + THUMBNAIL_RENDER_TOKEN_TTL_MS,
		}
		const token = await mintThumbnailRenderToken(env, job)
		const renderUrl = buildThumbnailRenderUrl(getRenderOrigin(env), token)
		const browserRun = await captureWithBrowserRun(
			renderUrl,
			{ width: DEFAULT_THUMBNAIL_WIDTH, height: DEFAULT_THUMBNAIL_HEIGHT },
			env
		)

		await env.THUMBNAILS?.put(cacheKey, browserRun.png, {
			httpMetadata: { contentType: 'image/png' },
			customMetadata: {
				version: String(board.version),
				createdAt: String(now),
			},
		})

		return imageResponse(browserRun.png, {
			cacheStatus: 'miss',
			version: String(board.version),
		})
	} catch {
		if (cached) {
			return imageResponse(await cached.arrayBuffer(), {
				cacheStatus: 'stale',
				version: cached.customMetadata?.version,
			})
		}
		return redirectToDefaultOgImage(request, env)
	}
}

export async function getOgHtml(request: IRequest, env: Environment): Promise<Response> {
	const kind = parseOgKind(request.params.kind)
	const slug = parseSlug(request.params.slug)
	const origin = getPublicOrigin(request, env)
	const canonicalUrl =
		kind && slug ? `${origin}/${kind === 'published' ? 'p' : 'f'}/${slug}` : origin
	const imageUrl =
		kind && slug
			? `${origin}/api/app/og-image/${kind === 'published' ? 'p' : 'f'}/${slug}`
			: `${origin}${DEFAULT_OG_IMAGE_PATH}`

	return new Response(
		`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>tldraw</title>
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
<meta name="description" content="A free and instant collaborative whiteboarding tool.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="tldraw">
<meta name="twitter:description" content="A free and instant collaborative whiteboarding tool.">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">
<meta name="twitter:image:alt" content="A collaborative whiteboarding tool interface">
<meta property="og:type" content="website">
<meta property="og:title" content="tldraw">
<meta property="og:description" content="A free and instant collaborative whiteboarding tool.">
<meta property="og:site_name" content="tldraw">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:image:width" content="${DEFAULT_THUMBNAIL_WIDTH}">
<meta property="og:image:height" content="${DEFAULT_THUMBNAIL_HEIGHT}">
<meta property="og:image:alt" content="A collaborative whiteboarding tool interface">
</head>
<body><a href="${escapeHtml(canonicalUrl)}">Open in tldraw</a></body>
</html>`,
		{
			headers: {
				'content-type': 'text/html; charset=utf-8',
				'cache-control': `public, max-age=${DEFAULT_OG_IMAGE_MAX_AGE_SECONDS}`,
			},
		}
	)
}

export function getOgImageCacheKey(board: Pick<ResolvedOgBoard, 'kind' | 'slug'>) {
	return `og/${board.kind}/${board.slug}/${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT}/light.png`
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
	const kind = parseOgKind(request.params.kind)
	const slug = parseSlug(request.params.slug)
	if (!kind || !slug) return null

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
		version,
	}: {
		cacheStatus: 'hit' | 'miss' | 'stale'
		version?: string
	}
) {
	return new Response(body, {
		headers: {
			'content-type': 'image/png',
			'cache-control': `public, max-age=${OG_IMAGE_MAX_AGE_SECONDS}, stale-while-revalidate=86400`,
			'x-tldraw-og-cache': cacheStatus,
			...(version ? { 'x-tldraw-og-version': version } : null),
		},
	})
}

function redirectToDefaultOgImage(request: IRequest, env: Environment) {
	return Response.redirect(`${getPublicOrigin(request, env)}${DEFAULT_OG_IMAGE_PATH}`, 302)
}

function getPublicOrigin(request: IRequest, env: Environment) {
	const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
	const host = forwardedHost ?? request.headers.get('host')
	const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'https'
	if (host && !host.endsWith('.workers.dev')) {
		return `${proto}://${host}`
	}
	if (env.MCP_SCREENSHOT_RENDER_ORIGIN) return env.MCP_SCREENSHOT_RENDER_ORIGIN
	return new URL(request.url).origin
}

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (char) => {
		switch (char) {
			case '&':
				return '&amp;'
			case '<':
				return '&lt;'
			case '>':
				return '&gt;'
			case '"':
				return '&quot;'
			default:
				return '&#39;'
		}
	})
}

import { decodeJwt } from '@clerk/backend/jwt'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { isRoomIdTooLong } from '../../utils/roomIdIsTooLong'
import { getAuth } from '../../utils/tla/getAuth'
import { authenticateMcpRequest } from './mcpAuth'
import { resolveSharedBoardForUser } from './mcpServer'
import { getOgImageCacheKey } from './ogImageQueue'
import { writeScreenshotTelemetry } from './thumbnailRender'
import { cacheStatusOf, etagMatches, reportThumbnailError } from './thumbnailShared'

// The owner-facing read of the board thumbnails the edit trigger already renders. Sibling of the OG
// route, and deliberately not the same route: that one asks "is this board public", this one asks
// "can this caller see it", which is the only question that lets a private board's image be served.
//
// Spends no Browser Run. A board with no stored thumbnail is a 404 rather than a render: the render
// triggers are the things that change a board's content, and a request that finds no thumbnail is
// not one of them. Opening that tap here would make listing boards a render per tile. See
// browser-run-thumbnails.md.

export async function getBoardThumbnail(
	request: IRequest,
	env: Environment,
	ctx?: ExecutionContext
): Promise<Response> {
	const auth = await authenticate(request, env, ctx)
	if (!auth.ok) return auth.response

	const boardId = request.params.boardId
	if (typeof boardId !== 'string' || boardId === '' || isRoomIdTooLong(boardId)) {
		return notFound()
	}

	try {
		const resolved = await resolveSharedBoardForUser(env, boardId, auth.userId)
		if (!resolved.ok) {
			// "No such board" and "you cannot see it" are the same 404, or this route is an existence
			// oracle for file ids. A board with nothing drawn on it yet is counted, because it is the
			// commonest reason a tile is blank and the miss rate would otherwise exclude it.
			if (resolved.reason === 'board_empty') {
				writeScreenshotTelemetry(env, {
					source: 'board_view',
					cacheStatus: 'miss',
					failureReason: 'board_empty',
				})
			}
			return notFound()
		}
		const board = resolved.board

		const cacheKey = getOgImageCacheKey(board)
		const ifNoneMatch = request.headers.get('if-none-match')
		const cached = ifNoneMatch
			? await env.THUMBNAILS?.head(cacheKey)
			: await env.THUMBNAILS?.get(cacheKey)
		if (!cached) {
			writeScreenshotTelemetry(env, {
				source: 'board_view',
				cacheStatus: 'miss',
				failureReason: 'not_rendered_yet',
			})
			return notFound()
		}

		writeScreenshotTelemetry(env, {
			source: 'board_view',
			cacheStatus: cacheStatusOf(cached, board.version),
		})
		if (ifNoneMatch && etagMatches(ifNoneMatch, cached.etag)) {
			return new Response(null, { status: 304, headers: cacheHeaders(cached) })
		}
		// A conditional GET whose etag no longer matches needs the bytes after all; the headers come
		// from this second read so a render landing in between cannot describe bytes we did not send.
		const body = 'body' in cached ? (cached as R2ObjectBody) : await env.THUMBNAILS?.get(cacheKey)
		if (!body) return notFound()
		return new Response(await body.arrayBuffer(), {
			headers: { 'content-type': 'image/png', ...cacheHeaders(body) },
		})
	} catch (error) {
		// Postgres or R2 failing, not a missing board. A 404 here would draw placeholders straight
		// through an outage and never be counted.
		reportThumbnailError(error, {
			ctx,
			env,
			request,
			surface: 'board_view',
			// No board identifier: for a shared file the id is the capability to view the board.
			extras: {},
		})
		return new Response(null, { status: 500 })
	}
}

// `private, no-cache`: the image may be of a private board, so no shared cache may keep it, and the
// caller revalidates every time so each use re-runs the access check. The etag makes that a 304.
function cacheHeaders(cached: R2Object) {
	const version = cached.customMetadata?.version
	return {
		'cache-control': 'private, no-cache',
		vary: 'cookie, authorization',
		etag: cached.httpEtag,
		...(version ? { 'x-tldraw-thumbnail-version': version } : null),
	}
}

function notFound() {
	return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } })
}

type Authenticated = { ok: true; userId: string } | { ok: false; response: Response }

/**
 * An OAuth access token goes to the MCP verifier; everything else — the session cookie, or the
 * Clerk session JWT the web client sends as a bearer — goes to `getAuth`. Routed on the token's
 * `typ` rather than by trying one verifier and falling back to the other, so each request is
 * verified once, and an expired web session gets a plain 401 instead of an MCP challenge it cannot
 * act on.
 */
async function authenticate(
	request: IRequest,
	env: Environment,
	ctx: ExecutionContext | undefined
): Promise<Authenticated> {
	if (isOAuthAccessToken(request)) {
		try {
			const bearer = await authenticateMcpRequest(request, env)
			return bearer.ok
				? { ok: true, userId: bearer.userId }
				: { ok: false, response: bearer.response }
		} catch (error) {
			reportThumbnailError(error, { ctx, env, request, surface: 'board_view', extras: {} })
			return { ok: false, response: new Response(null, { status: 500 }) }
		}
	}

	const session = await getAuth(request, env).catch((error) => {
		// Clerk unreachable, not a signed-out caller: without this report, an outage silently degrades
		// every cookie-holding request to the same plain 401 a caller with no session gets at all.
		reportThumbnailError(error, { ctx, env, request, surface: 'board_view', extras: {} })
		return null
	})
	if (session?.userId) return { ok: true, userId: session.userId }
	return { ok: false, response: new Response(null, { status: 401 }) }
}

// RFC 9068 access tokens carry `typ: at+jwt`; Clerk session JWTs carry `typ: JWT`. Unverified here —
// this only picks the verifier, and each verifier checks `typ` again.
function isOAuthAccessToken(request: IRequest): boolean {
	const match = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get('authorization') ?? '')
	if (!match) return false
	try {
		return String(decodeJwt(match[1]).header.typ).toLowerCase() === 'at+jwt'
	} catch {
		return false
	}
}

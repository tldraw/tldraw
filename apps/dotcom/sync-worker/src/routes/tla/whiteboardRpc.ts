import { notFound } from '@tldraw/worker-shared'
import { IRequest, StatusError } from 'itty-router'
import { Environment } from '../../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../../utils/roomIdIsTooLong'
import { requireApiTokenAuth } from '../../utils/tla/getApiTokenAuth'
import { requireWriteAccessForUser } from '../../utils/tla/getAuth'

export const INTERNAL_API_USER_HEADER = 'X-Internal-Api-User-Id'
export const INTERNAL_API_TOKEN_HEADER = 'X-Internal-Api-Token-Id'

// TODO: rate-limit per token id and per IP using env.RATE_LIMITER before the
// pg lookup / DO forward, so a leaked token can't hammer the DB or a file DO.
export async function whiteboardRpc(request: IRequest, env: Environment): Promise<Response> {
	const fileSlug = request.params.fileSlug
	if (!fileSlug) return notFound()
	if (isRoomIdTooLong(fileSlug)) return roomIdIsTooLong()

	let auth: { userId: string; tokenId: string }
	try {
		auth = await requireApiTokenAuth(request, env)
		await requireWriteAccessForUser(env, auth.userId, fileSlug)
	} catch (e) {
		if (e instanceof StatusError) {
			return Response.json({ error: true, message: e.message }, { status: e.status })
		}
		throw e
	}

	const id = env.TLDR_DOC.idFromName(`/r/${fileSlug}`)
	const stub = env.TLDR_DOC.get(id)

	const forwarded = new Request(
		new URL(`/app/file/${fileSlug}/whiteboard-rpc`, request.url).toString(),
		request
	)
	forwarded.headers.set(INTERNAL_API_USER_HEADER, auth.userId)
	forwarded.headers.set(INTERNAL_API_TOKEN_HEADER, auth.tokenId)
	return stub.fetch(forwarded)
}

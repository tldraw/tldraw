import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { fourOhFour } from '../utils/fourOhFour'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'

// This is the entry point for joining an existing room
export async function joinExistingRegularRoom(
	request: IRequest,
	env: Environment
): Promise<Response> {
	return joinExistingRoom(request, env, false)
}

export async function joinExistingReadonlyRoom(
	request: IRequest,
	env: Environment
): Promise<Response> {
	return joinExistingRoom(request, env, true)
}

export async function joinExistingRoom(
	request: IRequest,
	env: Environment,
	isReadonly: boolean
): Promise<Response> {
	const slug = request.params.slug
	const roomId = isReadonly ? await env.READONLY_SLUG_TO_SLUG.get(slug) : slug
	if (!roomId) return fourOhFour()

	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	// This needs to be a websocket request!
	if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
		// Set up the durable object for this room
		const id = env.TLDR_DOC.idFromName(`/r/${roomId}`)
		return env.TLDR_DOC.get(id).fetch(request)
	}

	return fourOhFour()
}

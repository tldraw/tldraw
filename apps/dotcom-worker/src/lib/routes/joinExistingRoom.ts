import { lns } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { fourOhFour } from '../utils/fourOhFour'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'

// This is the entry point for joining an existing room (non-readonly)
export async function joinExistingRegularRoom(
	request: IRequest,
	env: Environment
): Promise<Response> {
	return joinExistingRoom(request, env, request.params.roomId)
}

// This is the entry point for joining an existing readonly room
export async function joinExistingLegacyReadonlyRoom(
	request: IRequest,
	env: Environment
): Promise<Response> {
	const roomId = request.params.roomId && lns(request.params.roomId)
	return joinExistingRoom(request, env, roomId)
}

// This is the entry point for joining an existing readonly room
export async function joinExistingReadonlyRoom(
	request: IRequest,
	env: Environment
): Promise<Response> {
	const roomId =
		request.params.roomId && (await env.READONLY_SLUG_TO_SLUG.get(request.params.roomId))
	return joinExistingRoom(request, env, roomId)
}

async function joinExistingRoom(
	request: IRequest,
	env: Environment,
	roomId: string | null
): Promise<Response> {
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

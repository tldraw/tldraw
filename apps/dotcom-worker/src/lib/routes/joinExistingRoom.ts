import { ReadonlyStatus } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { fourOhFour } from '../utils/fourOhFour'
import { getSlug } from '../utils/readonly'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'

export async function joinExistingRoom(
	request: IRequest,
	env: Environment,
	readonlyStatus: ReadonlyStatus
): Promise<Response> {
	const roomId = await getSlug(env, request.params.roomId, readonlyStatus)
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

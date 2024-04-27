import { ROOM_PREFIX, RoomOpenMode } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { fourOhFour } from '../utils/fourOhFour'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { getSlug } from '../utils/roomOpenMode'

export async function joinExistingRoom(
	request: IRequest,
	env: Environment,
	roomOpenMode: RoomOpenMode
): Promise<Response> {
	const roomId = await getSlug(env, request.params.roomId, roomOpenMode)
	if (!roomId) return fourOhFour()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	// This needs to be a websocket request!
	if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
		// Set up the durable object for this room
		const id = env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${roomId}`)
		return env.TLDR_DOC.get(id).fetch(request)
	}

	return fourOhFour()
}

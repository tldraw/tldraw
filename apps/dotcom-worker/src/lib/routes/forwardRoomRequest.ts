import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { fourOhFour } from '../utils/fourOhFour'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'

// Forwards a room request to the durable object associated with that room
export async function forwardRoomRequest(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId

	if (!roomId) return fourOhFour()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	// Set up the durable object for this room
	const id = env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${roomId}`)
	return env.TLDR_DOC.get(id).fetch(request)
}

import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { getRoomDurableObjectId } from '../../utils/durableObjects'
import { isRoomIdTooLong, roomIdIsTooLong } from '../../utils/roomIdIsTooLong'

// Forwards a room request to the durable object associated with that room
export async function forwardRoomRequest(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId

	if (!roomId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	// Set up the durable object for this room
	const id = getRoomDurableObjectId(env, roomId)
	return env.TLDR_DOC.get(id).fetch(request)
}

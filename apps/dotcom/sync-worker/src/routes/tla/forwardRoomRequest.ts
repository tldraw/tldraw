import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { getRoomDurableObject } from '../../utils/durableObjects'
import { isRoomIdTooLong, roomIdIsTooLong } from '../../utils/roomIdIsTooLong'

// Forwards a room request to the durable object associated with that room
export async function forwardRoomRequest(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId

	if (!roomId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	// getRoomDurableObject will route to the appropriate DO based on ENABLE_FILE_DURABLE_OBJECT
	const durableObject = getRoomDurableObject(env, roomId)
	return durableObject.fetch(request)
}

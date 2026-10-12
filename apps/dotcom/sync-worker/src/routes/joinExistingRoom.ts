import { RoomOpenMode } from '@tldraw/dotcom-shared'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { stampRoomRequest } from '../utils/connectRouting'
import { getRoomDurableObjectId } from '../utils/durableObjects'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { getSlug } from '../utils/roomOpenMode'

export async function joinExistingRoom(
	request: IRequest,
	env: Environment,
	roomOpenMode: RoomOpenMode
): Promise<Response> {
	const receivedAt = Date.now()
	const roomId = await getSlug(env, request.params.roomId, roomOpenMode)
	if (!roomId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	// This needs to be a websocket request!
	if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
		// Set up the durable object for this room
		const id = getRoomDurableObjectId(env, roomId)
		return env.TLDR_DOC.get(id).fetch(stampRoomRequest(request as unknown as Request, receivedAt))
	}

	return notFound()
}

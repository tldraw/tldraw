import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { stampRoomRequest } from '../../utils/connectRouting'
import { getRoomDurableObjectId } from '../../utils/durableObjects'
import { LOAD_ID_PARAM, parseLoadId } from '../../utils/loadId'
import { isRoomIdTooLong, roomIdIsTooLong } from '../../utils/roomIdIsTooLong'

// Forwards a room request to the durable object associated with that room
export async function forwardRoomRequest(request: IRequest, env: Environment): Promise<Response> {
	const receivedAt = Date.now()
	const roomId = request.params.roomId

	if (!roomId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	// Set up the durable object for this room
	const id = getRoomDurableObjectId(env, roomId)
	const response = await env.TLDR_DOC.get(id).fetch(
		stampRoomRequest(request as unknown as Request, receivedAt)
	)
	const loadId = parseLoadId(new URL(request.url).searchParams.get(LOAD_ID_PARAM))
	// One machine's clock, so a cross-check for the echoed route step, which spans two.
	if (loadId) {
		writeDataPoint(undefined, env.MEASURE, env, 'forward_room_request', {
			blobs: [loadId],
			doubles: [Date.now() - receivedAt],
		})
	}
	return response
}

import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { fourOhFour } from '../utils/fourOhFour'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'

export async function joinExistingRoom(
	request: IRequest,
	env: Environment,
): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return fourOhFour()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	// This needs to be a websocket request!
	if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
		// Set up the durable object for this room
		const id = env.BEMO_DO.idFromName(`/connect/${roomId}`)
		return env.BEMO_DO.get(id).fetch(request)
	}

	return fourOhFour()
}

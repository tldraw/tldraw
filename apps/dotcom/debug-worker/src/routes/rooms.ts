import { IRequest } from 'itty-router'
import { Environment } from '../environment'
import { getR2Key } from '../utils/roomUtils'

export async function getRoom(
	request: IRequest,
	env: Environment,
	isApp: boolean
): Promise<Response> {
	const roomId = request.params.roomId

	if (!roomId) {
		return new Response('Room ID is required', { status: 400 })
	}

	const roomBucket = env.ROOMS

	const room = await roomBucket.get(getR2Key(isApp, roomId))

	return new Response(JSON.stringify(room), {
		headers: { 'content-type': 'application/json' },
	})
}

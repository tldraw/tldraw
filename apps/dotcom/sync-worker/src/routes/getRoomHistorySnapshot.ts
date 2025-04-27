import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'

// Get a snapshot of the room at a given point in time
export async function getRoomHistorySnapshot(
	request: IRequest,
	env: Environment
): Promise<Response> {
	const roomId = request.params.roomId

	if (!roomId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	const timestamp = request.params.timestamp

	const versionCacheBucket = env.ROOMS_HISTORY_EPHEMERAL

	const result = await versionCacheBucket.get(
		getR2KeyForRoom({ slug: roomId, isApp: false }) + '/' + timestamp
	)

	if (!result) {
		return new Response('Not found', { status: 404 })
	}

	return new Response(result.body, {
		headers: { 'content-type': 'application/json' },
	})
}

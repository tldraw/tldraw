import { forbidden, notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../postgres'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { requireAuth } from '../utils/tla/getAuth'

// Get a snapshot of the room at a given point in time
export async function getRoomHistorySnapshot(
	request: IRequest,
	env: Environment,
	isApp: boolean
): Promise<Response> {
	const roomId = request.params.roomId

	if (!roomId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	if (isApp) {
		const { userId } = await requireAuth(request, env)
		const db = createPostgresConnectionPool(env, 'sync-worker/getRoomHistorySnapshot')
		const file = await db
			.selectFrom('file')
			.select('ownerId')
			.where('id', '=', roomId)
			.executeTakeFirst()
		if (!file) return notFound()
		if (file.ownerId !== userId) return forbidden()
	}

	const timestamp = request.params.timestamp

	const versionCacheBucket = env.ROOMS_HISTORY_EPHEMERAL

	const result = await versionCacheBucket.get(
		getR2KeyForRoom({ slug: roomId, isApp }) + '/' + timestamp
	)

	if (!result) {
		return new Response('Not found', { status: 404 })
	}

	return new Response(result.body, {
		headers: { 'content-type': 'application/json' },
	})
}

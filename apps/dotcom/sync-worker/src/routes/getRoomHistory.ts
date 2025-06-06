import { forbidden, notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../postgres'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { requireAuth } from '../utils/tla/getAuth'

// Returns the history of a room as a list of objects with timestamps
export async function getRoomHistory(
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

	const versionCacheBucket = env.ROOMS_HISTORY_EPHEMERAL
	const bucketKey = getR2KeyForRoom({ slug: roomId, isApp })

	let batch = await versionCacheBucket.list({
		prefix: bucketKey,
	})
	const result = [...batch.objects.map((o) => o.key)]

	// ✅ - use the truncated property to check if there are more
	// objects to be returned
	while (batch.truncated) {
		const next = await versionCacheBucket.list({
			cursor: batch.cursor,
		})
		result.push(...next.objects.map((o) => o.key))

		batch = next
	}

	// these are ISO timestamps, so they sort lexicographically
	result.sort()

	return new Response(JSON.stringify(result), {
		headers: { 'content-type': 'application/json' },
	})
}

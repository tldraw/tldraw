import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'
import { getCurrentSerializedRoomSnapshot } from '../../utils/tla/getCurrentSerializedRoomSnapshot'
import { getTldrawAppFileRecord } from '../../utils/tla/getTldrawAppFileRecord'
import { getUserIdFromRequest } from '../../utils/tla/permissions'

// Publish a file or replace the published file.
export async function publishFile(request: IRequest, env: Environment): Promise<Response> {
	const { roomId } = request.params
	if (!roomId) {
		return Response.json({ error: true, message: 'Room ID is required' }, { status: 400 })
	}

	const userId = await getUserIdFromRequest(request, env)
	if (!userId) {
		return Response.json({ error: true, message: 'No user' }, { status: 401 })
	}

	try {
		const file = await getTldrawAppFileRecord(roomId, env)

		if (!file) {
			throw Error('not-found')
		}

		// A user can only publish their own files
		if (file.ownerId !== userId) {
			throw Error('forbidden')
		}

		// Get the current snapshot of the room (by waking up the worker, if we have to)
		const serializedSnapshot = await getCurrentSerializedRoomSnapshot(roomId, env)

		// Create a new slug for the published room
		await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put(file.publishedSlug, roomId)

		// Bang the snapshot into the database
		await env.ROOM_SNAPSHOTS.put(
			getR2KeyForRoom({ slug: `${roomId}/${file.publishedSlug}`, isApp: true }),
			serializedSnapshot
		)

		return new Response(JSON.stringify({ error: false }))
	} catch (e: any) {
		return new Response(JSON.stringify({ error: true, message: e.message }), { status: 500 })
	}
}

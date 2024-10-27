import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'
import { getTldrawAppFileRecord } from '../../utils/tla/getTldrawAppFileRecord'
import { getUserIdFromRequest } from '../../utils/tla/permissions'

// Unpublish a file.
export async function unpublishFile(request: IRequest, env: Environment): Promise<Response> {
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

		// Create a new slug for the published room
		await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(file.publishedSlug)

		// Bang the snapshot into the database
		await env.ROOM_SNAPSHOTS.delete(
			getR2KeyForRoom({ slug: `${roomId}/${file.publishedSlug}`, isApp: true })
		)

		return new Response(JSON.stringify({ error: false }))
	} catch (e: any) {
		return new Response(JSON.stringify({ error: true, message: e.message }), { status: 500 })
	}
}

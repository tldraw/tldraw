import { TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'
import { getCurrentSerializedRoomSnapshot } from '../../utils/tla/getCurrentSerializedRoomSnapshot'
import { getTldrawAppDurableObject } from '../../utils/tla/getTldrawAppDurableObject'
import { getUserIdFromRequest } from '../../utils/tla/permissions'

// Duplicates a file based on the freshest data available on the server.
export async function duplicateFile(request: IRequest, env: Environment): Promise<Response> {
	const { roomId } = request.params
	if (!roomId) {
		return Response.json({ error: true, message: 'Room ID is required' }, { status: 400 })
	}

	const userId = await getUserIdFromRequest(request, env)
	if (!userId) {
		return Response.json({ error: true, message: 'No user' }, { status: 401 })
	}

	try {
		const app = getTldrawAppDurableObject(env)

		const file = await app.getFileBySlug(roomId)

		if (!file) {
			throw Error('not-found')
		}

		// A user can duplicate other users' files only if they are shared
		if (file.ownerId !== userId) {
			if (!file.shared) {
				throw Error('forbidden')
			}
		}

		// Get the current serialized snapshot of the room (by waking up the worker,
		// if we have to). Why not grab from the database directly? Because the worker
		// only persists every ~10s while users are actively editing the room. If we
		// knew whether the room was active or not (either by checking whether the
		// worker was awake or somehow recording which rooms have active users in them,
		// or when the room was last edited) we could make a better decision.
		const serializedSnapshot = await getCurrentSerializedRoomSnapshot(roomId, env)

		// Create a new slug for the duplicated room
		const newSlug = uniqueId()

		// Bang the snapshot into the database
		await env.ROOMS.put(getR2KeyForRoom({ slug: newSlug, isApp: true }), serializedSnapshot)

		// We're going to bake the name, even if it's blank
		const fileName = file.name.trim() || new Date(file.createdAt).toLocaleString('en-gb')

		await app.createNewFile(
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId(newSlug),
				ownerId: userId,
				name: fileName + ' Copy',
			})
		)

		return new Response(JSON.stringify({ error: false, slug: newSlug }))
	} catch (e: any) {
		return new Response(JSON.stringify({ error: true, message: e.message }), { status: 500 })
	}
}

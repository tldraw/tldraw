import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'
import { getTldrawAppDurableObject } from '../../utils/tla/getTldrawAppDurableObject'
import { getUserIdFromRequest } from '../../utils/tla/permissions'

// Create new files based on snapshots. This is used when dropping .tldr files onto the app.
export async function deleteFile(request: IRequest, env: Environment): Promise<Response> {
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

		// A user can only delete files that they own
		if (file.ownerId !== userId) {
			app.forgetFile(file, userId)
		} else {
			// Delete the file and all associated states
			app.deleteFileAndStates(file)

			if (file.published) {
				// Delete the mapping of the published slug to the parent slug
				await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(file.publishedSlug)

				// Delete the published file from the database, if any
				await env.ROOM_SNAPSHOTS.delete(
					getR2KeyForRoom({ slug: `${roomId}/${file.publishedSlug}`, isApp: true })
				)
			}
		}

		return new Response(JSON.stringify({ error: false }))
	} catch (e: any) {
		return new Response(JSON.stringify({ error: true, message: e.message }), { status: 500 })
	}
}

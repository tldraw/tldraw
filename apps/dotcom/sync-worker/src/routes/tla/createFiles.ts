import { CreateFilesRequestBody } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { createTLSchema } from '@tldraw/tlschema'
import { uniqueId } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'
import { getUserIdFromRequest } from '../../utils/tla/permissions'
import { validateSnapshot } from '../../utils/validateSnapshot'

// Create new files based on snapshots. This is used when dropping .tldr files onto the app.
export async function createFiles(request: IRequest, env: Environment): Promise<Response> {
	// The data sent from the client will include the data for the new room

	const userId = await getUserIdFromRequest(request, env)
	if (!userId) {
		return Response.json({ error: true, message: 'No user' }, { status: 401 })
	}

	const slugs: string[] = []
	const data = (await request.json()) as CreateFilesRequestBody

	for (const snapshot of data.snapshots) {
		// There's a chance the data will be invalid, so we check it first
		// need to maybe migrate the snapshot
		const snapshotResult = validateSnapshot(snapshot)
		if (!snapshotResult.ok) {
			return Response.json({ error: true, message: snapshotResult.error }, { status: 400 })
		}

		try {
			// Create the new snapshot
			const snapshot: RoomSnapshot = {
				schema: createTLSchema().serialize(),
				clock: 0,
				documents: Object.values(snapshotResult.value).map((r) => ({
					state: r,
					lastChangedClock: 0,
				})),
				tombstones: {},
			}

			const serializedSnapshot = JSON.stringify(snapshot)

			// Create a new slug for the room
			const newSlug = uniqueId()

			// Bang the snapshot into the database
			await env.ROOMS.put(getR2KeyForRoom({ slug: newSlug, isApp: true }), serializedSnapshot)

			// Now create a new file in the app durable object belonging to the user
			// const app = getTldrawAppDurableObject(env)
			// TODO: make the backend talk to zero
			// await app.createNewFile(
			// 	TldrawAppFileRecordType.create({
			// 		id: TldrawAppFileRecordType.createId(newSlug),
			// 		ownerId: userId,
			// 	})
			// )

			slugs.push(newSlug)
		} catch (e: any) {
			return new Response(JSON.stringify({ error: true, message: e.message }), { status: 500 })
		}
	}
	return new Response(JSON.stringify({ error: false, slugs }))
}

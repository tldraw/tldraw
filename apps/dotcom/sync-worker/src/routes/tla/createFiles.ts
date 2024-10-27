import { CreateFilesRequestBody } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { createTLSchema } from '@tldraw/tlschema'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { getTldrawAppDurableObject } from '../../utils/tla/getTldrawAppDurableObject'
import { getUserIdFromRequest } from '../../utils/tla/permissions'
import { validateSnapshot } from '../../utils/validateSnapshot'

// Create new files based on snapshots. This is used when dropping .tldr files onto the app.
export async function createFiles(request: IRequest, env: Environment): Promise<Response> {
	// The data sent from the client will include the data for the new room
	const data = (await request.json()) as CreateFilesRequestBody

	const userId = await getUserIdFromRequest(request, env)
	if (!userId) {
		return Response.json({ error: true, message: 'No user' }, { status: 401 })
	}

	const app = getTldrawAppDurableObject(env)

	const slugs: string[] = []

	for (const snapshot of data.snapshots) {
		// There's a chance the data will be invalid, so we check it first
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

			const { slug } = await app.createFile(snapshot, userId)
			slugs.push(slug)
		} catch (e: any) {
			return new Response(JSON.stringify({ error: true, message: e.message }), { status: 500 })
		}
	}
	return new Response(JSON.stringify({ error: false, slugs }))
}

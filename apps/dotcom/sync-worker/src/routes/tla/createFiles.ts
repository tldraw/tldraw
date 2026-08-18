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
	const userId = await getUserIdFromRequest(request, env)
	if (!userId) {
		return Response.json({ error: true, message: 'No user' }, { status: 401 })
	}

	const slugs: string[] = []
	const data = (await request.json()) as CreateFilesRequestBody

	for (const _snapshot of data.snapshots) {
		const snapshotResult = validateSnapshot(_snapshot)
		if (!snapshotResult.ok) {
			return Response.json({ error: true, message: snapshotResult.error }, { status: 400 })
		}

		const snapshot: RoomSnapshot = {
			schema: createTLSchema().serialize(),
			clock: 0,
			documents: Object.values(snapshotResult.value).map((r) => ({
				state: r,
				lastChangedClock: 0,
			})),
			tombstones: {},
		}

		const newSlug = uniqueId()
		await env.ROOMS.put(getR2KeyForRoom({ slug: newSlug, isApp: true }), JSON.stringify(snapshot))

		slugs.push(newSlug)
	}
	return new Response(JSON.stringify({ error: false, slugs }))
}

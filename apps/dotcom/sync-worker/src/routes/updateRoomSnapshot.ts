import { CreateSnapshotRequestBody } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForSnapshot } from '../r2'
import { Environment } from '../types'
import { validateSnapshot } from '../utils/validateSnapshot'

export interface R2Snapshot {
	parent_slug: CreateSnapshotRequestBody['parent_slug']
	drawing: RoomSnapshot
}

export async function updateRoomSnapshot(request: IRequest, env: Environment): Promise<Response> {
	const snapshotSlug = request.params.roomId
	console.log('snapshotSlug', snapshotSlug)
	if (!snapshotSlug) return notFound()
	const data = (await request.json()) as CreateSnapshotRequestBody

	const snapshotResult = validateSnapshot(data)
	if (!snapshotResult.ok) {
		return Response.json({ error: true, message: snapshotResult.error }, { status: 400 })
	}
	const parentSlug = data.parent_slug
	if (!parentSlug) {
		return notFound()
	}
	const persistedRoomSnapshot = {
		parent_slug: parentSlug,
		drawing: {
			schema: data.schema,
			clock: 0,
			documents: Object.values(data.snapshot).map((r) => ({
				state: r,
				lastChangedClock: 0,
			})),
			tombstones: {},
		},
	} satisfies R2Snapshot

	await env.ROOM_SNAPSHOTS.put(
		getR2KeyForSnapshot({ parentSlug, snapshotSlug, isApp: true }),
		JSON.stringify(persistedRoomSnapshot)
	)
	return new Response(JSON.stringify({ error: false, roomId: snapshotSlug }))
}

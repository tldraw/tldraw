import { CreateSnapshotRequestBody } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/tlsync'
import { IRequest } from 'itty-router'
import { nanoid } from 'nanoid'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'
import { validateSnapshot } from '../utils/validateSnapshot'

export type R2Snapshot = {
	parent_slug: CreateSnapshotRequestBody['parent_slug']
	drawing: RoomSnapshot
}

export async function createRoomSnapshot(request: IRequest, env: Environment): Promise<Response> {
	const data = (await request.json()) as CreateSnapshotRequestBody

	const snapshotResult = validateSnapshot(data)
	if (!snapshotResult.ok) {
		return Response.json({ error: true, message: snapshotResult.error }, { status: 400 })
	}

	const roomId = `v2_c_${nanoid()}`

	const persistedRoomSnapshot = {
		parent_slug: data.parent_slug,
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

	await env.ROOM_SNAPSHOTS.put(getR2KeyForRoom(roomId), JSON.stringify(persistedRoomSnapshot))

	return new Response(JSON.stringify({ error: false, roomId }))
}

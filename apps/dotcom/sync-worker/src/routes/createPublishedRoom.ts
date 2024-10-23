import { CreateSnapshotRequestBody } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { getR2KeyForSnapshot } from '../r2'
import { Environment } from '../types'
import { fileOwnerStatusErrorResponse, getFileOwnerStatus } from '../utils/permissions'
import { validateSnapshot } from '../utils/validateSnapshot'

export interface R2Snapshot {
	drawing: RoomSnapshot
}

export async function createPublishedRoom(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) {
		return Response.json({ error: true, message: 'Room ID is required' }, { status: 400 })
	}
	const data = (await request.json()) as CreateSnapshotRequestBody
	const parentSlug = data.parent_slug
	if (!parentSlug)
		return Response.json({ error: true, message: 'Parent slug is required' }, { status: 400 })

	const snapshotResult = validateSnapshot(data)
	if (!snapshotResult.ok) {
		return Response.json({ error: true, message: snapshotResult.error }, { status: 400 })
	}

	const persistedRoomSnapshot = {
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

	const status = await getFileOwnerStatus(request, env, parentSlug)
	if (!status.ok) {
		return fileOwnerStatusErrorResponse(status.error)
	}
	await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put(roomId, parentSlug)
	await env.ROOM_SNAPSHOTS.put(
		getR2KeyForSnapshot({ parentSlug, snapshotSlug: roomId, isApp: true }),
		JSON.stringify(persistedRoomSnapshot)
	)

	return new Response(JSON.stringify({ error: false }), { status: 201 })
}

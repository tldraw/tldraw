import { RoomSnapshot } from '@tldraw/sync-core'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForSnapshot } from '../r2'
import { Environment } from '../types'
import { R2Snapshot } from './createPublishedRoom'

export async function getPublishedRoom(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return notFound()

	const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(roomId)
	if (!parentSlug) return notFound()

	const publishedRoomSnapshot = await env.ROOM_SNAPSHOTS.get(
		getR2KeyForSnapshot({ parentSlug, snapshotSlug: roomId, isApp: true })
	)
	if (!publishedRoomSnapshot) return notFound()

	const data = ((await publishedRoomSnapshot.json()) as R2Snapshot)?.drawing as RoomSnapshot
	if (!data) return notFound()

	return new Response(
		JSON.stringify({
			records: data.documents.map((d) => d.state),
			schema: data.schema,
			error: false,
		}),
		{
			headers: { 'content-type': 'application/json' },
		}
	)
}

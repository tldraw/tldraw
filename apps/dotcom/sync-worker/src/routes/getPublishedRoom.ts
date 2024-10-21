import { RoomSnapshot } from '@tldraw/sync-core'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForSnapshots } from '../r2'
import { Environment } from '../types'
import { R2Snapshot } from './createPublishedRoom'

export async function getPublishedRoom(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return notFound()

	const prefix = getR2KeyForSnapshots({ parentSlug: roomId, isApp: true })
	const snapshot = await env.ROOM_SNAPSHOTS.get(prefix)
	if (!snapshot) return notFound()

	const data = ((await snapshot.json()) as R2Snapshot)?.drawing as RoomSnapshot
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

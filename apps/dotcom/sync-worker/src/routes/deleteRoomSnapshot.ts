import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForSnapshot } from '../r2'
import { Environment } from '../types'

export async function deleteRoomSnapshot(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return notFound()

	// Get the parent slug if it exists
	const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(roomId)
	// Within the app context the parent should always exist
	if (!parentSlug) return notFound()

	// Delete the snapshot
	await env.ROOM_SNAPSHOTS.delete(
		getR2KeyForSnapshot({ parentSlug, snapshotSlug: roomId, isApp: true })
	)

	return new Response('ok', { status: 200 })
}

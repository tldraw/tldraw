import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'

export async function deletePublishedRoom(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return notFound()

	// Delete the snapshot
	await env.ROOM_SNAPSHOTS.delete(getR2KeyForRoom({ slug: roomId, isApp: true }))

	return new Response('ok', { status: 200 })
}

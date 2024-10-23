import { IRequest } from 'itty-router'
import { getR2KeyForSnapshot } from '../r2'
import { Environment } from '../types'
import { getFileOwnerStatus, returnFileOwnerStatusErrorResponse } from '../utils/permissions'

export async function deletePublishedRoom(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return new Response('Room ID is required', { status: 400 })

	const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(roomId)
	if (!parentSlug) return new Response('Parent slug is required', { status: 400 })

	const fileOwnerStatus = await getFileOwnerStatus(request, env, parentSlug)
	if (!fileOwnerStatus.ok) {
		return returnFileOwnerStatusErrorResponse(fileOwnerStatus.error)
	}
	await env.ROOM_SNAPSHOTS.delete(
		getR2KeyForSnapshot({ parentSlug, snapshotSlug: roomId, isApp: true })
	)
	return new Response('ok', { status: 200 })
}

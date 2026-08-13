import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { getArtifactsRepoName, listArtifactsHistory } from '../utils/artifacts'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { requireAdminAccessToRequest } from '../utils/tla/getAuth'
import { isTestFile } from '../utils/tla/isTestFile'

/**
 * List Artifacts snapshot history for an app file. Staff-gated from day one (matching
 * the tightened R2 history policy, not Pierre's per-file write check). Response shape
 * matches the Pierre history route: `{entries: [{timestamp, commitHash}], nextCursor}`.
 */
export async function getArtifactsHistory(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId

	if (!roomId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	await requireAdminAccessToRequest(request, env)

	if (isTestFile(roomId)) {
		return new Response('Not found', { status: 404 })
	}

	try {
		const cursor = (request.query?.nextCursor as string | undefined) ?? null
		const page = await listArtifactsHistory(env, getArtifactsRepoName(roomId), cursor)
		if (page === null) {
			return new Response('Artifacts not available', { status: 503 })
		}
		return new Response(JSON.stringify(page), {
			headers: { 'content-type': 'application/json' },
		})
	} catch (error) {
		console.error('Failed to fetch Artifacts history:', error)
		return new Response('Failed to fetch history', { status: 500 })
	}
}

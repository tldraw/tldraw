import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import {
	getArtifactsRepoName,
	getSnapshotJsonAtCommit,
	isValidCommitHash,
} from '../utils/artifacts'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { requireAdminAccessToRequest } from '../utils/tla/getAuth'
import { isTestFile } from '../utils/tla/isTestFile'

/**
 * Serve the room snapshot at a given Artifacts commit — one blob read (the blob
 * layout's payoff over Pierre's tar-stream reassembly). Staff-gated; commit-addressed
 * so the response is immutable, but cached `private` since it sits behind auth.
 */
export async function getArtifactsHistorySnapshot(
	request: IRequest,
	env: Environment
): Promise<Response> {
	const roomId = request.params.roomId
	const commitHash = request.params.commitHash

	if (!roomId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()
	if (!commitHash || !isValidCommitHash(commitHash)) {
		return new Response('Invalid commit hash', { status: 400 })
	}

	await requireAdminAccessToRequest(request, env)

	if (isTestFile(roomId)) {
		return new Response('Not found', { status: 404 })
	}

	try {
		const snapshotJson = await getSnapshotJsonAtCommit(
			env,
			getArtifactsRepoName(roomId),
			commitHash
		)
		if (snapshotJson === null) {
			return new Response('Snapshot not found', { status: 404 })
		}
		return new Response(snapshotJson, {
			headers: {
				'content-type': 'application/json',
				'cache-control': 'private, max-age=31536000, immutable',
			},
		})
	} catch (error) {
		console.error('Failed to fetch Artifacts snapshot:', error)
		return new Response('Failed to fetch snapshot', { status: 500 })
	}
}

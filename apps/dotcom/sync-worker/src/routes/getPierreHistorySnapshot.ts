import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { createPierreClient } from '../utils/createPierreClient'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { requireWriteAccessToFile } from '../utils/tla/getAuth'
import { isTestFile } from '../utils/tla/isTestFile'

export async function getPierreHistorySnapshot(
	request: IRequest,
	env: Environment,
	isApp: boolean
): Promise<Response> {
	const roomId = request.params.roomId

	if (!roomId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	if (isApp) {
		await requireWriteAccessToFile(request, env, roomId)
	}

	if (isTestFile(roomId)) {
		return new Response('Not found', { status: 404 })
	}

	const commitHash = request.params.timestamp // This is actually the commit hash now
	if (!commitHash) {
		return new Response('Missing commit hash', { status: 400 })
	}

	const pierreClient = createPierreClient(env)
	if (!pierreClient) {
		return new Response('Pierre not available', { status: 503 })
	}

	try {
		const envName = env.TLDRAW_ENV || 'development'
		const repoId = `${envName}/snapshots/${roomId}`

		const repo = await pierreClient.findOne({ id: repoId })
		if (!repo) {
			return new Response('Not found', { status: 404 })
		}

		// Get the file stream and return it
		const fileStream = await repo.getFileStream({ path: 'snapshot.json', ref: commitHash })

		// The content should be the snapshot JSON
		return new Response(fileStream.body, {
			headers: {
				'content-type': 'application/json',
				// cache forever
				'Cache-Control': 'public, max-age=31536000, immutable',
			},
		})
	} catch (error) {
		console.error('Failed to fetch Pierre snapshot:', error)
		return new Response('Failed to fetch snapshot', { status: 500 })
	}
}

import { compact } from '@tldraw/utils'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { createPierreClient } from '../utils/createPierreClient'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { requireWriteAccessToFile } from '../utils/tla/getAuth'
import { isTestFile } from '../utils/tla/isTestFile'

export async function getPierreHistory(
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

	const pierreClient = createPierreClient(env)
	if (!pierreClient) {
		return new Response('Pierre not available', { status: 503 })
	}

	try {
		const envName = env.TLDRAW_ENV || 'development'
		const repoId = `${envName}/files/${roomId}`

		const repo = await pierreClient.findOne({ id: repoId })
		if (!repo) {
			// No history yet
			return new Response(
				JSON.stringify({
					entries: [],
					nextCursor: null,
				}),
				{
					headers: { 'content-type': 'application/json' },
				}
			)
		}

		// Get commits with pagination
		const limit = 1000
		const nextCursor = request.query?.nextCursor as string | undefined

		const commitsResult = await repo.listCommits({ branch: 'main', limit, cursor: nextCursor })

		// Extract timestamps from commit messages and return with commit hashes
		// Commit messages have format: "Snapshot at {ISO timestamp}"
		const entries: Array<{ timestamp: string; commitHash: string }> = compact(
			commitsResult.commits.map((commit) => {
				// Extract timestamp from commit message
				const timestamp = commit.message.match(/Snapshot at (.+Z)/)?.[1]
				return timestamp ? { timestamp, commitHash: commit.sha } : null
			})
		)

		// Check if there are more commits

		const response = {
			entries,
			nextCursor: commitsResult.nextCursor,
		}

		return new Response(JSON.stringify(response), {
			headers: { 'content-type': 'application/json' },
		})
	} catch (error) {
		console.error('Failed to fetch Pierre history:', error)
		return new Response('Failed to fetch history', { status: 500 })
	}
}

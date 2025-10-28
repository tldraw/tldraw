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
		const repoId = `${envName}/snapshots/${roomId}`

		const repo = await pierreClient.findOne({ id: repoId })
		if (!repo) {
			// No history yet
			return new Response(
				JSON.stringify({
					entries: [],
					hasMore: false,
				}),
				{
					headers: { 'content-type': 'application/json' },
				}
			)
		}

		// Get commits with pagination
		const limit = 1000
		const offset = request.query?.offset as string | undefined

		const commitsResult = await repo.listCommits({
			branch: 'main',
			limit,
		})

		// Extract timestamps from commit messages and return with commit hashes
		// Commit messages have format: "Snapshot at {ISO timestamp}"
		const entries: Array<{ timestamp: string; commitHash: string }> = []
		let foundOffset = !offset // If no offset, include from start

		for (const commit of commitsResult.commits) {
			const sha = commit.sha

			if (!foundOffset) {
				// Still looking for the offset point (offset is a commit SHA)
				if (sha === offset) {
					foundOffset = true
					// Don't include the offset commit itself
				}
				continue
			}

			// Extract timestamp from commit message
			const match = commit.message.match(/Snapshot at (.+Z)/)
			if (!match) continue

			const timestamp = match[1]
			entries.push({ timestamp, commitHash: sha })
		}

		// Check if there are more commits
		const hasMore = commitsResult.commits.length === limit && !!commitsResult.nextCursor

		const response = {
			entries,
			hasMore,
		}

		return new Response(JSON.stringify(response), {
			headers: { 'content-type': 'application/json' },
		})
	} catch (error) {
		console.error('Failed to fetch Pierre history:', error)
		return new Response('Failed to fetch history', { status: 500 })
	}
}

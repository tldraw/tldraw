import { IRequest } from 'itty-router'
import { Environment } from '../environment'

// Returns the history of a room as a list of objects with timestamps
export async function getRoomHistory(
	request: IRequest,
	env: Environment,
	isApp: boolean
): Promise<Response> {
	const roomId = request.params.roomId

	if (!roomId) {
		return new Response('Room ID is required', { status: 400 })
	}

	const versionCacheBucket = env.ROOMS_HISTORY_EPHEMERAL
	const bucketKey = `${isApp ? 'app_rooms' : 'public_rooms'}/${roomId}`

	let batch = await versionCacheBucket.list({
		prefix: bucketKey,
	})
	const result = [...batch.objects.map((o) => o.key)]

	// ✅ - use the truncated property to check if there are more
	// objects to be returned
	while (batch.truncated) {
		const next = await versionCacheBucket.list({
			cursor: batch.cursor,
		})
		result.push(...next.objects.map((o) => o.key))

		batch = next
	}

	// these are ISO timestamps, so they sort lexicographically
	result.sort()

	return new Response(JSON.stringify(result), {
		headers: { 'content-type': 'application/json' },
	})
}

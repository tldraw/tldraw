import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { requireAdminAccessToRequest } from '../utils/tla/getAuth'
import { isTestFile } from '../utils/tla/isTestFile'
import { reconstructVersion } from '../versionChainRead'

// Get a snapshot of the room at a given point in time
export async function getRoomHistorySnapshot(
	request: IRequest,
	env: Environment,
	isApp: boolean
): Promise<Response> {
	const roomId = request.params.roomId

	if (!roomId) return notFound()
	if (isRoomIdTooLong(roomId)) return roomIdIsTooLong()

	await requireAdminAccessToRequest(request, env)

	if (isTestFile(roomId)) {
		return new Response('Not found', { status: 404 })
	}

	const timestamp = request.params.timestamp
	const roomKey = getR2KeyForRoom({ slug: roomId, isApp })

	let result
	try {
		result = await reconstructVersion({
			chainBucket: env.ROOMS_HISTORY,
			legacyBucket: env.ROOMS_HISTORY_EPHEMERAL,
			roomKey,
			timestamp,
		})
	} catch (error) {
		// A broken chain must not take history down while the legacy full copies still exist.
		// Serve the copy and let the error report — the verifier is how the chain gets fixed.
		console.error(error)
		const legacy = await env.ROOMS_HISTORY_EPHEMERAL.get(`${roomKey}/${timestamp}`)
		if (!legacy) throw error
		return new Response(legacy.body, {
			headers: { 'content-type': 'application/json' },
		})
	}

	if (!result) {
		return new Response('Not found', { status: 404 })
	}

	return new Response(JSON.stringify(result.snapshot), {
		headers: {
			'content-type': 'application/json',
			// Replay cost is a product metric once history is user-facing: the segment cap is the
			// lever, and this is what says whether it needs moving.
			'x-version-chain-ops': String(result.ops),
			'x-version-chain-depth': String(result.deltaCount),
		},
	})
}

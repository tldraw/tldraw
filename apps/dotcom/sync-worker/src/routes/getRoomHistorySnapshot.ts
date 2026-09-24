import { createSentry, notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { requireAdminAccessToRequest } from '../utils/tla/getAuth'
import { isTestFile } from '../utils/tla/isTestFile'
import { loadChainIndex, openWholeVersionStream, reconstructVersion } from '../versionChainRead'

// Get a snapshot of the room at a given point in time
export async function getRoomHistorySnapshot(
	request: IRequest,
	env: Environment,
	isApp: boolean,
	ctx?: ExecutionContext
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

	const buckets = { chainBucket: env.ROOMS_HISTORY, legacyBucket: env.ROOMS_HISTORY_EPHEMERAL }
	let result
	let listOps = 0
	try {
		const { entries: index, ops } = await loadChainIndex(env.ROOMS_HISTORY, roomKey)
		// The listing is part of this request's R2 cost: reconstructVersion counts zero listing
		// ops for a pre-loaded index, so leaving these out under-reports the header below.
		listOps = ops
		// Keyframes and legacy full copies stream straight through — openWholeVersionStream states
		// the parse-cost rationale. Only a delta replay materializes.
		const whole = await openWholeVersionStream({ ...buckets, roomKey, timestamp, index })
		if (whole) {
			return new Response(whole, {
				headers: {
					'content-type': 'application/json',
					// The listing plus the one whole-object get, so the metric reads the same
					// across both serve paths.
					'x-version-chain-ops': String(listOps + 1),
					'x-version-chain-depth': '0',
				},
			})
		}
		result = await reconstructVersion({ ...buckets, roomKey, timestamp, index })
	} catch (error) {
		// A broken chain must not take history down while the legacy full copies still exist.
		// Serve the copy — the verifier is how the chain gets fixed.
		const legacy = await env.ROOMS_HISTORY_EPHEMERAL.get(`${roomKey}/${timestamp}`)
		if (!legacy) throw error
		// Only the served fallback swallows the error, so only it has to report: a chain that
		// stopped reconstructing would stay invisible for as long as the copies last. The rethrow
		// above reaches the worker's catch-all, which reports it; capturing here too files it twice.
		try {
			// No ctx in unit tests, and createSentry throws when its env vars are unset; neither may
			// turn the degraded-but-fine fallback into a 500.
			const sentry = ctx ? createSentry(ctx, env) : null
			if (sentry) {
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				sentry.captureException(error)
			} else {
				console.error(error)
			}
		} catch {
			console.error(error)
		}
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
			'x-version-chain-ops': String(listOps + result.ops),
			'x-version-chain-depth': String(result.deltaCount),
		},
	})
}

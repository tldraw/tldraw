import { IRequest } from 'itty-router'
import { RoomActivitySnapshot, readRoomActivity } from '../../roomActivity'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { isRateLimited } from '../../utils/rateLimit'
import { requireAuth } from '../../utils/tla/getAuth'

const IDLE: RoomActivitySnapshot = { activeSessions: 0, documentClock: null, updatedAt: 0 }

/**
 * The lazy transport's poll target: "is anyone in this room, and has its content moved past my
 * snapshot?" Reads the advisory R2 object the durable object writes while awake (see
 * roomActivity.ts) — this route must never wake the durable object.
 *
 * Deliberately does NOT run the per-file Postgres access ladder: this is the hottest poll loop in
 * the lazy transport, and a Postgres query per poll would re-create the cost problem the feature
 * exists to fix. What a signed-in caller holding a slug can learn is only
 * `{activeSessions, documentClock, updatedAt}` — no content, no identities — and the slug itself
 * is already the sharing capability.
 */
export async function getRoomActivity(request: IRequest, env: Environment): Promise<Response> {
	const start = Date.now()
	// The lazy transport is gated to signed-in users; anonymous readers never poll.
	const auth = await requireAuth(request, env)
	if (await isRateLimited(env, auth.userId)) {
		return new Response('Rate limited', { status: 429 })
	}

	const activity = (await readRoomActivity(env, request.params.roomId)) ?? IDLE
	writeDataPoint(undefined, env.MEASURE, env, 'lazy_activity_poll', {
		blobs: [activity.activeSessions > 0 ? '1' : '0'],
		doubles: [Date.now() - start],
	})
	return new Response(JSON.stringify(activity), {
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	})
}

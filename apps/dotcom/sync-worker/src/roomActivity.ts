import { Environment } from './types'

/**
 * A tiny advisory object the file durable object writes to R2 whenever it is awake anyway
 * (session connect, session removal, persist). Lazy-transport readers poll it through the
 * stateless worker to learn "is anyone in this room" and "has the content moved past my
 * snapshot" without waking the durable object.
 *
 * R2 is used (rather than KV) because reads are strongly consistent — a collaborator joining
 * must be visible within one client poll period.
 */
export interface RoomActivitySnapshot {
	activeSessions: number
	/**
	 * The documentClock of the snapshot currently persisted to R2, or null when the durable
	 * object hasn't persisted since it last booted (the clock is only tracked in memory).
	 */
	documentClock: number | null
	/** Epoch ms of the write, so clients can apply trust-window heuristics. */
	updatedAt: number
}

export function getR2KeyForRoomActivity(slug: string): string {
	return `app_rooms_activity/${slug}`
}

/** Read a room's activity snapshot. Returns null when absent or unparseable — both mean "idle". */
export async function readRoomActivity(
	env: Environment,
	slug: string
): Promise<RoomActivitySnapshot | null> {
	try {
		const obj = await env.ROOMS.get(getR2KeyForRoomActivity(slug))
		if (!obj) return null
		const parsed = (await obj.json()) as RoomActivitySnapshot
		if (typeof parsed?.activeSessions !== 'number') return null
		return parsed
	} catch {
		return null
	}
}

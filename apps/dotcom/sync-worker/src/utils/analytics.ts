import { createSentry } from '@tldraw/worker-shared'
import { Analytics, Environment } from '../types'

export interface EventData {
	blobs?: string[]
	indexes?: [string]
	doubles?: number[]
}

/**
 * Index into a call site's `blobs` array at which the hashed room key is written, chosen so it
 * lands at `blob10` in SQL (`writeDataPoint` prepends two blobs of its own, so a call site's
 * element 0 is `blob3`).
 *
 * It goes in a fixed slot rather than being appended because call sites pass anywhere from zero to
 * five blobs: appending would put the room key in a different column per event and make it
 * impossible to group by room across event names — the entire point of recording it. A high slot
 * avoids disturbing the columns events already use (the screenshot surfaces reach `blob8`), so
 * existing queries and the 90 days of history behind them keep their meaning. The padding this
 * implies is empty strings, which cost effectively nothing against Analytics Engine's per-data
 * point blob budget.
 */
export const ROOM_KEY_BLOB_INDEX = 7

/** Recorded when an event is written before its room key has been resolved. Should never appear. */
export const UNKNOWN_ROOM_KEY = 'unknown'

/**
 * Places `roomKey` at {@link ROOM_KEY_BLOB_INDEX}, padding any gap with empty strings so the
 * caller's own blobs keep the positions they had before. Call sites are nowhere near that index —
 * the largest passes five blobs — but a caller that did reach it would have its last blob
 * overwritten rather than shifted, since silently moving a column is worse than losing one.
 */
export function withRoomKey(blobs: string[] | undefined, roomKey: string): string[] {
	const result = [...(blobs ?? [])]
	while (result.length < ROOM_KEY_BLOB_INDEX) result.push('')
	result[ROOM_KEY_BLOB_INDEX] = roomKey
	return result
}

export function writeDataPoint(
	sentry: ReturnType<typeof createSentry> | undefined,
	measure: Analytics | undefined,
	env: Environment,
	name: string,
	{ blobs, indexes, doubles }: EventData
) {
	try {
		measure?.writeDataPoint({
			// We put the worker name in the second spot for legacy reasons: when we first introduced analytics
			// we only included the name. If we were to change the order it would be hard to query old data.
			blobs: [name, env.WORKER_NAME ?? 'development-tldraw-multiplayer', ...(blobs ?? [])],
			doubles,
			indexes,
		})
	} catch (_e) {
		// // eslint-disable-next-line @typescript-eslint/no-deprecated
		// sentry?.withScope((scope) => {
		// 	scope.setExtra('name', name)
		// 	// eslint-disable-next-line @typescript-eslint/no-deprecated
		// 	sentry.captureException(e)
		// })
		// console.error('Failed to write data point', e)
	}
}

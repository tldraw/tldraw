import { TLDataPointName } from '../types'

/**
 * Only gaps longer than this are worth reporting. It sits above the longest thing that legitimately
 * keeps the room durable object awake — the 8 second `triggerPersist` throttle — so a reported gap
 * is unambiguous: nothing that was supposed to be holding the object in memory still was.
 *
 * Raising it makes the signal stricter and quieter; lowering it below 8s would report gaps the
 * persist timer explains, which is noise rather than evidence.
 */
export const RESIDENT_GAP_THRESHOLD_MS = 15_000

export type ResidencyObservation =
	| { event: Extract<TLDataPointName, 'room_wake' | 'room_cold_start'>; socketCount: number }
	| { event: Extract<TLDataPointName, 'room_resident_gap'>; gapMs: number }
	| null

/**
 * Decides what a room durable object should report about its own hibernation, given how long it has
 * been since it last saw an event.
 *
 * Hibernation is observable from inside the object because it is *defined* by wiping in-memory
 * state: the object is evicted and its constructor runs again on the next event. So an instance
 * field survives a gap only if the object stayed resident in memory — and was billed wall-clock for
 * all of it. That makes the field a direct probe:
 *
 * - **No previous event on this instance.** The object was just constructed. Live websockets mean it
 *   woke from hibernation with clients still attached; none means a genuine cold start. Callers must
 *   read the socket count _before_ accepting a new one, or every cold start looks like a wake.
 * - **A previous event, separated by more than the threshold.** In-memory state survived, so the
 *   object never hibernated across that gap. This is the finding: `sum(gapMs)` is milliseconds
 *   billed while idle and resident, which converts straight to GB-s and to money.
 * - **Anything shorter.** Normal traffic, not worth a datapoint.
 *
 * This reports residency, not its cause. A surviving gap could be a pending timer, an outbound
 * connection holding the object open, or in-flight work; distinguishing them means changing one
 * thing at a time and watching the gap total move.
 */
export function classifyResidency({
	lastEventAt,
	now,
	socketCount,
	thresholdMs = RESIDENT_GAP_THRESHOLD_MS,
}: {
	/** When this *instance* last saw an event, or null if it has not seen one yet. */
	lastEventAt: number | null
	now: number
	/** Sockets already attached, read before accepting any new one. */
	socketCount: number
	thresholdMs?: number
}): ResidencyObservation {
	if (lastEventAt === null) {
		return socketCount > 0
			? { event: 'room_wake', socketCount }
			: { event: 'room_cold_start', socketCount }
	}

	const gapMs = now - lastEventAt
	return gapMs > thresholdMs ? { event: 'room_resident_gap', gapMs } : null
}

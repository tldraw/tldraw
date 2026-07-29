import { describe, expect, it } from 'vitest'
import { OgRenderDebouncer } from './ogRenderDebounce'

const DEBOUNCE = 30_000
const MAX_WAIT = 300_000
const PERSIST = 8_000

function makeDebouncer() {
	return new OgRenderDebouncer({ debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT })
}

/**
 * Drives a debouncer through a run of persists at a fixed cadence, servicing alarms the way
 * TLFileDurableObject does, and reports what it cost.
 *
 * `renders` is the number of Browser Run captures the run would have paid for; `alarmWrites` is the
 * number of times durable storage was touched, which is the per-persist I/O the design is trying to
 * avoid.
 */
function simulate({ persistEveryMs, forMs }: { persistEveryMs: number; forMs: number }) {
	const debouncer = makeDebouncer()
	const renderTimes: number[] = []
	let alarmWrites = 0
	let alarmAt: number | null = null
	let persists = 0

	const serviceAlarmsUntil = (now: number) => {
		while (alarmAt !== null && alarmAt <= now) {
			const firedAt = alarmAt
			alarmAt = null
			const result = debouncer.onAlarm(firedAt)
			if (result.render) {
				renderTimes.push(firedAt)
			} else {
				alarmAt = result.reArmAt
				alarmWrites++
			}
		}
	}

	for (let t = 0; t <= forMs; t += persistEveryMs) {
		serviceAlarmsUntil(t)
		persists++
		const setAlarmAt = debouncer.onPersist(t)
		if (setAlarmAt !== null) {
			alarmAt = setAlarmAt
			alarmWrites++
		}
	}
	// Let the board settle, so the trailing render lands.
	serviceAlarmsUntil(forMs + MAX_WAIT + DEBOUNCE)

	return { renderTimes, renders: renderTimes.length, alarmWrites, persists }
}

describe('OgRenderDebouncer', () => {
	it('does not render while edits keep arriving', () => {
		const debouncer = makeDebouncer()

		debouncer.onPersist(0)
		// An alarm set for t=30s fires, but another persist has moved the deadline to t=38s.
		debouncer.onPersist(8_000)

		expect(debouncer.onAlarm(30_000)).toEqual({ render: false, reArmAt: 38_000 })
	})

	it('renders once editing settles for the debounce window', () => {
		const debouncer = makeDebouncer()

		debouncer.onPersist(0)

		expect(debouncer.onAlarm(30_000)).toEqual({ render: true })
	})

	// The behaviour the throttle it replaced could not offer: an isolated burst of editing renders
	// AFTER the burst, so the thumbnail is of the finished board rather than of its first stroke.
	it('renders after the last edit of a burst, not the first', () => {
		const debouncer = makeDebouncer()

		expect(debouncer.onPersist(0)).toBe(30_000)
		debouncer.onPersist(8_000)
		debouncer.onPersist(16_000)
		// Deadline is now 16s + 30s, not 0s + 30s.
		expect(debouncer.onAlarm(30_000)).toEqual({ render: false, reArmAt: 46_000 })
		expect(debouncer.onAlarm(46_000)).toEqual({ render: true })
	})

	// Pure debounce would never render a board that is never left alone.
	it('renders under sustained editing when the max wait expires', () => {
		// Seven minutes of unbroken editing, against a five minute max wait.
		const { renderTimes } = simulate({ persistEveryMs: PERSIST, forMs: 7 * 60_000 })

		// One render forced by the max wait at t=5min, then one 30s after the last edit at t=416s.
		expect(renderTimes).toEqual([MAX_WAIT, 446_000])
	})

	// The max wait is measured from the first persist of a session, not from each persist, or a board
	// edited without pause would push it out forever alongside the debounce.
	it('measures the max wait from the first persist since the last render', () => {
		const debouncer = makeDebouncer()

		debouncer.onPersist(0)
		for (let t = PERSIST; t < MAX_WAIT; t += PERSIST) {
			debouncer.onPersist(t)
		}

		// Capped at the max wait rather than the last persist + debounce.
		expect(debouncer.onAlarm(MAX_WAIT - 1)).toEqual({ render: false, reArmAt: MAX_WAIT })
		expect(debouncer.onAlarm(MAX_WAIT)).toEqual({ render: true })
	})

	// An evicted durable object loses the deadline but not the alarm. Rendering on an unrecognised
	// alarm costs at most one extra capture; the alternative silently drops a session's last edits.
	it('renders when an alarm arrives with no deadline in memory', () => {
		const debouncer = makeDebouncer()

		expect(debouncer.onAlarm(123_456)).toEqual({ render: true })
	})

	it('starts a fresh cycle after a render', () => {
		const debouncer = makeDebouncer()

		debouncer.onPersist(0)
		debouncer.onAlarm(30_000)

		// A later persist schedules again rather than being swallowed by stale state. A returned alarm
		// time (rather than null) is itself the proof the cycle reset: null means one is outstanding.
		expect(debouncer.onPersist(100_000)).toBe(130_000)
	})

	// The cost claim the switch away from a throttle was made on. Ten minutes of unbroken editing is
	// 76 persists, which a 30s throttle turned into roughly 20 renders (two per window). The debounce
	// pays only for max-wait expiries plus one trailing render.
	it('costs far less than a throttle for a long editing session', () => {
		const { renders, persists } = simulate({ persistEveryMs: PERSIST, forMs: 10 * 60_000 })

		expect(persists).toBe(76)
		expect(renders).toBe(2)
	})

	// The common case in production, where the measured mean gap between a board's persists (~39s) is
	// longer than the debounce window: a board is edited in a short burst and then left alone. Every
	// mechanism costs one render here — which is why the debounce is not a saving on bursty boards,
	// only on sustained ones. It still renders the *finished* burst rather than its first stroke.
	it('costs exactly one render for an isolated burst', () => {
		const { renderTimes } = simulate({ persistEveryMs: PERSIST, forMs: 24_000 })

		// Last edit at t=24s, render 30s later.
		expect(renderTimes).toEqual([54_000])
	})

	// Keeping the deadline in memory and only writing an alarm when none is outstanding is what keeps
	// this off the per-persist I/O path: storage is touched about once per debounce window, not once
	// per persist. If this regresses, every persist starts paying for a durable write.
	it('writes far fewer alarms than there are persists', () => {
		const { alarmWrites, persists } = simulate({ persistEveryMs: PERSIST, forMs: 10 * 60_000 })

		expect(alarmWrites).toBeLessThan(persists / 2)
	})
})

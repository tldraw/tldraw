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
 * number of times durable storage was touched, and `alarmFires` the number of alarm invocations —
 * the two halves of the cost, which the durable-deadline design trades against each other.
 */
function simulate({ persistEveryMs, forMs }: { persistEveryMs: number; forMs: number }) {
	const debouncer = makeDebouncer()
	const renderTimes: number[] = []
	let alarmWrites = 0
	let alarmFires = 0
	let alarmAt: number | null = null
	let persists = 0

	const serviceAlarmsUntil = (now: number) => {
		while (alarmAt !== null && alarmAt <= now) {
			const firedAt = alarmAt
			alarmAt = null
			alarmFires++
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
		// The object arms the alarm on every persist, so the durable copy never lags the deadline.
		alarmAt = debouncer.onPersist(t)
		alarmWrites++
	}
	// Let the board settle, so the trailing render lands.
	serviceAlarmsUntil(forMs + MAX_WAIT + DEBOUNCE)

	return { renderTimes, renders: renderTimes.length, alarmWrites, alarmFires, persists }
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

	// The defining behaviour: an isolated burst of editing renders AFTER the burst, so the thumbnail is
	// of the finished board rather than of its first stroke.
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

	// An evicted object loses the deadline but not the alarm — and because the alarm always carries
	// the real deadline, an alarm with nothing in memory means the deadline genuinely arrived.
	it('renders when an alarm arrives with no deadline in memory', () => {
		const debouncer = makeDebouncer()

		expect(debouncer.onAlarm(123_456)).toEqual({ render: true })
	})

	// The point of arming the alarm on every persist. Because the alarm carries the deadline itself
	// rather than a lower bound on it, a revived object renders once, at the right time — leave the
	// alarm behind the deadline and it renders early and then again when editing settles.
	it('costs no extra render when the object is evicted mid-session', () => {
		const live = makeDebouncer()
		let alarmAt = live.onPersist(0)
		for (let t = PERSIST; t <= 40_000; t += PERSIST) {
			alarmAt = live.onPersist(t)
		}
		// Last persist at t=40s, so the deadline — and the alarm — sit at t=70s.
		expect(alarmAt).toBe(70_000)

		// Evicted: every field is gone, only the durable alarm survives.
		const revived = makeDebouncer()

		// It fires at the deadline the live object chose, and renders exactly once.
		expect(revived.onAlarm(alarmAt)).toEqual({ render: true })
		// Nothing is left over to fire a second time.
		expect(revived.onAlarm(alarmAt + DEBOUNCE)).toEqual({ render: true })
	})

	it('starts a fresh cycle after a render', () => {
		const debouncer = makeDebouncer()

		debouncer.onPersist(0)
		debouncer.onAlarm(30_000)

		// A later persist schedules again rather than being swallowed by stale state. A returned alarm
		// time (rather than null) is itself the proof the cycle reset: null means one is outstanding.
		expect(debouncer.onPersist(100_000)).toBe(130_000)
	})

	// The cost claim the design rests on. Ten minutes of unbroken editing is 76 persists, which a 30s
	// throttle would turn into roughly 20 renders (two per window). The debounce pays only for max-wait
	// expiries plus one trailing render.
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

	// The cost of a durable deadline, stated rather than hidden: one alarm write per persist. What it
	// buys back is alarm invocations — the alarm never fires mid-session just to push itself out, so a
	// sustained session wakes the object twice rather than ~20 times.
	it('writes one alarm per persist, and wakes the object only to render', () => {
		const { alarmWrites, alarmFires, persists, renders } = simulate({
			persistEveryMs: PERSIST,
			forMs: 10 * 60_000,
		})

		expect(alarmWrites).toBe(persists)
		expect(alarmFires).toBe(renders)
		expect(alarmFires).toBe(2)
	})
})

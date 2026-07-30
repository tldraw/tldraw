import { OG_RENDER_DEBOUNCE_MS, OG_RENDER_MAX_WAIT_MS } from '../config'

/**
 * The scheduling decision behind edit-triggered thumbnail rendering, kept separate from
 * `TLFileDurableObject` so it can be tested without standing one up. The object owns the clock and
 * the durable alarm; this owns only the arithmetic of when a render is due.
 *
 * It is a debounce with a max wait, not a throttle: each persist pushes the render out by
 * `debounceMs`, so a board renders once its editing settles rather than on a cadence while it is
 * still being drawn on, and `maxWaitMs` stops a board that never settles from never rendering.
 *
 * `onPersist` always returns the deadline, and the caller always arms the alarm with it, so **the
 * durable alarm and the deadline never disagree**. That is what makes the deadline survive eviction:
 * the in-memory fields can be lost, and the alarm still fires at exactly the right time.
 *
 * This deliberately replaced a cheaper scheme where the deadline moved in memory and the alarm was
 * left where it was, re-armed on each fire. That wrote storage once per debounce window instead of
 * once per persist — but it meant an evicted object woke to an alarm that was merely a lower bound
 * on its deadline, rendered early, and then rendered again when the session actually settled. The
 * cost moved rather than grew: an alarm write per persist, against far fewer alarm *invocations*,
 * since the alarm no longer fires mid-session just to push itself out.
 */
export class OgRenderDebouncer {
	private readonly debounceMs: number
	private readonly maxWaitMs: number

	private targetAt: number | null = null
	private pendingSince: number | null = null

	constructor(opts: { debounceMs?: number; maxWaitMs?: number } = {}) {
		this.debounceMs = opts.debounceMs ?? OG_RENDER_DEBOUNCE_MS
		this.maxWaitMs = opts.maxWaitMs ?? OG_RENDER_MAX_WAIT_MS
	}

	/**
	 * Records a persist that advanced the document clock. Returns the time the alarm must be set to —
	 * always, because the alarm is the durable copy of this deadline and may never lag behind it.
	 */
	onPersist(now: number): number {
		// Measured from the first persist since the last render, so the max wait bounds a whole editing
		// session rather than resetting with every keystroke. Lost on eviction, which restarts the
		// window and can therefore only *delay* a render, never duplicate one.
		if (this.pendingSince === null) this.pendingSince = now
		this.targetAt = Math.min(now + this.debounceMs, this.pendingSince + this.maxWaitMs)
		return this.targetAt
	}

	/**
	 * Handles the alarm firing. Since the alarm always carries the current deadline, a fire normally
	 * means the deadline arrived — including after an eviction, where the in-memory deadline is gone
	 * and the alarm is the only thing left that knows it.
	 *
	 * The re-arm branch survives as a guard against the alarm firing before its time: a persist landing
	 * in the moment between the alarm firing and this handler running has already moved the deadline
	 * and re-armed, and this must not render underneath it.
	 */
	onAlarm(now: number): { render: true } | { render: false; reArmAt: number } {
		const target = this.targetAt
		if (target !== null && now < target) {
			return { render: false, reArmAt: target }
		}
		this.targetAt = null
		this.pendingSince = null
		return { render: true }
	}
}

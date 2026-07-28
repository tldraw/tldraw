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
 * The one non-obvious behaviour is that `onPersist` returns an alarm time only when nothing is
 * outstanding. While an alarm is pending, moving the deadline is a field assignment — the alarm
 * fires at the old time, `onAlarm` sees the newer deadline and re-arms. That is what keeps a board
 * persisting every 8s writing one alarm per debounce window rather than one per persist.
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
	 * Records a persist that advanced the document clock.
	 *
	 * Returns the time an alarm should be written for, or `null` when one is already outstanding and
	 * the caller therefore needs to touch durable storage.
	 */
	onPersist(now: number): number | null {
		// Measured from the first persist since the last render, so the max wait bounds a whole editing
		// session rather than resetting with every keystroke.
		if (this.pendingSince === null) this.pendingSince = now
		const hadAlarmOutstanding = this.targetAt !== null
		this.targetAt = Math.min(now + this.debounceMs, this.pendingSince + this.maxWaitMs)
		return hadAlarmOutstanding ? null : this.targetAt
	}

	/**
	 * Handles the alarm firing. Either the deadline has arrived and a render is due, or it moved while
	 * the alarm was pending (the board is still being edited) and the alarm re-arms for the new one.
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

	/**
	 * Whether a render is currently scheduled. After an eviction this reads false even though a durable
	 * alarm may still be pending — which is why `onAlarm` renders when it finds no deadline rather than
	 * assuming the alarm was spurious.
	 */
	hasPendingRender() {
		return this.targetAt !== null
	}
}

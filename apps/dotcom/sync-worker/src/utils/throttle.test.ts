import { afterEach, describe, expect, it, vi } from 'vitest'
import { throttle } from './throttle'

afterEach(() => {
	vi.useRealTimers()
})

// This helper backs TLFileDurableObject.triggerPersist, so its edge behaviour decides how often a
// board writes its snapshot to R2: the leading edge persists the first change after a quiet spell
// promptly, and the trailing edge guarantees the last change of a session is persisted at all.
//
// It is not what schedules thumbnail renders. Those are debounced (utils/ogRenderDebounce.ts) — see
// OG_RENDER_DEBOUNCE_MS in config.ts for why a throttle is the wrong shape there.
describe('throttle', () => {
	it('invokes immediately on the leading edge', () => {
		vi.useFakeTimers()
		const fn = vi.fn()
		const throttled = throttle(fn, 1000)

		throttled()

		expect(fn).toHaveBeenCalledTimes(1)
	})

	it('suppresses calls inside the window and replays one on the trailing edge', () => {
		vi.useFakeTimers()
		const fn = vi.fn()
		const throttled = throttle(fn, 1000)

		throttled()
		throttled()
		throttled()
		throttled()
		// Only the leading call has run so far; the other three collapse into one.
		expect(fn).toHaveBeenCalledTimes(1)

		vi.advanceTimersByTime(1000)
		expect(fn).toHaveBeenCalledTimes(2)
	})

	it('does not fire a trailing call when nothing was suppressed', () => {
		vi.useFakeTimers()
		const fn = vi.fn()
		const throttled = throttle(fn, 1000)

		throttled()
		vi.advanceTimersByTime(5000)

		expect(fn).toHaveBeenCalledTimes(1)
	})

	// The property persistence relies on: a board being edited continuously writes a bounded number of
	// snapshots per window, no matter how fast changes arrive.
	//
	// Note the bound is TWO per window, not one — see the re-arm test below. The two are adjacent in
	// time (a trailing call followed immediately by the next leading one) rather than spread across the
	// window.
	it('bounds a continuous stream to two invocations per window', () => {
		vi.useFakeTimers()
		const fn = vi.fn()
		const throttled = throttle(fn, 1000)

		// Ten seconds of asking every 100ms — 100 calls across 10 windows.
		for (let i = 0; i < 100; i++) {
			throttled()
			vi.advanceTimersByTime(100)
		}

		expect(fn.mock.calls.length).toBe(20)
	})

	// Worth pinning because it is mildly surprising: the trailing invocation calls the function
	// directly rather than going back through the throttle, so it does not start a new window. A call
	// arriving straight after a trailing edge runs immediately, which is why the bound above is "about"
	// one per window rather than exactly one.
	it('does not re-arm the window on the trailing edge', () => {
		vi.useFakeTimers()
		const fn = vi.fn()
		const throttled = throttle(fn, 1000)

		throttled()
		throttled()
		vi.advanceTimersByTime(1000)
		expect(fn).toHaveBeenCalledTimes(2)

		// Immediately after the trailing call, the next one is treated as a fresh leading edge.
		throttled()
		expect(fn).toHaveBeenCalledTimes(3)
	})
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { interval } from './interval'

describe('interval', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('[IN1] invokes the callback every N milliseconds', () => {
		const cb = vi.fn()
		const dispose = interval(cb, 100)

		expect(cb).not.toHaveBeenCalled()

		vi.advanceTimersByTime(99)
		expect(cb).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1)
		expect(cb).toHaveBeenCalledTimes(1)

		vi.advanceTimersByTime(300)
		expect(cb).toHaveBeenCalledTimes(4)

		dispose()
	})

	it('[IN1] the dispose function stops the interval', () => {
		const cb = vi.fn()
		const dispose = interval(cb, 100)

		vi.advanceTimersByTime(250)
		expect(cb).toHaveBeenCalledTimes(2)

		dispose()

		vi.advanceTimersByTime(1000)
		expect(cb).toHaveBeenCalledTimes(2)
	})
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { interval } from './interval'

describe('interval', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	it('should execute callback at specified intervals', () => {
		const callback = vi.fn()
		const dispose = interval(callback, 1000)

		// After first interval
		vi.advanceTimersByTime(1000)
		expect(callback).toHaveBeenCalledTimes(1)

		// After second interval
		vi.advanceTimersByTime(1000)
		expect(callback).toHaveBeenCalledTimes(2)

		dispose()
	})

	it('should stop executing when dispose is called', () => {
		const callback = vi.fn()
		const dispose = interval(callback, 100)

		vi.advanceTimersByTime(100)
		expect(callback).toHaveBeenCalledTimes(1)

		dispose()
		vi.advanceTimersByTime(100)
		expect(callback).toHaveBeenCalledTimes(1)
	})

	it('should handle multiple dispose calls safely', () => {
		const callback = vi.fn()
		const dispose = interval(callback, 100)

		dispose()
		dispose() // Should not throw

		vi.advanceTimersByTime(100)
		expect(callback).not.toHaveBeenCalled()
	})
})

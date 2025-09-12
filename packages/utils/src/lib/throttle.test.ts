import { describe, expect, it, vi } from 'vitest'
import { fpsThrottle, throttleToNextFrame } from './throttle'

describe('throttle functions', () => {
	describe('fpsThrottle', () => {
		it('returns a function with cancel method', () => {
			const mockFn = vi.fn()
			const throttled = fpsThrottle(mockFn)

			expect(typeof throttled).toBe('function')
			expect(throttled.cancel).toBeDefined()
			expect(typeof throttled.cancel).toBe('function')
		})

		it('executes function in test environment', () => {
			const mockFn = vi.fn()
			const throttled = fpsThrottle(mockFn)

			throttled()

			expect(mockFn).toHaveBeenCalledTimes(1)
		})

		it('can be called multiple times', () => {
			const mockFn = vi.fn()
			const throttled = fpsThrottle(mockFn)

			throttled()
			throttled()

			// In test environment, each call executes immediately
			expect(mockFn).toHaveBeenCalledTimes(2)
		})

		it('cancel method does not throw', () => {
			const mockFn = vi.fn()
			const throttled = fpsThrottle(mockFn)

			expect(() => throttled.cancel?.()).not.toThrow()
		})
	})

	describe('throttleToNextFrame', () => {
		it('returns a cancel function', () => {
			const mockFn = vi.fn()
			const cancel = throttleToNextFrame(mockFn)

			expect(typeof cancel).toBe('function')
		})

		it('executes function in test environment', () => {
			const mockFn = vi.fn()

			throttleToNextFrame(mockFn)

			expect(mockFn).toHaveBeenCalledTimes(1)
		})

		it('cancel function does not throw', () => {
			const mockFn = vi.fn()
			const cancel = throttleToNextFrame(mockFn)

			expect(() => cancel()).not.toThrow()
		})
	})

	describe('basic integration', () => {
		it('both functions work together', () => {
			const fn1 = vi.fn()
			const fn2 = vi.fn()

			const throttled = fpsThrottle(fn1)
			const cancel = throttleToNextFrame(fn2)

			throttled()

			expect(fn1).toHaveBeenCalledTimes(1)
			expect(fn2).toHaveBeenCalledTimes(1)

			expect(() => {
				throttled.cancel?.()
				cancel()
			}).not.toThrow()
		})

		it('handles functions with different signatures', () => {
			const voidFn = vi.fn()
			const returnFn = vi.fn().mockReturnValue('result')

			expect(() => {
				fpsThrottle(voidFn)
				throttleToNextFrame(returnFn)
			}).not.toThrow()
		})
	})
})

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

	describe('basic functionality', () => {
		it('should execute callback at specified intervals and provide cleanup', () => {
			const callback = vi.fn()
			const dispose = interval(callback, 1000)

			// Initially not called
			expect(callback).not.toHaveBeenCalled()

			// After first interval
			vi.advanceTimersByTime(1000)
			expect(callback).toHaveBeenCalledTimes(1)

			// After second interval
			vi.advanceTimersByTime(1000)
			expect(callback).toHaveBeenCalledTimes(2)

			// Dispose function should be returned
			expect(typeof dispose).toBe('function')

			// Should stop executing when dispose is called
			dispose()
			vi.advanceTimersByTime(1000)
			expect(callback).toHaveBeenCalledTimes(2)
		})

		it('should handle immediate disposal and multiple dispose calls', () => {
			const callback = vi.fn()
			const dispose = interval(callback, 100)

			// Dispose immediately
			dispose()
			dispose() // Multiple calls should be safe

			// Should never execute
			vi.advanceTimersByTime(100)
			expect(callback).not.toHaveBeenCalled()
		})

		it('should call callback with no arguments and handle errors', () => {
			const normalCallback = vi.fn()
			const throwingCallback = vi.fn(() => {
				throw new Error('Callback error')
			})

			const dispose1 = interval(normalCallback, 100)
			const dispose2 = interval(throwingCallback, 100)

			vi.advanceTimersByTime(100)

			expect(normalCallback).toHaveBeenCalledWith()
			expect(throwingCallback).toHaveBeenCalledTimes(1)

			dispose1()
			dispose2()
		})
	})

	describe('timing and parameters', () => {
		it('should work with various timeout values', () => {
			const shortCallback = vi.fn()
			const longCallback = vi.fn()
			const zeroCallback = vi.fn()

			const dispose1 = interval(shortCallback, 1)
			const dispose2 = interval(longCallback, 60000)
			const dispose3 = interval(zeroCallback, 0)

			// Short interval
			vi.advanceTimersByTime(1)
			expect(shortCallback).toHaveBeenCalledTimes(1)

			// Zero timeout (should execute immediately)
			vi.advanceTimersByTime(0)
			expect(zeroCallback).toHaveBeenCalledTimes(1)

			// Long interval - should not execute before timeout
			vi.advanceTimersByTime(59999)
			expect(longCallback).not.toHaveBeenCalled()

			// Should execute at the interval
			vi.advanceTimersByTime(1)
			expect(longCallback).toHaveBeenCalledTimes(1)

			dispose1()
			dispose2()
			dispose3()
		})

		it('should handle edge case timeouts', () => {
			const floatCallback = vi.fn()
			const negativeCallback = vi.fn()

			// Floating point intervals
			const dispose1 = interval(floatCallback, 100.5)
			// Negative timeouts (treated as 0 by setInterval)
			const dispose2 = interval(negativeCallback, -100)

			vi.advanceTimersByTime(100)
			expect(floatCallback).toHaveBeenCalledTimes(1)

			vi.advanceTimersByTime(0)
			expect(negativeCallback).toHaveBeenCalledTimes(1)

			dispose1()
			dispose2()
		})
	})

	describe('multiple intervals and concurrency', () => {
		it('should handle multiple concurrent intervals', () => {
			const callback1 = vi.fn()
			const callback2 = vi.fn()
			const callback3 = vi.fn()

			const dispose1 = interval(callback1, 100)
			const dispose2 = interval(callback2, 200)
			const dispose3 = interval(callback3, 300)

			// Verify different intervals execute at different times
			vi.advanceTimersByTime(300)
			expect(callback1).toHaveBeenCalledTimes(3) // 100, 200, 300
			expect(callback2).toHaveBeenCalledTimes(1) // 200
			expect(callback3).toHaveBeenCalledTimes(1) // 300

			// Test selective disposal
			dispose1()
			vi.advanceTimersByTime(300)
			expect(callback1).toHaveBeenCalledTimes(3) // Still 3
			expect(callback2).toHaveBeenCalledTimes(2) // 200, 400
			expect(callback3).toHaveBeenCalledTimes(2) // 300, 600

			dispose2()
			dispose3()
		})

		it('should handle shared callbacks and return unique dispose functions', () => {
			const sharedCallback = vi.fn()

			const dispose1 = interval(sharedCallback, 100)
			const dispose2 = interval(sharedCallback, 150)

			// Dispose functions should be unique
			expect(dispose1).not.toBe(dispose2)

			vi.advanceTimersByTime(300)
			// First interval: 100, 200, 300 = 3 calls
			// Second interval: 150, 300 = 2 calls
			// Total: 5 calls
			expect(sharedCallback).toHaveBeenCalledTimes(5)

			dispose1()
			dispose2()
		})
	})

	describe('real-world usage patterns', () => {
		it('should work for sync-core patterns like health checks and disposables', () => {
			// Health check pattern
			let serverHealth = 'unknown'
			const checkHealth = vi.fn(() => {
				serverHealth = 'healthy'
			})

			// Session cleanup pattern
			const sessions = new Map([['s1', { lastSeen: Date.now() }]])
			const pruneSessions = vi.fn(() => sessions.clear())

			// Create intervals
			const stopHealthCheck = interval(checkHealth, 1000)
			const stopPruning = interval(pruneSessions, 500)

			// Test health check
			expect(serverHealth).toBe('unknown')
			vi.advanceTimersByTime(1000)
			expect(checkHealth).toHaveBeenCalledTimes(1)
			expect(serverHealth).toBe('healthy')

			// Test session pruning
			expect(sessions.size).toBe(1)
			vi.advanceTimersByTime(500)
			expect(pruneSessions).toHaveBeenCalledTimes(3) // 500, 1000, 1500
			expect(sessions.size).toBe(0)

			// Disposables array pattern
			const disposables = [stopHealthCheck, stopPruning]
			disposables.forEach((dispose) => dispose())
		})
	})
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { retry } from './retry'

describe('retry', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	describe('basic functionality', () => {
		it('returns result when function succeeds on first attempt', async () => {
			const successFn = vi.fn().mockResolvedValue('success')

			const result = await retry(successFn)

			expect(result).toBe('success')
			expect(successFn).toHaveBeenCalledTimes(1)
		})

		it('returns result when function succeeds after failures', async () => {
			const successFn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail 1'))
				.mockRejectedValueOnce(new Error('fail 2'))
				.mockResolvedValue('success')

			const promise = retry(successFn)

			// Advance timers to allow retries to complete
			await vi.advanceTimersByTimeAsync(3000)
			const result = await promise

			expect(result).toBe('success')
			expect(successFn).toHaveBeenCalledTimes(3)
		})

		it('throws last error when all attempts fail', async () => {
			const failFn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail 1'))
				.mockRejectedValueOnce(new Error('fail 2'))
				.mockRejectedValueOnce(new Error('fail 3'))

			const promise = retry(failFn)

			// Advance timers to allow retries to complete
			// Need extra time for the final sleep call after last attempt
			await vi.advanceTimersByTimeAsync(3000)

			await expect(promise).rejects.toThrow('fail 3')
			expect(failFn).toHaveBeenCalledTimes(3)
		})

		it('preserves return type generics', async () => {
			const numberFn = vi.fn().mockResolvedValue(42)
			const stringFn = vi.fn().mockResolvedValue('hello')
			const objectFn = vi.fn().mockResolvedValue({ key: 'value' })

			const numberResult = await retry(numberFn)
			const stringResult = await retry(stringFn)
			const objectResult = await retry(objectFn)

			expect(numberResult).toBe(42)
			expect(stringResult).toBe('hello')
			expect(objectResult).toEqual({ key: 'value' })
		})
	})

	describe('configuration options', () => {
		it('respects custom attempts setting', async () => {
			const failFn = vi.fn().mockRejectedValue(new Error('always fails'))

			const promise = retry(failFn, { attempts: 5 })

			// Need to advance timers to account for sleep calls after each attempt
			// 5 attempts means 5 sleep calls (including after the final attempt)
			await vi.advanceTimersByTimeAsync(6000)

			await expect(promise).rejects.toThrow('always fails')
			expect(failFn).toHaveBeenCalledTimes(5)
		})

		it('respects custom waitDuration setting', async () => {
			const failFn = vi.fn().mockRejectedValueOnce(new Error('fail 1')).mockResolvedValue('success')

			const promise = retry(failFn, { waitDuration: 2500 })

			// Should not succeed until wait duration passes
			await vi.advanceTimersByTimeAsync(2000)
			expect(failFn).toHaveBeenCalledTimes(1)

			await vi.advanceTimersByTimeAsync(1000)
			const result = await promise

			expect(result).toBe('success')
			expect(failFn).toHaveBeenCalledTimes(2)
		})

		it('handles attempts set to 1 (no retries)', async () => {
			const failFn = vi.fn().mockRejectedValue(new Error('immediate fail'))

			const promise = retry(failFn, { attempts: 1 })

			// Even with 1 attempt, the sleep is called after the failure
			await vi.advanceTimersByTimeAsync(1100)

			await expect(promise).rejects.toThrow('immediate fail')
			expect(failFn).toHaveBeenCalledTimes(1)
		})

		it('handles attempts set to 0 (never executes)', async () => {
			const neverCalledFn = vi.fn().mockResolvedValue('never called')

			const promise = retry(neverCalledFn, { attempts: 0 })

			await expect(promise).rejects.toBeNull()
			expect(neverCalledFn).toHaveBeenCalledTimes(0)
		})
	})

	describe('abort signal', () => {
		it('throws error when abort signal is already aborted', async () => {
			const controller = new AbortController()
			controller.abort()

			const neverCalledFn = vi.fn().mockResolvedValue('never called')

			const promise = retry(neverCalledFn, { abortSignal: controller.signal })

			await expect(promise).rejects.toThrow('aborted')
			expect(neverCalledFn).toHaveBeenCalledTimes(0)
		})

		it('stops retrying when aborted during execution', async () => {
			const controller = new AbortController()
			const failFn = vi.fn().mockRejectedValue(new Error('fail'))

			const promise = retry(failFn, {
				attempts: 10,
				waitDuration: 1000,
				abortSignal: controller.signal,
			})

			// Let first attempt fail
			await vi.advanceTimersByTimeAsync(500)
			expect(failFn).toHaveBeenCalledTimes(1)

			// Abort before next retry
			controller.abort()

			await vi.advanceTimersByTimeAsync(1000)

			await expect(promise).rejects.toThrow('aborted')
			expect(failFn).toHaveBeenCalledTimes(1) // Should not retry after abort
		})

		it('succeeds normally if not aborted', async () => {
			const controller = new AbortController()
			const successFn = vi.fn().mockResolvedValue('success')

			const result = await retry(successFn, { abortSignal: controller.signal })

			expect(result).toBe('success')
			expect(successFn).toHaveBeenCalledTimes(1)
		})
	})

	describe('error matching', () => {
		class NetworkError extends Error {
			constructor(message: string) {
				super(message)
				this.name = 'NetworkError'
			}
		}

		class ValidationError extends Error {
			constructor(message: string) {
				super(message)
				this.name = 'ValidationError'
			}
		}

		it('retries only errors that match the filter', async () => {
			const failFn = vi
				.fn()
				.mockRejectedValueOnce(new NetworkError('network fail'))
				.mockRejectedValueOnce(new NetworkError('network fail 2'))
				.mockResolvedValue('success')

			const promise = retry(failFn, {
				matchError: (error) => error instanceof NetworkError,
			})

			await vi.advanceTimersByTimeAsync(3000)
			const result = await promise

			expect(result).toBe('success')
			expect(failFn).toHaveBeenCalledTimes(3)
		})

		it('does not retry errors that do not match the filter', async () => {
			const failFn = vi
				.fn()
				.mockRejectedValueOnce(new NetworkError('network fail'))
				.mockRejectedValueOnce(new ValidationError('validation fail'))

			const promise = retry(failFn, {
				attempts: 5,
				matchError: (error) => error instanceof NetworkError,
			})

			await vi.advanceTimersByTimeAsync(2000)

			await expect(promise).rejects.toThrow('validation fail')
			expect(failFn).toHaveBeenCalledTimes(2)
		})

		it('throws immediately on non-matching error on first attempt', async () => {
			const failFn = vi.fn().mockRejectedValue(new ValidationError('validation fail'))

			const promise = retry(failFn, {
				attempts: 5,
				matchError: (error) => error instanceof NetworkError,
			})

			await expect(promise).rejects.toThrow('validation fail')
			expect(failFn).toHaveBeenCalledTimes(1)
		})

		it('handles matchError function that throws', async () => {
			const failFn = vi.fn().mockRejectedValue(new Error('original error'))
			const throwingMatcher = vi.fn().mockImplementation(() => {
				throw new Error('matcher error')
			})

			const promise = retry(failFn, {
				matchError: throwingMatcher,
			})

			await expect(promise).rejects.toThrow('matcher error')
			expect(failFn).toHaveBeenCalledTimes(1)
			expect(throwingMatcher).toHaveBeenCalledTimes(1)
		})
	})

	describe('edge cases', () => {
		it('handles function that returns undefined', async () => {
			const undefinedFn = vi.fn().mockResolvedValue(undefined)

			const result = await retry(undefinedFn)

			expect(result).toBeUndefined()
			expect(undefinedFn).toHaveBeenCalledTimes(1)
		})

		it('handles function that returns null', async () => {
			const nullFn = vi.fn().mockResolvedValue(null)

			const result = await retry(nullFn)

			expect(result).toBeNull()
			expect(nullFn).toHaveBeenCalledTimes(1)
		})

		it('handles function that returns complex objects', async () => {
			const complexObject = {
				nested: { array: [1, 2, 3] },
				fn: () => 'test',
				date: new Date('2023-01-01'),
			}
			const complexFn = vi.fn().mockResolvedValue(complexObject)

			const result = await retry(complexFn)

			expect(result).toEqual(complexObject)
			expect(result).toBe(complexObject) // Same reference
		})

		it('handles empty options object', async () => {
			const successFn = vi.fn().mockResolvedValue('success')

			const result = await retry(successFn, {})

			expect(result).toBe('success')
			expect(successFn).toHaveBeenCalledTimes(1)
		})

		it('handles no options parameter', async () => {
			const successFn = vi.fn().mockResolvedValue('success')

			const result = await retry(successFn)

			expect(result).toBe('success')
			expect(successFn).toHaveBeenCalledTimes(1)
		})

		it('handles zero wait duration', async () => {
			const failFn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success')

			const promise = retry(failFn, { waitDuration: 0 })

			// Even with zero wait, still need to advance timers for the sleep calls
			await vi.advanceTimersByTimeAsync(10)

			const result = await promise

			expect(result).toBe('success')
			expect(failFn).toHaveBeenCalledTimes(2)
		})

		it('handles negative attempts gracefully', async () => {
			const neverCalledFn = vi.fn().mockResolvedValue('never called')

			const promise = retry(neverCalledFn, { attempts: -1 })

			await expect(promise).rejects.toBeNull()
			expect(neverCalledFn).toHaveBeenCalledTimes(0)
		})

		it('preserves error properties and stack traces', async () => {
			const originalError = new Error('original message')
			originalError.stack = 'original stack trace'
			;(originalError as any).customProperty = 'custom value'

			const failFn = vi.fn().mockRejectedValue(originalError)

			const promise = retry(failFn, { attempts: 2 })

			await vi.advanceTimersByTimeAsync(2000)

			try {
				await promise
				expect.fail('Should have thrown')
			} catch (error) {
				expect(error).toBe(originalError) // Same reference
				expect((error as any).message).toBe('original message')
				expect((error as any).stack).toBe('original stack trace')
				expect((error as any).customProperty).toBe('custom value')
			}
		})
	})

	describe('timing behavior', () => {
		it('waits correct duration between retries', async () => {
			const failFn = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail 1'))
				.mockRejectedValueOnce(new Error('fail 2'))
				.mockResolvedValue('success')

			const promise = retry(failFn, { waitDuration: 500 })

			// First call should happen immediately
			await vi.advanceTimersByTimeAsync(0)
			expect(failFn).toHaveBeenCalledTimes(1)

			// Second call should happen after 500ms
			await vi.advanceTimersByTimeAsync(499)
			expect(failFn).toHaveBeenCalledTimes(1)

			await vi.advanceTimersByTimeAsync(1)
			expect(failFn).toHaveBeenCalledTimes(2)

			// Third call should happen after another 500ms
			await vi.advanceTimersByTimeAsync(499)
			expect(failFn).toHaveBeenCalledTimes(2)

			await vi.advanceTimersByTimeAsync(1)
			const result = await promise

			expect(result).toBe('success')
			expect(failFn).toHaveBeenCalledTimes(3)
		})

		it('waits after each failed attempt including final attempt', async () => {
			const failFn = vi.fn().mockRejectedValue(new Error('always fails'))

			const promise = retry(failFn, { attempts: 2, waitDuration: 1000 })

			// Need to advance timers to account for sleep after each attempt
			await vi.advanceTimersByTimeAsync(2000)

			await expect(promise).rejects.toThrow('always fails')
			expect(failFn).toHaveBeenCalledTimes(2)
		})
	})

	describe('concurrent executions', () => {
		it('handles multiple concurrent retry calls independently', async () => {
			const fn1 = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success 1')

			const fn2 = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail'))
				.mockRejectedValueOnce(new Error('fail'))
				.mockResolvedValue('success 2')

			const promise1 = retry(fn1, { waitDuration: 100 })
			const promise2 = retry(fn2, { waitDuration: 200 })

			await vi.advanceTimersByTimeAsync(500)

			const [result1, result2] = await Promise.all([promise1, promise2])

			expect(result1).toBe('success 1')
			expect(result2).toBe('success 2')
			expect(fn1).toHaveBeenCalledTimes(2)
			expect(fn2).toHaveBeenCalledTimes(3)
		})
	})
})

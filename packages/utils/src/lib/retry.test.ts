import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { retry } from './retry'

describe('retry', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

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

		await vi.advanceTimersByTimeAsync(3000)
		const result = await promise

		expect(result).toBe('success')
		expect(successFn).toHaveBeenCalledTimes(3)
	})

	it('respects custom waitDuration setting', async () => {
		const failFn = vi.fn().mockRejectedValueOnce(new Error('fail 1')).mockResolvedValue('success')

		const promise = retry(failFn, { waitDuration: 2500 })

		await vi.advanceTimersByTimeAsync(2000)
		expect(failFn).toHaveBeenCalledTimes(1)

		await vi.advanceTimersByTimeAsync(1000)
		const result = await promise

		expect(result).toBe('success')
		expect(failFn).toHaveBeenCalledTimes(2)
	})

	it('retries only errors that match the filter', async () => {
		class NetworkError extends Error {
			constructor(message: string) {
				super(message)
				this.name = 'NetworkError'
			}
		}

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
})

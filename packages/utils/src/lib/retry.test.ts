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

	// it('throws last error when all attempts fail', async () => {
	// 	const failFn = vi
	// 		.fn()
	// 		.mockRejectedValueOnce(new Error('fail 1'))
	// 		.mockRejectedValueOnce(new Error('fail 2'))
	// 		.mockRejectedValueOnce(new Error('fail 3'))

	// 	const promise = retry(failFn)

	// 	await vi.advanceTimersByTimeAsync(3000)

	// 	await expect(promise).rejects.toThrow('fail 3')
	// 	expect(failFn).toHaveBeenCalledTimes(3)
	// })

	// it('respects custom attempts setting', async () => {
	// 	const failFn = vi.fn().mockRejectedValue(new Error('always fails'))

	// 	const promise = retry(failFn, { attempts: 5 })

	// 	await vi.advanceTimersByTimeAsync(6000)

	// 	await expect(promise).rejects.toThrow('always fails')
	// 	expect(failFn).toHaveBeenCalledTimes(5)
	// })

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

	// it('stops retrying when aborted during execution', async () => {
	// 	const controller = new AbortController()
	// 	const failFn = vi.fn().mockRejectedValue(new Error('fail'))

	// 	const promise = retry(failFn, {
	// 		attempts: 10,
	// 		waitDuration: 1000,
	// 		abortSignal: controller.signal,
	// 	})

	// 	await vi.advanceTimersByTimeAsync(500)
	// 	expect(failFn).toHaveBeenCalledTimes(1)

	// 	controller.abort()

	// 	await vi.advanceTimersByTimeAsync(1000)

	// 	await expect(promise).rejects.toThrow('aborted')
	// 	expect(failFn).toHaveBeenCalledTimes(1)
	// })

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

	// it('does not retry errors that do not match the filter', async () => {
	// 	class NetworkError extends Error {
	// 		constructor(message: string) {
	// 			super(message)
	// 			this.name = 'NetworkError'
	// 		}
	// 	}

	// 	class ValidationError extends Error {
	// 		constructor(message: string) {
	// 			super(message)
	// 			this.name = 'ValidationError'
	// 		}
	// 	}

	// 	const failFn = vi
	// 		.fn()
	// 		.mockRejectedValueOnce(new NetworkError('network fail'))
	// 		.mockRejectedValueOnce(new ValidationError('validation fail'))

	// 	const promise = retry(failFn, {
	// 		attempts: 5,
	// 		matchError: (error) => error instanceof NetworkError,
	// 	})

	// 	await vi.advanceTimersByTimeAsync(2000)

	// 	await expect(promise).rejects.toThrow('validation fail')
	// 	expect(failFn).toHaveBeenCalledTimes(2)
	// })
})

import { vi } from 'vitest'
import { debounce } from './debounce'

vi.useFakeTimers()

describe(debounce, () => {
	it('should debounce a function', async () => {
		const fn = vi.fn()
		const debounced = debounce(fn, 100)
		debounced()
		debounced()
		debounced()
		expect(fn).not.toHaveBeenCalled()
		vi.advanceTimersByTime(200)
		expect(fn).toHaveBeenCalledTimes(1)
		vi.advanceTimersByTime(200)
		expect(fn).toHaveBeenCalledTimes(1)
		vi.advanceTimersByTime(200)
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it('should debounce a function with arguments', async () => {
		const fn = vi.fn()
		const debounced = debounce(fn, 100)
		debounced('a', 'b')
		debounced('a', 'b')
		debounced('a', 'b')
		expect(fn).not.toHaveBeenCalled()
		vi.advanceTimersByTime(200)
		expect(fn).toHaveBeenCalledTimes(1)
		expect(fn).toHaveBeenCalledWith('a', 'b')
	})

	it('should debounce a function with arguments and return a promise', async () => {
		const fn = vi.fn((a, b) => a + b)
		const debounced = debounce(fn, 100)
		const promiseA = debounced('a', 'b')
		const promiseB = debounced('c', 'd')
		const promiseC = debounced('e', 'f')
		expect(fn).not.toHaveBeenCalled()
		vi.advanceTimersByTime(200)
		expect(fn).toHaveBeenCalledTimes(1)
		const results = await Promise.all([promiseA, promiseB, promiseC])

		expect(results).toEqual(['ef', 'ef', 'ef'])
	})

	it('can be called across multiple debounce windows', async () => {
		const fn = vi.fn((a, b) => a + b)
		const debounced = debounce(fn, 100)
		const promiseA = debounced('a', 'b')
		const promiseB = debounced('c', 'd')
		expect(fn).not.toHaveBeenCalled()
		vi.advanceTimersByTime(200)
		expect(fn).toHaveBeenCalledTimes(1)

		expect(await Promise.all([promiseA, promiseB])).toEqual(['cd', 'cd'])

		const promiseC = debounced('e', 'f')
		const promiseD = debounced('g', 'h')
		expect(fn).toHaveBeenCalledTimes(1)

		vi.advanceTimersByTime(200)

		expect(fn).toHaveBeenCalledTimes(2)
		expect(await Promise.all([promiseC, promiseD])).toEqual(['gh', 'gh'])
	})

	it('rejects the pending promise when cancelled', async () => {
		const fn = vi.fn()
		const debounced = debounce(fn, 100)
		const promiseA = debounced()
		const promiseB = debounced()

		debounced.cancel()
		vi.advanceTimersByTime(200)

		expect(fn).not.toHaveBeenCalled()
		await expect(promiseA).rejects.toThrow('Debounced function was cancelled')
		await expect(promiseB).rejects.toThrow('Debounced function was cancelled')
	})

	it('starts a fresh promise after cancel', async () => {
		const fn = vi.fn((a, b) => a + b)
		const debounced = debounce(fn, 100)
		const cancelledPromise = debounced('a', 'b')

		debounced.cancel()
		await expect(cancelledPromise).rejects.toThrow('Debounced function was cancelled')

		const freshPromise = debounced('c', 'd')
		expect(freshPromise).not.toBe(cancelledPromise)

		vi.advanceTimersByTime(200)
		expect(fn).toHaveBeenCalledTimes(1)
		expect(fn).toHaveBeenCalledWith('c', 'd')
		expect(await freshPromise).toBe('cd')
	})

	it('cancel is a no-op when no call is pending', async () => {
		const fn = vi.fn()
		const debounced = debounce(fn, 100)
		expect(() => debounced.cancel()).not.toThrow()

		const promise = debounced()
		debounced.cancel()
		await expect(promise).rejects.toThrow('Debounced function was cancelled')

		expect(() => debounced.cancel()).not.toThrow()
	})

	it('does not emit an unhandledrejection when the promise is discarded on cancel', async () => {
		const handler = vi.fn()
		process.on('unhandledRejection', handler)
		try {
			const fn = vi.fn()
			const debounced = debounce(fn, 100)
			debounced()
			debounced.cancel()

			await new Promise(process.nextTick)

			expect(handler).not.toHaveBeenCalled()
		} finally {
			process.off('unhandledRejection', handler)
		}
	})
})

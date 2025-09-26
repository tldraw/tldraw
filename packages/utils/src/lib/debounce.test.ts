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
})

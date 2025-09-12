import { describe, expect, it, vi } from 'vitest'
import { noop, omitFromStackTrace } from './function'

describe('omitFromStackTrace', () => {
	it('returns a function that behaves identically to the original', () => {
		const add = (a: number, b: number) => a + b
		const wrappedAdd = omitFromStackTrace(add)

		expect(wrappedAdd(2, 3)).toBe(5)
		expect(wrappedAdd(-1, 1)).toBe(0)
	})

	it('preserves function arguments and return types', () => {
		const fn = (str: string, num: number) => `${str}:${num}`
		const wrapped = omitFromStackTrace(fn)

		expect(wrapped('test', 42)).toBe('test:42')
	})

	it('wraps functions that throw errors', () => {
		const throwingFn = () => {
			throw new Error('test error')
		}
		const wrapped = omitFromStackTrace(throwingFn)

		expect(() => wrapped()).toThrow('test error')
	})

	it('calls Error.captureStackTrace when available and error is thrown', () => {
		// Mock Error.captureStackTrace if it doesn't exist
		const originalCaptureStackTrace = Error.captureStackTrace
		Error.captureStackTrace = vi.fn()

		const throwingFn = () => {
			throw new Error('test error')
		}
		const wrapped = omitFromStackTrace(throwingFn)

		try {
			wrapped()
		} catch (error) {
			expect(Error.captureStackTrace).toHaveBeenCalledWith(error, expect.any(Function))
		}

		// Restore original
		Error.captureStackTrace = originalCaptureStackTrace
	})

	it('does not call Error.captureStackTrace when not available', () => {
		// Save original and remove it
		const originalCaptureStackTrace = Error.captureStackTrace
		// @ts-expect-error - testing runtime behavior
		delete Error.captureStackTrace

		const throwingFn = () => {
			throw new Error('test error')
		}
		const wrapped = omitFromStackTrace(throwingFn)

		expect(() => wrapped()).toThrow('test error')

		// Restore original
		Error.captureStackTrace = originalCaptureStackTrace
	})

	it('does not call Error.captureStackTrace for non-Error objects', () => {
		const originalCaptureStackTrace = Error.captureStackTrace
		Error.captureStackTrace = vi.fn()

		const throwingFn = () => {
			throw 'string error'
		}
		const wrapped = omitFromStackTrace(throwingFn)

		try {
			wrapped()
		} catch (error) {
			expect(Error.captureStackTrace).not.toHaveBeenCalled()
		}

		// Restore original
		Error.captureStackTrace = originalCaptureStackTrace
	})

	it('works with async functions', async () => {
		const asyncFn = async (value: string) => {
			await new Promise((resolve) => setTimeout(resolve, 1))
			return value.toUpperCase()
		}
		const wrapped = omitFromStackTrace(asyncFn)

		const result = await wrapped('hello')
		expect(result).toBe('HELLO')
	})

	it('works with async functions that throw', async () => {
		const asyncThrowingFn = async () => {
			await new Promise((resolve) => setTimeout(resolve, 1))
			throw new Error('async error')
		}
		const wrapped = omitFromStackTrace(asyncThrowingFn)

		await expect(wrapped()).rejects.toThrow('async error')
	})
})

describe('noop', () => {
	it('is a function', () => {
		expect(typeof noop).toBe('function')
	})

	it('returns undefined', () => {
		expect(noop()).toBeUndefined()
	})

	it('accepts no arguments', () => {
		expect(noop.length).toBe(0)
	})

	it('can be called multiple times without side effects', () => {
		expect(() => {
			noop()
			noop()
			noop()
		}).not.toThrow()
	})

	it('can be used as default callback', () => {
		const processItems = (items: string[], callback: () => void = noop) => {
			items.forEach(() => callback())
		}

		expect(() => processItems(['a', 'b', 'c'])).not.toThrow()
	})

	it('can be used in object properties', () => {
		const handlers = {
			onSuccess: noop,
			onError: noop,
		}

		expect(() => {
			handlers.onSuccess()
			handlers.onError()
		}).not.toThrow()
	})
})

import { describe, expect, it } from 'vitest'
import { omitFromStackTrace } from './function'

describe('omitFromStackTrace', () => {
	it('preserves function behavior and return values', () => {
		const add = (a: number, b: number) => a + b
		const wrapped = omitFromStackTrace(add)

		expect(wrapped(2, 3)).toBe(5)
		expect(wrapped(-1, 1)).toBe(0)
	})

	it('preserves thrown errors', () => {
		const throwingFn = () => {
			throw new Error('test error')
		}
		const wrapped = omitFromStackTrace(throwingFn)

		expect(() => wrapped()).toThrow('test error')
	})
})

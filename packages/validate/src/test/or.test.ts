import * as T from '../lib/validation'

describe('§17 Either-of', () => {
	it('[OR1] returns the first validator’s result when it passes, else the second’s', () => {
		const stringOrNumber = T.or(T.string, T.number)
		expect(stringOrNumber.validate('hello')).toBe('hello')
		expect(stringOrNumber.validate(42)).toBe(42)
	})

	it('[OR2] when both fail, the second validator’s error propagates', () => {
		expect(() => T.or(T.string, T.number).validate(true)).toThrow('Expected number, got a boolean')
	})
})

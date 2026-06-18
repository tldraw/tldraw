import * as T from '../lib/validation'

describe('§16 Index keys', () => {
	it('[IK1] accepts valid fractional index keys', () => {
		expect(T.indexKey.validate('a0')).toBe('a0')
		expect(T.indexKey.validate('a1J')).toBe('a1J')
	})

	it('[IK1] rejects invalid index keys', () => {
		expect(() => T.indexKey.validate('a')).toThrow('Expected an index key, got "a"')
		expect(() => T.indexKey.validate('a00')).toThrow('Expected an index key, got "a00"')
		expect(() => T.indexKey.validate('')).toThrow('Expected an index key, got ""')
		expect(() => T.indexKey.validate(5)).toThrow('Expected string, got a number')
	})
})

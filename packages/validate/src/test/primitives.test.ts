import * as T from '../lib/validation'

describe('§6 Primitives', () => {
	it('[P1] string, boolean, and bigint validate by typeof', () => {
		expect(T.string.validate('hello')).toBe('hello')
		expect(T.string.validate('')).toBe('')
		expect(() => T.string.validate(123)).toThrow('Expected string, got a number')

		expect(T.boolean.validate(true)).toBe(true)
		expect(T.boolean.validate(false)).toBe(false)
		expect(() => T.boolean.validate('true')).toThrow('Expected boolean, got a string')

		expect(T.bigint.validate(123n)).toBe(123n)
		expect(() => T.bigint.validate(123)).toThrow('Expected bigint, got a number')
	})

	it('[P2] type-mismatch messages describe the actual value', () => {
		expect(() => T.string.validate(null)).toThrow('Expected string, got null')
		expect(() => T.string.validate(undefined)).toThrow('Expected string, got undefined')
		expect(() => T.string.validate([1])).toThrow('Expected string, got an array')
		expect(() => T.string.validate({})).toThrow('Expected string, got an object')
		expect(() => T.string.validate(1)).toThrow('Expected string, got a number')
		expect(() => T.string.validate(true)).toThrow('Expected string, got a boolean')
		expect(() => T.string.validate(1n)).toThrow('Expected string, got a bigint')
		expect(() => T.string.validate(() => {})).toThrow('Expected string, got a function')
		expect(() => T.string.validate(Symbol('s'))).toThrow('Expected string, got a symbol')
	})

	it('[P3] unknown and any accept every value as-is', () => {
		const obj = { a: 1 }
		expect(T.unknown.validate(obj)).toBe(obj)
		expect(T.unknown.validate(undefined)).toBe(undefined)
		expect(T.unknown.validate(null)).toBe(null)
		expect(T.any.validate(obj)).toBe(obj)
		expect(T.any.validate(undefined)).toBe(undefined)
	})

	it('[P4] literal accepts exactly the expected value', () => {
		expect(T.literal('active').validate('active')).toBe('active')
		expect(T.literal(1).validate(1)).toBe(1)
		expect(T.literal(true).validate(true)).toBe(true)

		expect(() => T.literal('a').validate('b')).toThrow('Expected a, got "b"')
		expect(() => T.literal(1).validate(2)).toThrow('Expected 1, got 2')
		expect(() => T.literal(1).validate(undefined)).toThrow('Expected 1, got undefined')
	})

	it('[P5] array accepts any array without validating items', () => {
		const arr = [1, 'two', null, () => {}]
		expect(T.array.validate(arr)).toBe(arr)
		expect(() => T.array.validate('not array')).toThrow('Expected an array, got a string')
		expect(() => T.array.validate({})).toThrow('Expected an array, got an object')
	})

	it('[P6] unknownObject accepts any non-null object and rejects null and primitives', () => {
		const obj = { any: 'properties' }
		expect(T.unknownObject.validate(obj)).toBe(obj)
		expect(() => T.unknownObject.validate(null)).toThrow('Expected object, got null')
		expect(() => T.unknownObject.validate('x')).toThrow('Expected object, got a string')
		expect(() => T.unknownObject.validate(5)).toThrow('Expected object, got a number')
	})

	it('[P6] unknownObject accepts arrays', () => {
		const arr = [1, 2, 3]
		expect(T.unknownObject.validate(arr)).toBe(arr)
	})
})

import * as T from '../lib/validation'

describe('§13 JSON values', () => {
	it('[J1] accepts JSON scalars, arrays, and plain objects recursively', () => {
		const value = { name: 'Alice', scores: [1, 2, 3], active: true, meta: null, nested: { a: 'b' } }
		expect(T.jsonValue.validate(value)).toBe(value)
		expect(T.jsonValue.validate('x')).toBe('x')
		expect(T.jsonValue.validate(42)).toBe(42)
		expect(T.jsonValue.validate(false)).toBe(false)
		expect(T.jsonValue.validate(null)).toBe(null)
	})

	it('[J1] accepts non-finite numbers', () => {
		expect(T.jsonValue.validate(NaN)).toBe(NaN)
		expect(T.jsonValue.validate(Infinity)).toBe(Infinity)
	})

	it('[J2] rejects non-JSON values anywhere in the structure', () => {
		class Foo {}
		expect(T.jsonValue.isValid(undefined)).toBe(false)
		expect(T.jsonValue.isValid(() => {})).toBe(false)
		expect(T.jsonValue.isValid(1n)).toBe(false)
		expect(T.jsonValue.isValid(Symbol('s'))).toBe(false)
		expect(T.jsonValue.isValid(new Foo())).toBe(false)
		expect(T.jsonValue.isValid({ a: undefined })).toBe(false)
		expect(T.jsonValue.isValid([1, () => {}])).toBe(false)
		expect(T.jsonValue.isValid({ deep: { deeper: [1n] } })).toBe(false)
	})

	it('[J2] rejects sparse arrays, whose holes read as undefined', () => {
		// eslint-disable-next-line no-sparse-arrays
		expect(T.jsonValue.isValid([1, , 3])).toBe(false)
		expect(T.jsonValue.isValid(new Array(3))).toBe(false)
	})

	it('[J3] accepts null-prototype and structured-clone objects as plain objects', () => {
		expect(T.jsonValue.isValid(Object.create(null))).toBe(true)
		expect(T.jsonValue.isValid(structuredClone({ a: 1 }))).toBe(true)
	})

	it('[J4] the full-validation failure message reports the typeof of the root value', () => {
		expect(() => T.jsonValue.validate({ a: undefined })).toThrow(
			'Expected json serializable value, got object'
		)
		expect(() => T.jsonValue.validate(() => {})).toThrow(
			'Expected json serializable value, got function'
		)
	})

	it('[J5] known-good validation is incremental and identity-preserving for arrays', () => {
		const knownGood = T.jsonValue.validate([1, [2], 'x'])
		expect(T.jsonValue.validateUsingKnownGoodVersion(knownGood, [1, [2], 'x'])).toBe(knownGood)

		const changed = [1, [2], 'y']
		expect(T.jsonValue.validateUsingKnownGoodVersion(knownGood, changed)).toBe(changed)

		const longer = [1, [2], 'x', 4]
		expect(T.jsonValue.validateUsingKnownGoodVersion(knownGood, longer)).toBe(longer)

		const shorter = [1, [2]]
		expect(T.jsonValue.validateUsingKnownGoodVersion(knownGood, shorter)).toBe(shorter)
	})

	it('[J5] known-good validation is incremental and identity-preserving for objects', () => {
		const knownGood = T.jsonValue.validate({ a: [1, 2], b: 'x' })
		expect(T.jsonValue.validateUsingKnownGoodVersion(knownGood, { a: [1, 2], b: 'x' })).toBe(
			knownGood
		)

		const changed = { a: [1, 2], b: 'y' }
		expect(T.jsonValue.validateUsingKnownGoodVersion(knownGood, changed)).toBe(changed)

		const removed = { a: [1, 2] }
		expect(T.jsonValue.validateUsingKnownGoodVersion(knownGood, removed)).toBe(removed)

		const added = { a: [1, 2], b: 'x', c: 1 }
		expect(T.jsonValue.validateUsingKnownGoodVersion(knownGood, added)).toBe(added)
	})

	it('[J5] added and changed entries are validated', () => {
		const knownGoodArr = T.jsonValue.validate([1, 2])
		expect(() => T.jsonValue.validateUsingKnownGoodVersion(knownGoodArr, [1, () => {}])).toThrow()
		expect(() =>
			T.jsonValue.validateUsingKnownGoodVersion(knownGoodArr, [1, 2, () => {}])
		).toThrow()

		const knownGoodObj = T.jsonValue.validate({ a: 1 })
		expect(() => T.jsonValue.validateUsingKnownGoodVersion(knownGoodObj, { a: () => {} })).toThrow()
		expect(() =>
			T.jsonValue.validateUsingKnownGoodVersion(knownGoodObj, { a: 1, b: () => {} })
		).toThrow()
	})

	it('[J6] a shape mismatch falls back to a full validation of the new value', () => {
		const knownGoodArr = T.jsonValue.validate([1])
		const obj = { a: 1 }
		expect(T.jsonValue.validateUsingKnownGoodVersion(knownGoodArr, obj)).toBe(obj)

		const knownGoodObj = T.jsonValue.validate({ a: 1 })
		const arr = [1]
		expect(T.jsonValue.validateUsingKnownGoodVersion(knownGoodObj, arr)).toBe(arr)

		expect(T.jsonValue.validateUsingKnownGoodVersion(knownGoodObj, 'x')).toBe('x')
		expect(() => T.jsonValue.validateUsingKnownGoodVersion(knownGoodObj, () => {})).toThrow(
			'Expected json serializable value, got function'
		)
	})
})

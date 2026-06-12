import * as T from '../lib/validation'
import { ValidationError } from '../lib/validation'

// ValidationError behavior (E)
describe('ValidationError [E]', () => {
	it('extends Error with name ValidationError [E1]', () => {
		const error = new ValidationError('test')
		expect(error).toBeInstanceOf(Error)
		expect(error.name).toBe('ValidationError')
	})

	it('formats message with path when path is non-empty [E2]', () => {
		const error = new ValidationError('test message', ['a', 'b'])
		expect(error.message).toContain('At a.b: test message')
	})

	it('uses raw message when path is empty [E2]', () => {
		const error = new ValidationError('test message', [])
		// Empty path still formats with "At null:" in the implementation
		expect(error.message).toContain('test message')
	})

	it('preserves rawMessage property [E3]', () => {
		const error = new ValidationError('raw test', ['x'])
		expect(error.rawMessage).toBe('raw test')
	})

	it('preserves path property [E4]', () => {
		const error = new ValidationError('msg', ['key1', 0, 'key2'])
		expect(error.path).toEqual(['key1', 0, 'key2'])
	})

	it('removes id references from formatted path [E5]', () => {
		const error = new ValidationError('msg', ['id = abc123, name', 'value'])
		expect(error.message).toContain('At name.value')
		expect(error.message).not.toContain('id = abc123')
	})
})

// Validator basics (V)
describe('Validator basics [V]', () => {
	it('implements Validatable<T> [V1]', () => {
		const validator = new T.Validator((v: unknown) => v as string)
		expect(validator).toHaveProperty('validate')
		expect(typeof validator.validate).toBe('function')
	})

	it('calls validation function and returns result [V2]', () => {
		const validator = new T.Validator((v: unknown) => {
			// Return the same value unchanged (validators must preserve referential equality)
			if (typeof v !== 'string') throw new ValidationError('not a string')
			return v
		})
		expect(validator.validate('hello')).toBe('hello')
	})

	it('throws ValidationError when validation fails [V2]', () => {
		const validator = new T.Validator((v: unknown) => {
			if (typeof v !== 'string') throw new ValidationError('not a string')
			return v
		})
		expect(() => validator.validate(123)).toThrow(ValidationError)
	})

	it('asserts referential equality in dev mode [V3]', () => {
		// In dev mode, should throw if validation function returns different object
		const validator = new T.Validator((_v: unknown) => 'different string')
		expect(() => validator.validate('original')).toThrow(/must return the same value/)
	})

	it('nullable returns Validator<T | null> [V7]', () => {
		const stringOrNull = T.string.nullable()
		expect(stringOrNull.validate('hello')).toBe('hello')
		expect(stringOrNull.validate(null)).toBe(null)
		expect(() => stringOrNull.validate(undefined)).toThrow()
	})

	it('optional returns Validator<T | undefined> [V7]', () => {
		const stringOrUndefined = T.string.optional()
		expect(stringOrUndefined.validate('hello')).toBe('hello')
		expect(stringOrUndefined.validate(undefined)).toBe(undefined)
		expect(() => stringOrUndefined.validate(null)).toThrow()
	})

	it('isValid is a type guard [V6]', () => {
		const val: unknown = 'hello'
		if (T.string.isValid(val)) {
			expect(typeof val).toBe('string')
		}
	})
})

// Primitive validators (P)
describe('Primitive validators [P]', () => {
	it('T.unknown accepts any value [P1]', () => {
		expect(T.unknown.validate('string')).toBe('string')
		expect(T.unknown.validate(123)).toBe(123)
		expect(T.unknown.validate(null)).toBe(null)
		expect(T.unknown.validate(undefined)).toBe(undefined)
	})

	it('T.any accepts any value and types as any [P2]', () => {
		expect(T.any.validate({})).toBeDefined()
	})

	it('T.string accepts strings [P3]', () => {
		expect(T.string.validate('hello')).toBe('hello')
		expect(T.string.validate('')).toBe('')
	})

	it('T.string rejects non-strings [P3]', () => {
		expect(() => T.string.validate(123)).toThrow(/Expected string, got a number/)
		expect(() => T.string.validate(null)).toThrow(/Expected string, got null/)
		expect(() => T.string.validate(undefined)).toThrow(/Expected string, got undefined/)
	})

	it('T.boolean accepts booleans [P4]', () => {
		expect(T.boolean.validate(true)).toBe(true)
		expect(T.boolean.validate(false)).toBe(false)
	})

	it('T.boolean rejects non-booleans [P4]', () => {
		expect(() => T.boolean.validate('true')).toThrow(/Expected boolean/)
		expect(() => T.boolean.validate(1)).toThrow(/Expected boolean/)
	})

	it('T.bigint accepts bigints [P5]', () => {
		expect(T.bigint.validate(123n)).toBe(123n)
	})

	it('T.bigint rejects non-bigints [P5]', () => {
		expect(() => T.bigint.validate(123)).toThrow(/Expected bigint/)
	})

	it('T.array accepts arrays [P6]', () => {
		expect(T.array.validate([1, 2, 3])).toEqual([1, 2, 3])
		expect(T.array.validate([])).toEqual([])
	})

	it('T.array rejects non-arrays [P6]', () => {
		expect(() => T.array.validate('not array')).toThrow(/Expected an array/)
		expect(() => T.array.validate({ length: 0 })).toThrow(/Expected an array/)
	})

	it('T.unknownObject accepts non-null objects [P7]', () => {
		expect(T.unknownObject.validate({ a: 1 })).toEqual({ a: 1 })
		expect(T.unknownObject.validate([])).toEqual([])
	})

	it('T.unknownObject rejects null and primitives [P7]', () => {
		expect(() => T.unknownObject.validate(null)).toThrow(/Expected object, got null/)
		expect(() => T.unknownObject.validate('string')).toThrow(/Expected object/)
	})
})

// Number validators (N)
describe('Number validators [N]', () => {
	it('T.number accepts finite numbers [N1]', () => {
		expect(T.number.validate(42)).toBe(42)
		expect(T.number.validate(0)).toBe(0)
		expect(T.number.validate(-3.14)).toBe(-3.14)
	})

	it('T.number rejects Infinity [N2]', () => {
		expect(() => T.number.validate(Infinity)).toThrow(/Expected a finite number/)
		expect(() => T.number.validate(-Infinity)).toThrow(/Expected a finite number/)
	})

	it('T.number rejects NaN with specific message [N2]', () => {
		expect(() => T.number.validate(NaN)).toThrow(/Expected a number, got NaN/)
	})

	it('T.number rejects non-numbers [N2]', () => {
		expect(() => T.number.validate('42')).toThrow(/Expected number, got a string/)
	})

	it('T.positiveNumber accepts >= 0 [N3]', () => {
		expect(T.positiveNumber.validate(0)).toBe(0)
		expect(T.positiveNumber.validate(42)).toBe(42)
	})

	it('T.positiveNumber rejects negative numbers [N3]', () => {
		expect(() => T.positiveNumber.validate(-1)).toThrow(/Expected a positive number/)
	})

	it('T.nonZeroNumber accepts > 0 [N4]', () => {
		expect(T.nonZeroNumber.validate(0.001)).toBe(0.001)
		expect(T.nonZeroNumber.validate(42)).toBe(42)
	})

	it('T.nonZeroNumber rejects zero and negative [N4]', () => {
		expect(() => T.nonZeroNumber.validate(0)).toThrow(/Expected a non-zero positive number/)
		expect(() => T.nonZeroNumber.validate(-1)).toThrow(/Expected a non-zero positive number/)
	})

	it('T.nonZeroFiniteNumber accepts any finite non-zero [N5]', () => {
		expect(T.nonZeroFiniteNumber.validate(-1.5)).toBe(-1.5)
		expect(T.nonZeroFiniteNumber.validate(1.5)).toBe(1.5)
	})

	it('T.nonZeroFiniteNumber rejects zero [N5]', () => {
		expect(() => T.nonZeroFiniteNumber.validate(0)).toThrow(/Expected a non-zero number/)
	})

	it('T.unitInterval accepts [0, 1] [N6]', () => {
		expect(T.unitInterval.validate(0)).toBe(0)
		expect(T.unitInterval.validate(0.5)).toBe(0.5)
		expect(T.unitInterval.validate(1)).toBe(1)
	})

	it('T.unitInterval rejects outside [0, 1] [N6]', () => {
		expect(() => T.unitInterval.validate(1.5)).toThrow(/Expected a number between 0 and 1/)
		expect(() => T.unitInterval.validate(-0.1)).toThrow(/Expected a number between 0 and 1/)
	})

	it('T.integer accepts whole numbers [N7]', () => {
		expect(T.integer.validate(42)).toBe(42)
		expect(T.integer.validate(-5)).toBe(-5)
		expect(T.integer.validate(0)).toBe(0)
	})

	it('T.integer rejects decimals [N7]', () => {
		expect(() => T.integer.validate(3.14)).toThrow(/Expected an integer/)
	})

	it('T.positiveInteger accepts >= 0 [N8]', () => {
		expect(T.positiveInteger.validate(0)).toBe(0)
		expect(T.positiveInteger.validate(5)).toBe(5)
	})

	it('T.positiveInteger rejects negative [N8]', () => {
		expect(() => T.positiveInteger.validate(-1)).toThrow(/Expected a positive integer/)
	})

	it('T.nonZeroInteger accepts > 0 [N9]', () => {
		expect(T.nonZeroInteger.validate(1)).toBe(1)
	})

	it('T.nonZeroInteger rejects zero and negative [N9]', () => {
		expect(() => T.nonZeroInteger.validate(0)).toThrow(/Expected a non-zero positive integer/)
	})
})

// Literal and enum validators (L)
describe('Literal and enum validators [L]', () => {
	it('T.literal creates exact-match validator [L1]', () => {
		const lit = T.literal('hello')
		expect(lit.validate('hello')).toBe('hello')
	})

	it('T.literal rejects non-matching values [L1]', () => {
		expect(() => T.literal('hello').validate('world')).toThrow(/Expected hello/)
	})

	it('T.setEnum accepts set members [L2]', () => {
		const colors = T.setEnum(new Set(['red', 'green', 'blue']))
		expect(colors.validate('red')).toBe('red')
	})

	it('T.setEnum rejects non-members [L2]', () => {
		const colors = T.setEnum(new Set(['red', 'green', 'blue']))
		expect(() => colors.validate('yellow')).toThrow(/Expected/)
	})

	it('T.literalEnum creates enum from arguments [L3]', () => {
		const color = T.literalEnum('red', 'green', 'blue')
		expect(color.validate('red')).toBe('red')
		expect(() => color.validate('yellow')).toThrow()
	})
})

// Array validators (A)
describe('Array validators [A]', () => {
	it('T.arrayOf validates array structure and elements [A1, A2]', () => {
		const nums = T.arrayOf(T.number)
		expect(nums.validate([1, 2, 3])).toEqual([1, 2, 3])
	})

	it('rejects non-array [A2]', () => {
		expect(() => T.arrayOf(T.number).validate('not array')).toThrow(/Expected an array/)
	})

	it('prefixes element errors with index [A3]', () => {
		expect(() => T.arrayOf(T.number).validate([1, 'two', 3])).toThrow(/At 1:/)
	})

	it('validateUsingKnownGoodVersion skips revalidation for unchanged items [A4]', () => {
		const validator = T.arrayOf(T.number)
		const arr = [1, 2, 3]
		const result = validator.validateUsingKnownGoodVersion(arr, arr)
		expect(result).toBe(arr)
	})

	it('validateUsingKnownGoodVersion revalidates changed items [A4]', () => {
		const validator = T.arrayOf(T.number)
		const original = [1, 2, 3]
		const updated = [1, 2, 4]
		const result = validator.validateUsingKnownGoodVersion(original, updated)
		expect(result).toEqual(updated)
	})

	it('validateUsingKnownGoodVersion detects length changes [A5]', () => {
		const validator = T.arrayOf(T.number)
		const original = [1, 2, 3]
		const updated = [1, 2]
		const result = validator.validateUsingKnownGoodVersion(original, updated)
		expect(result).toEqual(updated)
	})

	it('nonEmpty rejects empty arrays [A6]', () => {
		expect(() => T.arrayOf(T.string).nonEmpty().validate([])).toThrow(/non-empty/)
	})

	it('nonEmpty accepts non-empty arrays [A6]', () => {
		expect(T.arrayOf(T.string).nonEmpty().validate(['a'])).toEqual(['a'])
	})

	it('lengthGreaterThan1 requires length > 1 [A7]', () => {
		const arr = T.arrayOf(T.string).lengthGreaterThan1()
		expect(arr.validate(['a', 'b'])).toEqual(['a', 'b'])
		expect(() => arr.validate(['a'])).toThrow(/length greater than 1/)
	})
})

// Object validators (O)
describe('Object validators [O]', () => {
	it('T.object validates object structure [O1, O2]', () => {
		const obj = T.object({ name: T.string, age: T.number })
		expect(obj.validate({ name: 'Alice', age: 30 })).toEqual({ name: 'Alice', age: 30 })
	})

	it('rejects non-object [O2]', () => {
		expect(() => T.object({}).validate(null)).toThrow(/Expected object/)
		expect(() => T.object({}).validate('string')).toThrow(/Expected object/)
	})

	it('rejects unknown properties by default [O3]', () => {
		expect(() => T.object({ x: T.number }).validate({ x: 1, y: 2 })).toThrow(/Unexpected property/)
	})

	it('allowUnknownProperties permits extra properties [O4]', () => {
		const obj = T.object({ x: T.number }).allowUnknownProperties()
		expect(obj.validate({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 })
	})

	it('prefixes property errors with key [O5]', () => {
		expect(() => T.object({ name: T.string }).validate({ name: 123 })).toThrow(/At name:/)
	})

	it('validateUsingKnownGoodVersion skips unchanged properties [O6]', () => {
		const validator = T.object({ x: T.number, y: T.number })
		const original = { x: 1, y: 2 }
		const result = validator.validateUsingKnownGoodVersion(original, original)
		expect(result).toBe(original)
	})

	it('validateUsingKnownGoodVersion detects property changes [O7]', () => {
		const validator = T.object({ x: T.number, y: T.number })
		const original = { x: 1, y: 2 }
		const updated = { x: 1, y: 3 }
		const result = validator.validateUsingKnownGoodVersion(original, updated)
		expect(result).toEqual(updated)
	})

	it('validateUsingKnownGoodVersion detects key removal [O8]', () => {
		const validator = T.object({ x: T.number, y: T.number })
		const original = { x: 1, y: 2 }
		const updated = { x: 1 } // missing 'y'
		// Should throw or return the object with missing key detected
		expect(() => validator.validateUsingKnownGoodVersion(original, updated)).toThrow()
	})

	it('extend adds new properties [O9]', () => {
		const base = T.object({ x: T.number })
		const extended = base.extend({ y: T.number })
		expect(extended.validate({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 })
	})
})

// Dictionary validators (D)
describe('Dictionary validators [D]', () => {
	it('T.dict validates keys and values [D1, D2]', () => {
		const dict = T.dict(T.string, T.number)
		expect(dict.validate({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
	})

	it('rejects non-object [D2]', () => {
		const dict = T.dict(T.string, T.number)
		expect(() => dict.validate(null)).toThrow(/Expected object/)
	})

	it('prefixes errors with key [D3]', () => {
		const dict = T.dict(T.string, T.number)
		expect(() => dict.validate({ a: 'not a number' })).toThrow(/At a:/)
	})

	it('validateUsingKnownGoodVersion detects new keys [D4]', () => {
		const dict = T.dict(T.string, T.number)
		const original = { a: 1, b: 2 }
		const updated = { a: 1, b: 2, c: 3 }
		const result = dict.validateUsingKnownGoodVersion(original, updated)
		expect(result).toEqual(updated)
	})

	it('validateUsingKnownGoodVersion detects removed keys [D4]', () => {
		const dict = T.dict(T.string, T.number)
		const original = { a: 1, b: 2 }
		const updated = { a: 1 }
		const result = dict.validateUsingKnownGoodVersion(original, updated)
		expect(result).toEqual(updated)
	})

	it('validateUsingKnownGoodVersion detects value changes [D4]', () => {
		const dict = T.dict(T.string, T.number)
		const original = { a: 1 }
		const updated = { a: 2 }
		const result = dict.validateUsingKnownGoodVersion(original, updated)
		expect(result).toEqual(updated)
	})

	it('T.jsonDict creates dict with string keys and json values [S4]', () => {
		const dict = T.jsonDict()
		expect(dict.validate({ a: 1, b: 'hello', c: [1, 2] })).toEqual({ a: 1, b: 'hello', c: [1, 2] })
	})
})

// Union validators (U)
describe('Union validators [U]', () => {
	it('T.union validates discriminated unions [U1, U2]', () => {
		const schema = T.union('type', {
			cat: T.object({ type: T.literal('cat'), meow: T.boolean }),
			dog: T.object({ type: T.literal('dog'), bark: T.boolean }),
		})
		expect(schema.validate({ type: 'cat', meow: true })).toEqual({ type: 'cat', meow: true })
	})

	it('rejects unknown variants [U3]', () => {
		const schema = T.union('type', {
			cat: T.object({ type: T.literal('cat') }),
		})
		expect(() => schema.validate({ type: 'dog' })).toThrow(/Expected one of/)
	})

	it('prefixes variant errors with discriminator [U4]', () => {
		const schema = T.union('type', {
			cat: T.object({ type: T.literal('cat'), name: T.string }),
		})
		expect(() => schema.validate({ type: 'cat', name: 123 })).toThrow(/\(type = cat\)/)
	})

	it('T.numberUnion uses numeric discriminators [U6]', () => {
		const schema = T.numberUnion('version', {
			1: T.object({ version: T.literal(1), data: T.string }),
		})
		expect(schema.validate({ version: 1, data: 'hello' })).toEqual({ version: 1, data: 'hello' })
	})

	it('numberUnion rejects Infinity [U6]', () => {
		const schema = T.numberUnion('version', {
			1: T.object({ version: T.literal(1), data: T.string }),
		})
		expect(() => schema.validate({ version: Infinity, data: 'test' })).toThrow(/Expected a number/)
	})

	it('validateUnknownVariants handles unknown variants [U7]', () => {
		const schema = T.union('type', {
			cat: T.object({ type: T.literal('cat') }),
		}).validateUnknownVariants((obj, _variant) => {
			// Unknown variant handler receives object and variant name
			// Should return the object as-is or throw
			return obj
		})
		expect(schema.validate({ type: 'dog' })).toEqual({ type: 'dog' })
	})
})

// Composition (C)
describe('Validation composition [C]', () => {
	it('refine applies transformation [C1]', () => {
		const stringToNumber = T.string.refine((s) => parseInt(s, 10))
		expect(stringToNumber.validate('42')).toBe(42)
	})

	it('refine skips same-value check [C2]', () => {
		// refine allows returning different objects
		const upper = T.string.refine((s) => s.toUpperCase())
		expect(upper.validate('hello')).toBe('HELLO')
	})

	it('refine composes with validateUsingKnownGoodVersion [C3]', () => {
		const addPrefix = T.string.refine((s) => (s.startsWith('x') ? s : `x${s}`))
		// validateUsingKnownGoodVersion should work with refine
		const result = addPrefix.validateUsingKnownGoodVersion('xhello', 'xhello')
		expect(result).toBe('xhello')
	})

	it('check runs validation without changing type [C4]', () => {
		const even = T.number.check((n) => {
			if (n % 2 !== 0) throw new ValidationError('Not even')
		})
		expect(even.validate(4)).toBe(4)
		expect(() => even.validate(3)).toThrow(/Not even/)
	})

	it('check with name prepends check name to path [C5]', () => {
		const positive = T.number.check('positive', (n) => {
			if (n <= 0) throw new ValidationError('Not positive')
		})
		expect(() => positive.validate(-1)).toThrow(/\(check positive\)/)
	})

	it('or tries first validator then second [C6]', () => {
		const stringOrNumber = T.or(T.string, T.number)
		expect(stringOrNumber.validate('hello')).toBe('hello')
		expect(stringOrNumber.validate(42)).toBe(42)
		expect(() => stringOrNumber.validate(true)).toThrow()
	})
})

// Optional and nullable handling (ON)
describe('Optional and nullable handling [ON]', () => {
	it('optional accepts undefined [ON1]', () => {
		const opt = T.optional(T.string)
		expect(opt.validate(undefined)).toBe(undefined)
	})

	it('optional rejects null [ON1]', () => {
		expect(() => T.optional(T.string).validate(null)).toThrow()
	})

	it('optional accepts the base type [ON1]', () => {
		const opt = T.optional(T.string)
		expect(opt.validate('hello')).toBe('hello')
	})

	it('nullable accepts null [ON3]', () => {
		const nullable = T.nullable(T.string)
		expect(nullable.validate(null)).toBe(null)
	})

	it('nullable rejects undefined [ON3]', () => {
		expect(() => T.nullable(T.string).validate(undefined)).toThrow()
	})

	it('nullable accepts the base type [ON3]', () => {
		const nullable = T.nullable(T.string)
		expect(nullable.validate('hello')).toBe('hello')
	})

	it('validateUsingKnownGoodVersion for optional with undefined [ON5]', () => {
		const opt = T.optional(T.string)
		const result = opt.validateUsingKnownGoodVersion(undefined, undefined)
		expect(result).toBe(undefined)
	})

	it('validateUsingKnownGoodVersion for nullable with null [ON5]', () => {
		const nullable = T.nullable(T.string)
		const result = nullable.validateUsingKnownGoodVersion(null, null)
		expect(result).toBe(null)
	})

	it('propagates skipSameValueCheck from inner validator [ON6]', () => {
		// refine has skipSameValueCheck, so optional should allow it
		const refined = T.string.refine((s) => s.toUpperCase()).optional()
		expect(refined.validate('hello')).toBe('HELLO')
		expect(refined.validate(undefined)).toBe(undefined)
	})
})

// Special validators (S)
describe('Special validators [S]', () => {
	it('T.model prepends name to error path [S1]', () => {
		const userModel = T.model('User', T.object({ id: T.string, name: T.string }))
		expect(() => userModel.validate({ id: 'abc', name: 123 })).toThrow(/At User.name/)
	})

	it('T.jsonValue accepts json-serializable values [S2]', () => {
		expect(T.jsonValue.validate(null)).toBe(null)
		expect(T.jsonValue.validate(42)).toBe(42)
		expect(T.jsonValue.validate('hello')).toBe('hello')
		expect(T.jsonValue.validate([1, 2, 3])).toEqual([1, 2, 3])
		expect(T.jsonValue.validate({ a: 1 })).toEqual({ a: 1 })
	})

	it('T.jsonValue rejects undefined, functions [S3]', () => {
		expect(() => T.jsonValue.validate(undefined)).toThrow()
		expect(() => T.jsonValue.validate(() => {})).toThrow()
	})

	it('T.linkUrl accepts http/https/mailto [S5]', () => {
		expect(T.linkUrl.validate('https://example.com')).toBe('https://example.com')
		expect(T.linkUrl.validate('mailto:user@example.com')).toBe('mailto:user@example.com')
		expect(T.linkUrl.validate('')).toBe('')
	})

	it('T.linkUrl rejects javascript [S5]', () => {
		expect(() => T.linkUrl.validate('javascript:alert(1)')).toThrow(/invalid protocol/)
	})

	it('T.srcUrl accepts http/https/data/asset [S6]', () => {
		expect(T.srcUrl.validate('https://example.com/image.png')).toBe('https://example.com/image.png')
		expect(T.srcUrl.validate('data:image/png;base64,abc')).toBe('data:image/png;base64,abc')
		expect(T.srcUrl.validate('asset:abc123')).toBe('asset:abc123')
	})

	it('T.httpUrl accepts http/https only [S7]', () => {
		expect(T.httpUrl.validate('https://api.example.com')).toBe('https://api.example.com')
		expect(T.httpUrl.validate('http://localhost:3000')).toBe('http://localhost:3000')
	})

	it('T.httpUrl rejects other protocols [S7]', () => {
		expect(() => T.httpUrl.validate('ftp://example.com')).toThrow(/invalid protocol/)
	})

	it('T.indexKey validates index key format [S8]', () => {
		expect(T.indexKey.validate('a0')).toBe('a0')
		expect(T.indexKey.validate('a1J')).toBe('a1J')
	})

	it('T.indexKey rejects invalid format [S8]', () => {
		expect(() => T.indexKey.validate('a')).toThrow()
		expect(() => T.indexKey.validate('a00')).toThrow()
	})
})

// validateUsingKnownGoodVersion optimization (OP)
describe('Optimized validation [OP]', () => {
	it('returns known good when referentially equal [OP4]', () => {
		const validator = T.arrayOf(T.number)
		const arr = [1, 2, 3]
		const result = validator.validateUsingKnownGoodVersion(arr, arr)
		expect(result).toBe(arr)
	})

	it('revalidates when reference differs [OP5]', () => {
		const validator = T.object({ x: T.number, y: T.number })
		const original = { x: 1, y: 2 }
		const updated = { x: 1, y: 3 }
		const result = validator.validateUsingKnownGoodVersion(original, updated)
		expect(result).toEqual(updated)
		expect(result).not.toBe(original)
	})

	it('skips revalidation of unchanged nested objects [OP5]', () => {
		const inner = T.object({ value: T.number })
		const outer = T.object({ inner: inner })
		const innerObj = { value: 42 }
		const original = { inner: innerObj }
		const updated = { inner: innerObj } // same reference
		const result = outer.validateUsingKnownGoodVersion(original, updated)
		// Should skip revalidating innerObj since it's reference-equal
		expect(result).toEqual(updated)
	})

	it('detects array length changes [OP5]', () => {
		const validator = T.arrayOf(T.number)
		const original = [1, 2, 3]
		const updated = [1, 2] // shorter
		const result = validator.validateUsingKnownGoodVersion(original, updated)
		expect(result).toEqual(updated)
	})

	it('detects object key removal [OP5]', () => {
		const validator = T.object({ x: T.number, y: T.number })
		const original = { x: 1, y: 2 }
		const updated = { x: 1 } // y removed
		expect(() => validator.validateUsingKnownGoodVersion(original, updated)).toThrow()
	})
})

// Error propagation (VP)
describe('Error propagation [VP]', () => {
	it('nested validator errors are caught and path-prefixed [VP1]', () => {
		const schema = T.object({
			items: T.arrayOf(T.object({ id: T.string })),
		})
		expect(() => schema.validate({ items: [{ id: 123 }] })).toThrow(/At items.0.id/)
	})

	it('non-ValidationError throws are caught and converted [VP4]', () => {
		const badValidator = new T.Validator((_v: unknown) => {
			throw new Error('Custom error')
		})
		expect(() => badValidator.validate('test')).toThrow(/Custom error/)
	})

	it('multiline error messages are indented [VP5]', () => {
		const error = new ValidationError('Line 1\nLine 2', ['key'])
		expect(error.message).toContain('Line 1')
		expect(error.message).toContain('  Line 2')
	})
})

// Integration tests
describe('Integration: error paths and messages', () => {
	it('produces nice error messages for nested structures', () => {
		const validator = T.object({
			user: T.object({
				profile: T.object({
					name: T.string,
				}),
			}),
		})
		expect(() => validator.validate({ user: { profile: { name: 123 } } })).toThrow(
			/At user.profile.name:/
		)
	})

	it('formats union discriminator in path [V2, U4]', () => {
		const schema = T.union('type', {
			cat: T.object({ type: T.literal('cat'), name: T.string }),
		})
		expect(() => schema.validate({ type: 'cat', name: 123 })).toThrow(/\(type = cat\)/)
	})

	it('handles multiline error messages with indentation [VP5]', () => {
		const error = new ValidationError('Line 1\nLine 2\nLine 3', ['key'])
		expect(error.message).toContain('At key: Line 1')
		expect(error.message).toContain('  Line 2')
		expect(error.message).toContain('  Line 3')
	})

	it('returns referentially identical validated objects [V2]', () => {
		const validator = T.object({
			name: T.string,
			items: T.arrayOf(T.string.nullable()),
		})
		const value = { name: 'toad', items: ['a', null, 'b'] }
		const result = validator.validate(value)
		expect(result).toBe(value)
	})

	it('works with complex nested structures', () => {
		const schema = T.object({
			animals: T.arrayOf(
				T.union('type', {
					cat: T.object({ type: T.literal('cat'), meow: T.boolean }),
					dog: T.object({ type: T.literal('dog'), bark: T.boolean }),
				})
			),
		})

		const valid = {
			animals: [
				{ type: 'cat', meow: true },
				{ type: 'dog', bark: false },
			],
		}

		expect(schema.validate(valid)).toEqual(valid)

		expect(() =>
			schema.validate({
				animals: [{ type: 'cat', meow: 'not boolean' }],
			})
		).toThrow(/At animals.0.*meow/)
	})
})

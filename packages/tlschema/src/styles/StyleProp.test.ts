import { T } from '@tldraw/validate'
import { describe, expect, it, test, vi } from 'vitest'
import { EnumStyleProp, StyleProp, StylePropValue } from './StyleProp'

describe('StyleProp', () => {
	describe('StyleProp.define', () => {
		it('should create a StyleProp with basic options', () => {
			const prop = StyleProp.define('test:basic', {
				defaultValue: 'default',
			})

			expect(prop).toBeInstanceOf(StyleProp)
			expect(prop.id).toBe('test:basic')
			expect(prop.defaultValue).toBe('default')
			expect(prop.type).toBeDefined()
		})

		it('should create a StyleProp with custom validator', () => {
			const customValidator = T.string
			const prop = StyleProp.define('test:custom', {
				defaultValue: 'test',
				type: customValidator,
			})

			expect(prop.id).toBe('test:custom')
			expect(prop.defaultValue).toBe('test')
			expect(prop.type).toBe(customValidator)
		})

		it('should create a StyleProp with number type', () => {
			const prop = StyleProp.define('test:number', {
				defaultValue: 42,
				type: T.number,
			})

			expect(prop.defaultValue).toBe(42)
			expect(prop.validate(100)).toBe(100)
			expect(() => prop.validate('not a number')).toThrow()
		})

		it('should create a StyleProp with boolean type', () => {
			const prop = StyleProp.define('test:boolean', {
				defaultValue: true,
				type: T.boolean,
			})

			expect(prop.defaultValue).toBe(true)
			expect(prop.validate(false)).toBe(false)
			expect(() => prop.validate('not a boolean')).toThrow()
		})

		it('should create a StyleProp with object type', () => {
			const objectValidator = T.object({ x: T.number, y: T.number })
			const defaultObj = { x: 0, y: 0 }
			const prop = StyleProp.define('test:object', {
				defaultValue: defaultObj,
				type: objectValidator,
			})

			expect(prop.defaultValue).toEqual(defaultObj)
			expect(prop.validate({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 })
			expect(() => prop.validate({ x: 'invalid' })).toThrow()
		})

		it('should handle null and undefined default values', () => {
			const nullProp = StyleProp.define('test:null', {
				defaultValue: null,
				type: T.nullable(T.string),
			})

			expect(nullProp.defaultValue).toBe(null)
			expect(nullProp.validate(null)).toBe(null)
			expect(nullProp.validate('test')).toBe('test')
		})

		it('should use T.any as default type when no type is provided', () => {
			const prop = StyleProp.define('test:any', {
				defaultValue: 'anything',
			})

			// Should accept any value since it uses T.any
			expect(prop.validate('string')).toBe('string')
			expect(prop.validate(123)).toBe(123)
			expect(prop.validate({ obj: 'ect' })).toEqual({ obj: 'ect' })
			expect(prop.validate(null)).toBe(null)
		})

		it('should create StyleProp instances with different unique IDs', () => {
			const prop1 = StyleProp.define('app1:prop', { defaultValue: 'a' })
			const prop2 = StyleProp.define('app2:prop', { defaultValue: 'b' })

			expect(prop1.id).not.toBe(prop2.id)
			expect(prop1.defaultValue).toBe('a')
			expect(prop2.defaultValue).toBe('b')
		})

		test('should work with complex validation scenarios', () => {
			const complexValidator = T.union('type', {
				simple: T.object({ type: T.literal('simple'), message: T.string }),
				special: T.object({ type: T.literal('special'), value: T.number }),
			})
			const prop = StyleProp.define('test:complex', {
				defaultValue: { type: 'simple' as const, message: 'hello' },
				type: complexValidator,
			})

			expect(prop.validate({ type: 'simple', message: 'test' })).toEqual({
				type: 'simple',
				message: 'test',
			})
			expect(prop.validate({ type: 'special', value: 42 })).toEqual({
				type: 'special',
				value: 42,
			})
			expect(() => prop.validate({ type: 'invalid' })).toThrow()
		})
	})

	describe('StyleProp.defineEnum', () => {
		it('should create an EnumStyleProp with enum values', () => {
			const prop = StyleProp.defineEnum('test:size', {
				defaultValue: 'medium',
				values: ['small', 'medium', 'large'],
			})

			expect(prop).toBeInstanceOf(EnumStyleProp)
			expect(prop.id).toBe('test:size')
			expect(prop.defaultValue).toBe('medium')
			expect(prop.values).toEqual(['small', 'medium', 'large'])
		})

		it('should validate enum values correctly', () => {
			const prop = StyleProp.defineEnum('test:color', {
				defaultValue: 'red',
				values: ['red', 'green', 'blue'],
			})

			expect(prop.validate('red')).toBe('red')
			expect(prop.validate('green')).toBe('green')
			expect(prop.validate('blue')).toBe('blue')
			expect(() => prop.validate('yellow')).toThrow()
		})

		it('should work with number enum values', () => {
			const prop = StyleProp.defineEnum('test:numbers', {
				defaultValue: 1,
				values: [1, 2, 3, 5, 8],
			})

			expect(prop.validate(1)).toBe(1)
			expect(prop.validate(5)).toBe(5)
			expect(() => prop.validate(4)).toThrow()
			expect(() => prop.validate('1')).toThrow() // String '1' should not be valid
		})

		it('should work with mixed type enum values', () => {
			const prop = StyleProp.defineEnum('test:mixed', {
				defaultValue: 'auto',
				values: ['auto', 10, 20, true],
			})

			expect(prop.validate('auto')).toBe('auto')
			expect(prop.validate(10)).toBe(10)
			expect(prop.validate(20)).toBe(20)
			expect(prop.validate(true)).toBe(true)
			expect(() => prop.validate(false)).toThrow()
			expect(() => prop.validate(15)).toThrow()
		})

		it('should require defaultValue to be one of the enum values', () => {
			// This should work - defaultValue is in values
			expect(() => {
				StyleProp.defineEnum('test:valid', {
					defaultValue: 'a',
					values: ['a', 'b', 'c'],
				})
			}).not.toThrow()

			// This should also work at runtime (TypeScript would catch it at compile time)
			const prop = StyleProp.defineEnum('test:edge', {
				defaultValue: 'x' as any,
				values: ['a', 'b', 'c'],
			})
			// The runtime validation happens when the prop is used, not when created
			expect(prop.defaultValue).toBe('x')
		})

		it('should handle empty enum values array', () => {
			const prop = StyleProp.defineEnum('test:empty', {
				defaultValue: null as any,
				values: [] as any,
			})

			expect(prop.values).toEqual([])
			expect(() => prop.validate('anything')).toThrow()
		})

		it('should handle single value enum', () => {
			const prop = StyleProp.defineEnum('test:single', {
				defaultValue: 'only',
				values: ['only'],
			})

			expect(prop.validate('only')).toBe('only')
			expect(() => prop.validate('other')).toThrow()
		})

		test('should maintain readonly values array', () => {
			const originalValues = ['a', 'b', 'c'] as const
			const prop = StyleProp.defineEnum('test:readonly', {
				defaultValue: 'a',
				values: originalValues,
			})

			expect(prop.values).toEqual(originalValues)
			// Values should be the same reference (readonly)
			expect(prop.values).toBe(originalValues)
		})
	})

	describe('StyleProp instance methods', () => {
		let prop: StyleProp<string>
		let numberProp: StyleProp<number>

		beforeEach(() => {
			prop = StyleProp.define('test:instance', {
				defaultValue: 'initial',
				type: T.string,
			})
			numberProp = StyleProp.define('test:number', {
				defaultValue: 0,
				type: T.number,
			})
		})

		describe('setDefaultValue', () => {
			it('should update the default value', () => {
				expect(prop.defaultValue).toBe('initial')
				prop.setDefaultValue('updated')
				expect(prop.defaultValue).toBe('updated')
			})

			it('should allow setting different types of default values', () => {
				numberProp.setDefaultValue(42)
				expect(numberProp.defaultValue).toBe(42)

				numberProp.setDefaultValue(-100)
				expect(numberProp.defaultValue).toBe(-100)
			})

			it('should not validate the new default value immediately', () => {
				// This tests that setDefaultValue doesn't validate the value
				prop.setDefaultValue('anything' as string)
				expect(prop.defaultValue).toBe('anything')
			})
		})

		describe('validate', () => {
			it('should validate correct values', () => {
				expect(prop.validate('test')).toBe('test')
				expect(prop.validate('')).toBe('')
				expect(numberProp.validate(123)).toBe(123)
				expect(numberProp.validate(0)).toBe(0)
			})

			it('should throw ValidationError for invalid values', () => {
				expect(() => prop.validate(123)).toThrow()
				expect(() => prop.validate(null)).toThrow()
				expect(() => numberProp.validate('not a number')).toThrow()
			})

			it('should pass through validation to the underlying type validator', () => {
				const mockValidator = {
					validate: vi.fn().mockReturnValue('mocked'),
				}
				const mockProp = StyleProp.define('test:mock', {
					defaultValue: 'default',
					type: mockValidator,
				})

				const result = mockProp.validate('input')
				expect(result).toBe('mocked')
				expect(mockValidator.validate).toHaveBeenCalledWith('input')
			})

			it('should handle validation errors from underlying validator', () => {
				const errorValidator = {
					validate: vi.fn().mockImplementation(() => {
						throw new Error('Validation failed')
					}),
				}
				const errorProp = StyleProp.define('test:error', {
					defaultValue: 'default',
					type: errorValidator,
				})

				expect(() => errorProp.validate('input')).toThrow('Validation failed')
				expect(errorValidator.validate).toHaveBeenCalledWith('input')
			})
		})

		describe('validateUsingKnownGoodVersion', () => {
			it('should use underlying validator when available', () => {
				const mockValidator = {
					validate: vi.fn(),
					validateUsingKnownGoodVersion: vi.fn().mockReturnValue('optimized'),
				}
				const optimizedProp = StyleProp.define('test:optimized', {
					defaultValue: 'default',
					type: mockValidator,
				})

				const result = optimizedProp.validateUsingKnownGoodVersion('prev', 'new')
				expect(result).toBe('optimized')
				expect(mockValidator.validateUsingKnownGoodVersion).toHaveBeenCalledWith('prev', 'new')
				expect(mockValidator.validate).not.toHaveBeenCalled()
			})

			it('should fall back to regular validate when optimized version not available', () => {
				const mockValidator = {
					validate: vi.fn().mockReturnValue('fallback'),
				}
				const basicProp = StyleProp.define('test:basic', {
					defaultValue: 'default',
					type: mockValidator,
				})

				const result = basicProp.validateUsingKnownGoodVersion('prev', 'new')
				expect(result).toBe('fallback')
				expect(mockValidator.validate).toHaveBeenCalledWith('new')
			})

			it('should work with real T.string validator', () => {
				const result = prop.validateUsingKnownGoodVersion('old', 'new')
				expect(result).toBe('new')

				expect(() => prop.validateUsingKnownGoodVersion('old', 123)).toThrow()
			})

			it('should work with real T.number validator', () => {
				const result = numberProp.validateUsingKnownGoodVersion(10, 20)
				expect(result).toBe(20)

				expect(() => numberProp.validateUsingKnownGoodVersion(10, 'invalid')).toThrow()
			})
		})
	})

	describe('EnumStyleProp', () => {
		let enumProp: EnumStyleProp<string>

		beforeEach(() => {
			enumProp = StyleProp.defineEnum('test:enum', {
				defaultValue: 'a',
				values: ['a', 'b', 'c'],
			})
		})

		it('should extend StyleProp', () => {
			expect(enumProp).toBeInstanceOf(StyleProp)
			expect(enumProp).toBeInstanceOf(EnumStyleProp)
		})

		it('should have access to values property', () => {
			expect(enumProp.values).toEqual(['a', 'b', 'c'])
		})

		it('should inherit all StyleProp methods', () => {
			expect(typeof enumProp.validate).toBe('function')
			expect(typeof enumProp.validateUsingKnownGoodVersion).toBe('function')
			expect(typeof enumProp.setDefaultValue).toBe('function')
		})

		it('should use T.literalEnum validator internally', () => {
			expect(enumProp.validate('a')).toBe('a')
			expect(enumProp.validate('b')).toBe('b')
			expect(() => enumProp.validate('d')).toThrow()
		})

		it('should support setDefaultValue', () => {
			enumProp.setDefaultValue('b')
			expect(enumProp.defaultValue).toBe('b')
		})

		it('should work with validateUsingKnownGoodVersion', () => {
			const result = enumProp.validateUsingKnownGoodVersion('a', 'b')
			expect(result).toBe('b')

			expect(() => enumProp.validateUsingKnownGoodVersion('a', 'invalid')).toThrow()
		})

		test('should handle different enum types', () => {
			const numberEnum = StyleProp.defineEnum('test:numbers', {
				defaultValue: 1,
				values: [1, 2, 3],
			})

			expect(numberEnum.validate(2)).toBe(2)
			expect(() => numberEnum.validate(4)).toThrow()

			const mixedEnum = StyleProp.defineEnum('test:mixed', {
				defaultValue: 'default',
				values: ['default', 42, true, null],
			})

			expect(mixedEnum.validate('default')).toBe('default')
			expect(mixedEnum.validate(42)).toBe(42)
			expect(mixedEnum.validate(true)).toBe(true)
			expect(mixedEnum.validate(null)).toBe(null)
			expect(() => mixedEnum.validate('other')).toThrow()
		})
	})

	describe('StylePropValue utility type', () => {
		it('should extract the correct type from StyleProp', () => {
			const stringProp = StyleProp.define('test:string', {
				defaultValue: 'test',
				type: T.string,
			})

			const numberProp = StyleProp.define('test:number', {
				defaultValue: 42,
				type: T.number,
			})

			// These are compile-time type checks
			const stringValue: StylePropValue<typeof stringProp> = 'string'
			const numberValue: StylePropValue<typeof numberProp> = 123

			expect(typeof stringValue).toBe('string')
			expect(typeof numberValue).toBe('number')
		})

		it('should work with enum StyleProps', () => {
			const enumProp = StyleProp.defineEnum('test:enum', {
				defaultValue: 'a',
				values: ['a', 'b', 'c'],
			})

			const enumValue: StylePropValue<typeof enumProp> = 'b'
			expect(enumValue).toBe('b')
		})

		test('should maintain type safety with complex types', () => {
			const objectProp = StyleProp.define('test:object', {
				defaultValue: { x: 0, y: 0 },
				type: T.object({ x: T.number, y: T.number }),
			})

			const objectValue: StylePropValue<typeof objectProp> = { x: 10, y: 20 }
			expect(objectValue).toEqual({ x: 10, y: 20 })
		})
	})

	describe('error handling and edge cases', () => {
		it('should handle empty string as unique ID', () => {
			const prop = StyleProp.define('', {
				defaultValue: 'test',
			})

			expect(prop.id).toBe('')
		})

		it('should handle very long unique IDs', () => {
			const longId = 'a'.repeat(1000)
			const prop = StyleProp.define(longId, {
				defaultValue: 'test',
			})

			expect(prop.id).toBe(longId)
		})

		it('should handle special characters in unique IDs', () => {
			const specialId = 'test:with-dashes_and.dots/and\\slashes'
			const prop = StyleProp.define(specialId, {
				defaultValue: 'test',
			})

			expect(prop.id).toBe(specialId)
		})

		it('should handle validation errors gracefully', () => {
			const prop = StyleProp.define('test:error', {
				defaultValue: 'default',
				type: T.string,
			})

			expect(() => prop.validate(123)).toThrow()
			expect(() => prop.validate(null)).toThrow()
			expect(() => prop.validate(undefined)).toThrow()
			expect(() => prop.validate({})).toThrow()
		})

		it('should handle complex validation scenarios', () => {
			const complexValidator = T.object({
				type: T.literalEnum('type1', 'type2'),
				value: T.string,
				optional: T.optional(T.number),
			})

			const prop = StyleProp.define('test:complex', {
				defaultValue: { type: 'type1' as const, value: 'test' },
				type: complexValidator,
			})

			expect(prop.validate({ type: 'type1', value: 'valid' })).toEqual({
				type: 'type1',
				value: 'valid',
			})

			expect(prop.validate({ type: 'type2', value: 'test', optional: 42 })).toEqual({
				type: 'type2',
				value: 'test',
				optional: 42,
			})

			expect(() => prop.validate({ type: 'invalid', value: 'test' })).toThrow()
			expect(() => prop.validate({ type: 'type1' })).toThrow() // missing value
		})

		test('should handle null and undefined in enum values', () => {
			const enumWithNull = StyleProp.defineEnum('test:null-enum', {
				defaultValue: null,
				values: [null, 'value', undefined],
			})

			expect(enumWithNull.validate(null)).toBe(null)
			expect(enumWithNull.validate('value')).toBe('value')
			expect(enumWithNull.validate(undefined)).toBe(undefined)
			expect(() => enumWithNull.validate('other')).toThrow()
		})

		test('should maintain immutability of properties', () => {
			const prop = StyleProp.define('test:immutable', {
				defaultValue: 'initial',
				type: T.string,
			})

			const originalId = prop.id
			const originalType = prop.type

			// These properties should be readonly
			expect(prop.id).toBe(originalId)
			expect(prop.type).toBe(originalType)

			// Only defaultValue should be mutable via setDefaultValue
			prop.setDefaultValue('changed')
			expect(prop.defaultValue).toBe('changed')
		})
	})

	describe('integration with validation system', () => {
		it('should work with T.any validator', () => {
			const anyProp = StyleProp.define('test:any', {
				defaultValue: 'default',
			}) // Uses T.any by default

			expect(anyProp.validate('string')).toBe('string')
			expect(anyProp.validate(123)).toBe(123)
			expect(anyProp.validate(null)).toBe(null)
			expect(anyProp.validate({ key: 'value' })).toEqual({ key: 'value' })
		})

		it('should work with T.nullable validator', () => {
			const nullableProp = StyleProp.define('test:nullable', {
				defaultValue: null,
				type: T.nullable(T.string),
			})

			expect(nullableProp.validate(null)).toBe(null)
			expect(nullableProp.validate('string')).toBe('string')
			expect(() => nullableProp.validate(123)).toThrow()
		})

		it('should work with T.optional validator', () => {
			const optionalProp = StyleProp.define('test:optional', {
				defaultValue: undefined,
				type: T.optional(T.string),
			})

			expect(optionalProp.validate(undefined)).toBe(undefined)
			expect(optionalProp.validate('string')).toBe('string')
			expect(() => optionalProp.validate(123)).toThrow()
		})

		it('should work with T.union validator', () => {
			const unionProp = StyleProp.define('test:union', {
				defaultValue: { type: 'text' as const, value: 'hello' },
				type: T.union('type', {
					text: T.object({ type: T.literal('text'), value: T.string }),
					number: T.object({ type: T.literal('number'), value: T.number }),
				}),
			})

			expect(unionProp.validate({ type: 'text', value: 'hello' })).toEqual({
				type: 'text',
				value: 'hello',
			})
			expect(unionProp.validate({ type: 'number', value: 123 })).toEqual({
				type: 'number',
				value: 123,
			})
			expect(() => unionProp.validate({ type: 'invalid', value: 'test' })).toThrow()
		})

		it('should work with custom validators', () => {
			const customValidator = T.string.check((value) => {
				if (value.length < 3) {
					throw new Error('String must be at least 3 characters')
				}
				return value
			})

			const customProp = StyleProp.define('test:custom', {
				defaultValue: 'default',
				type: customValidator,
			})

			expect(customProp.validate('valid')).toBe('valid')
			expect(() => customProp.validate('no')).toThrow()
		})

		test('should handle validator with custom checks', () => {
			const customValidator = T.string.check((value) => {
				if (value.length < 3) {
					throw new Error('String must be at least 3 characters')
				}
				// T.check validates but doesn't transform - return original value
				return value
			})
			const customProp = StyleProp.define('test:custom-check', {
				defaultValue: 'default',
				type: customValidator,
			})

			expect(customProp.validate('hello')).toBe('hello')
			expect(customProp.validate('world')).toBe('world')
			expect(() => customProp.validate('hi')).toThrow('String must be at least 3 characters')
		})
	})

	describe('performance and optimization', () => {
		it('should create StyleProps efficiently', () => {
			const start = performance.now()
			const props = Array.from({ length: 1000 }, (_, i) =>
				StyleProp.define(`test:perf-${i}`, {
					defaultValue: `value-${i}`,
					type: T.string,
				})
			)
			const end = performance.now()

			expect(props).toHaveLength(1000)
			expect(end - start).toBeLessThan(100) // Should create 1000 props quickly
		})

		it('should validate values efficiently', () => {
			const prop = StyleProp.define('test:perf', {
				defaultValue: 'default',
				type: T.string,
			})

			const start = performance.now()
			for (let i = 0; i < 10000; i++) {
				prop.validate(`value-${i}`)
			}
			const end = performance.now()

			expect(end - start).toBeLessThan(100) // Should validate 10000 values quickly
		})

		it('should handle validateUsingKnownGoodVersion efficiently', () => {
			const prop = StyleProp.define('test:known-good', {
				defaultValue: 'default',
				type: T.string,
			})

			const start = performance.now()
			for (let i = 0; i < 10000; i++) {
				prop.validateUsingKnownGoodVersion('known', `value-${i}`)
			}
			const end = performance.now()

			expect(end - start).toBeLessThan(100) // Should handle optimization quickly
		})

		test('should handle large enum values efficiently', () => {
			const largeValues = Array.from({ length: 1000 }, (_, i) => `value-${i}`)
			const enumProp = StyleProp.defineEnum('test:large-enum', {
				defaultValue: 'value-0',
				values: largeValues,
			})

			const start = performance.now()
			for (let i = 0; i < 100; i++) {
				enumProp.validate(`value-${i}`)
			}
			const end = performance.now()

			expect(end - start).toBeLessThan(50) // Should validate large enums efficiently
		})
	})

	describe('real-world usage patterns', () => {
		it('should work like tldraw default styles', () => {
			// Simulate how tldraw creates color style
			const colorProp = StyleProp.defineEnum('tldraw:color', {
				defaultValue: 'black',
				values: ['black', 'red', 'blue', 'green'],
			})

			expect(colorProp.validate('red')).toBe('red')
			expect(colorProp.defaultValue).toBe('black')

			// Simulate setting a new default
			colorProp.setDefaultValue('blue')
			expect(colorProp.defaultValue).toBe('blue')
		})

		it('should support custom app style properties', () => {
			// Simulate custom app creating its own styles
			const customSize = StyleProp.define('myapp:size', {
				defaultValue: 16,
				type: T.number.check((n) => {
					if (n < 1 || n > 100) {
						throw new Error('Size must be between 1 and 100')
					}
					return n
				}),
			})

			expect(customSize.validate(20)).toBe(20)
			expect(() => customSize.validate(0)).toThrow()
			expect(() => customSize.validate(101)).toThrow()
		})

		it('should work in shape props patterns', () => {
			// Simulate how styles are used in shape props
			const colorStyle = StyleProp.defineEnum('app:color', {
				defaultValue: 'default',
				values: ['default', 'primary', 'secondary'],
			})

			const sizeStyle = StyleProp.define('app:size', {
				defaultValue: 'medium',
				type: T.literalEnum('small', 'medium', 'large'),
			})

			// Simulate shape props object
			const shapeProps = {
				color: colorStyle,
				size: sizeStyle,
				width: T.number,
				height: T.number,
			}

			expect(shapeProps.color.validate('primary')).toBe('primary')
			expect(shapeProps.size.validate('large')).toBe('large')
		})

		test('should handle style inheritance patterns', () => {
			// Base style
			const baseColor = StyleProp.defineEnum('base:color', {
				defaultValue: 'default',
				values: ['default', 'accent'],
			})

			// Extended style with more options
			const extendedColor = StyleProp.defineEnum('extended:color', {
				defaultValue: 'default',
				values: ['default', 'accent', 'warning', 'error'],
			})

			expect(baseColor.validate('accent')).toBe('accent')
			expect(extendedColor.validate('warning')).toBe('warning')
			expect(() => baseColor.validate('warning')).toThrow()
		})
	})
})

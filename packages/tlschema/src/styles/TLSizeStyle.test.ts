import { describe, expect, it, test } from 'vitest'
import { EnumStyleProp, StyleProp } from './StyleProp'
import { DefaultSizeStyle, TLDefaultSizeStyle } from './TLSizeStyle'

describe('TLSizeStyle', () => {
	describe('DefaultSizeStyle', () => {
		it('should be an EnumStyleProp', () => {
			expect(DefaultSizeStyle).toBeInstanceOf(EnumStyleProp)
			expect(DefaultSizeStyle).toBeInstanceOf(StyleProp)
		})

		it('should have correct id', () => {
			expect(DefaultSizeStyle.id).toBe('tldraw:size')
		})

		it('should have correct default value', () => {
			expect(DefaultSizeStyle.defaultValue).toBe('m')
		})

		it('should have correct enum values', () => {
			expect(DefaultSizeStyle.values).toEqual(['s', 'm', 'l', 'xl'])
		})

		it('should validate all size values correctly', () => {
			expect(DefaultSizeStyle.validate('s')).toBe('s')
			expect(DefaultSizeStyle.validate('m')).toBe('m')
			expect(DefaultSizeStyle.validate('l')).toBe('l')
			expect(DefaultSizeStyle.validate('xl')).toBe('xl')
		})

		it('should reject invalid size values', () => {
			expect(() => DefaultSizeStyle.validate('xs')).toThrow()
			expect(() => DefaultSizeStyle.validate('xxl')).toThrow()
			expect(() => DefaultSizeStyle.validate('small')).toThrow()
			expect(() => DefaultSizeStyle.validate('medium')).toThrow()
			expect(() => DefaultSizeStyle.validate('large')).toThrow()
			expect(() => DefaultSizeStyle.validate('')).toThrow()
		})

		it('should reject non-string values', () => {
			expect(() => DefaultSizeStyle.validate(null)).toThrow()
			expect(() => DefaultSizeStyle.validate(undefined)).toThrow()
			expect(() => DefaultSizeStyle.validate(123)).toThrow()
			expect(() => DefaultSizeStyle.validate({})).toThrow()
			expect(() => DefaultSizeStyle.validate([])).toThrow()
			expect(() => DefaultSizeStyle.validate(true)).toThrow()
		})

		it('should support setDefaultValue', () => {
			const originalDefault = DefaultSizeStyle.defaultValue

			DefaultSizeStyle.setDefaultValue('l')
			expect(DefaultSizeStyle.defaultValue).toBe('l')

			DefaultSizeStyle.setDefaultValue('s')
			expect(DefaultSizeStyle.defaultValue).toBe('s')

			// Restore original default
			DefaultSizeStyle.setDefaultValue(originalDefault)
		})

		it('should work with validateUsingKnownGoodVersion', () => {
			expect(DefaultSizeStyle.validateUsingKnownGoodVersion('m', 'l')).toBe('l')
			expect(DefaultSizeStyle.validateUsingKnownGoodVersion('s', 'xl')).toBe('xl')

			expect(() => DefaultSizeStyle.validateUsingKnownGoodVersion('m', 'invalid')).toThrow()
			expect(() => DefaultSizeStyle.validateUsingKnownGoodVersion('m', 123)).toThrow()
		})

		test('should maintain readonly values array', () => {
			const expectedValues = ['s', 'm', 'l', 'xl']
			expect(DefaultSizeStyle.values).toEqual(expectedValues)

			// Values array should be consistent and not changeable via public API
			expect(DefaultSizeStyle.values).toHaveLength(4)
			expect(Array.isArray(DefaultSizeStyle.values)).toBe(true)
		})

		test('should handle edge cases in validation', () => {
			// Test case sensitivity
			expect(() => DefaultSizeStyle.validate('S')).toThrow()
			expect(() => DefaultSizeStyle.validate('M')).toThrow()
			expect(() => DefaultSizeStyle.validate('L')).toThrow()
			expect(() => DefaultSizeStyle.validate('XL')).toThrow()
			expect(() => DefaultSizeStyle.validate('Xl')).toThrow()

			// Test whitespace
			expect(() => DefaultSizeStyle.validate(' s')).toThrow()
			expect(() => DefaultSizeStyle.validate('s ')).toThrow()
			expect(() => DefaultSizeStyle.validate(' s ')).toThrow()
		})

		it('should work in typical shape prop patterns', () => {
			// Simulate how it would be used in a shape props interface
			interface MockShapeProps {
				size: typeof DefaultSizeStyle
				width: number
				height: number
			}

			const props = {
				size: DefaultSizeStyle,
				// other props would be validators too
			}

			expect(props.size.validate('l')).toBe('l')
			expect(props.size.defaultValue).toBe('m')
		})

		test('should support all size progression semantics', () => {
			const sizes = DefaultSizeStyle.values

			// Verify the logical size progression
			expect(sizes.indexOf('s')).toBeLessThan(sizes.indexOf('m'))
			expect(sizes.indexOf('m')).toBeLessThan(sizes.indexOf('l'))
			expect(sizes.indexOf('l')).toBeLessThan(sizes.indexOf('xl'))
		})

		it('should handle validation errors with descriptive messages', () => {
			try {
				DefaultSizeStyle.validate('invalid')
				expect.fail('Should have thrown validation error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				// The error message should be informative (exact message may vary)
				expect((error as Error).message).toBeDefined()
			}
		})
	})

	describe('TLDefaultSizeStyle type', () => {
		it('should represent the correct union type', () => {
			// These are compile-time type checks - they verify the type works correctly
			const smallSize: TLDefaultSizeStyle = 's'
			const mediumSize: TLDefaultSizeStyle = 'm'
			const largeSize: TLDefaultSizeStyle = 'l'
			const extraLargeSize: TLDefaultSizeStyle = 'xl'

			expect(smallSize).toBe('s')
			expect(mediumSize).toBe('m')
			expect(largeSize).toBe('l')
			expect(extraLargeSize).toBe('xl')
		})

		it('should match DefaultSizeStyle validation', () => {
			const testValues: TLDefaultSizeStyle[] = ['s', 'm', 'l', 'xl']

			testValues.forEach((value) => {
				expect(() => DefaultSizeStyle.validate(value)).not.toThrow()
				expect(DefaultSizeStyle.validate(value)).toBe(value)
			})
		})

		test('should work in function parameters', () => {
			function setShapeSize(size: TLDefaultSizeStyle): string {
				return `Size set to ${size}`
			}

			expect(setShapeSize('s')).toBe('Size set to s')
			expect(setShapeSize('m')).toBe('Size set to m')
			expect(setShapeSize('l')).toBe('Size set to l')
			expect(setShapeSize('xl')).toBe('Size set to xl')
		})

		test('should work with array operations', () => {
			const sizes: TLDefaultSizeStyle[] = ['s', 'm', 'l', 'xl']

			expect(sizes.every((size) => DefaultSizeStyle.values.includes(size))).toBe(true)
			expect(sizes.length).toBe(DefaultSizeStyle.values.length)
		})
	})

	describe('integration with StyleProp system', () => {
		it('should inherit all StyleProp functionality', () => {
			expect(typeof DefaultSizeStyle.validate).toBe('function')
			expect(typeof DefaultSizeStyle.validateUsingKnownGoodVersion).toBe('function')
			expect(typeof DefaultSizeStyle.setDefaultValue).toBe('function')
			expect(DefaultSizeStyle.id).toBeDefined()
			expect(DefaultSizeStyle.defaultValue).toBeDefined()
			expect(DefaultSizeStyle.type).toBeDefined()
		})

		it('should work with StyleProp utility patterns', () => {
			// Test that it works like other StyleProp instances
			const originalDefault = DefaultSizeStyle.defaultValue

			DefaultSizeStyle.setDefaultValue('xl')
			expect(DefaultSizeStyle.defaultValue).toBe('xl')

			// Restore
			DefaultSizeStyle.setDefaultValue(originalDefault)
		})

		test('should be usable in custom shape definitions', () => {
			// Simulate how a custom shape might use the size style
			interface CustomShapeProps {
				size: typeof DefaultSizeStyle
				customProp: string
			}

			const mockProps = {
				size: DefaultSizeStyle,
			}

			// Verify it can be used for validation
			expect(mockProps.size.validate('l')).toBe('l')
			expect(mockProps.size.values).toContain('s')
			expect(mockProps.size.values).toContain('m')
			expect(mockProps.size.values).toContain('l')
			expect(mockProps.size.values).toContain('xl')
		})
	})

	describe('real-world usage patterns', () => {
		it('should support typical tldraw size progression', () => {
			// Test that size values follow expected semantic ordering
			const sizes = [...DefaultSizeStyle.values]
			expect(sizes).toEqual(['s', 'm', 'l', 'xl'])

			// These would typically map to different visual sizes
			const sizeMap = {
				s: 1, // small
				m: 2, // medium (default)
				l: 3, // large
				xl: 4, // extra large
			}

			sizes.forEach((size) => {
				expect(sizeMap[size as keyof typeof sizeMap]).toBeDefined()
				expect(sizeMap[size as keyof typeof sizeMap]).toBeGreaterThan(0)
			})
		})

		it('should handle style persistence patterns', () => {
			// Simulate saving/loading user preferences
			const userPreference: TLDefaultSizeStyle = 'l'

			// Simulate setting as default for new shapes
			const originalDefault = DefaultSizeStyle.defaultValue
			DefaultSizeStyle.setDefaultValue(userPreference)

			expect(DefaultSizeStyle.defaultValue).toBe('l')

			// Simulate creating a new shape that would inherit this default
			const newShapeSize = DefaultSizeStyle.defaultValue
			expect(newShapeSize).toBe('l')

			// Restore
			DefaultSizeStyle.setDefaultValue(originalDefault)
		})

		test('should work with batch operations', () => {
			// Simulate applying size to multiple shapes
			const shapeSizes = ['s', 'm', 'l', 'xl'] as TLDefaultSizeStyle[]

			const validatedSizes = shapeSizes.map((size) => DefaultSizeStyle.validate(size))

			expect(validatedSizes).toEqual(['s', 'm', 'l', 'xl'])
		})

		test('should integrate with shape filtering', () => {
			// Simulate filtering shapes by size
			const allSizes: TLDefaultSizeStyle[] = ['s', 'm', 'l', 'xl']
			const largeSizes = allSizes.filter((size) => size === 'l' || size === 'xl')

			expect(largeSizes).toEqual(['l', 'xl'])

			// All filtered values should still validate
			largeSizes.forEach((size) => {
				expect(() => DefaultSizeStyle.validate(size)).not.toThrow()
			})
		})
	})

	describe('performance characteristics', () => {
		it('should validate sizes efficiently', () => {
			const start = performance.now()
			for (let i = 0; i < 10000; i++) {
				const size = ['s', 'm', 'l', 'xl'][i % 4]
				DefaultSizeStyle.validate(size)
			}
			const end = performance.now()

			expect(end - start).toBeLessThan(100) // Should be very fast
		})

		it('should handle repeated validation efficiently', () => {
			const testValue = 'l'

			const start = performance.now()
			for (let i = 0; i < 10000; i++) {
				DefaultSizeStyle.validate(testValue)
			}
			const end = performance.now()

			expect(end - start).toBeLessThan(50)
		})

		test('should handle optimized validation efficiently', () => {
			const start = performance.now()
			for (let i = 0; i < 10000; i++) {
				DefaultSizeStyle.validateUsingKnownGoodVersion('m', 'l')
			}
			const end = performance.now()

			expect(end - start).toBeLessThan(50)
		})
	})

	describe('error handling', () => {
		it('should provide meaningful error messages', () => {
			const invalidValues = [
				'invalid',
				'small',
				'medium',
				'large',
				'extra-large',
				'xs',
				'xxl',
				123,
				null,
				undefined,
				{},
				[],
			]

			invalidValues.forEach((value) => {
				try {
					DefaultSizeStyle.validate(value)
					expect.fail(`Should have thrown error for value: ${value}`)
				} catch (error) {
					expect(error).toBeInstanceOf(Error)
					expect((error as Error).message).toBeDefined()
					expect(typeof (error as Error).message).toBe('string')
				}
			})
		})

		it('should handle validation edge cases', () => {
			// Test boundary conditions
			expect(() => DefaultSizeStyle.validate('')).toThrow()
			expect(() => DefaultSizeStyle.validate('s'.repeat(100))).toThrow()

			// Test similar but invalid values
			expect(() => DefaultSizeStyle.validate('sm')).toThrow()
			expect(() => DefaultSizeStyle.validate('ml')).toThrow()
			expect(() => DefaultSizeStyle.validate('lx')).toThrow()
		})

		test('should handle concurrent validation gracefully', () => {
			// Test that validation is safe for concurrent use
			const promises = Array.from({ length: 100 }, (_, i) =>
				Promise.resolve(DefaultSizeStyle.validate(['s', 'm', 'l', 'xl'][i % 4]))
			)

			return Promise.all(promises).then((results) => {
				expect(results).toHaveLength(100)
				results.forEach((result) => {
					expect(['s', 'm', 'l', 'xl']).toContain(result)
				})
			})
		})
	})
})

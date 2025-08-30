import { StyleProp2, StylePropMarker, isStyleProp2 } from './StyleProp'

describe('StyleProp2', () => {
	describe('factory function', () => {
		test('creates StyleProp2 with correct structure', () => {
			const styleProp = StyleProp2('test:color')

			expect(styleProp[StylePropMarker]).toBe('test:color')
			expect(Object.keys(styleProp)).toHaveLength(0)
		})

		test('preserves exact ID type', () => {
			const styleProp = StyleProp2('my-app:size' as const)

			expect(styleProp[StylePropMarker]).toBe('my-app:size')
		})

		test('creates unique objects for different IDs', () => {
			const prop1 = StyleProp2('test:prop1')
			const prop2 = StyleProp2('test:prop2')

			expect(prop1).not.toBe(prop2)
			expect(prop1[StylePropMarker]).not.toBe(prop2[StylePropMarker])
		})

		test('symbol is not enumerable', () => {
			const styleProp = StyleProp2('test:hidden')
			const keys = Object.keys(styleProp)

			expect(keys).not.toContain(StylePropMarker)
			expect(keys).toHaveLength(0)
		})
	})

	describe('isStyleProp2', () => {
		test('identifies StyleProp2 objects correctly', () => {
			const styleProp = StyleProp2('test:valid')
			const regularObject = { some: 'property' }

			expect(isStyleProp2(styleProp)).toBe(true)
			expect(isStyleProp2(regularObject)).toBe(false)
		})

		test('validates specific ID when provided', () => {
			const colorProp = StyleProp2('test:color')
			const sizeProp = StyleProp2('test:size')

			expect(isStyleProp2(colorProp, 'test:color')).toBe(true)
			expect(isStyleProp2(colorProp, 'test:size')).toBe(false)
			expect(isStyleProp2(sizeProp, 'test:size')).toBe(true)
		})

		test('returns false for objects without StylePropMarker', () => {
			const emptyObject = {}
			const objectWithProps = { id: 'test:fake', type: 'style' }

			expect(isStyleProp2(emptyObject)).toBe(false)
			expect(isStyleProp2(objectWithProps)).toBe(false)
		})

		test('handles edge cases gracefully', () => {
			const styleProp = StyleProp2('test:edge')

			// Test without specific ID (undefined gets handled in overload)
			expect(isStyleProp2(styleProp)).toBe(true)

			// Test with empty string ID
			const emptyProp = StyleProp2('')
			expect(isStyleProp2(emptyProp, '')).toBe(true)
			expect(isStyleProp2(emptyProp, 'not-empty')).toBe(false)
		})

		test('type guards work correctly', () => {
			const styleProp = StyleProp2('test:typed')
			const unknown: unknown = styleProp

			if (typeof unknown === 'object' && unknown !== null) {
				if (isStyleProp2(unknown)) {
					// Should have type StyleProp2<string>
					expect(unknown[StylePropMarker]).toBe('test:typed')
				}

				if (isStyleProp2(unknown, 'test:typed')) {
					// Should have type StyleProp2<'test:typed'>
					expect(unknown[StylePropMarker]).toBe('test:typed')
				}
			}
		})
	})

	describe('StylePropMarker symbol', () => {
		test('is a unique symbol', () => {
			expect(typeof StylePropMarker).toBe('symbol')
			expect(Symbol.for(StylePropMarker.toString())).not.toBe(StylePropMarker)
		})

		test('cannot be recreated or guessed', () => {
			const styleProp1 = StyleProp2('test:security')
			const fakeObject = { [Symbol('StyleProp')]: 'test:security' }

			expect(isStyleProp2(styleProp1)).toBe(true)
			expect(isStyleProp2(fakeObject)).toBe(false)
		})
	})

	describe('integration with existing StyleProp', () => {
		test('StyleProp2 objects are distinct from StyleProp instances', () => {
			const styleProp = StyleProp2('test:distinct')

			// StyleProp2 should not have StyleProp methods
			expect('validate' in styleProp).toBe(false)
			expect('defaultValue' in styleProp).toBe(false)
			expect('id' in styleProp).toBe(false)
		})
	})
})

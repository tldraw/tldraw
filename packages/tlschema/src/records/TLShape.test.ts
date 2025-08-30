import { T } from '@tldraw/validate'
import { StyleProp, StyleProp2 } from '../styles/StyleProp'
import { createShapeRecordType, getShapePropKeysByStyle } from './TLShape'

describe('getShapePropKeysByStyle', () => {
	describe('StyleProp2 detection', () => {
		test('correctly identifies and maps StyleProp2 objects', () => {
			const colorStyle = StyleProp2('test:color')
			const sizeStyle = StyleProp2('test:size')

			const props = {
				color: colorStyle,
				size: sizeStyle,
				name: T.string,
				width: T.number,
			}

			const result = getShapePropKeysByStyle(props)

			expect(result.size).toBe(2)
			expect(result.has(colorStyle)).toBe(true)
			expect(result.has(sizeStyle)).toBe(true)
			expect(result.get(colorStyle)).toBe('color')
			expect(result.get(sizeStyle)).toBe('size')
		})

		test('ignores non-style properties', () => {
			const colorStyle = StyleProp2('test:color')

			const props = {
				color: colorStyle,
				name: T.string,
				width: T.number,
				isVisible: T.boolean,
			}

			const result = getShapePropKeysByStyle(props)

			expect(result.size).toBe(1)
			expect(result.has(colorStyle)).toBe(true)
		})
	})

	describe('duplicate detection', () => {
		test('throws error for duplicate StyleProp2 usage', () => {
			const duplicateStyle = StyleProp2('test:duplicate')

			const props = {
				prop1: duplicateStyle,
				prop2: duplicateStyle,
			}

			expect(() => {
				getShapePropKeysByStyle(props)
			}).toThrow(
				'Duplicate style prop test:duplicate. Each style prop can only be used once within a shape.'
			)
		})

		test('throws error for duplicate StyleProp usage', () => {
			const duplicateStyleProp = StyleProp.defineEnum('test:classic-duplicate', {
				defaultValue: 'a',
				values: ['a', 'b'],
			})

			const props = {
				prop1: duplicateStyleProp,
				prop2: duplicateStyleProp,
			}

			expect(() => {
				getShapePropKeysByStyle(props)
			}).toThrow(
				'Duplicate style prop test:classic-duplicate. Each style prop can only be used once within a shape.'
			)
		})

		test('allows different StyleProp2 instances with same ID (duplication handled at schema level)', () => {
			// Different instances with same ID are allowed at the shape level
			// Duplication detection by ID happens at the schema creation level
			const style1 = StyleProp2('test:same-id')
			const style2 = StyleProp2('test:same-id')

			const props = {
				prop1: style1,
				prop2: style2,
			}

			const result = getShapePropKeysByStyle(props)

			// Both should be tracked as separate objects
			expect(result.size).toBe(2)
			expect(result.has(style1)).toBe(true)
			expect(result.has(style2)).toBe(true)
		})
	})

	describe('mixed prop types', () => {
		test('handles combination of regular validators, StyleProp, and StyleProp2', () => {
			const legacyStyle = StyleProp.defineEnum('test:legacy', {
				defaultValue: 'x',
				values: ['x', 'y'],
			})
			const newStyle = StyleProp2('test:new')

			const props = {
				legacy: legacyStyle,
				newStyle: newStyle,
				name: T.string,
				width: T.number,
				isActive: T.boolean,
			}

			const result = getShapePropKeysByStyle(props)

			expect(result.size).toBe(2)
			expect(result.has(legacyStyle)).toBe(true)
			expect(result.has(newStyle)).toBe(true)
			expect(result.get(legacyStyle)).toBe('legacy')
			expect(result.get(newStyle)).toBe('newStyle')
		})

		test('preserves property key names correctly', () => {
			const colorStyle = StyleProp2('test:color')
			const sizeStyle = StyleProp2('test:size')

			const props = {
				primaryColor: colorStyle,
				fontSize: sizeStyle,
			}

			const result = getShapePropKeysByStyle(props)

			expect(result.get(colorStyle)).toBe('primaryColor')
			expect(result.get(sizeStyle)).toBe('fontSize')
		})
	})

	describe('error messages', () => {
		test('provides clear error message with correct style ID for StyleProp2', () => {
			const style = StyleProp2('my-app:special-style')

			const props = {
				first: style,
				second: style,
			}

			expect(() => {
				getShapePropKeysByStyle(props)
			}).toThrow(
				'Duplicate style prop my-app:special-style. Each style prop can only be used once within a shape.'
			)
		})

		test('provides clear error message with correct style ID for StyleProp', () => {
			const style = StyleProp.defineEnum('my-app:classic-style', {
				defaultValue: 'default',
				values: ['default', 'alternate'],
			})

			const props = {
				first: style,
				second: style,
			}

			expect(() => {
				getShapePropKeysByStyle(props)
			}).toThrow(
				'Duplicate style prop my-app:classic-style. Each style prop can only be used once within a shape.'
			)
		})
	})

	describe('edge cases', () => {
		test('handles empty props object', () => {
			const result = getShapePropKeysByStyle({})

			expect(result.size).toBe(0)
		})

		test('handles props with only non-style properties', () => {
			const props = {
				name: T.string,
				width: T.number,
				isVisible: T.boolean,
			}

			const result = getShapePropKeysByStyle(props)

			expect(result.size).toBe(0)
		})

		test('handles style props with special characters in ID', () => {
			const specialStyle = StyleProp2('my-app:special@style#with$chars')

			const props = {
				special: specialStyle,
			}

			const result = getShapePropKeysByStyle(props)

			expect(result.size).toBe(1)
			expect(result.has(specialStyle)).toBe(true)
		})
	})
})

describe('createShapeRecordType', () => {
	describe('styles parameter integration', () => {
		test('correctly passes styles to shape validators', () => {
			const customStyles = {
				'test:color': { validator: T.literalEnum('red', 'blue', 'green') },
			}

			const shapes = {
				'test-shape': {
					props: {
						color: StyleProp2('test:color'),
						name: T.string,
					},
				},
			}

			expect(() => {
				createShapeRecordType(shapes, customStyles)
			}).not.toThrow()
		})

		test('throws when referenced style is missing', () => {
			const shapes = {
				'bad-shape': {
					props: {
						color: StyleProp2('missing:style'),
					},
				},
			}

			expect(() => {
				createShapeRecordType(shapes, {})
			}).toThrow('Style prop missing:style is not defined in the styles object')
		})
	})

	describe('validator creation', () => {
		test('creates working validator for shapes with StyleProp2 props', () => {
			const customStyles = {
				'test:status': { validator: T.literalEnum('active', 'inactive') },
			}

			const shapes = {
				'status-shape': {
					props: {
						status: StyleProp2('test:status'),
						label: T.string,
					},
				},
			}

			const recordType = createShapeRecordType(shapes, customStyles)

			const validShape = {
				id: 'shape:test',
				typeName: 'shape',
				type: 'status-shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:test',
				isLocked: false,
				opacity: 1,
				props: {
					status: 'active',
					label: 'Test Shape',
				},
				meta: {},
			}

			expect(() => {
				recordType.validate(validShape)
			}).not.toThrow()
		})

		test('validates StyleProp2 values correctly', () => {
			const customStyles = {
				'test:validation': { validator: T.literalEnum('valid', 'also-valid') },
			}

			const shapes = {
				'validation-shape': {
					props: {
						testProp: StyleProp2('test:validation'),
					},
				},
			}

			const recordType = createShapeRecordType(shapes, customStyles)

			const shapeWithInvalidValue = {
				id: 'shape:invalid',
				typeName: 'shape',
				type: 'validation-shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:test',
				isLocked: false,
				opacity: 1,
				props: {
					testProp: 'invalid-value',
				},
				meta: {},
			}

			expect(() => {
				recordType.validate(shapeWithInvalidValue)
			}).toThrow()
		})
	})

	describe('type validation', () => {
		test('validates shape structure with mixed prop types', () => {
			const legacyStyle = StyleProp.defineEnum('test:legacy-validation', {
				defaultValue: 'default',
				values: ['default', 'alternate'],
			})

			const customStyles = {
				'test:new-validation': { validator: T.number },
			}

			const shapes = {
				'mixed-validation-shape': {
					props: {
						legacy: legacyStyle,
						modern: StyleProp2('test:new-validation'),
						regular: T.string,
					},
				},
			}

			const recordType = createShapeRecordType(shapes, customStyles)

			const validMixedShape = {
				id: 'shape:mixed',
				typeName: 'shape',
				type: 'mixed-validation-shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:test',
				isLocked: false,
				opacity: 1,
				props: {
					legacy: 'default',
					modern: 42,
					regular: 'some text',
				},
				meta: {},
			}

			expect(() => {
				recordType.validate(validMixedShape)
			}).not.toThrow()
		})
	})
})

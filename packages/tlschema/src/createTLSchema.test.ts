import { T } from '@tldraw/validate'
import { createTLSchema, defaultStyleSchemas } from './createTLSchema'
import { StyleProp, StyleProp2 } from './styles/StyleProp'
import { DefaultSizeStyle } from './styles/TLSizeStyle'

describe('createTLSchema StyleProp2 integration', () => {
	describe('StyleProp2 features', () => {
		test('resolves StyleProp2 references to style validators', () => {
			const customStyles = {
				'test:color': { validator: T.literalEnum('red', 'blue') },
			}

			const customShapes = {
				'test-shape': {
					props: {
						color: StyleProp2('test:color'),
						width: T.number,
					},
				},
			}

			expect(() => {
				createTLSchema({
					shapes: customShapes,
					bindings: {},
					styles: customStyles,
				})
			}).not.toThrow()
		})

		test('handles both StyleProp and StyleProp2 in same schema', () => {
			const legacyStyleProp = StyleProp.defineEnum('test:legacy', {
				defaultValue: 'a',
				values: ['a', 'b', 'c'],
			})

			const customStyles = {
				'test:new': { validator: T.literalEnum('x', 'y', 'z') },
			}

			const mixedShapes = {
				'mixed-shape': {
					props: {
						legacyProp: legacyStyleProp,
						newProp: StyleProp2('test:new'),
						regularProp: T.string,
					},
				},
			}

			expect(() => {
				createTLSchema({
					shapes: mixedShapes,
					bindings: {},
					styles: customStyles,
				})
			}).not.toThrow()
		})

		test('validates shapes with StyleProp2 props correctly', () => {
			const customStyles = {
				'test:validated': { validator: T.literalEnum('valid', 'also-valid') },
			}

			const customShapes = {
				'validated-shape': {
					props: {
						testProp: StyleProp2('test:validated'),
						name: T.string,
					},
				},
			}

			const schema = createTLSchema({
				shapes: customShapes,
				bindings: {},
				styles: customStyles,
			})

			// Should be able to create valid shape
			const validShape = {
				id: 'shape:test',
				typeName: 'shape',
				type: 'validated-shape',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:test',
				isLocked: false,
				opacity: 1,
				props: {
					testProp: 'valid',
					name: 'test shape',
				},
				meta: {},
			}

			expect(() => {
				schema.types.shape.validate(validShape)
			}).not.toThrow()
		})
	})

	describe('error handling', () => {
		test('throws when StyleProp2 references missing style definition', () => {
			const shapesWithMissingStyle = {
				'bad-shape': {
					props: {
						missingStyle: StyleProp2('nonexistent:style'),
					},
				},
			}

			expect(() => {
				createTLSchema({
					shapes: shapesWithMissingStyle,
					bindings: {},
					styles: {},
				})
			}).toThrow('Style prop nonexistent:style is not defined in the styles object')
		})

		test('throws for duplicate StyleProp2 instances with same ID across shapes', () => {
			const style1 = StyleProp2('duplicate:id')
			const style2 = StyleProp2('duplicate:id')

			const shapesWithDuplicates = {
				shape1: {
					props: { style: style1 },
				},
				shape2: {
					props: { style: style2 },
				},
			}

			const customStyles = {
				'duplicate:id': { validator: T.string },
			}

			expect(() => {
				createTLSchema({
					shapes: shapesWithDuplicates,
					bindings: {},
					styles: customStyles,
				})
			}).toThrow('Multiple StyleProp instances with the same id: duplicate:id')
		})

		test('provides clear error message for missing style prop', () => {
			const shapesWithMissing = {
				'test-shape': {
					props: {
						missing: StyleProp2('my-app:missing-style'),
					},
				},
			}

			expect(() => {
				createTLSchema({
					shapes: shapesWithMissing,
					bindings: {},
					styles: { 'other:style': { validator: T.string } },
				})
			}).toThrow('Style prop my-app:missing-style is not defined in the styles object')
		})
	})

	describe('custom styles parameter', () => {
		test('accepts and uses custom styles object', () => {
			const customStyles = {
				'test:custom': { validator: T.string },
				'test:enum': { validator: T.literalEnum('a', 'b', 'c') },
			}

			const customShapes = {
				'custom-shape': {
					props: {
						customProp: StyleProp2('test:custom'),
						enumProp: StyleProp2('test:enum'),
					},
				},
			}

			const schema = createTLSchema({
				shapes: customShapes,
				bindings: {},
				styles: customStyles,
			})

			expect(schema).toBeDefined()
			expect(schema.types.shape).toBeDefined()
		})
	})
})

describe('defaultStyleSchemas', () => {
	test('exports correct structure', () => {
		expect(defaultStyleSchemas).toBeDefined()
		expect(typeof defaultStyleSchemas).toBe('object')
	})

	test('includes tldraw:size with DefaultSizeStyle', () => {
		expect(defaultStyleSchemas['tldraw:size'].validator).toBe(DefaultSizeStyle)
	})

	test('satisfies Record<string, Validatable<any>> constraint', () => {
		// This is primarily a TypeScript test, but we can check runtime structure
		for (const [key, value] of Object.entries(defaultStyleSchemas)) {
			expect(typeof key).toBe('string')
			expect(value).toHaveProperty('validator')
			expect(value.validator).toHaveProperty('validate')
		}
	})

	test('can be used with isolated shapes', () => {
		const isolatedShapes = {
			'isolated-shape': {
				props: {
					name: T.string,
				},
			},
		}

		expect(() => {
			createTLSchema({
				shapes: isolatedShapes,
				bindings: {},
				styles: defaultStyleSchemas,
			})
		}).not.toThrow()
	})
})

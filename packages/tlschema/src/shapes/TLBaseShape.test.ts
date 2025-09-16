import { BaseRecord } from '@tldraw/store'
import { IndexKey } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { TLParentId, TLShapeId } from '../records/TLShape'
import {
	TLBaseShape,
	createShapeValidator,
	parentIdValidator,
	shapeIdValidator,
} from './TLBaseShape'

describe('TLBaseShape', () => {
	describe('TLBaseShape interface', () => {
		it('should define the correct structure for a base shape', () => {
			// Test that the interface has all required properties
			const mockShape: TLBaseShape<'test', { size: number }> = {
				id: 'shape:test123' as TLShapeId,
				typeName: 'shape',
				type: 'test',
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 0.8,
				props: {
					size: 50,
				},
				meta: {
					custom: 'data',
				},
			}

			expect(mockShape.id).toBe('shape:test123')
			expect(mockShape.typeName).toBe('shape')
			expect(mockShape.type).toBe('test')
			expect(mockShape.x).toBe(100)
			expect(mockShape.y).toBe(200)
			expect(mockShape.rotation).toBe(0.5)
			expect(mockShape.index).toBe('a1')
			expect(mockShape.parentId).toBe('page:main')
			expect(mockShape.isLocked).toBe(false)
			expect(mockShape.opacity).toBe(0.8)
			expect(mockShape.props).toEqual({ size: 50 })
			expect(mockShape.meta).toEqual({ custom: 'data' })
		})

		it('should extend BaseRecord correctly', () => {
			const mockShape: TLBaseShape<'test', {}> = {
				id: 'shape:test123' as TLShapeId,
				typeName: 'shape',
				type: 'test',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {},
			}

			// Should satisfy BaseRecord interface
			const baseRecord: BaseRecord<'shape', TLShapeId> = mockShape
			expect(baseRecord.id).toBe('shape:test123')
			expect(baseRecord.typeName).toBe('shape')
		})

		it('should support different shape types with custom props', () => {
			interface CustomProps {
				width: number
				height: number
				color: string
				settings?: {
					visible: boolean
					interactive: boolean
				}
			}

			const customShape: TLBaseShape<'custom', CustomProps> = {
				id: 'shape:custom456' as TLShapeId,
				typeName: 'shape',
				type: 'custom',
				x: 50,
				y: 75,
				rotation: 1.57,
				index: 'b2' as IndexKey,
				parentId: 'shape:frame1' as TLParentId,
				isLocked: true,
				opacity: 0.3,
				props: {
					width: 150,
					height: 100,
					color: 'red',
					settings: {
						visible: true,
						interactive: false,
					},
				},
				meta: {
					createdAt: '2024-01-01',
					version: 2,
				},
			}

			expect(customShape.type).toBe('custom')
			expect(customShape.props.width).toBe(150)
			expect(customShape.props.height).toBe(100)
			expect(customShape.props.color).toBe('red')
			expect(customShape.props.settings?.visible).toBe(true)
			expect(customShape.props.settings?.interactive).toBe(false)
		})

		it('should support empty props and meta objects', () => {
			const minimalShape: TLBaseShape<'minimal', {}> = {
				id: 'shape:minimal' as TLShapeId,
				typeName: 'shape',
				type: 'minimal',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {},
			}

			expect(Object.keys(minimalShape.props)).toHaveLength(0)
			expect(Object.keys(minimalShape.meta)).toHaveLength(0)
		})
	})

	describe('parentIdValidator', () => {
		it('should validate page parent IDs', () => {
			const validPageIds = [
				'page:main',
				'page:123',
				'page:page-with-dashes',
				'page:page_with_underscores',
				'page:',
				'page:a1b2c3',
			]

			validPageIds.forEach((id) => {
				expect(() => parentIdValidator.validate(id)).not.toThrow()
				expect(parentIdValidator.validate(id)).toBe(id)
			})
		})

		it('should validate shape parent IDs', () => {
			const validShapeIds = [
				'shape:frame1',
				'shape:group1',
				'shape:abc123',
				'shape:shape-with-dashes',
				'shape:shape_with_underscores',
				'shape:',
				'shape:xyz789',
			]

			validShapeIds.forEach((id) => {
				expect(() => parentIdValidator.validate(id)).not.toThrow()
				expect(parentIdValidator.validate(id)).toBe(id)
			})
		})

		it('should reject invalid parent IDs', () => {
			const invalidIds = [
				'invalid:123',
				'asset:123',
				'user:123',
				'binding:123',
				'camera:123',
				'',
				'page',
				'shape',
				'page123',
				'shape456',
				'random-string',
				'page-main', // Missing colon
				'shape-frame1', // Missing colon
				'PAGE:main', // Wrong case
				'SHAPE:frame1', // Wrong case
			]

			invalidIds.forEach((id) => {
				expect(() => parentIdValidator.validate(id)).toThrow(
					'Parent ID must start with "page:" or "shape:"'
				)
			})
		})

		it('should reject non-string values', () => {
			const nonStringValues = [null, undefined, 123, true, false, {}, [], Symbol('test')]

			nonStringValues.forEach((value) => {
				expect(() => parentIdValidator.validate(value)).toThrow()
			})
		})

		it('should return properly typed TLParentId', () => {
			const pageId = parentIdValidator.validate('page:main')
			const shapeId = parentIdValidator.validate('shape:frame1')

			// TypeScript should recognize these as TLParentId
			const parentIdArray: TLParentId[] = [pageId, shapeId]
			expect(parentIdArray).toHaveLength(2)
			expect(parentIdArray[0]).toBe('page:main')
			expect(parentIdArray[1]).toBe('shape:frame1')
		})
	})

	describe('shapeIdValidator', () => {
		it('should validate valid shape IDs', () => {
			const validShapeIds = [
				'shape:abc123',
				'shape:test',
				'shape:shape-with-dashes',
				'shape:shape_with_underscores',
				'shape:123456789',
				'shape:',
				'shape:very-long-id-with-many-characters',
			]

			validShapeIds.forEach((id) => {
				expect(() => shapeIdValidator.validate(id)).not.toThrow()
				expect(shapeIdValidator.validate(id)).toBe(id)
			})
		})

		it('should reject invalid shape IDs', () => {
			const invalidIds = [
				'page:123',
				'asset:123',
				'user:123',
				'binding:123',
				'invalid:123',
				'',
				'shape',
				'shape123',
				'random-string',
				'shape-abc123', // Missing colon
				'SHAPE:abc123', // Wrong case
			]

			invalidIds.forEach((id) => {
				expect(() => shapeIdValidator.validate(id)).toThrow('shape ID must start with "shape:"')
			})
		})

		it('should reject non-string values', () => {
			const nonStringValues = [null, undefined, 123, true, false, {}, [], Symbol('test')]

			nonStringValues.forEach((value) => {
				expect(() => shapeIdValidator.validate(value)).toThrow()
			})
		})

		it('should return properly typed TLShapeId', () => {
			const shapeId = shapeIdValidator.validate('shape:test123')

			// TypeScript should recognize this as TLShapeId
			const shapeIdArray: TLShapeId[] = [shapeId]
			expect(shapeIdArray).toHaveLength(1)
			expect(shapeIdArray[0]).toBe('shape:test123')
		})
	})

	describe('createShapeValidator', () => {
		it('should create validator for shape with no custom props', () => {
			const validator = createShapeValidator('simple')

			const validShape = {
				id: 'shape:simple123',
				typeName: 'shape',
				type: 'simple',
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {},
				meta: {},
			}

			expect(() => validator.validate(validShape)).not.toThrow()
			const result = validator.validate(validShape)
			expect(result).toEqual(validShape)
		})

		it('should create validator for shape with custom props', () => {
			const validator = createShapeValidator('custom', {
				width: T.number,
				height: T.number,
				color: T.string,
			})

			const validShape = {
				id: 'shape:custom456',
				typeName: 'shape',
				type: 'custom',
				x: 50,
				y: 75,
				rotation: 1.0,
				index: 'a2' as IndexKey,
				parentId: 'shape:frame1',
				isLocked: true,
				opacity: 0.5,
				props: {
					width: 150,
					height: 100,
					color: 'blue',
				},
				meta: {
					custom: 'metadata',
				},
			}

			expect(() => validator.validate(validShape)).not.toThrow()
			const result = validator.validate(validShape)
			expect(result).toEqual(validShape)
		})

		it('should create validator for shape with custom props and meta', () => {
			const validator = createShapeValidator(
				'advanced',
				{
					size: T.number,
					visible: T.boolean,
				},
				{
					createdAt: T.string,
					version: T.number,
				}
			)

			const validShape = {
				id: 'shape:advanced789',
				typeName: 'shape',
				type: 'advanced',
				x: 25,
				y: 50,
				rotation: 0,
				index: 'a3' as IndexKey,
				parentId: 'page:test',
				isLocked: false,
				opacity: 1,
				props: {
					size: 42,
					visible: true,
				},
				meta: {
					createdAt: '2024-01-01T00:00:00Z',
					version: 1,
				},
			}

			expect(() => validator.validate(validShape)).not.toThrow()
			const result = validator.validate(validShape)
			expect(result).toEqual(validShape)
		})

		it('should reject shapes with invalid base properties', () => {
			const validator = createShapeValidator('test')

			const invalidShapes = [
				// Missing required properties
				{},
				{ id: 'shape:test' },
				{ id: 'shape:test', typeName: 'shape' },

				// Wrong typeName
				{
					id: 'shape:test',
					typeName: 'not-shape',
					type: 'test',
					x: 0,
					y: 0,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: {},
					meta: {},
				},

				// Wrong type
				{
					id: 'shape:test',
					typeName: 'shape',
					type: 'wrong',
					x: 0,
					y: 0,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: {},
					meta: {},
				},

				// Invalid ID format
				{
					id: 'page:test',
					typeName: 'shape',
					type: 'test',
					x: 0,
					y: 0,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: {},
					meta: {},
				},
			]

			invalidShapes.forEach((shape) => {
				expect(() => validator.validate(shape)).toThrow()
			})
		})

		it('should reject shapes with invalid custom props', () => {
			const validator = createShapeValidator('custom', {
				width: T.number,
				height: T.number,
				color: T.string,
			})

			const baseShape = {
				id: 'shape:custom123',
				typeName: 'shape',
				type: 'custom',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				meta: {},
			}

			const invalidPropVariations = [
				// Missing required props
				{ ...baseShape, props: {} },
				{ ...baseShape, props: { width: 100 } },
				{ ...baseShape, props: { width: 100, height: 50 } },

				// Wrong prop types
				{ ...baseShape, props: { width: '100', height: 50, color: 'red' } },
				{ ...baseShape, props: { width: 100, height: '50', color: 'red' } },
				{ ...baseShape, props: { width: 100, height: 50, color: 123 } },

				// Extra unexpected props
				{ ...baseShape, props: { width: 100, height: 50, color: 'red', extra: 'prop' } },
			]

			invalidPropVariations.forEach((shape) => {
				expect(() => validator.validate(shape)).toThrow()
			})
		})

		it('should validate all base shape properties correctly', () => {
			const validator = createShapeValidator('test', {
				value: T.string,
			})

			const baseShape = {
				id: 'shape:test123',
				typeName: 'shape' as const,
				type: 'test' as const,
				x: 100,
				y: 200,
				rotation: Math.PI,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 0.75,
				props: {
					value: 'test',
				},
				meta: {
					timestamp: Date.now(),
				},
			}

			expect(() => validator.validate(baseShape)).not.toThrow()
			const result = validator.validate(baseShape)

			// Verify all base properties are validated correctly
			expect(result.id).toBe('shape:test123')
			expect(result.typeName).toBe('shape')
			expect(result.type).toBe('test')
			expect(result.x).toBe(100)
			expect(result.y).toBe(200)
			expect(result.rotation).toBe(Math.PI)
			expect(result.index).toBe('a1')
			expect(result.parentId).toBe('page:main')
			expect(result.isLocked).toBe(false)
			expect(result.opacity).toBe(0.75)
			expect(result.props.value).toBe('test')
			expect(result.meta.timestamp).toBeDefined()
		})

		test('should handle complex nested props validation', () => {
			const validator = createShapeValidator('complex', {
				settings: T.object({
					enabled: T.boolean,
					config: T.object({
						timeout: T.number,
						retries: T.number,
					}),
					tags: T.arrayOf(T.string),
				}),
				metadata: T.object({
					title: T.string,
					description: T.string.optional(),
				}),
			})

			const validShape = {
				id: 'shape:complex123',
				typeName: 'shape',
				type: 'complex',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				props: {
					settings: {
						enabled: true,
						config: {
							timeout: 5000,
							retries: 3,
						},
						tags: ['important', 'user-created'],
					},
					metadata: {
						title: 'Complex Shape',
						description: 'A shape with nested configuration',
					},
				},
				meta: {},
			}

			expect(() => validator.validate(validShape)).not.toThrow()
			const result = validator.validate(validShape)
			expect(result.props.settings.enabled).toBe(true)
			expect(result.props.settings.config.timeout).toBe(5000)
			expect(result.props.settings.tags).toHaveLength(2)
			expect(result.props.metadata.title).toBe('Complex Shape')
		})

		it('should handle boundary values for numeric properties', () => {
			const validator = createShapeValidator('numeric')

			const extremeValues = {
				id: 'shape:numeric123',
				typeName: 'shape',
				type: 'numeric',
				x: -Number.MAX_VALUE,
				y: Number.MAX_VALUE,
				rotation: -Math.PI * 2,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0, // Minimum opacity
				props: {},
				meta: {},
			}

			expect(() => validator.validate(extremeValues)).not.toThrow()

			const maxOpacity = {
				...extremeValues,
				opacity: 1, // Maximum opacity
			}

			expect(() => validator.validate(maxOpacity)).not.toThrow()
		})

		it('should validate opacity range correctly', () => {
			const validator = createShapeValidator('opacity-test')

			const baseShape = {
				id: 'shape:opacity123',
				typeName: 'shape',
				type: 'opacity-test',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				props: {},
				meta: {},
			}

			// Valid opacity values
			const validOpacities = [0, 0.25, 0.5, 0.75, 1]
			validOpacities.forEach((opacity) => {
				expect(() => validator.validate({ ...baseShape, opacity })).not.toThrow()
			})

			// Invalid opacity values
			const invalidOpacities = [-0.1, 1.1, -1, 2, Number.NaN, Number.POSITIVE_INFINITY]
			invalidOpacities.forEach((opacity) => {
				expect(() => validator.validate({ ...baseShape, opacity })).toThrow()
			})
		})

		it('should validate boolean properties correctly', () => {
			const validator = createShapeValidator('boolean-test')

			const baseShape = {
				id: 'shape:boolean123',
				typeName: 'shape',
				type: 'boolean-test',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				opacity: 1,
				props: {},
				meta: {},
			}

			// Valid boolean values
			const validBooleans = [true, false]
			validBooleans.forEach((isLocked) => {
				expect(() => validator.validate({ ...baseShape, isLocked })).not.toThrow()
			})

			// Invalid boolean values
			const invalidBooleans = ['true', 'false', 1, 0, null, undefined, {}, []]
			invalidBooleans.forEach((isLocked) => {
				expect(() => validator.validate({ ...baseShape, isLocked })).toThrow()
			})
		})
	})

	describe('integration with other validators', () => {
		it('should work with custom validators that extend base functionality', () => {
			const customValidator = createShapeValidator('integration', {
				customProp: T.string.check((s) => {
					if (s.length < 3) {
						throw new Error('Custom prop must be at least 3 characters')
					}
					return s
				}),
			})

			const validShape = {
				id: 'shape:integration123',
				typeName: 'shape',
				type: 'integration',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				props: {
					customProp: 'valid-value',
				},
				meta: {},
			}

			expect(() => customValidator.validate(validShape)).not.toThrow()

			const invalidShape = {
				...validShape,
				props: {
					customProp: 'no', // Too short
				},
			}

			expect(() => customValidator.validate(invalidShape)).toThrow(
				'Custom prop must be at least 3 characters'
			)
		})

		it('should be compatible with store record validation patterns', () => {
			// Test that the created validator can be used in store-like scenarios
			const validator = createShapeValidator('store-compatible', {
				data: T.string,
			})

			const shapes = [
				{
					id: 'shape:store1',
					typeName: 'shape',
					type: 'store-compatible',
					x: 10,
					y: 20,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: { data: 'first' },
					meta: {},
				},
				{
					id: 'shape:store2',
					typeName: 'shape',
					type: 'store-compatible',
					x: 30,
					y: 40,
					rotation: 0.5,
					index: 'a2',
					parentId: 'page:main',
					isLocked: true,
					opacity: 0.8,
					props: { data: 'second' },
					meta: { tag: 'important' },
				},
			]

			// All shapes should validate successfully
			shapes.forEach((shape, index) => {
				expect(() => validator.validate(shape)).not.toThrow()
				const result = validator.validate(shape)
				expect(result.id).toBe(`shape:store${index + 1}`)
				expect(result.props.data).toBe(index === 0 ? 'first' : 'second')
			})
		})
	})

	describe('error handling and edge cases', () => {
		it('should provide clear error messages for validation failures', () => {
			const validator = createShapeValidator('error-test', {
				required: T.string,
			})

			try {
				validator.validate({
					id: 'shape:error123',
					typeName: 'shape',
					type: 'error-test',
					x: 0,
					y: 0,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: {}, // Missing required prop
					meta: {},
				})
				expect.fail('Should have thrown validation error')
			} catch (error) {
				expect(error).toBeDefined()
				// Error should contain information about the validation failure
			}
		})

		it('should handle null and undefined values appropriately', () => {
			const validator = createShapeValidator('null-test')

			const invalidShapes = [
				null,
				undefined,
				{
					id: null,
					typeName: 'shape',
					type: 'null-test',
					x: 0,
					y: 0,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: {},
					meta: {},
				},
			]

			invalidShapes.forEach((shape) => {
				expect(() => validator.validate(shape)).toThrow()
			})
		})

		it('should handle empty and malformed objects', () => {
			const validator = createShapeValidator('malformed-test')

			const malformedShapes = [
				{}, // Empty object
				{ id: 'shape:test' }, // Partial object
				'not-an-object', // Wrong type
				[], // Array instead of object
				42, // Number instead of object
			]

			malformedShapes.forEach((shape) => {
				expect(() => validator.validate(shape)).toThrow()
			})
		})

		test('should maintain type safety with generic parameters', () => {
			// This test verifies that TypeScript types are working correctly
			type TestProps = { value: string }
			type TestMeta = { timestamp: number }

			const validator = createShapeValidator<'typed-test', TestProps, TestMeta>(
				'typed-test',
				{ value: T.string },
				{ timestamp: T.number }
			)

			const typedShape: TLBaseShape<'typed-test', TestProps> = {
				id: 'shape:typed123' as TLShapeId,
				typeName: 'shape',
				type: 'typed-test',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 1,
				props: { value: 'test' },
				meta: { timestamp: 123456 },
			}

			expect(() => validator.validate(typedShape)).not.toThrow()
			const result = validator.validate(typedShape)
			expect(result.props.value).toBe('test')
			expect(result.meta.timestamp).toBe(123456)
		})
	})
})

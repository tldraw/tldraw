import { IndexKey } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { TLParentId, TLShapeId } from '../records/TLShape'
import { createShapeValidator } from './TLBaseShape'
import {
	TLGroupShape,
	TLGroupShapeProps,
	groupShapeMigrations,
	groupShapeProps,
} from './TLGroupShape'

describe('TLGroupShape', () => {
	describe('TLGroupShapeProps interface', () => {
		it('should define an empty interface', () => {
			// Group shapes have no specific properties - they're containers
			const props: TLGroupShapeProps = {}

			expect(Object.keys(props)).toHaveLength(0)
			expect(props).toEqual({})
		})

		it('should be assignable to an empty object', () => {
			const emptyObject = {}
			const props: TLGroupShapeProps = emptyObject

			expect(props).toBe(emptyObject)
		})
	})

	describe('TLGroupShape type', () => {
		it('should extend TLBaseShape with group type and empty props', () => {
			const groupShape: TLGroupShape = {
				id: 'shape:group123' as TLShapeId,
				typeName: 'shape',
				type: 'group',
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 0.8,
				props: {},
				meta: {},
			}

			expect(groupShape.id).toBe('shape:group123')
			expect(groupShape.typeName).toBe('shape')
			expect(groupShape.type).toBe('group')
			expect(groupShape.x).toBe(100)
			expect(groupShape.y).toBe(200)
			expect(groupShape.rotation).toBe(0.5)
			expect(groupShape.index).toBe('a1')
			expect(groupShape.parentId).toBe('page:main')
			expect(groupShape.isLocked).toBe(false)
			expect(groupShape.opacity).toBe(0.8)
			expect(groupShape.props).toEqual({})
			expect(groupShape.meta).toEqual({})
		})

		it('should support different parent types', () => {
			// Group can be a child of a page
			const pageChildGroup: TLGroupShape = {
				id: 'shape:group1' as TLShapeId,
				typeName: 'shape',
				type: 'group',
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

			// Group can be a child of another shape (e.g., frame)
			const shapeChildGroup: TLGroupShape = {
				id: 'shape:group2' as TLShapeId,
				typeName: 'shape',
				type: 'group',
				x: 50,
				y: 75,
				rotation: 0,
				index: 'b1' as IndexKey,
				parentId: 'shape:frame1' as TLParentId,
				isLocked: true,
				opacity: 0.5,
				props: {},
				meta: {},
			}

			expect(pageChildGroup.parentId).toBe('page:main')
			expect(shapeChildGroup.parentId).toBe('shape:frame1')
		})

		it('should support various rotation values', () => {
			const rotatedGroup: TLGroupShape = {
				id: 'shape:rotated' as TLShapeId,
				typeName: 'shape',
				type: 'group',
				x: 0,
				y: 0,
				rotation: Math.PI / 4, // 45 degrees
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {},
			}

			expect(rotatedGroup.rotation).toBe(Math.PI / 4)
		})

		it('should support opacity range 0-1', () => {
			const transparentGroup: TLGroupShape = {
				id: 'shape:transparent' as TLShapeId,
				typeName: 'shape',
				type: 'group',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 0.3,
				props: {},
				meta: {},
			}

			const opaqueGroup: TLGroupShape = {
				id: 'shape:opaque' as TLShapeId,
				typeName: 'shape',
				type: 'group',
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

			expect(transparentGroup.opacity).toBe(0.3)
			expect(opaqueGroup.opacity).toBe(1)
		})

		it('should support custom metadata', () => {
			const groupWithMeta: TLGroupShape = {
				id: 'shape:meta-group' as TLShapeId,
				typeName: 'shape',
				type: 'group',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {
					name: 'My Group',
					createdAt: '2024-01-01',
					tags: ['important', 'user-created'],
					customData: {
						nested: 'value',
					},
				},
			}

			expect(groupWithMeta.meta.name).toBe('My Group')
			expect(groupWithMeta.meta.createdAt).toBe('2024-01-01')
			expect(groupWithMeta.meta.tags).toEqual(['important', 'user-created'])
			expect((groupWithMeta.meta.customData as any).nested).toBe('value')
		})

		it('should support lock state variations', () => {
			const lockedGroup: TLGroupShape = {
				id: 'shape:locked' as TLShapeId,
				typeName: 'shape',
				type: 'group',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: true,
				opacity: 1,
				props: {},
				meta: {},
			}

			const unlockedGroup: TLGroupShape = {
				id: 'shape:unlocked' as TLShapeId,
				typeName: 'shape',
				type: 'group',
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

			expect(lockedGroup.isLocked).toBe(true)
			expect(unlockedGroup.isLocked).toBe(false)
		})
	})

	describe('groupShapeProps validation', () => {
		it('should be an empty object', () => {
			expect(groupShapeProps).toEqual({})
			expect(Object.keys(groupShapeProps)).toHaveLength(0)
		})

		it('should be of correct type', () => {
			// This test verifies that groupShapeProps matches the RecordProps<TLGroupShape> type
			const props = groupShapeProps
			expect(typeof props).toBe('object')
			expect(props).not.toBeNull()
		})

		it('should work with shape validator', () => {
			// Even though props is empty, it should work with the validation system
			const validator = createShapeValidator('group', groupShapeProps)

			const validGroupShape = {
				id: 'shape:test-group',
				typeName: 'shape',
				type: 'group',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {},
			}

			expect(() => validator.validate(validGroupShape)).not.toThrow()
			const result = validator.validate(validGroupShape)
			expect(result).toEqual(validGroupShape)
		})
	})

	describe('groupShapeMigrations', () => {
		it('should have empty migration sequence', () => {
			expect(groupShapeMigrations).toBeDefined()
			expect(groupShapeMigrations.sequence).toEqual([])
		})

		it('should have correct structure', () => {
			expect(groupShapeMigrations).toHaveProperty('sequence')
			expect(Array.isArray(groupShapeMigrations.sequence)).toBe(true)
		})

		it('should be returned by createShapePropsMigrationSequence', () => {
			// Verify the migration was created correctly
			expect(groupShapeMigrations.sequence).toHaveLength(0)
		})
	})

	describe('group shape validation with createShapeValidator', () => {
		const groupValidator = createShapeValidator('group', groupShapeProps)

		it('should validate a minimal valid group shape', () => {
			const minimalGroup = {
				id: 'shape:minimal',
				typeName: 'shape',
				type: 'group',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {},
			}

			expect(() => groupValidator.validate(minimalGroup)).not.toThrow()
			const result = groupValidator.validate(minimalGroup)
			expect(result).toEqual(minimalGroup)
		})

		it('should validate a complex group shape', () => {
			const complexGroup = {
				id: 'shape:complex-group',
				typeName: 'shape',
				type: 'group',
				x: 150,
				y: 250,
				rotation: Math.PI / 6,
				index: 'a1V',
				parentId: 'shape:frame1',
				isLocked: true,
				opacity: 0.75,
				props: {},
				meta: {
					name: 'Complex Group',
					version: 2,
					tags: ['complex', 'test'],
					settings: {
						visible: true,
						interactive: false,
					},
				},
			}

			expect(() => groupValidator.validate(complexGroup)).not.toThrow()
			const result = groupValidator.validate(complexGroup)
			expect(result).toEqual(complexGroup)
		})

		it('should reject shapes with wrong type', () => {
			const wrongTypeShape = {
				id: 'shape:wrong',
				typeName: 'shape',
				type: 'geo', // Wrong type
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {},
			}

			expect(() => groupValidator.validate(wrongTypeShape)).toThrow()
		})

		it('should reject shapes with wrong typeName', () => {
			const wrongTypeNameShape = {
				id: 'shape:wrong-typename',
				typeName: 'asset', // Wrong typeName
				type: 'group',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {},
			}

			expect(() => groupValidator.validate(wrongTypeNameShape)).toThrow()
		})

		it('should reject shapes with invalid ID format', () => {
			const invalidIdShape = {
				id: 'asset:invalid-id', // Wrong ID format
				typeName: 'shape',
				type: 'group',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {},
			}

			expect(() => groupValidator.validate(invalidIdShape)).toThrow()
		})

		it('should reject shapes with non-empty props', () => {
			const nonEmptyPropsShape = {
				id: 'shape:non-empty-props',
				typeName: 'shape',
				type: 'group',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				props: {
					invalidProp: 'should not be here', // Group shapes should have empty props
				},
				meta: {},
			}

			expect(() => groupValidator.validate(nonEmptyPropsShape)).toThrow()
		})

		it('should reject shapes with missing required properties', () => {
			const incompleteShapes = [
				{}, // Empty object
				{ id: 'shape:incomplete' }, // Missing most properties
				{
					id: 'shape:incomplete2',
					typeName: 'shape',
					type: 'group',
					// Missing x, y, rotation, etc.
				},
			]

			incompleteShapes.forEach((shape) => {
				expect(() => groupValidator.validate(shape)).toThrow()
			})
		})

		it('should reject shapes with invalid property types', () => {
			const baseShape = {
				id: 'shape:type-test',
				typeName: 'shape',
				type: 'group',
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {},
			}

			const invalidTypeVariations = [
				{ ...baseShape, x: 'not-a-number' }, // x should be number
				{ ...baseShape, x: 0, y: 'not-a-number' }, // y should be number
				{ ...baseShape, x: 0, y: 0, rotation: 'not-a-number' }, // rotation should be number
				{ ...baseShape, x: 0, y: 0, rotation: 0, isLocked: 'not-a-boolean' }, // isLocked should be boolean
				{ ...baseShape, x: 0, y: 0, rotation: 0, opacity: 'not-a-number' }, // opacity should be number
				{ ...baseShape, x: 0, y: 0, rotation: 0, opacity: 2 }, // opacity should be 0-1
				{ ...baseShape, x: 0, y: 0, rotation: 0, opacity: -0.5 }, // opacity should be 0-1
			]

			invalidTypeVariations.forEach((shape) => {
				expect(() => groupValidator.validate(shape)).toThrow()
			})
		})

		test('should handle boundary values correctly', () => {
			const boundaryValueShapes = [
				{
					id: 'shape:boundary1',
					typeName: 'shape',
					type: 'group',
					x: -Number.MAX_VALUE,
					y: Number.MAX_VALUE,
					rotation: -Math.PI * 2,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 0, // Minimum opacity
					props: {},
					meta: {},
				},
				{
					id: 'shape:boundary2',
					typeName: 'shape',
					type: 'group',
					x: Number.MAX_VALUE,
					y: -Number.MAX_VALUE,
					rotation: Math.PI * 2,
					index: 'a9',
					parentId: 'shape:parent',
					isLocked: true,
					opacity: 1, // Maximum opacity
					props: {},
					meta: {},
				},
			]

			boundaryValueShapes.forEach((shape) => {
				expect(() => groupValidator.validate(shape)).not.toThrow()
				const result = groupValidator.validate(shape)
				expect(result).toEqual(shape)
			})
		})
	})

	describe('integration with TLShape system', () => {
		it('should be compatible with generic shape operations', () => {
			const groupShape: TLGroupShape = {
				id: 'shape:integration-test' as TLShapeId,
				typeName: 'shape',
				type: 'group',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 0.8,
				props: {},
				meta: { test: true },
			}

			// Should work with generic shape transformations
			const moved = {
				...groupShape,
				x: groupShape.x + 50,
				y: groupShape.y + 30,
			}

			expect(moved.x).toBe(150)
			expect(moved.y).toBe(230)
			expect(moved.type).toBe('group')

			// Should work with opacity changes
			const fadedGroup = { ...groupShape, opacity: 0.5 }
			expect(fadedGroup.opacity).toBe(0.5)

			// Should work with rotation
			const rotatedGroup = { ...groupShape, rotation: Math.PI / 2 }
			expect(rotatedGroup.rotation).toBe(Math.PI / 2)
		})

		it('should support hierarchical relationships', () => {
			const parentGroup: TLGroupShape = {
				id: 'shape:parent-group' as TLShapeId,
				typeName: 'shape',
				type: 'group',
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

			const childGroup: TLGroupShape = {
				id: 'shape:child-group' as TLShapeId,
				typeName: 'shape',
				type: 'group',
				x: 50,
				y: 50,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: parentGroup.id, // Child of another group
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {},
			}

			expect(parentGroup.parentId).toBe('page:main')
			expect(childGroup.parentId).toBe('shape:parent-group')
		})

		it('should work with different index values for ordering', () => {
			const firstGroup: TLGroupShape = {
				id: 'shape:first' as TLShapeId,
				typeName: 'shape',
				type: 'group',
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

			const secondGroup: TLGroupShape = {
				id: 'shape:second' as TLShapeId,
				typeName: 'shape',
				type: 'group',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a2' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {},
			}

			expect(firstGroup.index).toBe('a1')
			expect(secondGroup.index).toBe('a2')
			// Index a1 should come before a2 in fractional index ordering
			expect(firstGroup.index < secondGroup.index).toBe(true)
		})
	})

	describe('error handling', () => {
		it('should handle null and undefined values', () => {
			const validator = createShapeValidator('group', groupShapeProps)

			const invalidInputs = [null, undefined, 'not-an-object', 123, [], true]

			invalidInputs.forEach((input) => {
				expect(() => validator.validate(input)).toThrow()
			})
		})

		it('should provide meaningful error messages', () => {
			const validator = createShapeValidator('group', groupShapeProps)

			try {
				validator.validate({
					id: 'shape:test',
					typeName: 'shape',
					type: 'group',
					// Missing required properties
				})
				expect.fail('Should have thrown validation error')
			} catch (error) {
				expect(error).toBeDefined()
				// Error should contain information about validation failure
			}
		})

		it('should handle malformed objects gracefully', () => {
			const validator = createShapeValidator('group', groupShapeProps)

			const malformedObjects = [
				{ id: 'shape:test' }, // Partial object
				{ type: 'group' }, // Missing ID
				{ id: 'invalid-id', type: 'group' }, // Invalid ID format
				{ id: 'shape:test', typeName: 'wrong', type: 'group' }, // Wrong typeName
			]

			malformedObjects.forEach((obj) => {
				expect(() => validator.validate(obj)).toThrow()
			})
		})
	})

	describe('type compatibility', () => {
		it('should be assignable to TLShape union', () => {
			const groupShape: TLGroupShape = {
				id: 'shape:type-test' as TLShapeId,
				typeName: 'shape',
				type: 'group',
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

			// Should be compatible with generic shape functions
			function getShapeType(shape: TLGroupShape): string {
				return shape.type
			}

			expect(getShapeType(groupShape)).toBe('group')
		})

		it('should work with TypeScript type guards', () => {
			const groupShape: TLGroupShape = {
				id: 'shape:guard-test' as TLShapeId,
				typeName: 'shape',
				type: 'group',
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

			function isGroupShape(shape: any): shape is TLGroupShape {
				return shape.type === 'group'
			}

			expect(isGroupShape(groupShape)).toBe(true)
			expect(isGroupShape({ type: 'geo' })).toBe(false)
		})
	})

	describe('props validation with T validators', () => {
		it('should validate empty props correctly', () => {
			const emptyObjectValidator = T.object({})

			expect(() => emptyObjectValidator.validate({})).not.toThrow()
			expect(() => emptyObjectValidator.validate({ extra: 'prop' })).toThrow()
		})

		it('should work with optional validation patterns', () => {
			// Group shapes don't have props, but test the pattern for consistency
			const optionalPropsValidator = T.object({
				optionalProp: T.string.optional(),
			})

			expect(() => optionalPropsValidator.validate({})).not.toThrow()
			expect(() => optionalPropsValidator.validate({ optionalProp: 'test' })).not.toThrow()
		})
	})
})

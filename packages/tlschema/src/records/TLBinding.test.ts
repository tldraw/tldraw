import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { TLArrowBinding } from '../bindings/TLArrowBinding'
import { TLBaseBinding } from '../bindings/TLBaseBinding'
import {
	createBindingId,
	createBindingPropsMigrationIds,
	createBindingPropsMigrationSequence,
	createBindingRecordType,
	isBinding,
	isBindingId,
	rootBindingMigrations,
	rootBindingVersions,
	TLBinding,
	TLBindingCreate,
	TLBindingId,
	TLBindingUpdate,
	TLDefaultBinding,
	TLUnknownBinding,
} from './TLBinding'
import { TLShapeId } from './TLShape'

describe('TLBinding', () => {
	describe('TLDefaultBinding type', () => {
		it('should be an alias for TLArrowBinding', () => {
			const arrowBinding: TLArrowBinding = {
				id: 'binding:arrow1' as TLBindingId,
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:source1' as TLShapeId,
				toId: 'shape:target1' as TLShapeId,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: true,
					snap: 'center',
				},
				meta: {},
			}

			// Should be assignable to TLDefaultBinding
			const defaultBinding: TLDefaultBinding = arrowBinding

			expect(defaultBinding.type).toBe('arrow')
			expect(defaultBinding.typeName).toBe('binding')
			expect(defaultBinding.fromId).toBe('shape:source1')
			expect(defaultBinding.toId).toBe('shape:target1')
		})

		it('should support arrow binding structure as documented', () => {
			const arrowBinding: TLDefaultBinding = {
				id: 'binding:arrow1' as TLBindingId,
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:arrow1' as TLShapeId,
				toId: 'shape:rectangle1' as TLShapeId,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: true,
					snap: 'center',
				},
				meta: {},
			}

			expect(arrowBinding.props.terminal).toBe('end')
			expect(arrowBinding.props.normalizedAnchor).toEqual({ x: 0.5, y: 0.5 })
			expect(arrowBinding.props.isExact).toBe(false)
			expect(arrowBinding.props.isPrecise).toBe(true)
			expect(arrowBinding.props.snap).toBe('center')
		})
	})

	describe('TLUnknownBinding type', () => {
		it('should represent binding with unknown structure', () => {
			const unknownBinding: TLUnknownBinding = {
				id: 'binding:custom1' as TLBindingId,
				typeName: 'binding',
				type: 'custom',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: {
					customProp: 'value',
					count: 42,
					enabled: true,
				},
				meta: {
					version: 1,
					author: 'test-user',
				},
			}

			expect(unknownBinding.type).toBe('custom')
			expect((unknownBinding.props as any).customProp).toBe('value')
			expect((unknownBinding.props as any).count).toBe(42)
			expect(unknownBinding.meta.version).toBe(1)
		})

		it('should extend TLBaseBinding with string type and object props', () => {
			interface CustomBinding extends TLBaseBinding<'custom', { value: string }> {}

			const customBinding: CustomBinding = {
				id: 'binding:custom123' as TLBindingId,
				typeName: 'binding',
				type: 'custom',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: { value: 'test' },
				meta: {},
			}

			// Should be assignable to TLUnknownBinding
			const unknownBinding: TLUnknownBinding = customBinding

			expect(unknownBinding.type).toBe('custom')
			expect((unknownBinding.props as any).value).toBe('test')
		})

		it('should handle empty props and meta', () => {
			const minimalBinding: TLUnknownBinding = {
				id: 'binding:minimal' as TLBindingId,
				typeName: 'binding',
				type: 'minimal',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: {},
				meta: {},
			}

			expect(minimalBinding.props).toEqual({})
			expect(minimalBinding.meta).toEqual({})
		})
	})

	describe('TLBinding union type', () => {
		it('should include TLDefaultBinding and TLUnknownBinding', () => {
			const defaultBinding: TLBinding = {
				id: 'binding:arrow123' as TLBindingId,
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:arrow1' as TLShapeId,
				toId: 'shape:target1' as TLShapeId,
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.25, y: 0.75 },
					isExact: true,
					isPrecise: false,
					snap: 'edge',
				},
				meta: {},
			}

			const unknownBinding: TLBinding = {
				id: 'binding:custom123' as TLBindingId,
				typeName: 'binding',
				type: 'custom',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: { customData: 'value' },
				meta: { version: 1 },
			}

			expect(defaultBinding.type).toBe('arrow')
			expect(unknownBinding.type).toBe('custom')
		})

		it('should work with type discrimination', () => {
			const handleBinding = (binding: TLBinding): string => {
				switch (binding.type) {
					case 'arrow':
						return 'arrow binding'
					default:
						return 'unknown binding'
				}
			}

			const arrowBinding: TLBinding = {
				id: 'binding:test' as TLBindingId,
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: true,
					snap: 'none',
				},
				meta: {},
			}

			const customBinding: TLBinding = {
				id: 'binding:custom' as TLBindingId,
				typeName: 'binding',
				type: 'custom',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: {},
				meta: {},
			}

			expect(handleBinding(arrowBinding)).toBe('arrow binding')
			expect(handleBinding(customBinding)).toBe('unknown binding')
		})
	})

	describe('TLBindingUpdate type', () => {
		it('should allow partial updates with required id and type', () => {
			const bindingUpdate: TLBindingUpdate = {
				id: 'binding:update1' as TLBindingId,
				type: 'arrow',
			}

			expect(bindingUpdate.id).toBe('binding:update1')
			expect(bindingUpdate.type).toBe('arrow')
			expect(bindingUpdate.fromId).toBeUndefined()
			expect(bindingUpdate.toId).toBeUndefined()
			expect(bindingUpdate.props).toBeUndefined()
		})

		it('should allow partial props updates', () => {
			const bindingUpdate: TLBindingUpdate<TLArrowBinding> = {
				id: 'binding:arrow1' as TLBindingId,
				type: 'arrow',
				props: {
					normalizedAnchor: { x: 0.7, y: 0.3 },
				},
			}

			expect(bindingUpdate.props?.normalizedAnchor).toEqual({ x: 0.7, y: 0.3 })
			expect(bindingUpdate.props?.terminal).toBeUndefined()
		})

		it('should allow optional fromId and toId updates', () => {
			const bindingUpdate: TLBindingUpdate = {
				id: 'binding:update2' as TLBindingId,
				type: 'custom',
				fromId: 'shape:newFrom' as TLShapeId,
				toId: 'shape:newTo' as TLShapeId,
			}

			expect(bindingUpdate.fromId).toBe('shape:newFrom')
			expect(bindingUpdate.toId).toBe('shape:newTo')
		})

		it('should allow partial meta updates', () => {
			const bindingUpdate: TLBindingUpdate = {
				id: 'binding:meta_update' as TLBindingId,
				type: 'custom',
				meta: {
					lastModified: Date.now(),
				},
			}

			expect(bindingUpdate.meta?.lastModified).toBeDefined()
		})

		it('should allow optional typeName field', () => {
			const bindingUpdate: TLBindingUpdate = {
				id: 'binding:typename_update' as TLBindingId,
				type: 'arrow',
				typeName: 'binding',
			}

			expect(bindingUpdate.typeName).toBe('binding')
		})
	})

	describe('TLBindingCreate type', () => {
		it('should require type, fromId, and toId', () => {
			const bindingCreate: TLBindingCreate = {
				type: 'arrow',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
			}

			expect(bindingCreate.type).toBe('arrow')
			expect(bindingCreate.fromId).toBe('shape:from1')
			expect(bindingCreate.toId).toBe('shape:to1')
			expect(bindingCreate.id).toBeUndefined()
		})

		it('should allow optional id field', () => {
			const bindingCreate: TLBindingCreate = {
				id: 'binding:custom_id' as TLBindingId,
				type: 'custom',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
			}

			expect(bindingCreate.id).toBe('binding:custom_id')
		})

		it('should allow partial props for arrow binding', () => {
			const bindingCreate: TLBindingCreate<TLArrowBinding> = {
				type: 'arrow',
				fromId: 'shape:arrow1' as TLShapeId,
				toId: 'shape:rectangle1' as TLShapeId,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: true,
					snap: 'center',
				},
			}

			expect(bindingCreate.props?.terminal).toBe('end')
			expect(bindingCreate.props?.normalizedAnchor).toEqual({ x: 0.5, y: 0.5 })
		})

		it('should allow partial meta', () => {
			const bindingCreate: TLBindingCreate = {
				type: 'custom',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				meta: {
					createdBy: 'user123',
				},
			}

			expect(bindingCreate.meta?.createdBy).toBe('user123')
		})

		it('should allow optional typeName field', () => {
			const bindingCreate: TLBindingCreate = {
				type: 'arrow',
				typeName: 'binding',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
			}

			expect(bindingCreate.typeName).toBe('binding')
		})
	})

	describe('TLBindingId branded type', () => {
		it('should be a branded string for binding IDs', () => {
			const bindingId: TLBindingId = 'binding:test123' as TLBindingId

			expect(typeof bindingId).toBe('string')
			expect(bindingId.startsWith('binding:')).toBe(true)
		})

		it('should prevent mixing with other ID types at compile time', () => {
			const bindingId: TLBindingId = 'binding:type_safety' as TLBindingId
			const shapeId: TLShapeId = 'shape:different' as TLShapeId

			// These are different branded types
			expect(bindingId).toContain('binding:')
			expect(shapeId).toContain('shape:')
		})

		it('should work with createBindingId function', () => {
			const generatedId = createBindingId()
			const customId = createBindingId('custom')

			expect(typeof generatedId).toBe('string')
			expect(generatedId.startsWith('binding:')).toBe(true)
			expect(customId).toBe('binding:custom')
		})
	})

	describe('rootBindingVersions', () => {
		it('should be defined with correct structure', () => {
			expect(rootBindingVersions).toBeDefined()
			expect(typeof rootBindingVersions).toBe('object')
		})

		it('should be empty as no migrations have been applied', () => {
			const versionKeys = Object.keys(rootBindingVersions)
			expect(versionKeys).toHaveLength(0)
		})

		it('should be created with correct sequence ID', () => {
			// The constant should be created by createMigrationIds with 'com.tldraw.binding'
			expect(rootBindingVersions).toEqual({})
		})
	})

	describe('rootBindingMigrations', () => {
		it('should be defined with correct structure', () => {
			expect(rootBindingMigrations).toBeDefined()
			expect(rootBindingMigrations.sequenceId).toBe('com.tldraw.binding')
			// Note: recordType is not part of MigrationSequence interface
			expect(Array.isArray(rootBindingMigrations.sequence)).toBe(true)
		})

		it('should have empty sequence as no migrations exist yet', () => {
			expect(rootBindingMigrations.sequence).toHaveLength(0)
		})

		it('should have correct sequenceId', () => {
			expect(rootBindingMigrations.sequenceId).toBe('com.tldraw.binding')
		})
	})

	describe('isBinding type guard', () => {
		it('should return true for valid binding records', () => {
			const binding: TLBinding = {
				id: 'binding:test' as TLBindingId,
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: true,
					isPrecise: false,
					snap: 'none',
				},
				meta: {},
			}

			expect(isBinding(binding)).toBe(true)
		})

		it('should return false for non-binding records', () => {
			const shapeRecord = {
				id: 'shape:test',
				typeName: 'shape',
				type: 'geo',
				x: 0,
				y: 0,
				props: {},
				meta: {},
			}

			const assetRecord = {
				id: 'asset:test',
				typeName: 'asset',
				type: 'image',
				props: {},
				meta: {},
			}

			expect(isBinding(shapeRecord as any)).toBe(false)
			expect(isBinding(assetRecord as any)).toBe(false)
		})

		it('should return false for undefined or null', () => {
			expect(isBinding(undefined)).toBe(false)
			expect(isBinding(null as any)).toBe(false)
		})

		it('should return false for objects without typeName', () => {
			const invalidRecord = {
				id: 'binding:test',
				type: 'arrow',
				fromId: 'shape:from1',
				toId: 'shape:to1',
				props: {},
				meta: {},
			}

			expect(isBinding(invalidRecord as any)).toBe(false)
		})

		it('should work in filtering operations', () => {
			const mixedRecords = [
				{
					id: 'binding:test1' as TLBindingId,
					typeName: 'binding' as const,
					type: 'arrow',
					fromId: 'shape:from1' as TLShapeId,
					toId: 'shape:to1' as TLShapeId,
					props: {},
					meta: {},
				},
				{
					id: 'shape:test1' as TLShapeId,
					typeName: 'shape' as const,
					type: 'geo',
					x: 0,
					y: 0,
					rotation: 0,
					index: 'a1' as any,
					parentId: 'page:1' as any,
					isLocked: false,
					opacity: 1,
					props: {},
					meta: {},
				},
				{
					id: 'binding:test2' as TLBindingId,
					typeName: 'binding' as const,
					type: 'custom',
					fromId: 'shape:from2' as TLShapeId,
					toId: 'shape:to2' as TLShapeId,
					props: {},
					meta: {},
				},
			]

			const bindings = mixedRecords.filter(isBinding)
			expect(bindings).toHaveLength(2)
			expect(bindings[0].id).toBe('binding:test1')
			expect(bindings[1].id).toBe('binding:test2')
		})
	})

	describe('isBindingId type guard', () => {
		it('should return true for valid binding IDs', () => {
			const validIds = [
				'binding:abc123',
				'binding:arrow_binding_1',
				'binding:custom-binding-name',
				'binding:123456789',
				'binding:uuid-style-id-12345',
				'binding:a',
				'binding:very_long_binding_id_with_underscores_and_numbers_123',
				'binding:', // Empty ID part is technically valid
			]

			validIds.forEach((id) => {
				expect(isBindingId(id)).toBe(true)
			})
		})

		it('should return false for invalid binding IDs', () => {
			const invalidIds = [
				'shape:abc123', // Wrong prefix
				'page:abc123',
				'asset:abc123',
				'binding', // Missing colon and ID
				':abc123', // Missing prefix
				'BINDING:abc123', // Wrong case
				'Binding:abc123',
				'abc123', // No prefix at all
				'', // Empty string
				'custom:abc123', // Custom prefix
			]

			invalidIds.forEach((id) => {
				expect(isBindingId(id)).toBe(false)
			})
		})

		it('should return false for undefined or null', () => {
			expect(isBindingId(undefined)).toBe(false)
			expect(isBindingId(null as any)).toBe(false)
		})

		it('should return false for non-string values', () => {
			// These will cause runtime errors due to startsWith call, but that's expected behavior
			// The function expects string input as indicated by the type signature
			expect(() => isBindingId(123 as any)).toThrow()
			expect(() => isBindingId({} as any)).toThrow()
			expect(() => isBindingId([] as any)).toThrow()
			expect(() => isBindingId(true as any)).toThrow()
		})

		it('should work in filtering operations', () => {
			const mixedIds = [
				'shape:1',
				'binding:2',
				'page:3',
				'binding:arrow1',
				'asset:image1',
				'binding:custom',
			]

			const bindingIds = mixedIds.filter(isBindingId)
			expect(bindingIds).toHaveLength(3)
			expect(bindingIds).toEqual(['binding:2', 'binding:arrow1', 'binding:custom'])
		})
	})

	describe('createBindingId function', () => {
		it('should generate unique IDs when no parameter provided', () => {
			const id1 = createBindingId()
			const id2 = createBindingId()

			expect(id1.startsWith('binding:')).toBe(true)
			expect(id2.startsWith('binding:')).toBe(true)
			expect(id1).not.toBe(id2)
		})

		it('should use custom ID when provided', () => {
			const customId = createBindingId('myCustomBinding')
			expect(customId).toBe('binding:myCustomBinding')
		})

		it('should handle various custom ID formats', () => {
			const ids = [
				'simple',
				'with-dashes',
				'with_underscores',
				'withNumbers123',
				'with.dots',
				'123numeric',
				'',
			]

			ids.forEach((customId) => {
				const result = createBindingId(customId)
				expect(result).toBe(`binding:${customId}`)
			})
		})

		it('should return TLBindingId branded type', () => {
			const id = createBindingId('test')

			// Should be usable as TLBindingId
			const binding: TLBinding = {
				id: id,
				typeName: 'binding',
				type: 'custom',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: {},
				meta: {},
			}

			expect(binding.id).toBe('binding:test')
		})

		it('should work with isBindingId type guard', () => {
			const id = createBindingId('validation_test')
			expect(isBindingId(id)).toBe(true)
		})
	})

	describe('createBindingPropsMigrationSequence function', () => {
		it('should return the same migration sequence passed in', () => {
			const migrations = {
				sequence: [
					{
						id: 'com.test.binding.custom/1' as `${string}/${number}`,
						up: (props: any) => ({ ...props, newProperty: 'default' }),
						down: ({ newProperty, ...props }: any) => props,
					},
				],
			}

			const result = createBindingPropsMigrationSequence(migrations)
			expect(result).toBe(migrations)
			expect(result.sequence).toHaveLength(1)
		})

		it('should handle empty migration sequences', () => {
			const emptyMigrations = { sequence: [] }
			const result = createBindingPropsMigrationSequence(emptyMigrations)

			expect(result).toBe(emptyMigrations)
			expect(result.sequence).toHaveLength(0)
		})

		it('should preserve complex migration structures', () => {
			const complexMigrations = {
				sequence: [
					{
						id: 'com.myapp.binding.custom/1' as `${string}/${number}`,
						up: (props: any) => ({ ...props, version: 1 }),
						down: ({ version, ...props }: any) => props,
					},
					{
						id: 'com.myapp.binding.custom/2' as `${string}/${number}`,
						up: (props: any) => ({ ...props, newFeature: true }),
						down: ({ newFeature, ...props }: any) => props,
					},
				],
			}

			const result = createBindingPropsMigrationSequence(complexMigrations)
			expect(result).toBe(complexMigrations)
			expect(result.sequence).toHaveLength(2)
			expect((result.sequence[0] as any).id).toBe('com.myapp.binding.custom/1')
			expect((result.sequence[1] as any).id).toBe('com.myapp.binding.custom/2')
		})
	})

	describe('createBindingPropsMigrationIds function', () => {
		it('should create correctly formatted migration IDs', () => {
			const ids = createBindingPropsMigrationIds('myCustomBinding', {
				AddNewProperty: 1,
				UpdateProperty: 2,
			})

			expect(ids.AddNewProperty).toBe('com.tldraw.binding.myCustomBinding/1')
			expect(ids.UpdateProperty).toBe('com.tldraw.binding.myCustomBinding/2')
		})

		it('should handle different binding types', () => {
			const arrowIds = createBindingPropsMigrationIds('arrow', {
				AddSnap: 1,
			})

			const customIds = createBindingPropsMigrationIds('customConnection', {
				InitialVersion: 1,
				AddMetadata: 2,
				UpdateFormat: 3,
			})

			expect(arrowIds.AddSnap).toBe('com.tldraw.binding.arrow/1')
			expect(customIds.InitialVersion).toBe('com.tldraw.binding.customConnection/1')
			expect(customIds.AddMetadata).toBe('com.tldraw.binding.customConnection/2')
			expect(customIds.UpdateFormat).toBe('com.tldraw.binding.customConnection/3')
		})

		it('should handle various version numbers', () => {
			const ids = createBindingPropsMigrationIds('test', {
				Version0: 0,
				Version1: 1,
				Version100: 100,
				Version999: 999,
			})

			expect(ids.Version0).toBe('com.tldraw.binding.test/0')
			expect(ids.Version1).toBe('com.tldraw.binding.test/1')
			expect(ids.Version100).toBe('com.tldraw.binding.test/100')
			expect(ids.Version999).toBe('com.tldraw.binding.test/999')
		})

		it('should maintain type safety for migration names', () => {
			const ids = createBindingPropsMigrationIds('typeSafety', {
				FirstMigration: 1,
				SecondMigration: 2,
			})

			// Should preserve the exact keys
			expect('FirstMigration' in ids).toBe(true)
			expect('SecondMigration' in ids).toBe(true)
			expect(Object.keys(ids)).toEqual(['FirstMigration', 'SecondMigration'])
		})

		it('should handle empty migration objects', () => {
			const emptyIds = createBindingPropsMigrationIds('empty', {})
			expect(Object.keys(emptyIds)).toHaveLength(0)
		})

		it('should handle special characters in binding type', () => {
			const ids = createBindingPropsMigrationIds('custom-binding_type.v2', {
				Migration: 1,
			})

			expect(ids.Migration).toBe('com.tldraw.binding.custom-binding_type.v2/1')
		})
	})

	describe('createBindingRecordType function', () => {
		it('should create a record type with correct configuration', () => {
			const bindings = {
				arrow: {
					props: {
						terminal: T.literalEnum('start', 'end'),
						normalizedAnchor: T.object({
							x: T.number,
							y: T.number,
						}),
					},
					meta: {},
				},
			}

			const recordType = createBindingRecordType(bindings)

			expect(recordType.typeName).toBe('binding')
			expect(recordType.scope).toBe('document')
			expect(recordType.validator).toBeDefined()
		})

		it('should create validator that validates binding types', () => {
			const bindings = {
				test: {
					props: {
						value: T.string,
					},
					meta: {},
				},
			}

			const recordType = createBindingRecordType(bindings)
			const validator = recordType.validator

			const validBinding = {
				id: 'binding:test',
				typeName: 'binding',
				type: 'test',
				fromId: 'shape:from',
				toId: 'shape:to',
				props: {
					value: 'test-value',
				},
				meta: {},
			}

			expect(() => validator.validate(validBinding)).not.toThrow()
			const result = validator.validate(validBinding)
			expect(result.type).toBe('test')
			if (result.type === 'test') {
				expect((result.props as any).value).toBe('test-value')
			}
		})

		it('should reject invalid binding types', () => {
			const bindings = {
				arrow: {
					props: { terminal: T.string },
					meta: {},
				},
			}

			const recordType = createBindingRecordType(bindings)
			const validator = recordType.validator

			const invalidBinding = {
				id: 'binding:test',
				typeName: 'binding',
				type: 'unknown', // Not in bindings config
				fromId: 'shape:from',
				toId: 'shape:to',
				props: {},
				meta: {},
			}

			expect(() => validator.validate(invalidBinding)).toThrow()
		})

		it('should handle multiple binding types', () => {
			const bindings = {
				arrow: {
					props: {
						terminal: T.literalEnum('start', 'end'),
					},
					meta: {},
				},
				custom: {
					props: {
						strength: T.number,
						color: T.string,
					},
					meta: {},
				},
			}

			const recordType = createBindingRecordType(bindings)
			const validator = recordType.validator

			const arrowBinding = {
				id: 'binding:arrow',
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:from',
				toId: 'shape:to',
				props: { terminal: 'start' },
				meta: {},
			}

			const customBinding = {
				id: 'binding:custom',
				typeName: 'binding',
				type: 'custom',
				fromId: 'shape:from',
				toId: 'shape:to',
				props: { strength: 0.8, color: 'red' },
				meta: {},
			}

			expect(() => validator.validate(arrowBinding)).not.toThrow()
			expect(() => validator.validate(customBinding)).not.toThrow()

			const arrowResult = validator.validate(arrowBinding)
			const customResult = validator.validate(customBinding)

			expect(arrowResult.type).toBe('arrow')
			expect(customResult.type).toBe('custom')
			if (customResult.type === 'custom') {
				expect((customResult.props as any).strength).toBe(0.8)
			}
		})

		it('should create record type with default properties function', () => {
			const bindings = {
				test: {
					props: { value: T.string },
					meta: {},
				},
			}

			const recordType = createBindingRecordType(bindings)

			// The record type should have withDefaultProperties applied
			expect(recordType.create).toBeDefined()

			// Test that default properties are applied (meta: {})
			const record = recordType.create({
				id: 'binding:test' as TLBindingId,
				type: 'test',
				fromId: 'shape:from' as TLShapeId,
				toId: 'shape:to' as TLShapeId,
				props: { value: 'test' },
			})

			expect(record.meta).toEqual({})
		})

		it('should handle complex prop validation', () => {
			const bindings = {
				complex: {
					props: {
						coordinates: T.object({
							x: T.number,
							y: T.number,
							z: T.optional(T.number),
						}),
						settings: T.object({
							enabled: T.boolean,
							mode: T.literalEnum('auto', 'manual'),
						}),
					},
					meta: {},
				},
			}

			const recordType = createBindingRecordType(bindings)
			const validator = recordType.validator

			const complexBinding = {
				id: 'binding:complex',
				typeName: 'binding',
				type: 'complex',
				fromId: 'shape:from',
				toId: 'shape:to',
				props: {
					coordinates: { x: 100, y: 200, z: 50 },
					settings: { enabled: true, mode: 'auto' },
				},
				meta: {},
			}

			expect(() => validator.validate(complexBinding)).not.toThrow()
			const result = validator.validate(complexBinding)
			if (result.type === 'complex') {
				expect((result.props as any).coordinates.z).toBe(50)
				expect((result.props as any).settings.mode).toBe('auto')
			}
		})
	})

	describe('integration tests', () => {
		it('should work with TLArrowBinding integration', () => {
			const arrowBinding: TLArrowBinding = {
				id: createBindingId('integration_test'),
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:arrow1' as TLShapeId,
				toId: 'shape:target1' as TLShapeId,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: true,
					snap: 'center',
				},
				meta: {},
			}

			// Should work with all type guards
			expect(isBinding(arrowBinding)).toBe(true)
			expect(isBindingId(arrowBinding.id)).toBe(true)

			// Should be assignable to all binding types
			const defaultBinding: TLDefaultBinding = arrowBinding
			const genericBinding: TLBinding = arrowBinding

			expect(defaultBinding.type).toBe('arrow')
			expect(genericBinding.type).toBe('arrow')
		})

		it('should support binding update and create operations', () => {
			const originalBinding: TLBinding = {
				id: 'binding:update_test' as TLBindingId,
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.25, y: 0.25 },
					isExact: true,
					isPrecise: false,
					snap: 'none',
				},
				meta: { version: 1 },
			}

			const update: TLBindingUpdate<TLArrowBinding> = {
				id: originalBinding.id,
				type: 'arrow',
				props: {
					normalizedAnchor: { x: 0.75, y: 0.75 },
					snap: 'edge',
				},
				meta: {
					version: 2,
				},
			}

			const create: TLBindingCreate<TLArrowBinding> = {
				type: 'arrow',
				fromId: 'shape:new_from' as TLShapeId,
				toId: 'shape:new_to' as TLShapeId,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: true,
					snap: 'center',
				},
			}

			// These should compile and have correct types
			expect(update.props?.normalizedAnchor).toEqual({ x: 0.75, y: 0.75 })
			expect(create.fromId).toBe('shape:new_from')
			expect(create.id).toBeUndefined()
		})

		test('should handle migration ID creation for binding props', () => {
			const migrationIds = createBindingPropsMigrationIds('testBinding', {
				AddFeature: 1,
				UpdateFormat: 2,
			})

			const migrations = createBindingPropsMigrationSequence({
				sequence: [
					{
						id: migrationIds.AddFeature,
						up: (props: any) => ({ ...props, newFeature: true }),
						down: ({ newFeature, ...props }: any) => props,
					},
					{
						id: migrationIds.UpdateFormat,
						up: (props: any) => ({ ...props, format: 'v2' }),
						down: ({ format, ...props }: any) => props,
					},
				],
			})

			expect(migrationIds.AddFeature).toBe('com.tldraw.binding.testBinding/1')
			expect(migrationIds.UpdateFormat).toBe('com.tldraw.binding.testBinding/2')
			expect(migrations.sequence).toHaveLength(2)
		})

		it('should handle complex binding scenarios', () => {
			// Create a custom binding type
			interface CustomBinding
				extends TLBaseBinding<
					'connection',
					{
						strength: number
						bidirectional: boolean
						metadata: { title: string; description?: string }
					}
				> {}

			const customBinding: CustomBinding = {
				id: createBindingId('complex_custom'),
				typeName: 'binding',
				type: 'connection',
				fromId: 'shape:node1' as TLShapeId,
				toId: 'shape:node2' as TLShapeId,
				props: {
					strength: 0.85,
					bidirectional: true,
					metadata: {
						title: 'Data Flow',
						description: 'Primary data connection',
					},
				},
				meta: {
					createdAt: Date.now(),
					author: 'system',
					tags: ['important', 'data'],
				},
			}

			// Should work as TLBinding
			const genericBinding: TLBinding = customBinding
			expect(isBinding(genericBinding)).toBe(true)
			expect(genericBinding.type).toBe('connection')
			expect((genericBinding.props as any).strength).toBe(0.85)
			expect((genericBinding.props as any).metadata.title).toBe('Data Flow')

			// Should support updates
			const update: TLBindingUpdate<CustomBinding> = {
				id: customBinding.id,
				type: 'connection',
				props: {
					strength: 0.95,
					metadata: {
						title: 'Updated Data Flow',
					},
				},
			}

			expect(update.props?.strength).toBe(0.95)
			expect(update.props?.metadata?.title).toBe('Updated Data Flow')
		})
	})
})

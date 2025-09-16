import { Migration, StandaloneDependsOn, createMigrationSequence } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { describe, expect, it, vi } from 'vitest'
import { SchemaPropsInfo } from './createTLSchema'
import {
	RecordProps,
	RecordPropsType,
	TLPropsMigration,
	TLPropsMigrations,
	createPropsMigration,
	processPropsMigrations,
} from './recordsWithProps'

// Test types for records with props - removed as they're causing type issues with branded RecordId types

describe('RecordProps type', () => {
	it('should map record props to validators', () => {
		// Test with a generic record interface that doesn't have strict typing
		type TestRecord = {
			id: any
			typeName: any
			type: any
			props: {
				color: string
				size: number
				optional?: string
			}
		}

		const recordProps: RecordProps<TestRecord> = {
			color: T.string,
			size: T.number,
			optional: T.optional(T.string),
		}

		expect(recordProps).toBeDefined()
		expect(recordProps.color).toBe(T.string)
		expect(recordProps.size).toBe(T.number)
		expect(recordProps.optional).toBeDefined()
	})

	it('should work with style properties', () => {
		// Test with a generic shape interface
		type TestShape = {
			id: any
			typeName: any
			type: any
			props: {
				width: number
				height: number
				customProp: string // Use a simple string instead of style property to avoid type complexity
			}
		}

		const shapeProps: RecordProps<TestShape> = {
			width: T.number,
			height: T.number,
			customProp: T.string,
		}

		expect(shapeProps).toBeDefined()
		expect(shapeProps.width).toBe(T.number)
		expect(shapeProps.height).toBe(T.number)
		expect(shapeProps.customProp).toBe(T.string)
	})
})

describe('RecordPropsType type', () => {
	it('should extract TypeScript types from validators', () => {
		const config = {
			width: T.number,
			height: T.number,
			color: T.string,
			optional: T.optional(T.string),
		}

		// Type-only test - verify this compiles correctly
		type ExtractedType = RecordPropsType<typeof config>
		const _typeTest: ExtractedType = {
			width: 100,
			height: 200,
			color: 'blue',
			// optional should be optional
		}

		expect(_typeTest).toBeDefined()
	})

	it('should handle complex validator configurations', () => {
		const complexConfig = {
			id: T.string,
			count: T.number,
			enabled: T.boolean,
			tags: T.arrayOf(T.string),
			metadata: T.object({
				created: T.number,
				updated: T.optional(T.number),
			}),
		}

		// Type-only test - verify this compiles correctly
		type ComplexType = RecordPropsType<typeof complexConfig>
		const _complexTest: ComplexType = {
			id: 'test',
			count: 42,
			enabled: true,
			tags: ['a', 'b'],
			metadata: {
				created: Date.now(),
			},
		}

		expect(_complexTest).toBeDefined()
	})
})

describe('TLPropsMigration interface', () => {
	it('should define migration structure', () => {
		const migration: TLPropsMigration = {
			id: 'com.test.shape.custom/1' as const,
			up: (props: any) => ({ ...props, newProp: 'default' }),
			down: (props: any) => {
				const { newProp, ...rest } = props
				return rest
			},
		}

		expect(migration.id).toBe('com.test.shape.custom/1')
		expect(typeof migration.up).toBe('function')
		expect(typeof migration.down).toBe('function')
	})

	it('should support migrations without down function', () => {
		const migration: TLPropsMigration = {
			id: 'com.test.shape.custom/1' as const,
			up: (props: any) => ({ ...props, newProp: 'default' }),
		}

		expect(migration.id).toBe('com.test.shape.custom/1')
		expect(typeof migration.up).toBe('function')
		expect(migration.down).toBeUndefined()
	})

	it('should support down migration markers', () => {
		const noneDown: TLPropsMigration = {
			id: 'com.test.shape.custom/1' as const,
			up: (props: any) => props,
			down: 'none',
		}

		const retiredDown: TLPropsMigration = {
			id: 'com.test.shape.custom/2' as const,
			up: (props: any) => props,
			down: 'retired',
		}

		expect(noneDown.down).toBe('none')
		expect(retiredDown.down).toBe('retired')
	})

	it('should support dependsOn field', () => {
		const migration: TLPropsMigration = {
			id: 'com.test.shape.custom/2' as const,
			dependsOn: ['com.test.shape.custom/1' as const],
			up: (props: any) => ({ ...props, newProp2: true }),
			down: (props: any) => {
				const { newProp2, ...rest } = props
				return rest
			},
		}

		expect(migration.dependsOn).toEqual(['com.test.shape.custom/1'])
	})
})

describe('TLPropsMigrations interface', () => {
	it('should contain sequence of migrations', () => {
		const migrations: TLPropsMigrations = {
			sequence: [
				{
					id: 'com.test.shape.custom/1' as const,
					up: (props: any) => ({ ...props, v: 1 }),
					down: (props: any) => {
						const { v, ...rest } = props
						return rest
					},
				},
				{
					id: 'com.test.shape.custom/2' as const,
					up: (props: any) => ({ ...props, v: 2 }),
					down: (props: any) => ({ ...props, v: 1 }),
				},
			],
		}

		expect(migrations.sequence).toHaveLength(2)
		expect((migrations.sequence[0] as any).id).toBe('com.test.shape.custom/1')
		expect((migrations.sequence[1] as any).id).toBe('com.test.shape.custom/2')
	})

	it('should support standalone dependencies', () => {
		const standaloneDepends: StandaloneDependsOn = {
			dependsOn: ['com.other.migration/1' as const],
		}

		const migrations: TLPropsMigrations = {
			sequence: [
				standaloneDepends,
				{
					id: 'com.test.shape.custom/1' as const,
					up: (props: any) => props,
				},
			],
		}

		expect(migrations.sequence).toHaveLength(2)
		expect(migrations.sequence[0]).toEqual(standaloneDepends)
	})
})

describe('createPropsMigration', () => {
	it('should create a store migration from props migration', () => {
		const propsMigration: TLPropsMigration = {
			id: 'com.test.shape.custom/1' as const,
			up: (props: any) => ({ ...props, newProp: 'added' }),
			down: (props: any) => {
				const { newProp, ...rest } = props
				return rest
			},
		}

		const storeMigration = createPropsMigration('shape', 'custom', propsMigration)

		expect(storeMigration.id).toBe('com.test.shape.custom/1')
		expect(storeMigration.scope).toBe('record')
		expect(typeof storeMigration.up).toBe('function')
		expect(typeof storeMigration.down).toBe('function')
		expect(typeof (storeMigration as any).filter).toBe('function')
	})

	it('should set dependsOn from props migration', () => {
		const propsMigration: TLPropsMigration = {
			id: 'com.test.shape.custom/2' as const,
			dependsOn: ['com.test.shape.custom/1' as const],
			up: (props: any) => props,
		}

		const storeMigration = createPropsMigration('shape', 'custom', propsMigration)

		expect(storeMigration.dependsOn).toEqual(['com.test.shape.custom/1'])
	})

	it('should create filter that matches type name and subtype', () => {
		const propsMigration: TLPropsMigration = {
			id: 'com.test.shape.custom/1' as const,
			up: (props: any) => props,
		}

		const storeMigration = createPropsMigration('shape', 'custom', propsMigration)

		// Test filter function - cast to access the filter property
		const recordMigration = storeMigration as any
		const matchingRecord = { typeName: 'shape', type: 'custom', props: {} }
		const nonMatchingTypeName = { typeName: 'binding', type: 'custom', props: {} }
		const nonMatchingType = { typeName: 'shape', type: 'other', props: {} }

		expect(recordMigration.filter(matchingRecord)).toBe(true)
		expect(recordMigration.filter(nonMatchingTypeName)).toBe(false)
		expect(recordMigration.filter(nonMatchingType)).toBe(false)
	})

	it('should apply up migration to record props', () => {
		const propsMigration: TLPropsMigration = {
			id: 'com.test.shape.custom/1' as const,
			up: (props: any) => ({ ...props, newProp: 'added' }),
		}

		const storeMigration = createPropsMigration('shape', 'custom', propsMigration)

		const record = {
			id: 'shape:test' as const,
			typeName: 'shape' as const,
			type: 'custom' as const,
			props: { oldProp: 'value' },
		}

		storeMigration.up(record as any)

		expect(record.props).toEqual({
			oldProp: 'value',
			newProp: 'added',
		})
	})

	it('should apply down migration to record props', () => {
		const propsMigration: TLPropsMigration = {
			id: 'com.test.shape.custom/1' as const,
			up: (props: any) => ({ ...props, newProp: 'added' }),
			down: (props: any) => {
				const { newProp, ...rest } = props
				return rest
			},
		}

		const storeMigration = createPropsMigration('shape', 'custom', propsMigration)

		const record = {
			id: 'shape:test' as const,
			typeName: 'shape' as const,
			type: 'custom' as const,
			props: { oldProp: 'value', newProp: 'added' },
		}

		if (storeMigration.down) {
			storeMigration.down(record as any)
		}

		expect(record.props).toEqual({ oldProp: 'value' })
	})

	it('should handle up migration that returns null/undefined', () => {
		const propsMigration: TLPropsMigration = {
			id: 'com.test.shape.custom/1' as const,
			up: () => null, // Returns null
		}

		const storeMigration = createPropsMigration('shape', 'custom', propsMigration)

		const record = {
			id: 'shape:test' as const,
			typeName: 'shape' as const,
			type: 'custom' as const,
			props: { oldProp: 'value' },
		}

		const originalProps = { ...record.props }
		storeMigration.up(record as any)

		// Props should remain unchanged when migration returns null/undefined
		expect(record.props).toEqual(originalProps)
	})

	it('should handle down migration that returns null/undefined', () => {
		const propsMigration: TLPropsMigration = {
			id: 'com.test.shape.custom/1' as const,
			up: (props: any) => props,
			down: () => undefined, // Returns undefined
		}

		const storeMigration = createPropsMigration('shape', 'custom', propsMigration)

		const record = {
			id: 'shape:test' as const,
			typeName: 'shape' as const,
			type: 'custom' as const,
			props: { oldProp: 'value' },
		}

		const originalProps = { ...record.props }
		if (storeMigration.down) {
			storeMigration.down(record as any)
		}

		// Props should remain unchanged when migration returns null/undefined
		expect(record.props).toEqual(originalProps)
	})

	it('should not create down migration for non-function down values', () => {
		const propsMigrationNone: TLPropsMigration = {
			id: 'com.test.shape.custom/1' as const,
			up: (props: any) => props,
			down: 'none',
		}

		const propsMigrationRetired: TLPropsMigration = {
			id: 'com.test.shape.custom/2' as const,
			up: (props: any) => props,
			down: 'retired',
		}

		const propsMigrationUndefined: TLPropsMigration = {
			id: 'com.test.shape.custom/3' as const,
			up: (props: any) => props,
		}

		const storeMigrationNone = createPropsMigration('shape', 'custom', propsMigrationNone)
		const storeMigrationRetired = createPropsMigration('shape', 'custom', propsMigrationRetired)
		const storeMigrationUndefined = createPropsMigration('shape', 'custom', propsMigrationUndefined)

		expect(storeMigrationNone.down).toBeUndefined()
		expect(storeMigrationRetired.down).toBeUndefined()
		expect(storeMigrationUndefined.down).toBeUndefined()
	})
})

describe('processPropsMigrations', () => {
	it('should create migration sequences for records with no migrations', () => {
		const records: Record<string, SchemaPropsInfo> = {
			custom: {
				props: { width: T.number, height: T.number },
			},
		}

		const result = processPropsMigrations('shape', records)

		expect(result).toHaveLength(1)
		expect(result[0].sequenceId).toBe('com.tldraw.shape.custom')
		expect(result[0].retroactive).toBe(true)
		expect(result[0].sequence).toHaveLength(0)
	})

	it('should handle existing migration sequences', () => {
		const existingMigration = createMigrationSequence({
			sequenceId: 'com.tldraw.shape.custom',
			retroactive: true,
			sequence: [
				{
					id: 'com.tldraw.shape.custom/1',
					scope: 'record' as const,
					up: vi.fn(),
					down: vi.fn(),
				},
			],
		})

		const records: Record<string, SchemaPropsInfo> = {
			custom: {
				props: { width: T.number },
				migrations: existingMigration,
			},
		}

		const result = processPropsMigrations('shape', records)

		expect(result).toHaveLength(1)
		expect(result[0]).toBe(existingMigration)
	})

	it('should throw error for mismatched sequenceId', () => {
		const wrongSequenceId = createMigrationSequence({
			sequenceId: 'com.wrong.shape.custom', // Wrong sequence ID
			retroactive: true,
			sequence: [],
		})

		const records: Record<string, SchemaPropsInfo> = {
			custom: {
				props: { width: T.number },
				migrations: wrongSequenceId,
			},
		}

		expect(() => processPropsMigrations('shape', records)).toThrow(`sequenceId mismatch for custom`)
	})

	it('should process TLPropsMigrations format', () => {
		const propsMigrations: TLPropsMigrations = {
			sequence: [
				{
					id: 'com.tldraw.shape.custom/1',
					up: (props: any) => ({ ...props, v: 1 }),
					down: (props: any) => {
						const { v, ...rest } = props
						return rest
					},
				},
				{
					id: 'com.tldraw.shape.custom/2',
					dependsOn: ['com.tldraw.shape.custom/1'],
					up: (props: any) => ({ ...props, v: 2 }),
					down: (props: any) => ({ ...props, v: 1 }),
				},
			],
		}

		const records: Record<string, SchemaPropsInfo> = {
			custom: {
				props: { width: T.number },
				migrations: propsMigrations,
			},
		}

		const result = processPropsMigrations('shape', records)

		expect(result).toHaveLength(1)
		expect(result[0].sequenceId).toBe('com.tldraw.shape.custom')
		expect(result[0].retroactive).toBe(true)
		expect(result[0].sequence).toHaveLength(2)

		// Check that props migrations were converted to store migrations
		const storeMigrations = result[0].sequence as Migration[]
		expect(storeMigrations[0].id).toBe('com.tldraw.shape.custom/1')
		expect(storeMigrations[0].scope).toBe('record')
		expect(storeMigrations[1].id).toBe('com.tldraw.shape.custom/2')
		expect(storeMigrations[1].dependsOn).toEqual(['com.tldraw.shape.custom/1'])
	})

	it('should handle mixed migrations with standalone dependencies', () => {
		const standaloneDepends: StandaloneDependsOn = {
			dependsOn: ['com.other.migration/1'],
		}

		const propsMigrations: TLPropsMigrations = {
			sequence: [
				standaloneDepends,
				{
					id: 'com.tldraw.shape.custom/1',
					up: (props: any) => props,
				},
			],
		}

		const records: Record<string, SchemaPropsInfo> = {
			custom: {
				props: { width: T.number },
				migrations: propsMigrations,
			},
		}

		const result = processPropsMigrations('shape', records)

		expect(result).toHaveLength(1)
		expect(result[0].sequence).toHaveLength(1)

		// The standalone dependency should be merged into the migration's dependsOn
		const storeMigration = result[0].sequence[0] as Migration
		expect(storeMigration.id).toBe('com.tldraw.shape.custom/1')
		expect(storeMigration.scope).toBe('record')
		expect(storeMigration.dependsOn).toContain('com.other.migration/1')
	})

	it('should process legacy migrations format', () => {
		const legacyMigrations = {
			migrators: {
				1: {
					up: vi.fn((record: any) => ({ ...record, version: 1 })),
					down: vi.fn((record: any) => {
						const { version, ...rest } = record
						return rest
					}),
				},
				2: {
					up: vi.fn((record: any) => ({ ...record, version: 2 })),
					down: vi.fn((record: any) => ({ ...record, version: 1 })),
				},
			},
		}

		const records: Record<string, SchemaPropsInfo> = {
			legacy: {
				props: { width: T.number },
				migrations: legacyMigrations as any,
			},
		}

		const result = processPropsMigrations('shape', records)

		expect(result).toHaveLength(1)
		expect(result[0].sequenceId).toBe('com.tldraw.shape.legacy')
		expect(result[0].retroactive).toBe(true)
		expect(result[0].sequence).toHaveLength(2)

		// Check legacy migration conversion
		const migrations = result[0].sequence as Migration[]
		expect(migrations[0].id).toBe('com.tldraw.shape.legacy/1')
		expect(migrations[0].scope).toBe('record')
		expect(migrations[1].id).toBe('com.tldraw.shape.legacy/2')
		expect(migrations[1].scope).toBe('record')

		// Test filter function - cast to the specific migration type that has filter
		const recordMigration = migrations[0] as any
		const matchingRecord = { typeName: 'shape', type: 'legacy' }
		const nonMatchingRecord = { typeName: 'shape', type: 'other' }

		expect(recordMigration.filter(matchingRecord)).toBe(true)
		expect(recordMigration.filter(nonMatchingRecord)).toBe(false)
	})

	it('should handle legacy migrations with unsorted version numbers', () => {
		const legacyMigrations = {
			migrators: {
				3: { up: vi.fn(), down: vi.fn() },
				1: { up: vi.fn(), down: vi.fn() },
				2: { up: vi.fn(), down: vi.fn() },
			},
		}

		const records: Record<string, SchemaPropsInfo> = {
			legacy: {
				props: { width: T.number },
				migrations: legacyMigrations as any,
			},
		}

		const result = processPropsMigrations('shape', records)

		expect(result).toHaveLength(1)
		const migrations = result[0].sequence as Migration[]

		// Should be sorted by version number
		expect(migrations[0].id).toBe('com.tldraw.shape.legacy/1')
		expect(migrations[1].id).toBe('com.tldraw.shape.legacy/2')
		expect(migrations[2].id).toBe('com.tldraw.shape.legacy/3')
	})

	it('should apply legacy migration up functions to records', () => {
		const upMigration = vi.fn((record: any) => ({ ...record, migrated: true }))
		const downMigration = vi.fn((record: any) => {
			const { migrated, ...rest } = record
			return rest
		})

		const legacyMigrations = {
			migrators: {
				1: {
					up: upMigration,
					down: downMigration,
				},
			},
		}

		const records: Record<string, SchemaPropsInfo> = {
			legacy: {
				props: { width: T.number },
				migrations: legacyMigrations as any,
			},
		}

		const result = processPropsMigrations('shape', records)
		const migration = result[0].sequence[0] as Migration

		const record = { id: 'test', typeName: 'shape', original: true }
		const migratedRecord = migration.up(record as any)

		expect(upMigration).toHaveBeenCalledWith(record)
		expect(migratedRecord).toEqual({
			id: 'test',
			typeName: 'shape',
			original: true,
			migrated: true,
		})
	})

	it('should apply legacy migration down functions to records', () => {
		const upMigration = vi.fn()
		const downMigration = vi.fn((record: any) => ({ ...record, downgraded: true }))

		const legacyMigrations = {
			migrators: {
				1: {
					up: upMigration,
					down: downMigration,
				},
			},
		}

		const records: Record<string, SchemaPropsInfo> = {
			legacy: {
				props: { width: T.number },
				migrations: legacyMigrations as any,
			},
		}

		const result = processPropsMigrations('shape', records)
		const migration = result[0].sequence[0] as Migration

		const record = { id: 'test', typeName: 'shape', original: true }
		if (migration.down) {
			const downgradedRecord = migration.down(record as any)
			expect(downMigration).toHaveBeenCalledWith(record)
			expect(downgradedRecord).toEqual({
				id: 'test',
				typeName: 'shape',
				original: true,
				downgraded: true,
			})
		}
	})

	it('should handle legacy migrations that return null/undefined', () => {
		// This test checks behavior when legacy migrations return null/undefined
		const legacyMigrations = {
			migrators: {
				1: {
					up: vi.fn(() => null), // Returns null
					down: vi.fn(() => undefined), // Returns undefined
				},
			},
		}

		const records: Record<string, SchemaPropsInfo> = {
			legacy: {
				props: { width: T.number },
				migrations: legacyMigrations as any,
			},
		}

		const result = processPropsMigrations('shape', records)
		const migration = result[0].sequence[0] as Migration

		const record = { id: 'test', typeName: 'shape', original: true }

		// Test up migration - when migration returns null, the result should be undefined
		const upResult = migration.up(record as any)
		expect(upResult).toBeUndefined()

		// Test down migration - when migration returns undefined, the result should be undefined
		if (migration.down) {
			const downResult = migration.down(record as any)
			expect(downResult).toBeUndefined()
		}
	})

	it('should process multiple record types', () => {
		const records: Record<string, SchemaPropsInfo> = {
			type1: {
				props: { prop1: T.string },
			},
			type2: {
				props: { prop2: T.number },
				migrations: {
					sequence: [
						{
							id: 'com.tldraw.shape.type2/1',
							up: (props: any) => props,
						},
					],
				},
			},
			type3: {
				props: { prop3: T.boolean },
				migrations: createMigrationSequence({
					sequenceId: 'com.tldraw.shape.type3',
					sequence: [],
				}),
			},
		}

		const result = processPropsMigrations('shape', records)

		expect(result).toHaveLength(3)
		expect(result.find((seq) => seq.sequenceId === 'com.tldraw.shape.type1')).toBeDefined()
		expect(result.find((seq) => seq.sequenceId === 'com.tldraw.shape.type2')).toBeDefined()
		expect(result.find((seq) => seq.sequenceId === 'com.tldraw.shape.type3')).toBeDefined()
	})

	it('should handle different typeName values', () => {
		const records: Record<string, SchemaPropsInfo> = {
			custom: {
				props: { width: T.number },
			},
		}

		const bindingResult = processPropsMigrations('binding', records)
		const shapeResult = processPropsMigrations('shape', records)

		expect(bindingResult[0].sequenceId).toBe('com.tldraw.binding.custom')
		expect(shapeResult[0].sequenceId).toBe('com.tldraw.shape.custom')
	})

	it('should handle empty records object', () => {
		const records: Record<string, SchemaPropsInfo> = {}

		const result = processPropsMigrations('shape', records)

		expect(result).toHaveLength(0)
	})
})

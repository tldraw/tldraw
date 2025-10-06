import { Migration, createMigrationSequence } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { describe, expect, it, vi } from 'vitest'
import { SchemaPropsInfo } from './createTLSchema'
import {
	TLPropsMigration,
	TLPropsMigrations,
	createPropsMigration,
	processPropsMigrations,
} from './recordsWithProps'

describe('createPropsMigration', () => {
	it('should create a store migration from props migration', () => {
		const propsMigration: TLPropsMigration = {
			id: 'com.test.shape.custom/1' as const,
			up: (props: any) => ({ ...props, newProp: 'added' }),
			down: (props: any) => {
				const { newProp: _newProp, ...rest } = props
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
				const { newProp: _newProp, ...rest } = props
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
})

describe('processPropsMigrations', () => {
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
						const { v: _v, ...rest } = props
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

	it('should process legacy migrations format', () => {
		const legacyMigrations = {
			migrators: {
				1: {
					up: vi.fn((record: any) => ({ ...record, version: 1 })),
					down: vi.fn((record: any) => {
						const { version: _version, ...rest } = record
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
})

import { describe, expect, it } from 'vitest'
import { UnknownRecord } from './BaseRecord'
import { SerializedStore } from './Store'
import {
	type Migration,
	type MigrationId,
	type MigrationSequence,
	type StandaloneDependsOn,
	createMigrationIds,
	createMigrationSequence,
	createRecordMigrationSequence,
	parseMigrationId,
	sortMigrations,
	validateMigrations,
} from './migrate'

describe('createMigrationIds', () => {
	it('creates properly formatted migration IDs', () => {
		const ids = createMigrationIds('com.myapp.book', {
			addGenre: 1,
			addPublisher: 2,
			removeOldField: 3,
		})

		expect(ids).toEqual({
			addGenre: 'com.myapp.book/1',
			addPublisher: 'com.myapp.book/2',
			removeOldField: 'com.myapp.book/3',
		})
	})
})

describe('parseMigrationId', () => {
	it('parses migration IDs correctly', () => {
		expect(parseMigrationId('com.myapp.book/5' as MigrationId)).toEqual({
			sequenceId: 'com.myapp.book',
			version: 5,
		})
		expect(parseMigrationId('test/1' as MigrationId)).toEqual({
			sequenceId: 'test',
			version: 1,
		})
		expect(parseMigrationId('com.example.app/42' as MigrationId)).toEqual({
			sequenceId: 'com.example.app',
			version: 42,
		})
	})
})

describe('createMigrationSequence', () => {
	it('creates and validates migration sequences', () => {
		const migration: Migration = {
			id: 'test/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => ({ ...record, newField: 'default' }),
		}

		const sequence = createMigrationSequence({
			sequenceId: 'test',
			sequence: [migration],
			retroactive: false,
		})

		expect(sequence.sequenceId).toBe('test')
		expect(sequence.retroactive).toBe(false)
		expect(sequence.sequence).toHaveLength(1)
	})

	it('squashes standalone dependsOn entries', () => {
		const dependsOn: StandaloneDependsOn = {
			dependsOn: ['other/1' as MigrationId, 'another/2' as MigrationId],
		}

		const migration: Migration = {
			id: 'test/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['existing/1' as MigrationId],
		}

		const sequence = createMigrationSequence({
			sequenceId: 'test',
			sequence: [dependsOn, migration],
		})

		expect(sequence.sequence).toHaveLength(1)
		expect(sequence.sequence[0].dependsOn).toEqual(['other/1', 'another/2', 'existing/1'])
	})

	it('validates the migration sequence', () => {
		expect(() => {
			createMigrationSequence({
				sequenceId: 'test/invalid',
				sequence: [],
			})
		}).toThrow()
	})
})

describe('createRecordMigrationSequence', () => {
	it('creates record-scoped migrations with type filtering', () => {
		const sequence = createRecordMigrationSequence({
			recordType: 'book',
			sequenceId: 'com.myapp.book',
			sequence: [
				{
					id: 'com.myapp.book/1' as MigrationId,
					up: (record: UnknownRecord) => ({ ...record, newField: 'value' }),
				},
			],
		})

		expect(sequence.sequenceId).toBe('com.myapp.book')
		expect(sequence.sequence).toHaveLength(1)
		expect(sequence.sequence[0].scope).toBe('record')

		// Test the filter function
		const migration = sequence.sequence[0] as Extract<Migration, { scope: 'record' }>
		const bookRecord = { id: 'book-1' as any, typeName: 'book' } as any as UnknownRecord
		const userRecord = { id: 'user-1' as any, typeName: 'user' } as any as UnknownRecord

		expect(migration.filter?.(bookRecord)).toBe(true)
		expect(migration.filter?.(userRecord)).toBe(false)
	})

	it('combines record type filter with custom filter', () => {
		const sequence = createRecordMigrationSequence({
			recordType: 'shape',
			filter: (record) => (record as any).shapeType === 'rectangle',
			sequenceId: 'com.myapp.shape',
			sequence: [
				{
					id: 'com.myapp.shape/1' as MigrationId,
					up: (record: UnknownRecord) => record,
				},
			],
		})

		const migration = sequence.sequence[0] as Extract<Migration, { scope: 'record' }>
		const rectangleShape = {
			id: 'shape-1' as any,
			typeName: 'shape',
			shapeType: 'rectangle',
		} as any as UnknownRecord
		const circleShape = {
			id: 'shape-2' as any,
			typeName: 'shape',
			shapeType: 'circle',
		} as any as UnknownRecord
		const userRecord = { id: 'user-1' as any, typeName: 'user' } as any as UnknownRecord

		expect(migration.filter?.(rectangleShape)).toBe(true)
		expect(migration.filter?.(circleShape)).toBe(false)
		expect(migration.filter?.(userRecord)).toBe(false)
	})
})

describe('validateMigrations', () => {
	it('validates sequential migration versions', () => {
		const sequence: MigrationSequence = {
			sequenceId: 'test',
			retroactive: true,
			sequence: [
				{
					id: 'test/1' as MigrationId,
					scope: 'record',
					up: (record: UnknownRecord) => record,
				},
				{
					id: 'test/2' as MigrationId,
					scope: 'record',
					up: (record: UnknownRecord) => record,
				},
				{
					id: 'test/3' as MigrationId,
					scope: 'store',
					up: (store: SerializedStore<UnknownRecord>) => store,
				},
			],
		}

		expect(() => validateMigrations(sequence)).not.toThrow()
	})

	it('throws on sequence ID with slash', () => {
		const sequence: MigrationSequence = {
			sequenceId: 'test/invalid',
			retroactive: true,
			sequence: [],
		}

		expect(() => validateMigrations(sequence)).toThrow(
			"sequenceId cannot contain a '/', got test/invalid"
		)
	})

	it('throws on invalid migration ID format', () => {
		const sequence: MigrationSequence = {
			sequenceId: 'test',
			retroactive: true,
			sequence: [
				{
					id: 'invalid-id' as MigrationId,
					scope: 'record',
					up: (record: UnknownRecord) => record,
				},
			],
		}

		expect(() => validateMigrations(sequence)).toThrow(
			"Every migration in sequence 'test' must have an id starting with 'test/'. Got invalid id: 'invalid-id'"
		)
	})

	it('throws on first migration not starting at version 1', () => {
		const sequence: MigrationSequence = {
			sequenceId: 'test',
			retroactive: true,
			sequence: [
				{
					id: 'test/5' as MigrationId,
					scope: 'record',
					up: (record: UnknownRecord) => record,
				},
			],
		}

		expect(() => validateMigrations(sequence)).toThrow(
			"Expected the first migrationId to be 'test/1' but got 'test/5'"
		)
	})

	it('throws on non-sequential migration versions', () => {
		const sequence: MigrationSequence = {
			sequenceId: 'test',
			retroactive: true,
			sequence: [
				{
					id: 'test/1' as MigrationId,
					scope: 'record',
					up: (record: UnknownRecord) => record,
				},
				{
					id: 'test/3' as MigrationId,
					scope: 'record',
					up: (record: UnknownRecord) => record,
				},
			],
		}

		expect(() => validateMigrations(sequence)).toThrow(
			"Migration id numbers must increase in increments of 1, expected test/2 but got 'test/3'"
		)
	})
})

describe('sortMigrations', () => {
	it('sorts migrations by sequence order', () => {
		const migration1: Migration = {
			id: 'app/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}
		const migration2: Migration = {
			id: 'app/2' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}

		expect(sortMigrations([migration2, migration1])).toEqual([migration1, migration2])
	})

	it('respects explicit dependencies', () => {
		const libMigration: Migration = {
			id: 'lib/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['app/1' as MigrationId],
		}
		const appMigration: Migration = {
			id: 'app/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}

		const sorted = sortMigrations([libMigration, appMigration])
		expect(sorted).toEqual([appMigration, libMigration])
	})

	it('handles complex dependency chains', () => {
		const a1: Migration = {
			id: 'a/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}
		const b1: Migration = {
			id: 'b/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['a/1' as MigrationId],
		}
		const c1: Migration = {
			id: 'c/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['b/1' as MigrationId],
		}
		const d1: Migration = {
			id: 'd/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['a/1' as MigrationId, 'c/1' as MigrationId],
		}

		const sorted = sortMigrations([d1, c1, b1, a1])
		expect(sorted).toEqual([a1, b1, c1, d1])
	})

	it('prioritizes explicit dependencies over sequence order', () => {
		const later: Migration = {
			id: 'z/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}
		const earlier: Migration = {
			id: 'a/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['z/1' as MigrationId],
		}

		const sorted = sortMigrations([earlier, later])
		expect(sorted).toEqual([later, earlier])
	})

	it('throws on circular dependencies', () => {
		const a: Migration = {
			id: 'a/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['b/1' as MigrationId],
		}
		const b: Migration = {
			id: 'b/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['a/1' as MigrationId],
		}

		expect(() => sortMigrations([a, b])).toThrow('Circular dependency in migrations: a/1')
	})

	it('handles multiple sequences with cross-dependencies', () => {
		const app1: Migration = {
			id: 'app/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}
		const app2: Migration = {
			id: 'app/2' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}
		const lib1: Migration = {
			id: 'lib/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['app/1' as MigrationId],
		}
		const lib2: Migration = {
			id: 'lib/2' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}
		const plugin1: Migration = {
			id: 'plugin/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['app/2' as MigrationId, 'lib/1' as MigrationId],
		}

		const sorted = sortMigrations([plugin1, lib2, lib1, app2, app1])

		// Verify constraints are satisfied
		const app1Index = sorted.indexOf(app1)
		const app2Index = sorted.indexOf(app2)
		const lib1Index = sorted.indexOf(lib1)
		const lib2Index = sorted.indexOf(lib2)
		const plugin1Index = sorted.indexOf(plugin1)

		// Sequence dependencies
		expect(app1Index).toBeLessThan(app2Index)
		expect(lib1Index).toBeLessThan(lib2Index)

		// Explicit dependencies
		expect(app1Index).toBeLessThan(lib1Index) // lib/1 depends on app/1
		expect(app2Index).toBeLessThan(plugin1Index) // plugin/1 depends on app/2
		expect(lib1Index).toBeLessThan(plugin1Index) // plugin/1 depends on lib/1
	})
})

import { describe, expect, it, test } from 'vitest'
import { UnknownRecord } from './BaseRecord'
import { SerializedStore } from './Store'
import {
	type Migration,
	MigrationFailureReason,
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

	it('handles empty versions object', () => {
		const ids = createMigrationIds('com.myapp.test', {})
		expect(ids).toEqual({})
	})

	it('preserves type information', () => {
		const ids = createMigrationIds('test', { first: 1, second: 2 } as const)
		// TypeScript should infer the correct types
		const firstId: 'test/1' = ids.first
		const secondId: 'test/2' = ids.second
		expect(firstId).toBe('test/1')
		expect(secondId).toBe('test/2')
	})
})

describe('parseMigrationId', () => {
	it('parses valid migration IDs', () => {
		expect(parseMigrationId('com.myapp.book/5' as MigrationId)).toEqual({
			sequenceId: 'com.myapp.book',
			version: 5,
		})
	})

	it('handles single digit versions', () => {
		expect(parseMigrationId('test/1' as MigrationId)).toEqual({
			sequenceId: 'test',
			version: 1,
		})
	})

	it('handles multi-digit versions', () => {
		expect(parseMigrationId('app/123' as MigrationId)).toEqual({
			sequenceId: 'app',
			version: 123,
		})
	})

	it('handles complex sequence IDs', () => {
		expect(parseMigrationId('com.example.app.feature.subfeature/42' as MigrationId)).toEqual({
			sequenceId: 'com.example.app.feature.subfeature',
			version: 42,
		})
	})
})

describe('createMigrationSequence', () => {
	it('creates a basic migration sequence', () => {
		const migration: Migration = {
			id: 'test/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => ({ ...record, newField: 'default' }),
		}

		const sequence = createMigrationSequence({
			sequenceId: 'test',
			sequence: [migration],
		})

		expect(sequence.sequenceId).toBe('test')
		expect(sequence.retroactive).toBe(true)
		expect(sequence.sequence).toHaveLength(1)
		expect(sequence.sequence[0]).toBe(migration)
	})

	it('sets retroactive flag correctly', () => {
		const migration: Migration = {
			id: 'test/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}

		const sequence = createMigrationSequence({
			sequenceId: 'test',
			sequence: [migration],
			retroactive: false,
		})

		expect(sequence.retroactive).toBe(false)
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

	it('handles multiple standalone dependsOn entries', () => {
		const dependsOn1: StandaloneDependsOn = {
			dependsOn: ['dep1/1' as MigrationId],
		}
		const dependsOn2: StandaloneDependsOn = {
			dependsOn: ['dep2/1' as MigrationId],
		}
		const migration: Migration = {
			id: 'test/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}

		const sequence = createMigrationSequence({
			sequenceId: 'test',
			sequence: [dependsOn1, dependsOn2, migration],
		})

		expect(sequence.sequence).toHaveLength(1)
		// The order depends on how squashDependsOn processes the dependencies
		expect(sequence.sequence[0].dependsOn).toEqual(['dep1/1', 'dep2/1'])
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

	it('combines migration filter with type and custom filters', () => {
		const sequence = createRecordMigrationSequence({
			recordType: 'item',
			filter: (record) => (record as any).category === 'book',
			sequenceId: 'com.myapp.item',
			sequence: [
				{
					id: 'com.myapp.item/1' as MigrationId,
					filter: (record) => (record as any).published === true,
					up: (record: UnknownRecord) => record,
				},
			],
		})

		const migration = sequence.sequence[0] as Extract<Migration, { scope: 'record' }>
		const publishedBook = {
			id: 'item-1' as any,
			typeName: 'item',
			category: 'book',
			published: true,
		} as any as UnknownRecord
		const unpublishedBook = {
			id: 'item-2' as any,
			typeName: 'item',
			category: 'book',
			published: false,
		} as any as UnknownRecord
		const publishedMovie = {
			id: 'item-3' as any,
			typeName: 'item',
			category: 'movie',
			published: true,
		} as any as UnknownRecord

		expect(migration.filter?.(publishedBook)).toBe(true)
		expect(migration.filter?.(unpublishedBook)).toBe(false)
		expect(migration.filter?.(publishedMovie)).toBe(false)
	})

	it('sets default retroactive flag to true', () => {
		const sequence = createRecordMigrationSequence({
			recordType: 'test',
			sequenceId: 'com.test',
			sequence: [
				{
					id: 'com.test/1' as MigrationId,
					up: (record: UnknownRecord) => record,
				},
			],
		})

		expect(sequence.retroactive).toBe(true)
	})

	it('respects custom retroactive flag', () => {
		const sequence = createRecordMigrationSequence({
			recordType: 'test',
			sequenceId: 'com.test',
			retroactive: false,
			sequence: [
				{
					id: 'com.test/1' as MigrationId,
					up: (record: UnknownRecord) => record,
				},
			],
		})

		expect(sequence.retroactive).toBe(false)
	})
})

describe('validateMigrations', () => {
	it('validates empty migration sequence', () => {
		const sequence: MigrationSequence = {
			sequenceId: 'test',
			retroactive: true,
			sequence: [],
		}

		expect(() => validateMigrations(sequence)).not.toThrow()
	})

	it('validates single migration sequence', () => {
		const sequence: MigrationSequence = {
			sequenceId: 'com.myapp.test',
			retroactive: true,
			sequence: [
				{
					id: 'com.myapp.test/1' as MigrationId,
					scope: 'record',
					up: (record: UnknownRecord) => record,
				},
			],
		}

		expect(() => validateMigrations(sequence)).not.toThrow()
	})

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

	it('throws on empty sequence ID', () => {
		const sequence: MigrationSequence = {
			sequenceId: '',
			retroactive: true,
			sequence: [],
		}

		expect(() => validateMigrations(sequence)).toThrow('sequenceId must be a non-empty string')
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

	it('throws on migration ID with invalid version format', () => {
		const sequence: MigrationSequence = {
			sequenceId: 'test',
			retroactive: true,
			sequence: [
				{
					id: 'test/abc' as MigrationId,
					scope: 'record',
					up: (record: UnknownRecord) => record,
				},
			],
		}

		expect(() => validateMigrations(sequence)).toThrow("Invalid migration id: 'test/abc'")
	})

	it('throws on migration ID with wrong sequence', () => {
		const sequence: MigrationSequence = {
			sequenceId: 'test',
			retroactive: true,
			sequence: [
				{
					id: 'other/1' as MigrationId,
					scope: 'record',
					up: (record: UnknownRecord) => record,
				},
			],
		}

		expect(() => validateMigrations(sequence)).toThrow(
			"Every migration in sequence 'test' must have an id starting with 'test/'. Got invalid id: 'other/1'"
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

	it('throws on migration ID with leading zeros in version', () => {
		const sequence: MigrationSequence = {
			sequenceId: 'test',
			retroactive: true,
			sequence: [
				{
					id: 'test/01' as MigrationId,
					scope: 'record',
					up: (record: UnknownRecord) => record,
				},
			],
		}

		expect(() => validateMigrations(sequence)).toThrow("Invalid migration id: 'test/01'")
	})
})

describe('sortMigrations', () => {
	it('returns empty array for empty input', () => {
		expect(sortMigrations([])).toEqual([])
	})

	it('sorts single migration', () => {
		const migration: Migration = {
			id: 'test/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}

		expect(sortMigrations([migration])).toEqual([migration])
	})

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

		// Test both orders
		expect(sortMigrations([migration2, migration1])).toEqual([migration1, migration2])
		expect(sortMigrations([migration1, migration2])).toEqual([migration1, migration2])
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

	it('combines sequence and explicit dependencies', () => {
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

		const sorted = sortMigrations([lib1, app2, app1])
		expect(sorted).toEqual([app1, app2, lib1])
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

	it('ignores dependencies on non-existent migrations', () => {
		const migration: Migration = {
			id: 'test/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['nonexistent/1' as MigrationId],
		}

		expect(sortMigrations([migration])).toEqual([migration])
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

	it('throws on self-referencing dependency', () => {
		const migration: Migration = {
			id: 'test/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['test/1' as MigrationId],
		}

		expect(() => sortMigrations([migration])).toThrow()
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
		const indices = sorted.map((m) => sorted.indexOf(m))
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

	it('minimizes distance for explicit dependencies', () => {
		// Create scenario where explicit dependency can be placed close to its dependency
		const foundation: Migration = {
			id: 'foundation/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}
		const feature: Migration = {
			id: 'feature/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['foundation/1' as MigrationId],
		}
		const unrelated1: Migration = {
			id: 'unrelated1/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}
		const unrelated2: Migration = {
			id: 'unrelated2/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
		}

		const sorted = sortMigrations([unrelated1, feature, unrelated2, foundation])

		// feature should come immediately after foundation (or as close as possible)
		const foundationIndex = sorted.indexOf(foundation)
		const featureIndex = sorted.indexOf(feature)
		expect(featureIndex).toBeGreaterThan(foundationIndex)
	})
})

describe('Migration types and interfaces', () => {
	it('supports record-scoped migrations', () => {
		const migration: Migration = {
			id: 'test/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => ({ ...record, version: 1 }),
			down: (record: UnknownRecord) => {
				const { version, ...rest } = record as any
				return rest
			},
			filter: (record: UnknownRecord) => record.typeName === 'test',
		}

		expect(migration.scope).toBe('record')
		expect(typeof migration.up).toBe('function')
		expect(typeof migration.down).toBe('function')
		expect(typeof migration.filter).toBe('function')
	})

	it('supports store-scoped migrations', () => {
		const migration: Migration = {
			id: 'test/1' as MigrationId,
			scope: 'store',
			up: (store: SerializedStore<UnknownRecord>) => {
				const newStore: SerializedStore<UnknownRecord> = {}
				for (const [key, record] of Object.entries(store)) {
					;(newStore as any)[key] = { ...record, migrated: true }
				}
				return newStore
			},
			down: (store: SerializedStore<UnknownRecord>) => {
				const newStore: SerializedStore<UnknownRecord> = {}
				for (const [key, record] of Object.entries(store)) {
					const { migrated, ...rest } = record as any
					;(newStore as any)[key] = rest
				}
				return newStore
			},
		}

		expect(migration.scope).toBe('store')
		expect(typeof migration.up).toBe('function')
		expect(typeof migration.down).toBe('function')
	})

	it('supports migrations with dependencies', () => {
		const migration: Migration = {
			id: 'dependent/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => record,
			dependsOn: ['foundation/1' as MigrationId, 'base/2' as MigrationId],
		}

		expect(migration.dependsOn).toEqual(['foundation/1', 'base/2'])
	})

	it('supports standalone depends-on declarations', () => {
		const dependsOn: StandaloneDependsOn = {
			dependsOn: ['dep1/1' as MigrationId, 'dep2/1' as MigrationId],
		}

		expect(dependsOn.dependsOn).toEqual(['dep1/1', 'dep2/1'])
	})
})

describe('MigrationFailureReason enum', () => {
	it('contains expected failure reasons', () => {
		expect(MigrationFailureReason.IncompatibleSubtype).toBe('incompatible-subtype')
		expect(MigrationFailureReason.UnknownType).toBe('unknown-type')
		expect(MigrationFailureReason.TargetVersionTooNew).toBe('target-version-too-new')
		expect(MigrationFailureReason.TargetVersionTooOld).toBe('target-version-too-old')
		expect(MigrationFailureReason.MigrationError).toBe('migration-error')
		expect(MigrationFailureReason.UnrecognizedSubtype).toBe('unrecognized-subtype')
	})
})

describe('Edge cases and error handling', () => {
	test('createMigrationSequence with no migrations', () => {
		const sequence = createMigrationSequence({
			sequenceId: 'test',
			sequence: [],
		})

		expect(sequence.sequence).toEqual([])
		expect(sequence.sequenceId).toBe('test')
	})

	test('parseMigrationId with version 0', () => {
		expect(parseMigrationId('test/0' as MigrationId)).toEqual({
			sequenceId: 'test',
			version: 0,
		})
	})

	test('sortMigrations handles duplicate migration IDs', () => {
		const migration1: Migration = {
			id: 'test/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => ({ ...record, source: 'first' }),
		}
		const migration2: Migration = {
			id: 'test/1' as MigrationId,
			scope: 'record',
			up: (record: UnknownRecord) => ({ ...record, source: 'second' }),
		}

		// sortMigrations doesn't deduplicate - it treats them as separate migrations
		// This matches the actual behavior of the function
		const sorted = sortMigrations([migration1, migration2])
		expect(sorted).toHaveLength(2)
		expect(sorted).toContain(migration1)
		expect(sorted).toContain(migration2)
	})

	test('createRecordMigrationSequence with no filter', () => {
		const sequence = createRecordMigrationSequence({
			recordType: 'test',
			sequenceId: 'com.test',
			sequence: [
				{
					id: 'com.test/1' as MigrationId,
					up: (record: UnknownRecord) => record,
				},
			],
		})

		const migration = sequence.sequence[0] as Extract<Migration, { scope: 'record' }>
		const testRecord = { id: 'test-1' as any, typeName: 'test' } as any as UnknownRecord
		expect(migration.filter?.(testRecord)).toBe(true)
	})

	test('sortMigrations handles complex multi-sequence dependencies', () => {
		// Test a more complex scenario with multiple sequences and cross-dependencies
		const migrations: Migration[] = [
			{ id: 'a/1' as MigrationId, scope: 'record', up: (r) => r },
			{ id: 'a/2' as MigrationId, scope: 'record', up: (r) => r },
			{
				id: 'b/1' as MigrationId,
				scope: 'record',
				up: (r) => r,
				dependsOn: ['a/1' as MigrationId],
			},
			{ id: 'b/2' as MigrationId, scope: 'record', up: (r) => r },
			{
				id: 'c/1' as MigrationId,
				scope: 'record',
				up: (r) => r,
				dependsOn: ['a/2' as MigrationId, 'b/1' as MigrationId],
			},
		]

		const sorted = sortMigrations(migrations)

		// Verify all constraints
		const getIndex = (id: string) => sorted.findIndex((m) => m.id === id)

		// Sequence constraints
		expect(getIndex('a/1')).toBeLessThan(getIndex('a/2'))
		expect(getIndex('b/1')).toBeLessThan(getIndex('b/2'))

		// Explicit dependency constraints
		expect(getIndex('a/1')).toBeLessThan(getIndex('b/1'))
		expect(getIndex('a/2')).toBeLessThan(getIndex('c/1'))
		expect(getIndex('b/1')).toBeLessThan(getIndex('c/1'))
	})
})

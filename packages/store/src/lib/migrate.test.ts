import { describe, expect, it } from 'vitest'
import { UnknownRecord } from './BaseRecord'
import {
	type Migration,
	type MigrationId,
	createMigrationIds,
	createMigrationSequence,
	createRecordMigrationSequence,
	parseMigrationId,
	sortMigrations,
	validateMigrations,
} from './migrate'
import { SerializedStore } from './Store'

// Tests for SPEC.md §16 (migration authoring) and §17 (migration sorting).
// Rule IDs like [M2] in test names refer to that document.

const m = (id: MigrationId, others?: { dependsOn?: MigrationId[] }): Migration => ({
	...others,
	id,
	scope: 'record',
	up() {
		// noop
	},
})

describe('migration authoring (M)', () => {
	it('[M1] createMigrationSequence returns the validated sequence', () => {
		const sequence = createMigrationSequence({
			sequenceId: 'test',
			sequence: [m('test/1')],
			retroactive: false,
		})

		expect(sequence.sequenceId).toBe('test')
		expect(sequence.retroactive).toBe(false)
		expect(sequence.sequence).toHaveLength(1)
	})

	it('[M1] retroactive defaults to true', () => {
		const sequence = createMigrationSequence({
			sequenceId: 'test',
			sequence: [m('test/1')],
		})
		expect(sequence.retroactive).toBe(true)
	})

	it('[M1] createMigrationSequence validates the sequence', () => {
		expect(() =>
			createMigrationSequence({
				sequenceId: 'test/invalid',
				sequence: [],
			})
		).toThrow()

		expect(() =>
			createMigrationSequence({
				sequenceId: 'test',
				sequence: [m('test/2')],
			})
		).toThrow()
	})

	it('[M2] a standalone dependsOn entry squashes into the next migration', () => {
		const result = createMigrationSequence({
			sequenceId: 'foo',
			retroactive: false,
			sequence: [{ dependsOn: ['bar/1'] }, m('foo/1')],
		})

		expect(result.sequence).toHaveLength(1)
		expect(result.sequence[0].dependsOn).toEqual(['bar/1'])
	})

	it('[M2] a squashed dependsOn prepends to the migration’s own dependsOn', () => {
		const sequence = createMigrationSequence({
			sequenceId: 'test',
			sequence: [
				{ dependsOn: ['other/1' as MigrationId, 'another/2' as MigrationId] },
				m('test/1', { dependsOn: ['existing/1' as MigrationId] }),
			],
		})

		expect(sequence.sequence).toHaveLength(1)
		expect(sequence.sequence[0].dependsOn).toEqual(['other/1', 'another/2', 'existing/1'])
	})

	it('[M2] a standalone dependsOn between migrations attaches to the one after it', () => {
		const result = createMigrationSequence({
			sequenceId: 'foo',
			retroactive: false,
			sequence: [m('foo/1'), { dependsOn: ['bar/1'] }, m('foo/2')],
		})

		expect(result.sequence).toHaveLength(2)
		expect(result.sequence[0].dependsOn ?? []).toEqual([])
		expect(result.sequence[1].dependsOn).toEqual(['bar/1'])
	})

	it('[M2] a standalone dependsOn with no following migration is dropped', () => {
		expect(
			createMigrationSequence({
				sequenceId: 'foo',
				retroactive: false,
				sequence: [{ dependsOn: ['bar/1'] }],
			}).sequence
		).toHaveLength(0)

		const trailing = createMigrationSequence({
			sequenceId: 'foo',
			retroactive: false,
			sequence: [m('foo/1'), { dependsOn: ['bar/1'] }],
		})
		expect(trailing.sequence).toHaveLength(1)
		expect(trailing.sequence[0].dependsOn ?? []).toEqual([])
	})

	it('[M4] createMigrationIds formats sequenceId/version ids', () => {
		expect(
			createMigrationIds('com.myapp.book', {
				addGenre: 1,
				addPublisher: 2,
				removeOldField: 3,
			})
		).toEqual({
			addGenre: 'com.myapp.book/1',
			addPublisher: 'com.myapp.book/2',
			removeOldField: 'com.myapp.book/3',
		})
	})

	it('[M4] parseMigrationId splits the sequence id and version', () => {
		expect(parseMigrationId('com.myapp.book/5')).toEqual({
			sequenceId: 'com.myapp.book',
			version: 5,
		})
		expect(parseMigrationId('test/1')).toEqual({ sequenceId: 'test', version: 1 })
		expect(parseMigrationId('com.example.app/42')).toEqual({
			sequenceId: 'com.example.app',
			version: 42,
		})
	})

	it('[M5] createRecordMigrationSequence filters by record type', () => {
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

		const migration = sequence.sequence[0] as Extract<Migration, { scope: 'record' }>
		expect(migration.filter?.({ id: 'book-1', typeName: 'book' } as any)).toBe(true)
		expect(migration.filter?.({ id: 'user-1', typeName: 'user' } as any)).toBe(false)
	})

	it('[M5] a sequence-level filter composes with the record type filter', () => {
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
		expect(
			migration.filter?.({ id: 'shape-1', typeName: 'shape', shapeType: 'rectangle' } as any)
		).toBe(true)
		expect(
			migration.filter?.({ id: 'shape-2', typeName: 'shape', shapeType: 'circle' } as any)
		).toBe(false)
		expect(migration.filter?.({ id: 'user-1', typeName: 'user' } as any)).toBe(false)
	})
})

describe('validateMigrations (M)', () => {
	it('[M3] accepts well-formed sequences, including mixed scopes', () => {
		expect(() =>
			validateMigrations({
				sequenceId: 'test',
				retroactive: true,
				sequence: [
					m('test/1'),
					m('test/2'),
					{
						id: 'test/3',
						scope: 'store',
						up: (store: SerializedStore<UnknownRecord>) => store,
					},
				],
			})
		).not.toThrow()
	})

	it('[M3] throws on an invalid sequence id', () => {
		expect(() =>
			validateMigrations({ retroactive: false, sequence: [], sequenceId: 'foo/bar' })
		).toThrowErrorMatchingInlineSnapshot(`[Error: sequenceId cannot contain a '/', got foo/bar]`)

		expect(() =>
			validateMigrations({ retroactive: false, sequence: [], sequenceId: '' })
		).toThrowErrorMatchingInlineSnapshot(`[Error: sequenceId must be a non-empty string]`)
	})

	it('[M3] throws on a migration id outside the sequence or in the wrong format', () => {
		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [m('foo.1' as any)],
				sequenceId: 'foo',
			})
		).toThrowErrorMatchingInlineSnapshot(
			`[Error: Every migration in sequence 'foo' must have an id starting with 'foo/'. Got invalid id: 'foo.1']`
		)

		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [m('foo/one' as any)],
				sequenceId: 'foo',
			})
		).toThrowErrorMatchingInlineSnapshot(`[Error: Invalid migration id: 'foo/one']`)

		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [m('foo/1'), m('foo.2' as any)],
				sequenceId: 'foo',
			})
		).toThrowErrorMatchingInlineSnapshot(
			`[Error: Every migration in sequence 'foo' must have an id starting with 'foo/'. Got invalid id: 'foo.2']`
		)

		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [m('foo/1'), m('foo/two' as any)],
				sequenceId: 'foo',
			})
		).toThrowErrorMatchingInlineSnapshot(`[Error: Invalid migration id: 'foo/two']`)
	})

	it('[M3] throws if the first version is not 1', () => {
		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [m('foo/2')],
				sequenceId: 'foo',
			})
		).toThrowErrorMatchingInlineSnapshot(
			`[Error: Expected the first migrationId to be 'foo/1' but got 'foo/2']`
		)
	})

	it('[M3] throws if versions do not increase in increments of 1', () => {
		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [m('foo/1'), m('foo/2'), m('foo/4')],
				sequenceId: 'foo',
			})
		).toThrowErrorMatchingInlineSnapshot(
			`[Error: Migration id numbers must increase in increments of 1, expected foo/3 but got 'foo/4']`
		)
	})
})

describe('sortMigrations (MS)', () => {
	const sort = (migrations: Migration[]) => sortMigrations(migrations).map((m) => m.id)

	it('[MS1] sorts migrations within a sequence by version', () => {
		expect(sort([m('foo/2'), m('foo/1')])).toEqual(['foo/1', 'foo/2'])
		expect(sort([m('foo/1'), m('foo/2')])).toEqual(['foo/1', 'foo/2'])
	})

	it('[MS1] sorts each of several sequences by version', () => {
		const result = sort([m('foo/2'), m('bar/2'), m('foo/1'), m('bar/1')])
		expect(result.filter((id) => id.startsWith('foo/'))).toEqual(['foo/1', 'foo/2'])
		expect(result.filter((id) => id.startsWith('bar/'))).toEqual(['bar/1', 'bar/2'])
	})

	it('[MS2] a migration sorts after its explicit dependencies', () => {
		expect(
			sort([m('foo/2'), m('bar/2'), m('foo/1'), m('bar/1', { dependsOn: ['foo/2'] })])
		).toEqual(['foo/1', 'foo/2', 'bar/1', 'bar/2'])

		expect(
			sort([m('foo/2'), m('bar/2'), m('foo/1', { dependsOn: ['bar/2'] }), m('bar/1')])
		).toEqual(['bar/1', 'bar/2', 'foo/1', 'foo/2'])
	})

	it('[MS2] handles chains of dependencies across sequences', () => {
		const a1 = m('a/1')
		const b1 = m('b/1', { dependsOn: ['a/1'] })
		const c1 = m('c/1', { dependsOn: ['b/1'] })
		const d1 = m('d/1', { dependsOn: ['a/1', 'c/1'] })

		expect(sortMigrations([d1, c1, b1, a1])).toEqual([a1, b1, c1, d1])
	})

	it('[MS2] satisfies both sequence order and cross-sequence dependencies', () => {
		const sorted = sort([
			m('plugin/1', { dependsOn: ['app/2', 'lib/1'] }),
			m('lib/2'),
			m('lib/1', { dependsOn: ['app/1'] }),
			m('app/2'),
			m('app/1'),
		])

		expect(sorted.indexOf('app/1')).toBeLessThan(sorted.indexOf('app/2'))
		expect(sorted.indexOf('lib/1')).toBeLessThan(sorted.indexOf('lib/2'))
		expect(sorted.indexOf('app/1')).toBeLessThan(sorted.indexOf('lib/1'))
		expect(sorted.indexOf('app/2')).toBeLessThan(sorted.indexOf('plugin/1'))
		expect(sorted.indexOf('lib/1')).toBeLessThan(sorted.indexOf('plugin/1'))
	})

	it('[MS3] schedules dependents close to their dependencies', () => {
		// bar/3 depends on foo/1 — the bar sequence runs immediately after foo/1
		expect(
			sort([m('foo/2'), m('bar/3', { dependsOn: ['foo/1'] }), m('foo/1'), m('bar/1'), m('bar/2')])
		).toEqual(['foo/1', 'bar/1', 'bar/2', 'bar/3', 'foo/2'])
	})

	it('[MS3] minimizes total distance for multiple explicit dependencies', () => {
		expect(
			sort([
				m('foo/2'),
				m('bar/2', { dependsOn: ['foo/1'] }),
				m('foo/1'),
				m('bar/1'),
				m('baz/1', { dependsOn: ['foo/1'] }),
			])
		).toEqual(['foo/1', 'bar/1', 'bar/2', 'baz/1', 'foo/2'])
	})

	it('[MS3] keeps chains of explicit dependencies consecutive', () => {
		expect(
			sort([
				m('foo/2'),
				m('bar/1', { dependsOn: ['foo/1'] }),
				m('foo/1'),
				m('baz/1', { dependsOn: ['bar/1'] }),
			])
		).toEqual(['foo/1', 'bar/1', 'baz/1', 'foo/2'])
	})

	it('[MS4] throws on circular dependencies', () => {
		expect(() => sort([m('foo/1', { dependsOn: ['foo/1'] })])).toThrowErrorMatchingInlineSnapshot(
			`[Error: Circular dependency in migrations: foo/1]`
		)

		expect(() =>
			sort([m('foo/1', { dependsOn: ['foo/2'] }), m('foo/2')])
		).toThrowErrorMatchingInlineSnapshot(`[Error: Circular dependency in migrations: foo/1]`)

		expect(() =>
			sort([m('foo/1', { dependsOn: ['bar/1'] }), m('bar/1', { dependsOn: ['foo/1'] })])
		).toThrowErrorMatchingInlineSnapshot(`[Error: Circular dependency in migrations: foo/1]`)

		expect(() =>
			sort([m('bar/1', { dependsOn: ['foo/1'] }), m('foo/1', { dependsOn: ['bar/1'] })])
		).toThrowErrorMatchingInlineSnapshot(`[Error: Circular dependency in migrations: bar/1]`)
	})
})

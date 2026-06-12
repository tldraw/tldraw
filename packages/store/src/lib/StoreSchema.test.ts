/* eslint-disable @typescript-eslint/no-deprecated -- serializeEarliestVersion (SC3) is part of the tested contract */
import { assert } from '@tldraw/utils'
import { describe, expect, it, test, vi } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import {
	createMigrationSequence,
	Migration,
	MigrationSequence,
	SynchronousStorage,
} from './migrate'
import { createRecordType } from './RecordType'
import { SerializedStore, Store } from './Store'
import {
	SerializedSchema,
	SerializedSchemaV1,
	SerializedSchemaV2,
	StoreSchema,
	upgradeSchema,
} from './StoreSchema'
import { testSchemaV0 } from './test/testSchema.v0'
import { testSchemaV1 } from './test/testSchema.v1'

// Tests for SPEC.md §15 (schema), §18 (migration selection), §19 (applying migrations to
// records), and §20 (applying migrations to snapshots and storage). Rule IDs like [MG4] in
// test names refer to that document.

interface Book extends BaseRecord<'book', RecordId<Book>> {
	title: string
}

const Book = createRecordType<Book>('book', {
	validator: { validate: (book) => book as Book },
	scope: 'document',
})

const noopMigration = (id: `${string}/${number}`, dependsOn?: string[]): Migration => ({
	id,
	scope: 'record',
	dependsOn: dependsOn as any,
	up: (r) => r,
})

describe('schema creation (SC)', () => {
	it('[SC1] throws for duplicate migration sequence ids', () => {
		const migration1 = createMigrationSequence({
			sequenceId: 'com.tldraw.book',
			sequence: [noopMigration('com.tldraw.book/1')],
		})
		const migration2 = createMigrationSequence({
			sequenceId: 'com.tldraw.book',
			sequence: [noopMigration('com.tldraw.book/1')],
		})

		expect(() => {
			StoreSchema.create({ book: Book }, { migrations: [migration1, migration2] })
		}).toThrow('Duplicate migration sequenceId com.tldraw.book')
	})

	it('[SC1] throws for invalid migration sequences', () => {
		expect(() => {
			StoreSchema.create(
				{ book: Book },
				{
					migrations: [
						{
							sequenceId: 'com.tldraw.book',
							retroactive: true,
							sequence: [noopMigration('com.tldraw.book/2')],
						},
					],
				}
			)
		}).toThrow()
	})

	it('[SC1] throws when a dependsOn references a missing migration', () => {
		expect(() => {
			StoreSchema.create(
				{},
				{
					migrations: [
						{
							sequenceId: 'foo',
							retroactive: false,
							sequence: [noopMigration('foo/1', ['bar/1'])],
						},
					],
				}
			)
		}).toThrowErrorMatchingInlineSnapshot(
			`[Error: Migration 'foo/1' depends on missing migration 'bar/1']`
		)
	})

	it('[MS1] [MS2] sortedMigrations is sorted regardless of registration order', () => {
		const foo: MigrationSequence = {
			sequenceId: 'foo',
			retroactive: false,
			sequence: [noopMigration('foo/1', ['bar/1'])],
		}
		const bar: MigrationSequence = {
			sequenceId: 'bar',
			retroactive: false,
			sequence: [noopMigration('bar/1')],
		}
		const s = StoreSchema.create({}, { migrations: [foo, bar] })
		const s2 = StoreSchema.create({}, { migrations: [bar, foo] })

		expect(s.sortedMigrations.map((m) => m.id)).toEqual(['bar/1', 'foo/1'])
		expect(s2.sortedMigrations).toEqual(s.sortedMigrations)
	})

	it('[SC1] a standalone dependsOn entry participates in dependency checking', () => {
		expect(() => {
			StoreSchema.create(
				{},
				{
					migrations: [
						createMigrationSequence({
							sequenceId: 'foo',
							retroactive: false,
							sequence: [{ dependsOn: ['bar/1'] }, noopMigration('foo/1')],
						}),
					],
				}
			)
		}).toThrowErrorMatchingInlineSnapshot(
			`[Error: Migration 'foo/1' depends on missing migration 'bar/1']`
		)
	})

	it('[SC2] serialize maps each sequence to the version of its last migration', () => {
		const schema = StoreSchema.create(
			{ book: Book },
			{
				migrations: [
					createMigrationSequence({
						sequenceId: 'com.tldraw.book',
						sequence: [noopMigration('com.tldraw.book/1'), noopMigration('com.tldraw.book/2')],
					}),
					createMigrationSequence({
						sequenceId: 'com.tldraw.author',
						sequence: [noopMigration('com.tldraw.author/1')],
					}),
				],
			}
		)

		expect(schema.serialize()).toEqual({
			schemaVersion: 2,
			sequences: {
				'com.tldraw.book': 2,
				'com.tldraw.author': 1,
			},
		})
	})

	it('[SC2] an empty sequence serializes as version 0; no sequences serialize as {}', () => {
		const schema = StoreSchema.create(
			{ book: Book },
			{
				migrations: [createMigrationSequence({ sequenceId: 'com.tldraw.book', sequence: [] })],
			}
		)
		expect(schema.serialize()).toEqual({
			schemaVersion: 2,
			sequences: { 'com.tldraw.book': 0 },
		})

		expect(testSchemaV0.serialize()).toEqual({ schemaVersion: 2, sequences: {} })
		expect(testSchemaV1.serialize()).toEqual({
			schemaVersion: 2,
			sequences: {
				'com.tldraw.shape': 2,
				'com.tldraw.shape.oval': 1,
				'com.tldraw.shape.rectangle': 1,
				'com.tldraw.store': 1,
				'com.tldraw.user': 2,
			},
		})
	})

	it('[SC3] serializeEarliestVersion maps every sequence to version 0', () => {
		expect(testSchemaV1.serializeEarliestVersion()).toEqual({
			schemaVersion: 2,
			sequences: {
				'com.tldraw.shape': 0,
				'com.tldraw.shape.oval': 0,
				'com.tldraw.shape.rectangle': 0,
				'com.tldraw.store': 0,
				'com.tldraw.user': 0,
			},
		})
	})

	it('[SC4] getType returns the record type and throws for unknown names', () => {
		const schema = StoreSchema.create({ book: Book })
		expect(schema.getType('book')).toBe(Book)
		expect(() => schema.getType('nonexistent')).toThrow('record type does not exist')
	})
})

describe('validateRecord (V)', () => {
	const StrictBook = createRecordType<Book>('book', {
		validator: {
			validate: (book) => {
				if (!(book as Book).title) {
					throw new Error('Missing required fields')
				}
				return book as Book
			},
		},
		scope: 'document',
	})

	it('[V1] a validation error propagates when there is no failure handler', () => {
		const schema = StoreSchema.create({ book: StrictBook })
		const store = new Store({ schema, props: {} })

		const invalidBook = { id: StrictBook.createId(), typeName: 'book' as const } as any

		expect(() => {
			schema.validateRecord(store, invalidBook, 'createRecord', null)
		}).toThrow('Missing required fields')
	})

	it('[V1] throws for an unknown record type', () => {
		const schema = StoreSchema.create({ book: Book })
		const store = new Store({ schema, props: {} })

		expect(() => {
			schema.validateRecord(
				store,
				{ id: 'unknown:1', typeName: 'unknown' } as any,
				'createRecord',
				null
			)
		}).toThrow('Missing definition for record type unknown')
	})

	it('[V4] the validation failure handler receives the context and its return value is used', () => {
		const fixedBook = {
			id: Book.createId(),
			typeName: 'book' as const,
			title: 'Fixed Title',
		}
		const onValidationFailure = vi.fn().mockReturnValue(fixedBook)

		const schema = StoreSchema.create({ book: StrictBook }, { onValidationFailure })
		const store = new Store({ schema, props: {} })

		const invalidBook = { id: StrictBook.createId(), typeName: 'book' as const } as any
		const result = schema.validateRecord(store, invalidBook, 'createRecord', null)

		expect(onValidationFailure).toHaveBeenCalledWith({
			store,
			record: invalidBook,
			phase: 'createRecord',
			recordBefore: null,
			error: expect.any(Error),
		})
		expect(result).toBe(fixedBook)
	})
})

describe('upgradeSchema (SC)', () => {
	it('[SC5] upgrades a v1 schema to v2', () => {
		const v1: SerializedSchemaV1 = {
			schemaVersion: 1,
			storeVersion: 4,
			recordVersions: {
				asset: {
					version: 1,
					subTypeKey: 'type',
					subTypeVersions: { image: 2, video: 2, bookmark: 0 },
				},
				camera: { version: 1 },
				shape: {
					version: 3,
					subTypeKey: 'type',
					subTypeVersions: { group: 0, text: 1 },
				},
			},
		}

		expect(upgradeSchema(v1)).toEqual({
			ok: true,
			value: {
				schemaVersion: 2,
				sequences: {
					'com.tldraw.store': 4,
					'com.tldraw.asset': 1,
					'com.tldraw.asset.image': 2,
					'com.tldraw.asset.video': 2,
					'com.tldraw.asset.bookmark': 0,
					'com.tldraw.camera': 1,
					'com.tldraw.shape': 3,
					'com.tldraw.shape.group': 0,
					'com.tldraw.shape.text': 1,
				},
			},
		})
	})

	it('[SC5] passes v2 schemas through unchanged', () => {
		const v2: SerializedSchemaV2 = { schemaVersion: 2, sequences: { foo: 1 } }
		const result = upgradeSchema(v2)
		assert(result.ok)
		expect(result.value).toBe(v2)
	})

	it('[SC5] rejects unknown schema versions', () => {
		expect(upgradeSchema({ schemaVersion: 3 } as any).ok).toBe(false)
		expect(upgradeSchema({ schemaVersion: 0 } as any).ok).toBe(false)
	})
})

const mockSequence = ({
	id,
	retroactive,
	versions,
	filter,
}: {
	id: string
	retroactive: boolean
	versions: number
	filter?(r: TestRecordType): boolean
}): MigrationSequence => ({
	sequenceId: id,
	retroactive,
	sequence: new Array(versions).fill(0).map((_, i) => ({
		id: `${id}/${i + 1}`,
		scope: 'record',
		filter: filter as any,
		up(r) {
			const record = r as TestRecordType
			record.versions[id] ??= 0
			record.versions[id]++
		},
		down(r) {
			const record = r as TestRecordType
			record.versions[id]--
		},
	})),
})

interface TestRecordType extends BaseRecord<'test', RecordId<TestRecordType>> {
	versions: Record<string, number>
}
const TestRecordType = createRecordType<TestRecordType>('test', {
	scope: 'document',
})

const makeSchema = (migrations: MigrationSequence[]) =>
	StoreSchema.create({ test: TestRecordType }, { migrations })

const makePersistedSchema = (...args: Array<[migrations: MigrationSequence, version: number]>) =>
	({
		schemaVersion: 2,
		sequences: Object.fromEntries(args.map(([m, v]) => [m.sequenceId, v])),
	}) satisfies SerializedSchemaV2

const makeTestRecord = (persistedSchema: SerializedSchemaV2) =>
	TestRecordType.create({
		versions: Object.fromEntries(
			Object.keys(persistedSchema.sequences).map((id) => [id, persistedSchema.sequences[id]])
		),
	})

describe('getMigrationsSince (MG)', () => {
	function getMigrationsBetween(
		serialized: SerializedSchemaV2['sequences'],
		current: MigrationSequence[]
	) {
		const schema = StoreSchema.create({}, { migrations: current })
		const ms = schema.getMigrationsSince({ schemaVersion: 2, sequences: serialized })
		if (!ms.ok) {
			throw new Error('Expected migrations to be found')
		}
		return ms.value.map((m) => m.id)
	}

	it('[MG1] returns the migrations after the persisted version, in order', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
		const ids = getMigrationsBetween({ foo: 1, bar: 1 }, [foo, bar])

		expect(ids.filter((id) => id.startsWith('foo'))).toEqual(['foo/2'])
		expect(ids.filter((id) => id.startsWith('bar'))).toEqual(['bar/2', 'bar/3'])
	})

	it('[MG1] a persisted version of 0 selects the whole sequence', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })

		const ids = getMigrationsBetween({ foo: 0, bar: 0 }, [foo, bar])
		expect(ids.filter((id) => id.startsWith('foo'))).toEqual(['foo/1', 'foo/2'])
		expect(ids.filter((id) => id.startsWith('bar'))).toEqual(['bar/1', 'bar/2', 'bar/3'])
	})

	it('[MG2] sequences at the current version contribute nothing', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
		expect(getMigrationsBetween({ foo: 2, bar: 3 }, [foo, bar])).toEqual([])

		const emptyFoo = mockSequence({ id: 'foo', retroactive: true, versions: 0 })
		const emptyBar = mockSequence({ id: 'bar', retroactive: false, versions: 0 })
		expect(getMigrationsBetween({ foo: 0, bar: 0 }, [emptyFoo, emptyBar])).toEqual([])
	})

	it('[MG3] sequences unknown to the current schema are ignored', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		expect(getMigrationsBetween({ foo: 2, someoneElses: 1 }, [foo])).toEqual([])
	})

	it('[MG4] a sequence missing from the persisted schema is included in full iff retroactive', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })

		const ids = getMigrationsBetween({}, [foo, bar])
		expect(ids.filter((id) => id.startsWith('foo'))).toEqual(['foo/1', 'foo/2'])
		expect(ids.filter((id) => id.startsWith('bar'))).toEqual([])

		const allRetroactive = getMigrationsBetween({}, [
			mockSequence({ id: 'foo', retroactive: true, versions: 2 }),
			mockSequence({ id: 'bar', retroactive: true, versions: 3 }),
		])
		expect(allRetroactive.filter((id) => id.startsWith('bar'))).toEqual(['bar/1', 'bar/2', 'bar/3'])

		expect(
			getMigrationsBetween({}, [
				mockSequence({ id: 'foo', retroactive: false, versions: 2 }),
				mockSequence({ id: 'bar', retroactive: false, versions: 3 }),
			])
		).toEqual([])
	})

	it('[MG5] a persisted version missing from the sequence is an error', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		const schema = StoreSchema.create({}, { migrations: [foo] })

		const result = schema.getMigrationsSince({ schemaVersion: 2, sequences: { foo: 999 } })
		assert(!result.ok)
		expect(result.error).toBe('Incompatible schema?')
	})

	it('[MG6] results are cached per persisted-schema object identity', () => {
		const schema = makeSchema([mockSequence({ id: 'foo', retroactive: true, versions: 2 })])
		const oldSchema = schema.serializeEarliestVersion()

		const migrations1 = schema.getMigrationsSince(oldSchema)
		assert(migrations1.ok)
		expect(migrations1.value).toHaveLength(2)

		const migrations2 = schema.getMigrationsSince(oldSchema)
		assert(migrations2.ok)
		expect(migrations2.value).toBe(migrations1.value)

		// a structurally identical but distinct object misses the cache
		const equivalent = structuredClone(oldSchema) as SerializedSchema
		const migrations3 = schema.getMigrationsSince(equivalent)
		assert(migrations3.ok)
		expect(migrations3.value).not.toBe(migrations1.value)
		expect(migrations3.value).toEqual(migrations1.value)
	})

	it('[MG6] empty and error results are cached too', () => {
		const schema = makeSchema([])
		const oldSchema = schema.serializeEarliestVersion()

		const empty1 = schema.getMigrationsSince(oldSchema)
		const empty2 = schema.getMigrationsSince(oldSchema)
		assert(empty1.ok && empty2.ok)
		expect(empty2.value).toBe(empty1.value)
		expect(empty1.value).toHaveLength(0)

		const incompatible: SerializedSchema = {
			schemaVersion: 1,
			storeVersion: 1,
			recordVersions: { test: { version: 999 } },
		}
		const schemaWithMigrations = makeSchema([
			{
				sequenceId: 'com.tldraw.test',
				retroactive: true,
				sequence: [noopMigration('com.tldraw.test/1')],
			},
		])
		const err1 = schemaWithMigrations.getMigrationsSince(incompatible)
		const err2 = schemaWithMigrations.getMigrationsSince(incompatible)
		expect(err1.ok).toBe(false)
		expect(err2).toBe(err1)
	})

	it('[MG7] v1 persisted schemas are upgraded before comparison', () => {
		const userSequence = mockSequence({ id: 'com.tldraw.user', retroactive: false, versions: 2 })
		const schema = StoreSchema.create({}, { migrations: [userSequence] })

		const v1Schema: SerializedSchema = {
			schemaVersion: 1,
			storeVersion: 1,
			recordVersions: { user: { version: 1 } },
		}

		const result = schema.getMigrationsSince(v1Schema)
		assert(result.ok)
		expect(result.value.map((m) => m.id)).toEqual(['com.tldraw.user/2'])
	})
})

describe('migratePersistedRecord (MP)', () => {
	it('[MP1] applies the needed migrations without mutating the input', () => {
		const foo = mockSequence({ id: 'foo', retroactive: false, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
		const schema = makeSchema([foo, bar])
		const persistedSchema = makePersistedSchema([foo, 0], [bar, 0])

		const r = makeTestRecord(persistedSchema)
		expect(r.versions).toEqual({ foo: 0, bar: 0 })
		const update = schema.migratePersistedRecord(r, persistedSchema)
		assert(update.type === 'success', 'the update should be successful')

		// the original record did not change
		expect(r.versions).toEqual({ foo: 0, bar: 0 })

		// the updated record has the new versions
		expect((update.value as TestRecordType).versions).toEqual({ foo: 2, bar: 3 })
	})

	it('[MP1] retroactivity applies per MG4 when the persisted schema lacks the sequence', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
		const schema = makeSchema([foo, bar])
		const persistedSchema = makePersistedSchema()

		const r = makeTestRecord(persistedSchema)
		const update = schema.migratePersistedRecord(r, persistedSchema)
		assert(update.type === 'success', 'the update should be successful')
		expect((update.value as TestRecordType).versions).toEqual({ foo: 2 })
	})

	it('[MP2] with no migrations to apply, the input record is returned as the value', () => {
		const foo = mockSequence({ id: 'foo', retroactive: false, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
		const schema = makeSchema([foo, bar])
		const persistedSchema = makePersistedSchema([foo, 2], [bar, 3])

		const r = makeTestRecord(persistedSchema)

		const up = schema.migratePersistedRecord(r, persistedSchema)
		assert(up.type === 'success')
		expect(up.value).toBe(r)

		const down = schema.migratePersistedRecord(r, persistedSchema, 'down')
		assert(down.type === 'success')
		expect(down.value).toBe(r)
	})

	it('[MP3] a migrator may mutate in place or return a new record', () => {
		const foo = mockSequence({ id: 'foo', retroactive: false, versions: 3 })
		foo.sequence[1] = {
			id: 'foo/2',
			scope: 'record',
			up(r) {
				const record = r as TestRecordType
				return { ...record, versions: { ...record.versions, foo: 2 } }
			},
			down(r) {
				const record = r as TestRecordType
				return { ...record, versions: { ...record.versions, foo: 1 } }
			},
		}
		const schema = makeSchema([foo])
		const v0Schema = makePersistedSchema([foo, 0])

		const r0 = makeTestRecord(v0Schema)
		const r3 = makeTestRecord(schema.serialize())
		const update = schema.migratePersistedRecord(r0, v0Schema, 'up')
		assert(update.type === 'success', 'the update should be successful')
		expect((update.value as TestRecordType).versions).toEqual({ foo: 3 })
		const update2 = schema.migratePersistedRecord(r3, v0Schema, 'down')
		assert(update2.type === 'success', 'the update should be successful')
		expect((update2.value as TestRecordType).versions).toEqual({ foo: 0 })
	})

	it('[MP4] a migration filter skips non-matching records', () => {
		const foo = mockSequence({
			id: 'foo',
			retroactive: false,
			versions: 2,
			filter: (r) => (r as any).foo === true,
		})
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
		const schema = makeSchema([foo, bar])
		const persistedSchema = makePersistedSchema([foo, 0], [bar, 0])

		const r = makeTestRecord(persistedSchema)
		const update = schema.migratePersistedRecord(r, persistedSchema, 'up')
		assert(update.type === 'success', 'the update should be successful')

		// foo migrations were not applied
		expect((update.value as TestRecordType).versions).toEqual({ foo: 0, bar: 3 })

		const r2 = { ...r, foo: true }
		const update2 = schema.migratePersistedRecord(r2, persistedSchema, 'up')
		assert(update2.type === 'success', 'the update should be successful')

		// foo migrations were applied
		expect((update2.value as TestRecordType).versions).toEqual({ foo: 2, bar: 3 })
	})

	it('[MP5] errors when a store-scope migration is in the path', () => {
		const foo = mockSequence({ id: 'foo', retroactive: false, versions: 3 })
		foo.sequence[1] = {
			id: 'foo/2',
			scope: 'store',
			up() {
				// noop
			},
			down() {
				// noop
			},
		}
		const schema = makeSchema([foo])
		const v0Schema = makePersistedSchema([foo, 0])

		const r0 = makeTestRecord(v0Schema)
		const r3 = makeTestRecord(schema.serialize())
		expect(schema.migratePersistedRecord(r0, v0Schema, 'up')).toMatchObject({
			type: 'error',
			reason: 'target-version-too-new',
		})
		expect(schema.migratePersistedRecord(r3, v0Schema, 'down')).toMatchObject({
			type: 'error',
			reason: 'target-version-too-old',
		})

		// migrating a whole snapshot still works
		const update3 = schema.migrateStoreSnapshot({
			schema: v0Schema,
			store: { [r0.id]: r0 },
		})
		assert(update3.type === 'success', 'the update should be successful')
		expect((update3.value[r0.id] as TestRecordType).versions).toEqual({ foo: 2 })
	})

	it('[MP6] going down requires every migration to have a down migrator', () => {
		const foo = mockSequence({ id: 'foo', retroactive: false, versions: 3 })
		delete (foo.sequence[1] as any).down
		const schema = makeSchema([foo])
		const v0Schema = makePersistedSchema([foo, 0])

		// going up still works
		const r0 = makeTestRecord(v0Schema)
		expect(schema.migratePersistedRecord(r0, v0Schema, 'up').type).toBe('success')

		// going down does not
		const r3 = makeTestRecord(schema.serialize())
		expect(schema.migratePersistedRecord(r3, v0Schema, 'down')).toMatchObject({
			type: 'error',
			reason: 'target-version-too-old',
		})
	})

	it('[MP6] going down applies down migrators in reverse and restores the old shape', () => {
		const foo = mockSequence({ id: 'foo', retroactive: false, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
		const schema = makeSchema([foo, bar])
		const persistedSchema = makePersistedSchema([foo, 0], [bar, 0])

		const r = makeTestRecord(schema.serialize())
		expect(r.versions).toEqual({ foo: 2, bar: 3 })
		const downgrade = schema.migratePersistedRecord(r, persistedSchema, 'down')
		assert(downgrade.type === 'success', 'the downgrade should be successful')

		expect(r.versions).toEqual({ foo: 2, bar: 3 })
		expect((downgrade.value as TestRecordType).versions).toEqual({ foo: 0, bar: 0 })
	})

	it('[MP6] going down ignores sequences the persisted schema does not know unless retroactive', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
		const schema = makeSchema([foo, bar])
		const persistedSchema = makePersistedSchema()

		const r = makeTestRecord(schema.serialize())
		expect(r.versions).toEqual({ foo: 2, bar: 3 })
		const downgrade = schema.migratePersistedRecord(r, persistedSchema, 'down')
		assert(downgrade.type === 'success', 'the downgrade should be successful')

		// only the foo migrations were undone
		expect((downgrade.value as TestRecordType).versions).toEqual({ foo: 0, bar: 3 })
	})

	it('[MP7] a throwing migrator produces a migration-error result', () => {
		const foo: MigrationSequence = {
			sequenceId: 'foo',
			retroactive: true,
			sequence: [
				{
					id: 'foo/1',
					scope: 'record',
					up() {
						throw new Error('boom')
					},
				},
			],
		}
		const schema = makeSchema([foo])
		const v0Schema = makePersistedSchema([foo, 0])

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const r = makeTestRecord(v0Schema)
		expect(schema.migratePersistedRecord(r, v0Schema, 'up')).toMatchObject({
			type: 'error',
			reason: 'migration-error',
		})
		consoleSpy.mockRestore()
	})
})

describe('migrateStoreSnapshot (MA)', () => {
	test('[MA1] migrates every record in a snapshot, including v1 schemas with subtypes', () => {
		const serializedStore: SerializedStore<any> = {
			'user-1': {
				id: 'user-1',
				typeName: 'user',
				name: 'name',
			},
			'shape-1': {
				id: 'shape-1',
				typeName: 'shape',
				x: 0,
				y: 0,
				type: 'rectangle',
				props: {
					width: 100,
					height: 100,
				},
			},
			'org-1': {
				id: 'org-1',
				typeName: 'org',
				name: 'tldraw',
			},
		}

		const result = testSchemaV1.migrateStoreSnapshot({
			store: serializedStore,
			schema: testSchemaV0.serialize(),
		})

		assert(result.type === 'success', 'Migration failed')

		// users and shapes are migrated; the store-scope migration removed the org record
		expect(result.value).toEqual({
			'shape-1': {
				id: 'shape-1',
				typeName: 'shape',
				x: 0,
				y: 0,
				type: 'rectangle',
				parentId: null,
				rotation: 0,
				props: {
					width: 100,
					height: 100,
					opacity: 1,
				},
			},
			'user-1': {
				id: 'user-1',
				typeName: 'user',
				name: 'name',
				locale: 'en',
				phoneNumber: null,
			},
		})
	})

	it('[MA1] does not modify the input snapshot by default; mutateInputStore mutates in place', () => {
		const migrations = [
			createMigrationSequence({
				sequenceId: 'com.tldraw.test',
				sequence: [
					{
						id: 'com.tldraw.test/1',
						scope: 'record',
						up: (record: any) => {
							record.version = 2
						},
					},
				],
			}),
		]
		const schema = StoreSchema.create({ test: TestRecordType }, { migrations })
		const oldSchema = schema.serializeEarliestVersion()

		const store1: any = {
			test1: { id: 'test1', version: 1, typeName: 'test', versions: {} },
		}
		const result1 = schema.migrateStoreSnapshot({ store: store1, schema: oldSchema })
		assert(result1.type === 'success')
		expect((result1.value as any).test1.version).toBe(2)
		expect(store1.test1.version).toBe(1) // input untouched

		const store2: any = {
			test1: { id: 'test1', version: 1, typeName: 'test', versions: {} },
		}
		const result2 = schema.migrateStoreSnapshot(
			{ store: store2, schema: oldSchema },
			{ mutateInputStore: true }
		)
		assert(result2.type === 'success')
		expect(result2.value).toBe(store2)
		expect(store2.test1.version).toBe(2)
	})

	it('[MA2] a snapshot needing no migrations is returned as-is', () => {
		const schema = makeSchema([])
		const store: SerializedStore<TestRecordType> = {
			[TestRecordType.createId('a')]: makeTestRecord({ schemaVersion: 2, sequences: {} }),
		} as any

		const result = schema.migrateStoreSnapshot({ store, schema: schema.serialize() })
		assert(result.type === 'success')
		expect(result.value).toBe(store)
	})

	it('[MA6] a throwing migrator produces a migration-error result', () => {
		const foo: MigrationSequence = {
			sequenceId: 'foo',
			retroactive: true,
			sequence: [
				{
					id: 'foo/1',
					scope: 'record',
					up() {
						throw new Error('boom')
					},
				},
			],
		}
		const schema = makeSchema([foo])

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const result = schema.migrateStoreSnapshot({
			store: {
				[TestRecordType.createId('a')]: makeTestRecord({ schemaVersion: 2, sequences: {} }),
			} as any,
			schema: makePersistedSchema([foo, 0]),
		})
		expect(result).toMatchObject({ type: 'error', reason: 'migration-error' })
		consoleSpy.mockRestore()
	})

	it('[MA6] an unknown record type encountered during migration is an error', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 1 })
		const schema = makeSchema([foo])

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const result = schema.migrateStoreSnapshot({
			store: { 'mystery:1': { id: 'mystery:1', typeName: 'mystery' } } as any,
			schema: makePersistedSchema([foo, 0]),
		})
		expect(result).toMatchObject({ type: 'error', reason: 'migration-error' })
		consoleSpy.mockRestore()
	})

	it('[MA5] non-document records are dropped when migrations apply, kept when none apply', () => {
		interface SessionThing extends BaseRecord<'sessionThing', RecordId<SessionThing>> {
			label: string
		}
		const SessionThing = createRecordType<SessionThing>('sessionThing', {
			scope: 'session',
		}).withDefaultProperties(() => ({ label: '' }))

		const foo: MigrationSequence = {
			sequenceId: 'foo',
			retroactive: true,
			sequence: [
				{ id: 'foo/1', scope: 'record', filter: (r) => r.typeName === 'test', up: (r) => r },
			],
		}
		const schema = StoreSchema.create(
			{ test: TestRecordType, sessionThing: SessionThing },
			{ migrations: [foo] }
		)

		const sessionRecord = SessionThing.create({ id: SessionThing.createId('s') })
		const testRecord = makeTestRecord({ schemaVersion: 2, sequences: {} })
		const store = {
			[sessionRecord.id]: sessionRecord,
			[testRecord.id]: testRecord,
		} as SerializedStore<any>

		// migrations apply -> session record dropped
		const migrated = schema.migrateStoreSnapshot({
			store,
			schema: makePersistedSchema([foo, 0]),
		})
		assert(migrated.type === 'success')
		expect(Object.keys(migrated.value)).toEqual([testRecord.id])

		// no migrations apply -> snapshot unchanged
		const untouched = schema.migrateStoreSnapshot({ store, schema: schema.serialize() })
		assert(untouched.type === 'success')
		expect(untouched.value).toBe(store)
	})
})

describe('migrateStorage (MA)', () => {
	function makeStorage<R extends BaseRecord<any, any>>(
		records: [string, R][],
		schema: SerializedSchema
	): SynchronousStorage<R> & {
		map: Map<string, R>
		setCalls: string[]
		setSchemaCalls: SerializedSchema[]
	} {
		const map = new Map(records)
		const setCalls: string[] = []
		const setSchemaCalls: SerializedSchema[] = []
		return {
			map,
			setCalls,
			setSchemaCalls,
			get: (id) => map.get(id),
			set: (id, record) => {
				setCalls.push(id)
				map.set(id, record)
			},
			delete: (id) => {
				map.delete(id)
			},
			keys: () => map.keys(),
			values: () => map.values(),
			entries: () => map.entries(),
			getSchema: () => schema,
			setSchema: (s) => {
				setSchemaCalls.push(s)
			},
		}
	}

	it('[MA7] writes the current schema and updates only records that actually changed', () => {
		const migrations = [
			createMigrationSequence({
				sequenceId: 'foo',
				sequence: [
					{
						id: 'foo/1',
						scope: 'record',
						filter: (r) => (r as any).shouldChange === true,
						up: (record: any) => {
							record.changed = true
						},
					},
				],
			}),
		]
		const schema = StoreSchema.create({ test: TestRecordType }, { migrations })

		const changing = { ...makeTestRecord({ schemaVersion: 2, sequences: {} }), shouldChange: true }
		const staying = makeTestRecord({ schemaVersion: 2, sequences: {} })
		const storage = makeStorage(
			[
				[changing.id, changing],
				[staying.id, staying],
			],
			schema.serializeEarliestVersion()
		)

		schema.migrateStorage(storage as any)

		expect(storage.setSchemaCalls).toEqual([schema.serialize()])
		expect(storage.setCalls).toEqual([changing.id])
		expect((storage.map.get(changing.id) as any).changed).toBe(true)
		// the unchanged record was not rewritten and the original was not mutated
		expect((changing as any).changed).toBeUndefined()
	})

	it('[MA7] does nothing when no migrations are needed', () => {
		const schema = StoreSchema.create({ test: TestRecordType }, { migrations: [] })
		const record = makeTestRecord({ schemaVersion: 2, sequences: {} })
		const storage = makeStorage([[record.id, record]], schema.serialize())

		schema.migrateStorage(storage as any)

		expect(storage.setSchemaCalls).toEqual([])
		expect(storage.setCalls).toEqual([])
	})

	it('[MA4] storage-scope migrations receive the storage and may read and write records', () => {
		// exercised end-to-end via Store.loadStoreSnapshot in Store.test.ts; here we check the
		// storage object passed to the migrator is the one we provided
		let receivedStorage: any
		const migrations = [
			createMigrationSequence({
				sequenceId: 'foo',
				sequence: [
					{
						id: 'foo/1',
						scope: 'storage',
						up: (storage) => {
							receivedStorage = storage
							for (const [id, record] of storage.entries()) {
								storage.set(id, { ...(record as any), touched: true })
							}
						},
					},
				],
			}),
		]
		const schema = StoreSchema.create({ test: TestRecordType }, { migrations })
		const record = makeTestRecord({ schemaVersion: 2, sequences: {} })
		const storage = makeStorage([[record.id, record]], schema.serializeEarliestVersion())

		schema.migrateStorage(storage as any)

		expect(receivedStorage).toBe(storage)
		expect((storage.map.get(record.id) as any).touched).toBe(true)
	})

	it('[MA3] store-scope migrations can add, change, and delete records', () => {
		const recordA = { ...makeTestRecord({ schemaVersion: 2, sequences: {} }), name: 'a' }
		const recordB = { ...makeTestRecord({ schemaVersion: 2, sequences: {} }), name: 'b' }
		const newRecord = { ...makeTestRecord({ schemaVersion: 2, sequences: {} }), name: 'new' }

		const migrations = [
			createMigrationSequence({
				sequenceId: 'foo',
				sequence: [
					{
						id: 'foo/1',
						scope: 'store',
						up: (store: any) => {
							const next: any = {}
							for (const [id, record] of Object.entries(store)) {
								if ((record as any).name === 'a') continue // delete a
								next[id] = { ...(record as any), renamed: true } // change b
							}
							next[newRecord.id] = newRecord // add new
							return next
						},
					},
				],
			}),
		]
		const schema = StoreSchema.create({ test: TestRecordType }, { migrations })

		const result = schema.migrateStoreSnapshot({
			store: { [recordA.id]: recordA, [recordB.id]: recordB } as any,
			schema: schema.serializeEarliestVersion(),
		})
		assert(result.type === 'success')

		expect(result.value[recordA.id as keyof typeof result.value]).toBeUndefined()
		expect((result.value[recordB.id as keyof typeof result.value] as any).renamed).toBe(true)
		expect(result.value[newRecord.id as keyof typeof result.value]).toMatchObject({ name: 'new' })
	})
})

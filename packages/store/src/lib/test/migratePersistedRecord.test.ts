import assert from 'assert'
import { BaseRecord, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { SerializedSchemaV2, StoreSchema } from '../StoreSchema'
import { MigrationSequence } from '../migrate'

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
			// noop
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

const makeSchema = (migrations: MigrationSequence[]) => {
	return StoreSchema.create({ test: TestRecordType }, { migrations })
}

const makePersistedSchema = (...args: Array<[migrations: MigrationSequence, version: number]>) => {
	return {
		schemaVersion: 2,
		sequences: Object.fromEntries(args.map(([m, v]) => [m.sequenceId, v])),
	} satisfies SerializedSchemaV2
}

const makeTestRecord = (persistedSchema: SerializedSchemaV2) => {
	return TestRecordType.create({
		versions: Object.fromEntries(
			Object.keys(persistedSchema.sequences).map((id) => [id, persistedSchema.sequences[id]])
		),
	})
}

test('going up from 0', () => {
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

test('going up with a retroactive: true and a retroactive: false', () => {
	const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
	const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
	const schema = makeSchema([foo, bar])
	const persistedSchema = makePersistedSchema()

	const r = makeTestRecord(persistedSchema)
	expect(r.versions).toEqual({})
	const update = schema.migratePersistedRecord(r, persistedSchema)
	assert(update.type === 'success', 'the update should be successful')

	// the original record did not change
	expect(r.versions).toEqual({})

	// the updated record has the new versions
	expect((update.value as TestRecordType).versions).toEqual({ foo: 2 })
})

test('going down to 0s', () => {
	const foo = mockSequence({ id: 'foo', retroactive: false, versions: 2 })
	const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
	const schema = makeSchema([foo, bar])
	const persistedSchema = makePersistedSchema([foo, 0], [bar, 0])

	const r = makeTestRecord(schema.serialize())
	expect(r.versions).toEqual({ foo: 2, bar: 3 })
	const downgrade = schema.migratePersistedRecord(r, persistedSchema, 'down')
	assert(downgrade.type === 'success', 'the downgrade should be successful')

	// the original record did not change
	expect(r.versions).toEqual({ foo: 2, bar: 3 })

	// the downgraded record has the new versions
	expect((downgrade.value as TestRecordType).versions).toEqual({ foo: 0, bar: 0 })
})

test('going down with a retroactive: true and a retroactive: false', () => {
	const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
	const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
	const schema = makeSchema([foo, bar])
	const persistedSchema = makePersistedSchema()

	const r = makeTestRecord(schema.serialize())
	expect(r.versions).toEqual({ foo: 2, bar: 3 })
	const downgrade = schema.migratePersistedRecord(r, persistedSchema, 'down')
	assert(downgrade.type === 'success', 'the downgrade should be successful')

	// the original record did not change
	expect(r.versions).toEqual({ foo: 2, bar: 3 })

	// only the foo migrations were undone
	expect((downgrade.value as TestRecordType).versions).toEqual({ foo: 0, bar: 3 })
})

test('going up with no changes', () => {
	const foo = mockSequence({ id: 'foo', retroactive: false, versions: 2 })
	const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
	const schema = makeSchema([foo, bar])
	const persistedSchema = makePersistedSchema([foo, 2], [bar, 3])

	const r = makeTestRecord(persistedSchema)
	expect(r.versions).toEqual({ foo: 2, bar: 3 })
	const update = schema.migratePersistedRecord(r, persistedSchema)
	assert(update.type === 'success', 'the update should be successful')

	// the returned record should be the the input record, i.e. it should not have allocated a new record
	expect(r).toBe(update.value)
})

test('going down with no changes', () => {
	const foo = mockSequence({ id: 'foo', retroactive: false, versions: 2 })
	const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
	const schema = makeSchema([foo, bar])
	const persistedSchema = makePersistedSchema([foo, 2], [bar, 3])

	const r = makeTestRecord(persistedSchema)
	expect(r.versions).toEqual({ foo: 2, bar: 3 })
	const update = schema.migratePersistedRecord(r, persistedSchema, 'down')
	assert(update.type === 'success', 'the update should be successful')

	// the returned record should be the the input record, i.e. it should not have allocated a new record
	expect(r).toBe(update.value)
})

test('respects filters', () => {
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

	// foo migrations shouldn't have been applied
	expect((update.value as TestRecordType).versions).toEqual({ foo: 0, bar: 3 })

	const r2 = { ...r, foo: true }
	const update2 = schema.migratePersistedRecord(r2, persistedSchema, 'up')
	assert(update2.type === 'success', 'the update should be successful')

	// foo migrations should have been applied
	expect((update2.value as TestRecordType).versions).toEqual({ foo: 2, bar: 3 })
})

test('does not go up or down if theres a store migration in the path', () => {
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
	const update = schema.migratePersistedRecord(r0, v0Schema, 'up')
	expect(update.type).toBe('error')
	const update2 = schema.migratePersistedRecord(r3, v0Schema, 'down')
	expect(update2.type).toBe('error')

	// snapshot migration up should still work
	const update3 = schema.migrateStoreSnapshot({
		schema: v0Schema,
		store: { [r0.id]: r0 },
	})

	assert(update3.type === 'success', 'the update should be successful')
	expect((update3.value[r0.id] as TestRecordType).versions).toEqual({ foo: 2 })
})

test('does not go down if theres a migrations without the down migrator in the path', () => {
	const foo = mockSequence({ id: 'foo', retroactive: false, versions: 3 })
	delete (foo.sequence[1] as any).down
	const schema = makeSchema([foo])
	const v0Schema = makePersistedSchema([foo, 0])

	// going up still works
	const r0 = makeTestRecord(v0Schema)
	const update = schema.migratePersistedRecord(r0, v0Schema, 'up')
	expect(update.type).toBe('success')

	// going down does not
	const r3 = makeTestRecord(schema.serialize())
	const update2 = schema.migratePersistedRecord(r3, v0Schema, 'down')
	expect(update2.type).toBe('error')
})

test('allows returning a new record from the migrator fn', () => {
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

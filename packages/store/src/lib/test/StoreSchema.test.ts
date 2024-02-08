import { T } from '@tldraw/validate'
import { BaseRecord, RecordId } from '../BaseRecord'
import { createRecordType } from '../RecordType'
import { StoreSnapshot } from '../Store'
import { StoreSchema } from '../StoreSchema'
import { Migration, MigrationId, MigrationSequence, MigrationsConfigBuilder } from '../migrate'

interface TestRecord extends BaseRecord<'test', RecordId<TestRecord>> {
	migrationsApplied: string[]
}

function recordMigration<Id extends MigrationId>(id: Id) {
	return {
		id,
		scope: 'record',
		up(record: TestRecord) {
			return { ...record, migrationsApplied: [...record.migrationsApplied, id] }
		},
		down(record: TestRecord) {
			return { ...record, migrationsApplied: record.migrationsApplied.filter((x) => x !== id) }
		},
	} as const satisfies Migration
}

function storeMigration<Id extends MigrationId>(id: Id) {
	return {
		id,
		scope: 'store',
		up(store) {
			return Object.fromEntries(
				Object.entries(store).map(([k, v]) => [
					k,
					{
						...v,
						migrationsApplied: [...(v as TestRecord).migrationsApplied, id],
					},
				])
			)
		},
		down(store) {
			return Object.fromEntries(
				Object.entries(store).map(([k, v]) => [
					k,
					{
						...v,
						migrationsApplied: (v as TestRecord).migrationsApplied.filter((x) => x !== id),
					},
				])
			)
		},
	} as const satisfies Migration
}

const validator: T.Validator<TestRecord> = T.model(
	'test',
	T.object({
		typeName: T.literal('test'),
		id: T.string as any as T.Validatable<RecordId<TestRecord>>,
		migrationsApplied: T.arrayOf(T.string),
	})
)

const TestRecordType = createRecordType<TestRecord>('test', {
	scope: 'document',
	validator,
})

const schemaV0 = StoreSchema.create({ test: TestRecordType })

const sequenceAV1 = {
	id: 'A',
	migrations: [recordMigration('A/1')],
} as const satisfies MigrationSequence

const schemaV1 = StoreSchema.create(
	{ test: TestRecordType },
	{ migrations: new MigrationsConfigBuilder().addSequence(sequenceAV1).setOrder(['A/1']) }
)

const sequenceAV2 = {
	id: 'A',
	migrations: [recordMigration('A/1'), recordMigration('A/2')],
} as const satisfies MigrationSequence

const sequenceBV2 = {
	id: 'B',
	migrations: [recordMigration('B/2')],
} as const satisfies MigrationSequence

const sequenceCV2 = {
	id: 'C',
	migrations: [recordMigration('C/1'), recordMigration('C/2')],
} as const satisfies MigrationSequence

const schemaV2 = StoreSchema.create(
	{ test: TestRecordType },
	{
		migrations: new MigrationsConfigBuilder()
			.addSequence(sequenceAV2)
			.addSequence(sequenceBV2)
			.addSequence(sequenceCV2, 'C/1')
			.setOrder(['A/1', 'A/2', 'B/2', 'C/2']),
	}
)

const sequenceAV3 = {
	id: 'A',
	migrations: [recordMigration('A/1'), recordMigration('A/2'), storeMigration('A/3')],
} as const satisfies MigrationSequence

const schemaV3 = StoreSchema.create(
	{ test: TestRecordType },
	{
		migrations: new MigrationsConfigBuilder()
			.addSequence(sequenceAV3)
			.addSequence(sequenceBV2)
			.addSequence(sequenceCV2, 'C/1')
			.setOrder(['A/1', 'A/2', 'B/2', 'C/2', 'A/3']),
	}
)

describe('ensureMigrationSequenceIncluded', () => {
	it('throws if sequence is not included', () => {
		expect(() => schemaV0.ensureMigrationSequenceIncluded('A')).toThrow()
		expect(() => schemaV1.ensureMigrationSequenceIncluded('B')).toThrow()
		expect(() => schemaV1.ensureMigrationSequenceIncluded('C')).toThrow()
	})
	it('does not throw if sequence is included', () => {
		expect(() => schemaV1.ensureMigrationSequenceIncluded('A')).not.toThrow()
		expect(() => schemaV1.ensureMigrationSequenceIncluded('B')).toThrow()
		expect(() => schemaV1.ensureMigrationSequenceIncluded('C')).toThrow()
		expect(() => schemaV2.ensureMigrationSequenceIncluded('A')).not.toThrow()
		expect(() => schemaV2.ensureMigrationSequenceIncluded('B')).not.toThrow()
		expect(() => schemaV2.ensureMigrationSequenceIncluded('C')).not.toThrow()
	})
})

test('migrating up from v0 to v1 and back again works', () => {
	const blankRecord = TestRecordType.create({
		id: TestRecordType.createId('0'),
		migrationsApplied: [],
	})

	const upResult = schemaV1.migratePersistedRecord(blankRecord, schemaV0.serialize(), 'up')
	if (upResult.type !== 'success') throw new Error('up migration failed')
	const upped = upResult.value as TestRecord
	expect(upped.migrationsApplied).toEqual(['A/1'])

	const downResult = schemaV1.migratePersistedRecord(upped, schemaV0.serialize(), 'down')
	if (downResult.type !== 'success') throw new Error('down migration failed')
	expect(downResult.value).toEqual(blankRecord)
})

test('migrating from v0 to v2 and back again works', () => {
	const blankRecord = TestRecordType.create({
		id: TestRecordType.createId('0'),
		migrationsApplied: [],
	})
	const upResult = schemaV2.migratePersistedRecord(blankRecord, schemaV0.serialize(), 'up')
	if (upResult.type !== 'success') throw new Error('up migration failed')
	const upped = upResult.value as TestRecord
	expect(upped.migrationsApplied).toEqual(['A/1', 'A/2', 'B/2', 'C/2'])

	const downResult = schemaV2.migratePersistedRecord(upped, schemaV0.serialize(), 'down')
	if (downResult.type !== 'success') throw new Error('down migration failed')
	expect(downResult.value).toEqual(blankRecord)
})

test('migrating from v1 to v2 and back again works', () => {
	const v1Record = TestRecordType.create({
		id: TestRecordType.createId('0'),
		migrationsApplied: ['A/1'],
	})
	const upResult = schemaV2.migratePersistedRecord(v1Record, schemaV1.serialize(), 'up')
	if (upResult.type !== 'success') throw new Error('up migration failed')
	const upped = upResult.value as TestRecord
	expect(upped.migrationsApplied).toEqual(['A/1', 'A/2', 'B/2', 'C/2'])

	const downResult = schemaV2.migratePersistedRecord(upped, schemaV1.serialize(), 'down')
	if (downResult.type !== 'success') throw new Error('down migration failed')
	expect(downResult.value).toEqual(v1Record)
})

test('migrating an individual record up does not work if the migration sequence includes a store-scoped migration', () => {
	const blankRecord = TestRecordType.create({
		id: TestRecordType.createId('0'),
		migrationsApplied: [],
	})
	const upResult = schemaV3.migratePersistedRecord(blankRecord, schemaV0.serialize(), 'up')
	expect(upResult).toMatchInlineSnapshot(`
{
  "reason": "target-version-too-old",
  "type": "error",
}
`)

	expect(schemaV3.migratePersistedRecord(blankRecord, schemaV1.serialize(), 'up')).toEqual(upResult)
	expect(schemaV3.migratePersistedRecord(blankRecord, schemaV2.serialize(), 'up')).toEqual(upResult)
})

test('Migrating a whole snapshot works for store-level migrations', () => {
	const id = TestRecordType.createId('0')
	const snapshot: StoreSnapshot<TestRecord> = {
		schema: schemaV0.serialize(),
		store: {
			[id]: TestRecordType.create({
				id,
				migrationsApplied: [],
			}),
		},
	}

	const result = schemaV3.migrateStoreSnapshot(snapshot)
	expect(result).toMatchInlineSnapshot(`
{
  "type": "success",
  "value": {
    "test:0": {
      "id": "test:0",
      "migrationsApplied": [
        "A/1",
        "A/2",
        "B/2",
        "C/2",
        "A/3",
      ],
      "typeName": "test",
    },
  },
}
`)
})

test('Migrating a snapshot from a newer version does not work', () => {
	const id = TestRecordType.createId('0')
	const snapshot: StoreSnapshot<TestRecord> = {
		schema: schemaV3.serialize(),
		store: {
			[id]: TestRecordType.create({
				id,
				migrationsApplied: [],
			}),
		},
	}

	const result = schemaV2.migrateStoreSnapshot(snapshot)
	expect(result).toMatchInlineSnapshot(`
{
  "reason": "target-version-too-old",
  "type": "error",
}
`)
})

test('migrating a record down from and older version does not work', () => {
	const id = TestRecordType.createId('0')
	const record = TestRecordType.create({
		id,
		migrationsApplied: [],
	})
	const result = schemaV0.migratePersistedRecord(record, schemaV1.serialize(), 'down')
	expect(result).toMatchInlineSnapshot(`
{
  "reason": "target-version-too-old",
  "type": "error",
}
`)
})

test('migrating a record up from a newer version does not work', () => {
	const id = TestRecordType.createId('0')
	const record = TestRecordType.create({
		id,
		migrationsApplied: [],
	})
	const result = schemaV1.migratePersistedRecord(record, schemaV2.serialize(), 'up')
	expect(result).toMatchInlineSnapshot(`
{
  "reason": "target-version-too-old",
  "type": "error",
}
`)
})

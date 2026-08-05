import {
	BaseRecord,
	createMigrationSequence,
	createRecordType,
	RecordId,
	StoreSchema,
} from '@tldraw/store'
import { TLDOCUMENT_ID, TLRecord } from '@tldraw/tlschema'
import { describe, expect, it, vi } from 'vitest'
import {
	contractRecords,
	contractSchema,
	makeContractSnapshot,
	makePage,
} from '../test/storageContractSuite'
import { InMemorySyncStorage } from './InMemorySyncStorage'
import {
	convertStoreSnapshotToRoomSnapshot,
	loadSnapshotIntoStorage,
	toNetworkDiff,
	TLSyncForwardDiff,
} from './TLSyncStorage'

describe('toNetworkDiff', () => {
	const pageA = makePage('a', 'A')
	const pageB = { ...makePage('a', 'A'), name: 'B' } as TLRecord

	it('[ND2] maps plain puts, update tuples, and deletes to network ops', () => {
		const diff: TLSyncForwardDiff<TLRecord> = {
			puts: {
				[contractRecords[0].id]: contractRecords[0],
				[pageA.id]: [pageA, pageB],
			},
			deletes: ['shape:gone'],
		}
		expect(toNetworkDiff(diff)).toEqual({
			[contractRecords[0].id]: ['put', contractRecords[0]],
			[pageA.id]: ['patch', { name: ['put', 'B'] }],
			'shape:gone': ['remove'],
		})
	})

	it('[ND2] omits update tuples that compute to no diff', () => {
		const diff: TLSyncForwardDiff<TLRecord> = {
			puts: { [pageA.id]: [pageA, { ...pageA } as TLRecord] },
			deletes: [],
		}
		expect(toNetworkDiff(diff)).toEqual({})
	})

	it('[ND2] returns an (possibly empty) object, never null', () => {
		expect(toNetworkDiff({ puts: {}, deletes: [] })).toEqual({})
	})
})

describe('convertStoreSnapshotToRoomSnapshot', () => {
	it('[SL1] passes a RoomSnapshot through by reference', () => {
		const roomSnapshot = makeContractSnapshot(contractRecords, { documentClock: 42 })
		expect(convertStoreSnapshotToRoomSnapshot(roomSnapshot)).toBe(roomSnapshot)
	})

	it('[SL1] converts a StoreSnapshot to a clock-zero room snapshot', () => {
		const storeSnapshot = {
			store: {
				[TLDOCUMENT_ID]: contractRecords[0],
				[contractRecords[1].id]: contractRecords[1],
			} as any,
			schema: contractSchema.serialize(),
		}
		expect(convertStoreSnapshotToRoomSnapshot(storeSnapshot)).toEqual({
			clock: 0,
			documentClock: 0,
			documents: [
				{ state: contractRecords[0], lastChangedClock: 0 },
				{ state: contractRecords[1], lastChangedClock: 0 },
			],
			schema: storeSnapshot.schema,
			tombstones: {},
		})
	})
})

describe('loadSnapshotIntoStorage', () => {
	it('[SL2] throws when the snapshot has no schema', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeContractSnapshot(contractRecords),
		})
		expect(() =>
			storage.transaction((txn) => {
				loadSnapshotIntoStorage(txn, contractSchema, { documents: [], clock: 0 } as any)
			})
		).toThrow('Schema is required')
		consoleSpy.mockRestore()
	})

	it('[SL3] writes new and changed documents and tombstones the rest', () => {
		const extraPage = makePage('extra', 'Extra')
		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeContractSnapshot([...contractRecords, extraPage]),
		})

		const changedPage = { ...contractRecords[1], name: 'Renamed' } as TLRecord
		const newSnapshot = makeContractSnapshot([contractRecords[0], changedPage])
		storage.transaction((txn) => {
			loadSnapshotIntoStorage(txn, contractSchema, newSnapshot)
		})

		expect(storage.documents.get(contractRecords[1].id)?.state).toEqual(changedPage)
		expect(storage.documents.has(extraPage.id)).toBe(false)
		expect(storage.tombstones.has(extraPage.id)).toBe(true)
	})

	it('[SL3] skips documents that are deep-equal to the stored state', () => {
		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeContractSnapshot(contractRecords, { documentClock: 5 }),
		})
		storage.transaction((txn) => {
			loadSnapshotIntoStorage(txn, contractSchema, makeContractSnapshot(contractRecords))
		})
		// nothing changed, so the clock did not advance
		expect(storage.getClock()).toBe(5)
	})

	it('[SL4] persists the snapshot schema and migrates loaded records to the current version', () => {
		interface TestRecord extends BaseRecord<'test', RecordId<TestRecord>> {
			value: number
			migrated?: boolean
		}
		const TestRecordType = createRecordType<TestRecord>('test', {
			validator: { validate: (r) => r as TestRecord },
			scope: 'document',
		})
		const migrations = createMigrationSequence({
			sequenceId: 'com.test.record',
			retroactive: true,
			sequence: [
				{
					id: 'com.test.record/1',
					scope: 'record',
					filter: (r: any) => r.typeName === 'test',
					up: (record: any) => {
						record.migrated = true
					},
				},
			],
		})
		const oldSchema = StoreSchema.create({ test: TestRecordType })
		const newSchema = StoreSchema.create({ test: TestRecordType }, { migrations: [migrations] })

		const storage = new InMemorySyncStorage<TestRecord>({
			snapshot: {
				documents: [],
				clock: 0,
				documentClock: 0,
				schema: newSchema.serialize(),
			},
		})

		const record: TestRecord = { id: 'test:1' as RecordId<TestRecord>, typeName: 'test', value: 1 }
		storage.transaction((txn) => {
			loadSnapshotIntoStorage(txn, newSchema, {
				documents: [{ state: record, lastChangedClock: 0 }],
				clock: 0,
				documentClock: 0,
				schema: oldSchema.serialize(),
			})
		})

		expect((storage.documents.get('test:1')!.state as TestRecord).migrated).toBe(true)
		// the schema was migrated up to the current version too
		expect(storage.schema.get()).toEqual(newSchema.serialize())
	})

	it('[SL4] applies record migrations exactly once per record', () => {
		const migrationCounts = new Map<string, number>()

		interface TestRecord extends BaseRecord<'test', RecordId<TestRecord>> {
			value: number
		}
		const TestRecordType = createRecordType<TestRecord>('test', {
			validator: { validate: (r) => r as TestRecord },
			scope: 'document',
		})
		const migrations = createMigrationSequence({
			sequenceId: 'com.test.record',
			retroactive: true,
			sequence: [
				{
					id: 'com.test.record/1',
					scope: 'record',
					filter: (r: any) => r.typeName === 'test',
					up: (record: any) => {
						migrationCounts.set(record.id, (migrationCounts.get(record.id) ?? 0) + 1)
					},
				},
			],
		})
		const oldSchema = StoreSchema.create({ test: TestRecordType })
		const newSchema = StoreSchema.create({ test: TestRecordType }, { migrations: [migrations] })

		const numRecords = 100
		const testRecords: TestRecord[] = Array.from({ length: numRecords }, (_, i) => ({
			id: `test:${i}` as RecordId<TestRecord>,
			typeName: 'test' as const,
			value: i,
		}))

		const storage = new InMemorySyncStorage<TestRecord>({
			snapshot: {
				documents: testRecords.map((r) => ({ state: r, lastChangedClock: 0 })),
				clock: 0,
				documentClock: 0,
				schema: oldSchema.serialize(),
			},
		})

		storage.transaction((txn) => {
			newSchema.migrateStorage(txn)
		})

		expect(migrationCounts.size).toBe(numRecords)
		expect([...migrationCounts.values()].every((count) => count === 1)).toBe(true)
	})
})

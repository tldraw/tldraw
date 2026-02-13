import { DatabaseSync } from 'node:sqlite'
import { RecordId, StoreSchema } from 'tldraw'
import { beforeEach, describe, expect, it } from 'vitest'
import { NodeSqliteWrapper } from './NodeSqliteWrapper'
import { migrateSqliteSyncStorage, SQLiteSyncStorage } from './SQLiteSyncStorage'
import { RoomSnapshot } from './TLSyncRoom'

// Simple record type for testing
interface TestRecord {
	id: RecordId<TestRecord>
	typeName: string
	name: string
	value: number
}

type ID = RecordId<TestRecord>

// SQLiteSyncStorage uses multi-statement DDL in constructor which node:sqlite
// doesn't support (prepare() only handles one statement). We need to initialize
// the tables separately before creating the storage.
function initializeTables(db: DatabaseSync) {
	migrateSqliteSyncStorage(new NodeSqliteWrapper(db))
}

const defaultSnapshot: RoomSnapshot = {
	documents: [],
	tombstones: {},
	schema: StoreSchema.create({}).serialize(),
}

describe('NodeSqliteSyncWrapper + SQLiteSyncStorage integration', () => {
	let db: DatabaseSync
	let sql: NodeSqliteWrapper
	let storage: SQLiteSyncStorage<TestRecord>

	beforeEach(() => {
		db = new DatabaseSync(':memory:')
		initializeTables(db)
		sql = new NodeSqliteWrapper(db)
		// Pass undefined snapshot since we already initialized the tables
		storage = new SQLiteSyncStorage<TestRecord>({
			sql,
			snapshot: defaultSnapshot,
		})
	})

	describe('basic operations', () => {
		it('can set and get a record', () => {
			const record: TestRecord = { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 }

			storage.transaction((txn) => {
				txn.set(record.id, record)
			})

			const result = storage.transaction((txn) => txn.get('test-1'))
			expect(result.result).toEqual(record)
		})

		it('can delete a record', () => {
			const record: TestRecord = { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 }

			storage.transaction((txn) => {
				txn.set(record.id, record)
			})

			storage.transaction((txn) => {
				txn.delete('test-1')
			})

			const result = storage.transaction((txn) => txn.get('test-1'))
			expect(result.result).toBeUndefined()
		})

		it('increments clock on mutations', () => {
			expect(storage.getClock()).toBe(0)

			storage.transaction((txn) => {
				txn.set('test-1', { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 })
			})

			expect(storage.getClock()).toBe(1)

			storage.transaction((txn) => {
				txn.set('test-2', { id: 'test-2' as ID, typeName: 'test', name: 'Bob', value: 200 })
			})

			expect(storage.getClock()).toBe(2)
		})

		it('only increments clock once per transaction', () => {
			storage.transaction((txn) => {
				txn.set('test-1', { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 })
				txn.set('test-2', { id: 'test-2' as ID, typeName: 'test', name: 'Bob', value: 200 })
				txn.set('test-3', { id: 'test-3' as ID, typeName: 'test', name: 'Charlie', value: 300 })
			})

			expect(storage.getClock()).toBe(1)
		})
	})

	describe('iteration', () => {
		it('can iterate over entries', () => {
			storage.transaction((txn) => {
				txn.set('test-1', { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 })
				txn.set('test-2', { id: 'test-2' as ID, typeName: 'test', name: 'Bob', value: 200 })
			})

			const entries = storage.transaction((txn) => [...txn.entries()])
			expect(entries.result).toHaveLength(2)
			expect(entries.result.map(([id]) => id).sort()).toEqual(['test-1', 'test-2'])
		})

		it('can iterate over keys', () => {
			storage.transaction((txn) => {
				txn.set('test-1', { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 })
				txn.set('test-2', { id: 'test-2' as ID, typeName: 'test', name: 'Bob', value: 200 })
			})

			const keys = storage.transaction((txn) => [...txn.keys()])
			expect(keys.result.sort()).toEqual(['test-1', 'test-2'])
		})

		it('can iterate over values', () => {
			storage.transaction((txn) => {
				txn.set('test-1', { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 })
				txn.set('test-2', { id: 'test-2' as ID, typeName: 'test', name: 'Bob', value: 200 })
			})

			const values = storage.transaction((txn) => [...txn.values()])
			expect(values.result).toHaveLength(2)
			expect(values.result.map((v) => v.name).sort()).toEqual(['Alice', 'Bob'])
		})
	})

	describe('snapshots', () => {
		it('can get a snapshot', () => {
			storage.transaction((txn) => {
				txn.set('test-1', { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 })
			})

			const snapshot = storage.getSnapshot()

			expect(snapshot.documentClock).toBe(1)
			expect(snapshot.documents).toHaveLength(1)
			expect(snapshot.documents[0].state).toEqual({
				id: 'test-1',
				typeName: 'test',
				name: 'Alice',
				value: 100,
			})
			expect(snapshot.schema).toEqual(defaultSnapshot.schema)
		})

		it('includes tombstones in snapshot', () => {
			storage.transaction((txn) => {
				txn.set('test-1', { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 })
			})

			storage.transaction((txn) => {
				txn.delete('test-1')
			})

			const snapshot = storage.getSnapshot()

			expect(snapshot.documents).toHaveLength(0)
			expect(snapshot.tombstones).toEqual({ 'test-1': 2 })
		})
	})

	describe('getChangesSince', () => {
		it('returns changes since a given clock', () => {
			storage.transaction((txn) => {
				txn.set('test-1', { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 })
			})

			const clock1 = storage.getClock()

			storage.transaction((txn) => {
				txn.set('test-2', { id: 'test-2' as ID, typeName: 'test', name: 'Bob', value: 200 })
			})

			const changes = storage.transaction((txn) => txn.getChangesSince(clock1))

			expect(changes.result?.diff.puts).toHaveProperty('test-2')
			expect(changes.result?.diff.puts).not.toHaveProperty('test-1')
		})

		it('includes deletes in changes', () => {
			storage.transaction((txn) => {
				txn.set('test-1', { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 })
			})

			const clock1 = storage.getClock()

			storage.transaction((txn) => {
				txn.delete('test-1')
			})

			const changes = storage.transaction((txn) => txn.getChangesSince(clock1))

			expect(changes.result?.diff.deletes).toContain('test-1')
		})

		it('returns undefined when no changes', () => {
			storage.transaction((txn) => {
				txn.set('test-1', { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 })
			})

			const clock = storage.getClock()

			const changes = storage.transaction((txn) => txn.getChangesSince(clock))

			expect(changes.result).toBeUndefined()
		})
	})

	describe('transaction rollback', () => {
		it('rolls back on error', () => {
			storage.transaction((txn) => {
				txn.set('test-1', { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 })
			})

			expect(() => {
				storage.transaction((txn) => {
					txn.set('test-2', { id: 'test-2' as ID, typeName: 'test', name: 'Bob', value: 200 })
					throw new Error('oops')
				})
			}).toThrow('oops')

			// test-2 should not exist
			const result = storage.transaction((txn) => txn.get('test-2'))
			expect(result.result).toBeUndefined()

			// test-1 should still exist
			const result1 = storage.transaction((txn) => txn.get('test-1'))
			expect(result1.result?.name).toBe('Alice')
		})
	})

	describe('onChange', () => {
		it('notifies on changes', async () => {
			const changes: { id?: string; documentClock: number }[] = []
			storage.onChange((change) => {
				changes.push(change)
			})

			storage.transaction((txn) => {
				txn.set('test-1', { id: 'test-1' as ID, typeName: 'test', name: 'Alice', value: 100 })
			})

			// onChange uses microtask, so wait for it
			await new Promise((resolve) => setTimeout(resolve, 0))

			expect(changes).toHaveLength(1)
			expect(changes[0].documentClock).toBe(1)
		})
	})

	describe('hasBeenInitialized', () => {
		it('returns true for initialized storage', () => {
			expect(SQLiteSyncStorage.hasBeenInitialized(sql)).toBe(true)
		})

		it('returns false for uninitialized storage', () => {
			const freshDb = new DatabaseSync(':memory:')
			const freshWrapper = new NodeSqliteWrapper(freshDb)
			expect(SQLiteSyncStorage.hasBeenInitialized(freshWrapper)).toBe(false)
		})
	})
})

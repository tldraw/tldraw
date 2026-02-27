import {
	BaseRecord,
	createMigrationSequence,
	createRecordType,
	RecordId,
	StoreSchema,
} from '@tldraw/store'
import {
	createTLSchema,
	DocumentRecordType,
	PageRecordType,
	TLDOCUMENT_ID,
	TLRecord,
} from '@tldraw/tlschema'
import { IndexKey, ZERO_INDEX_KEY } from '@tldraw/utils'
import { DatabaseSync } from 'node:sqlite'
import { vi } from 'vitest'
import { MAX_TOMBSTONES, TOMBSTONE_PRUNE_BUFFER_SIZE } from '../lib/InMemorySyncStorage'
import { NodeSqliteWrapper } from '../lib/NodeSqliteWrapper'
import { SQLiteSyncStorage } from '../lib/SQLiteSyncStorage'
import { RoomSnapshot } from '../lib/TLSyncRoom'

const tlSchema = createTLSchema()

const makeSnapshot = (records: TLRecord[], others: Partial<RoomSnapshot> = {}): RoomSnapshot => ({
	documents: records.map((r) => ({ state: r, lastChangedClock: 0 })),
	clock: 0,
	documentClock: 0,
	schema: tlSchema.serialize(),
	...others,
})

// Helper to create legacy snapshots without documentClock field
const makeLegacySnapshot = (
	records: TLRecord[],
	others: Partial<Omit<RoomSnapshot, 'documentClock'>> = {}
): Omit<RoomSnapshot, 'documentClock'> & { schema: RoomSnapshot['schema'] } => ({
	documents: records.map((r) => ({ state: r, lastChangedClock: 0 })),
	clock: 0,
	schema: tlSchema.serialize(),
	...others,
})

const defaultRecords = [
	DocumentRecordType.create({ id: TLDOCUMENT_ID }),
	PageRecordType.create({
		index: ZERO_INDEX_KEY,
		name: 'Page 1',
		id: PageRecordType.createId('page_1'),
	}),
]

function createWrapper(config?: { tablePrefix?: string }) {
	const db = new DatabaseSync(':memory:')
	return new NodeSqliteWrapper(db, config)
}

function getStorage(snapshot: RoomSnapshot, wrapperConfig?: { tablePrefix?: string }) {
	const sql = createWrapper(wrapperConfig)
	return new SQLiteSyncStorage<TLRecord>({ sql, snapshot })
}

describe('SQLiteSyncStorage', () => {
	describe('Static methods', () => {
		describe('hasBeenInitialized', () => {
			it('returns false for empty database', () => {
				const sql = createWrapper()
				expect(SQLiteSyncStorage.hasBeenInitialized(sql)).toBe(false)
			})

			it('returns true after storage is initialized', () => {
				const sql = createWrapper()
				new SQLiteSyncStorage<TLRecord>({ sql, snapshot: makeSnapshot(defaultRecords) })
				expect(SQLiteSyncStorage.hasBeenInitialized(sql)).toBe(true)
			})

			it('respects table prefix', () => {
				const sql = createWrapper({ tablePrefix: 'test_' })
				expect(SQLiteSyncStorage.hasBeenInitialized(sql)).toBe(false)
				new SQLiteSyncStorage<TLRecord>({ sql, snapshot: makeSnapshot(defaultRecords) })
				expect(SQLiteSyncStorage.hasBeenInitialized(sql)).toBe(true)
			})
		})

		describe('getDocumentClock', () => {
			it('returns null for empty database', () => {
				const sql = createWrapper()
				expect(SQLiteSyncStorage.getDocumentClock(sql)).toBe(null)
			})

			it('returns 0 for newly initialized storage with default snapshot', () => {
				const sql = createWrapper()
				new SQLiteSyncStorage<TLRecord>({ sql, snapshot: makeSnapshot(defaultRecords) })
				expect(SQLiteSyncStorage.getDocumentClock(sql)).toBe(0)
			})

			it('returns the documentClock value from snapshot', () => {
				const sql = createWrapper()
				const snapshot = makeSnapshot(defaultRecords)
				snapshot.documentClock = 42
				new SQLiteSyncStorage<TLRecord>({ sql, snapshot })
				expect(SQLiteSyncStorage.getDocumentClock(sql)).toBe(42)
			})

			it('returns updated clock after transactions', () => {
				const sql = createWrapper()
				const storage = new SQLiteSyncStorage<TLRecord>({
					sql,
					snapshot: makeSnapshot(defaultRecords),
				})
				expect(SQLiteSyncStorage.getDocumentClock(sql)).toBe(0)

				const newPage = PageRecordType.create({
					id: PageRecordType.createId('test_page'),
					name: 'Test Page',
					index: 'a1' as IndexKey,
				})
				storage.transaction((txn) => {
					txn.set(newPage.id, newPage)
				})
				expect(SQLiteSyncStorage.getDocumentClock(sql)).toBe(1)
			})

			it('respects table prefix', () => {
				const sql = createWrapper({ tablePrefix: 'test_' })
				expect(SQLiteSyncStorage.getDocumentClock(sql)).toBe(null)
				new SQLiteSyncStorage<TLRecord>({ sql, snapshot: makeSnapshot(defaultRecords) })
				expect(SQLiteSyncStorage.getDocumentClock(sql)).toBe(0)
			})
		})
	})

	describe('Constructor', () => {
		it('initializes documents from snapshot', () => {
			const storage = getStorage(makeSnapshot(defaultRecords))

			const snapshot = storage.getSnapshot()
			expect(snapshot.documents.length).toBe(2)
			expect(snapshot.documents.find((d) => d.state.id === TLDOCUMENT_ID)).toBeDefined()
		})

		it('initializes schema from snapshot', () => {
			const snapshotIn = makeSnapshot(defaultRecords)
			const storage = getStorage(snapshotIn)

			const snapshot = storage.getSnapshot()
			expect(snapshot.schema).toEqual(snapshotIn.schema)
		})

		it('initializes documentClock from snapshot', () => {
			const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 42 }))

			expect(storage.getClock()).toBe(42)
		})

		it('falls back to clock when documentClock is not present (legacy snapshot)', () => {
			const storage = getStorage(makeLegacySnapshot(defaultRecords, { clock: 15 }) as RoomSnapshot)

			expect(storage.getClock()).toBe(15)
		})

		it('falls back to 0 when neither documentClock nor clock is present', () => {
			const snapshot = {
				documents: defaultRecords.map((r) => ({ state: r, lastChangedClock: 0 })),
				schema: tlSchema.serialize(),
			} as RoomSnapshot

			const storage = getStorage(snapshot)

			expect(storage.getClock()).toBe(0)
		})

		it('initializes tombstones from snapshot', () => {
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					tombstones: { 'shape:deleted1': 5, 'shape:deleted2': 10 },
					tombstoneHistoryStartsAtClock: 0,
					documentClock: 15,
				})
			)

			const snapshot = storage.getSnapshot()
			expect(Object.keys(snapshot.tombstones!).length).toBe(2)
			expect(snapshot.tombstones?.['shape:deleted1']).toBe(5)
			expect(snapshot.tombstones?.['shape:deleted2']).toBe(10)
		})

		it('sets tombstoneHistoryStartsAtClock from snapshot', () => {
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					tombstoneHistoryStartsAtClock: 5,
					documentClock: 10,
				})
			)

			const snapshot = storage.getSnapshot()
			expect(snapshot.tombstoneHistoryStartsAtClock).toBe(5)
		})

		it('defaults tombstoneHistoryStartsAtClock to documentClock when not provided', () => {
			const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 20 }))

			const snapshot = storage.getSnapshot()
			expect(snapshot.tombstoneHistoryStartsAtClock).toBe(20)
		})

		it('handles empty documents array', () => {
			const storage = getStorage(makeSnapshot([]))

			const snapshot = storage.getSnapshot()
			expect(snapshot.documents.length).toBe(0)
		})

		it('works with table prefix', () => {
			const storage = getStorage(makeSnapshot(defaultRecords), { tablePrefix: 'myapp_' })

			const snapshot = storage.getSnapshot()
			expect(snapshot.documents.length).toBe(2)
		})

		it('reinitializes storage when snapshot provided to existing tables', () => {
			const sql = createWrapper()

			// First initialization
			new SQLiteSyncStorage<TLRecord>({
				sql,
				snapshot: makeSnapshot(defaultRecords, { documentClock: 10 }),
			})

			// Second initialization with different data
			const newRecords = [DocumentRecordType.create({ id: TLDOCUMENT_ID })]
			const storage2 = new SQLiteSyncStorage<TLRecord>({
				sql,
				snapshot: makeSnapshot(newRecords, { documentClock: 20 }),
			})

			const snapshot = storage2.getSnapshot()
			expect(snapshot.documents.length).toBe(1)
			expect(snapshot.documentClock).toBe(20)
		})
	})

	describe('Transaction', () => {
		describe('get()', () => {
			it('returns record by id', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				storage.transaction((txn) => {
					const doc = txn.get(TLDOCUMENT_ID)
					expect(doc).toBeDefined()
					expect(doc?.id).toBe(TLDOCUMENT_ID)
				})
			})

			it('returns undefined for non-existent record', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				storage.transaction((txn) => {
					expect(txn.get('nonexistent')).toBeUndefined()
				})
			})
		})

		describe('set()', () => {
			it('creates new records', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				const newPage = PageRecordType.create({
					id: PageRecordType.createId('new_page'),
					name: 'New Page',
					index: 'a2' as IndexKey,
				})

				storage.transaction((txn) => {
					txn.set(newPage.id, newPage)
				})

				const snapshot = storage.getSnapshot()
				expect(snapshot.documents.length).toBe(3)
				expect(snapshot.documents.find((d) => d.state.id === newPage.id)?.state).toEqual(newPage)
			})

			it('updates existing records', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				const pageId = PageRecordType.createId('page_1')
				const updatedPage = PageRecordType.create({
					id: pageId,
					name: 'Updated Page',
					index: ZERO_INDEX_KEY,
				})

				storage.transaction((txn) => {
					txn.set(pageId, updatedPage)
				})

				const snapshot = storage.getSnapshot()
				expect(snapshot.documents.find((d) => d.state.id === pageId)?.state).toEqual(updatedPage)
			})

			it('clears tombstone when re-creating a deleted record', () => {
				const pageId = PageRecordType.createId('page_to_delete')
				const page = PageRecordType.create({
					id: pageId,
					name: 'Page',
					index: 'a2' as IndexKey,
				})

				const storage = getStorage(makeSnapshot([...defaultRecords, page]))

				// Delete the page
				storage.transaction((txn) => {
					txn.delete(pageId)
				})

				let snapshot = storage.getSnapshot()
				expect(snapshot.tombstones?.[pageId]).toBeDefined()
				expect(snapshot.documents.find((d) => d.state.id === pageId)).toBeUndefined()

				// Re-create the page
				storage.transaction((txn) => {
					txn.set(pageId, page)
				})

				snapshot = storage.getSnapshot()
				expect(snapshot.tombstones?.[pageId]).toBeUndefined()
				expect(snapshot.documents.find((d) => d.state.id === pageId)).toBeDefined()
			})

			it('sets lastChangedClock to the incremented clock', () => {
				const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 5 }))

				const newPage = PageRecordType.create({
					id: PageRecordType.createId('new_page'),
					name: 'New Page',
					index: 'a2' as IndexKey,
				})

				storage.transaction((txn) => {
					txn.set(newPage.id, newPage)
				})

				const snapshot = storage.getSnapshot()
				expect(snapshot.documents.find((d) => d.state.id === newPage.id)?.lastChangedClock).toBe(6)
			})
		})

		describe('delete()', () => {
			it('removes records', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				const pageId = PageRecordType.createId('page_1')

				storage.transaction((txn) => {
					txn.delete(pageId)
				})

				const snapshot = storage.getSnapshot()
				expect(snapshot.documents.find((d) => d.state.id === pageId)).toBeUndefined()
			})

			it('creates tombstones', () => {
				const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 10 }))

				const pageId = PageRecordType.createId('page_1')

				storage.transaction((txn) => {
					txn.delete(pageId)
				})

				const snapshot = storage.getSnapshot()
				expect(snapshot.tombstones?.[pageId]).toBe(11) // clock incremented to 11
			})
		})

		describe('getClock()', () => {
			it('returns current clock at start of transaction', () => {
				const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 42 }))

				storage.transaction((txn) => {
					expect(txn.getClock()).toBe(42)
				})
			})

			it('returns incremented clock after a write', () => {
				const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 42 }))

				storage.transaction((txn) => {
					expect(txn.getClock()).toBe(42)
					const newPage = PageRecordType.create({
						id: PageRecordType.createId('new'),
						name: 'New',
						index: 'a2' as IndexKey,
					})
					txn.set(newPage.id, newPage)
					expect(txn.getClock()).toBe(43)
				})
			})

			it('increments clock only once per transaction', () => {
				const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 10 }))

				storage.transaction((txn) => {
					const page1 = PageRecordType.create({
						id: PageRecordType.createId('p1'),
						name: 'P1',
						index: 'a2' as IndexKey,
					})
					const page2 = PageRecordType.create({
						id: PageRecordType.createId('p2'),
						name: 'P2',
						index: 'a3' as IndexKey,
					})

					txn.set(page1.id, page1)
					expect(txn.getClock()).toBe(11)

					txn.set(page2.id, page2)
					expect(txn.getClock()).toBe(11) // Still 11, not 12

					txn.delete(PageRecordType.createId('page_1'))
					expect(txn.getClock()).toBe(11) // Still 11
				})

				expect(storage.getClock()).toBe(11)
			})
		})

		describe('entries()', () => {
			it('iterates over all documents', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				storage.transaction((txn) => {
					const entries = Array.from(txn.entries())
					expect(entries.length).toBe(2)
					expect(entries.map(([id]) => id).sort()).toEqual(defaultRecords.map((r) => r.id).sort())
				})
			})
		})

		describe('keys()', () => {
			it('iterates over all document ids', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				storage.transaction((txn) => {
					const keys = Array.from(txn.keys())
					expect(keys.sort()).toEqual(defaultRecords.map((r) => r.id).sort())
				})
			})
		})

		describe('values()', () => {
			it('iterates over all document states', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				storage.transaction((txn) => {
					const values = Array.from(txn.values())
					expect(values.length).toBe(2)
					expect(values.map((v) => v.id).sort()).toEqual(defaultRecords.map((r) => r.id).sort())
				})
			})
		})

		describe('iterator consumption after transaction ends', () => {
			it('throws when entries() iterator is consumed after transaction ends', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				let iterator: Iterator<[string, TLRecord]>

				storage.transaction((txn) => {
					iterator = txn.entries()[Symbol.iterator]()
					// Consume one item inside the transaction - should work
					iterator.next()
				})

				// Trying to consume more after transaction ends should throw
				expect(() => iterator.next()).toThrow('Transaction has ended')
			})

			it('throws when keys() iterator is consumed after transaction ends', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				let iterator: Iterator<string>

				storage.transaction((txn) => {
					iterator = txn.keys()[Symbol.iterator]()
					iterator.next()
				})

				expect(() => iterator.next()).toThrow('Transaction has ended')
			})

			it('throws when values() iterator is consumed after transaction ends', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				let iterator: Iterator<TLRecord>

				storage.transaction((txn) => {
					iterator = txn.values()[Symbol.iterator]()
					iterator.next()
				})

				expect(() => iterator.next()).toThrow('Transaction has ended')
			})

			it('allows full consumption of iterator within transaction', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				storage.transaction((txn) => {
					// Should be able to fully consume all iterators
					const entries = Array.from(txn.entries())
					const keys = Array.from(txn.keys())
					const values = Array.from(txn.values())

					expect(entries.length).toBe(2)
					expect(keys.length).toBe(2)
					expect(values.length).toBe(2)
				})
			})
		})

		describe('getSchema() / setSchema()', () => {
			it('gets the current schema', () => {
				const snapshotIn = makeSnapshot(defaultRecords)
				const storage = getStorage(snapshotIn)

				storage.transaction((txn) => {
					expect(txn.getSchema()).toEqual(snapshotIn.schema)
				})
			})

			it('sets the schema', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				const newSchema = { ...tlSchema.serialize(), schemaVersion: 99 as any }

				storage.transaction((txn) => {
					txn.setSchema(newSchema)
				})

				const snapshot = storage.getSnapshot()
				expect(snapshot.schema?.schemaVersion).toBe(99)
			})
		})

		describe('transaction result', () => {
			it('returns result from callback', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				const { result } = storage.transaction((txn) => {
					return txn.get(TLDOCUMENT_ID)
				})

				expect(result?.id).toBe(TLDOCUMENT_ID)
			})

			it('returns didChange: false when no writes occur', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				const { didChange, documentClock } = storage.transaction((txn) => {
					txn.get(TLDOCUMENT_ID)
				})

				expect(didChange).toBe(false)
				expect(documentClock).toBe(0)
			})

			it('returns didChange: true when writes occur', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				const newPage = PageRecordType.create({
					id: PageRecordType.createId('new'),
					name: 'New',
					index: 'a2' as IndexKey,
				})

				const { didChange, documentClock } = storage.transaction((txn) => {
					txn.set(newPage.id, newPage)
				})

				expect(didChange).toBe(true)
				expect(documentClock).toBe(1)
			})

			it('throws when callback returns a promise', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				expect(() => {
					storage.transaction(() => Promise.resolve() as any)
				}).toThrow('Transaction must return a value, not a promise')
			})
		})
	})

	describe('getChangesSince', () => {
		it('returns puts for records changed after sinceClock', () => {
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					documents: [
						{ state: defaultRecords[0], lastChangedClock: 5 },
						{ state: defaultRecords[1], lastChangedClock: 10 },
					],
					documentClock: 15,
					tombstoneHistoryStartsAtClock: 0,
				})
			)

			storage.transaction((txn) => {
				const changes = txn.getChangesSince(7)!
				const puts = Object.values(changes.diff.puts)

				expect(puts.length).toBe(1)
				expect((puts[0] as TLRecord).id).toBe(defaultRecords[1].id) // only record with clock 10 > 7
				expect(changes.wipeAll).toBe(false)
			})
		})

		it('returns all records when sinceClock is before all changes', () => {
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					documents: [
						{ state: defaultRecords[0], lastChangedClock: 5 },
						{ state: defaultRecords[1], lastChangedClock: 10 },
					],
					documentClock: 15,
					tombstoneHistoryStartsAtClock: 0,
				})
			)

			storage.transaction((txn) => {
				const changes = txn.getChangesSince(0)!
				const puts = Object.values(changes.diff.puts)

				expect(puts.length).toBe(2)
			})
		})

		it('returns deletes for tombstones after sinceClock', () => {
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					tombstones: {
						'shape:deleted1': 5,
						'shape:deleted2': 12,
					},
					documentClock: 15,
					tombstoneHistoryStartsAtClock: 0,
				})
			)

			storage.transaction((txn) => {
				const changes = txn.getChangesSince(7)!

				expect(changes.diff.deletes).toEqual(['shape:deleted2']) // only tombstone with clock 12 > 7
			})
		})

		it('returns wipeAll: true when sinceClock < tombstoneHistoryStartsAtClock', () => {
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					documentClock: 20,
					tombstoneHistoryStartsAtClock: 10,
				})
			)

			storage.transaction((txn) => {
				const changes = txn.getChangesSince(5)! // 5 < 10

				expect(changes.wipeAll).toBe(true)
				// When wipeAll is true, all documents are returned and deletes are omitted (redundant)
				const puts = Object.values(changes.diff.puts)
				expect(puts.length).toBe(2)
				expect(changes.diff.deletes).toEqual([])
			})
		})

		it('returns wipeAll: false when sinceClock >= tombstoneHistoryStartsAtClock', () => {
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					documentClock: 20,
					tombstoneHistoryStartsAtClock: 10,
				})
			)

			storage.transaction((txn) => {
				const changes = txn.getChangesSince(15)!

				expect(changes.wipeAll).toBe(false)
			})
		})

		it('returns undefined when no changes since clock', () => {
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					documents: [
						{ state: defaultRecords[0], lastChangedClock: 5 },
						{ state: defaultRecords[1], lastChangedClock: 10 },
					],
					documentClock: 15,
					tombstoneHistoryStartsAtClock: 0,
				})
			)

			storage.transaction((txn) => {
				const changes = txn.getChangesSince(15)
				expect(changes).toBeUndefined()
			})
		})
	})

	describe('onChange', () => {
		it('accepts onChange callback in constructor', async () => {
			const listener = vi.fn()
			const sql = createWrapper()
			const storage = new SQLiteSyncStorage<TLRecord>({
				sql,
				snapshot: makeSnapshot(defaultRecords),
				onChange: listener,
			})

			await Promise.resolve()

			const newPage = PageRecordType.create({
				id: PageRecordType.createId('new'),
				name: 'New',
				index: 'a2' as IndexKey,
			})

			storage.transaction((txn) => {
				txn.set(newPage.id, newPage)
			})

			await Promise.resolve()

			expect(listener).toHaveBeenCalledTimes(1)
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					documentClock: 1,
				})
			)
		})

		it('notifies listeners after changes', async () => {
			const storage = getStorage(makeSnapshot(defaultRecords))

			const listener = vi.fn()
			storage.onChange(listener)

			// Wait for listener registration (microtask)
			await Promise.resolve()

			const newPage = PageRecordType.create({
				id: PageRecordType.createId('new'),
				name: 'New',
				index: 'a2' as IndexKey,
			})

			storage.transaction((txn) => {
				txn.set(newPage.id, newPage)
			})

			// Wait for notification (microtask)
			await Promise.resolve()

			expect(listener).toHaveBeenCalledTimes(1)
		})

		it('receives correct documentClock', async () => {
			const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 10 }))

			const listener = vi.fn()
			storage.onChange(listener)

			await Promise.resolve()

			const newPage = PageRecordType.create({
				id: PageRecordType.createId('new'),
				name: 'New',
				index: 'a2' as IndexKey,
			})

			storage.transaction((txn) => {
				txn.set(newPage.id, newPage)
			})

			await Promise.resolve()

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					documentClock: 11,
				})
			)
		})

		it('receives transaction id when provided', async () => {
			const storage = getStorage(makeSnapshot(defaultRecords))

			const listener = vi.fn()
			storage.onChange(listener)

			await Promise.resolve()

			const newPage = PageRecordType.create({
				id: PageRecordType.createId('new'),
				name: 'New',
				index: 'a2' as IndexKey,
			})

			storage.transaction(
				(txn) => {
					txn.set(newPage.id, newPage)
				},
				{ id: 'my-transaction-id' }
			)

			await Promise.resolve()

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'my-transaction-id',
				})
			)
		})

		it('unsubscribe prevents future notifications', async () => {
			const storage = getStorage(makeSnapshot(defaultRecords))

			const listener = vi.fn()
			const unsubscribe = storage.onChange(listener)

			await Promise.resolve()

			// Unsubscribe immediately
			unsubscribe()

			const newPage = PageRecordType.create({
				id: PageRecordType.createId('new'),
				name: 'New',
				index: 'a2' as IndexKey,
			})

			storage.transaction((txn) => {
				txn.set(newPage.id, newPage)
			})

			await Promise.resolve()

			expect(listener).not.toHaveBeenCalled()
		})

		it('does not notify for read-only transactions', async () => {
			const storage = getStorage(makeSnapshot(defaultRecords))

			const listener = vi.fn()
			storage.onChange(listener)

			await Promise.resolve()

			storage.transaction((txn) => {
				txn.get(TLDOCUMENT_ID) // read only
			})

			await Promise.resolve()

			expect(listener).not.toHaveBeenCalled()
		})
	})

	describe('getSnapshot', () => {
		it('returns correct snapshot structure', () => {
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					documentClock: 15,
					tombstoneHistoryStartsAtClock: 5,
					tombstones: { 'shape:deleted': 10 },
				})
			)

			const snapshot = storage.getSnapshot()

			expect(snapshot.documentClock).toBe(15)
			expect(snapshot.tombstoneHistoryStartsAtClock).toBe(5)
			expect(snapshot.documents.length).toBe(2)
			expect(snapshot.tombstones).toEqual({ 'shape:deleted': 10 })
			expect(snapshot.schema).toEqual(tlSchema.serialize())
		})

		it('reflects changes from transactions', () => {
			const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 0 }))

			const newPage = PageRecordType.create({
				id: PageRecordType.createId('new'),
				name: 'New',
				index: 'a2' as IndexKey,
			})

			storage.transaction((txn) => {
				txn.set(newPage.id, newPage)
			})

			const snapshot = storage.getSnapshot()

			expect(snapshot.documentClock).toBe(1)
			expect(snapshot.documents.length).toBe(3)
			expect(snapshot.documents.find((d) => d.state.id === newPage.id)).toBeDefined()
		})
	})

	describe('Edge cases', () => {
		describe('Transaction error handling', () => {
			it('does not increment clock if transaction throws', () => {
				const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 10 }))

				expect(() => {
					storage.transaction(() => {
						throw new Error('Oops!')
					})
				}).toThrow('Oops!')

				// Clock should not have changed
				expect(storage.getClock()).toBe(10)
			})

			it('rolls back changes if transaction throws after a write', () => {
				const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 10 }))

				const newPage = PageRecordType.create({
					id: PageRecordType.createId('new'),
					name: 'New',
					index: 'a2' as IndexKey,
				})

				expect(() => {
					storage.transaction((txn) => {
						txn.set(newPage.id, newPage)
						throw new Error('Oops after write!')
					})
				}).toThrow('Oops after write!')

				// Document should not have been added (rolled back)
				const snapshot = storage.getSnapshot()
				expect(snapshot.documents.find((d) => d.state.id === newPage.id)).toBeUndefined()
				// Clock should not have changed
				expect(storage.getClock()).toBe(10)
			})
		})

		describe('Deleting non-existent records', () => {
			it('does not create a tombstone for records that never existed', () => {
				const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 5 }))

				storage.transaction((txn) => {
					txn.delete('nonexistent:record')
				})

				// No tombstone should be created for a record that never existed
				const snapshot = storage.getSnapshot()
				expect(snapshot.tombstones?.['nonexistent:record']).toBeUndefined()
				// Clock should not be incremented since nothing changed
				expect(storage.getClock()).toBe(5)
			})

			it('does not increment clock when deleting non-existent record', () => {
				const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 10 }))

				const { didChange, documentClock } = storage.transaction((txn) => {
					txn.delete('nonexistent:record')
				})

				expect(didChange).toBe(false)
				expect(documentClock).toBe(10)
			})
		})

		describe('Set with mismatched ID', () => {
			it('throws when key does not match record.id', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				const page = PageRecordType.create({
					id: PageRecordType.createId('actual_id'),
					name: 'Test',
					index: 'a2' as IndexKey,
				})

				// Attempting to store with a different key than the record's id should throw
				expect(() => {
					storage.transaction((txn) => {
						txn.set('different:key', page)
					})
				}).toThrow('Record id mismatch: key does not match record.id')
			})

			it('succeeds when key matches record.id', () => {
				const storage = getStorage(makeSnapshot(defaultRecords))

				const page = PageRecordType.create({
					id: PageRecordType.createId('my_page'),
					name: 'Test',
					index: 'a2' as IndexKey,
				})

				// Store with matching key
				storage.transaction((txn) => {
					txn.set(page.id, page)
				})

				const snapshot = storage.getSnapshot()
				expect(snapshot.documents.find((d) => d.state.id === page.id)).toBeDefined()
			})
		})

		describe('getChangesSince boundary conditions', () => {
			it('sinceClock exactly equal to tombstoneHistoryStartsAtClock is NOT wipeAll', () => {
				const storage = getStorage(
					makeSnapshot(defaultRecords, {
						documentClock: 20,
						tombstoneHistoryStartsAtClock: 10,
					})
				)

				storage.transaction((txn) => {
					// sinceClock === tombstoneHistoryStartsAtClock
					const changes = txn.getChangesSince(10)!
					expect(changes.wipeAll).toBe(false)
				})
			})

			it('sinceClock one less than tombstoneHistoryStartsAtClock IS wipeAll', () => {
				const storage = getStorage(
					makeSnapshot(defaultRecords, {
						documentClock: 20,
						tombstoneHistoryStartsAtClock: 10,
					})
				)

				storage.transaction((txn) => {
					const changes = txn.getChangesSince(9)!
					expect(changes.wipeAll).toBe(true)
				})
			})

			it('handles negative sinceClock', () => {
				const storage = getStorage(
					makeSnapshot(defaultRecords, {
						documentClock: 10,
						tombstoneHistoryStartsAtClock: 0,
					})
				)

				storage.transaction((txn) => {
					const changes = txn.getChangesSince(-1)!
					// -1 < 0, so wipeAll should be true
					expect(changes.wipeAll).toBe(true)
					// All documents should be returned
					expect(Object.values(changes.diff.puts).length).toBe(2)
				})
			})

			it('returns undefined when sinceClock equals current documentClock', () => {
				const storage = getStorage(
					makeSnapshot(defaultRecords, {
						documents: [
							{ state: defaultRecords[0], lastChangedClock: 5 },
							{ state: defaultRecords[1], lastChangedClock: 10 },
						],
						documentClock: 10,
						tombstoneHistoryStartsAtClock: 0,
					})
				)

				storage.transaction((txn) => {
					const changes = txn.getChangesSince(10)
					expect(changes).toBeUndefined()
				})
			})

			it('returns all changes when sinceClock is greater than documentClock', () => {
				const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 10 }))

				storage.transaction((txn) => {
					const changes = txn.getChangesSince(100)!
					expect(Object.values(changes.diff.puts).length).toBe(2)
					expect(changes.wipeAll).toBe(true)
				})
			})
		})

		describe('Transaction result consistency', () => {
			it('didChange reflects whether clock was incremented', () => {
				const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 10 }))

				// Read-only transaction
				const readResult = storage.transaction((txn) => {
					txn.get(TLDOCUMENT_ID)
					return 'read'
				})

				expect(readResult.didChange).toBe(false)
				expect(readResult.documentClock).toBe(10)

				// Write transaction
				const writeResult = storage.transaction((txn) => {
					txn.set(TLDOCUMENT_ID, defaultRecords[0])
					return 'write'
				})

				expect(writeResult.didChange).toBe(true)
				expect(writeResult.documentClock).toBe(11)
			})

			it('documentClock in result matches storage.getClock()', () => {
				const storage = getStorage(makeSnapshot(defaultRecords, { documentClock: 5 }))

				const result = storage.transaction((txn) => {
					const page = PageRecordType.create({
						id: PageRecordType.createId('new'),
						name: 'New',
						index: 'a2' as IndexKey,
					})
					txn.set(page.id, page)
				})

				expect(result.documentClock).toBe(storage.getClock())
				expect(result.documentClock).toBe(6)
			})
		})
	})

	describe('pruneTombstones', () => {
		// Helper to create a snapshot with many tombstones
		function makeTombstoneMap(count: number, clockFn: (i: number) => number = (i) => i + 1) {
			const tombstones: Record<string, number> = {}
			for (let i = 0; i < count; i++) {
				tombstones[`doc${i}`] = clockFn(i)
			}
			return tombstones
		}

		it('does not prune when below MAX_TOMBSTONES', () => {
			const tombstoneCount = Math.floor(MAX_TOMBSTONES / 2)
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					documentClock: tombstoneCount + 1,
					tombstoneHistoryStartsAtClock: 0,
					tombstones: makeTombstoneMap(tombstoneCount),
				})
			)

			const snapshotBefore = storage.getSnapshot()
			const initialCount = Object.keys(snapshotBefore.tombstones!).length
			const initialHistoryClock = snapshotBefore.tombstoneHistoryStartsAtClock

			// Schedule the throttled function then force it to run
			storage.pruneTombstones()
			storage.pruneTombstones.flush()

			const snapshotAfter = storage.getSnapshot()
			expect(Object.keys(snapshotAfter.tombstones!).length).toBe(initialCount)
			expect(snapshotAfter.tombstoneHistoryStartsAtClock).toBe(initialHistoryClock)
		})

		it('prunes when exceeding MAX_TOMBSTONES', () => {
			const totalTombstones = MAX_TOMBSTONES + 500
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					documentClock: totalTombstones + 1,
					tombstoneHistoryStartsAtClock: 0,
					tombstones: makeTombstoneMap(totalTombstones),
				})
			)

			const snapshotBefore = storage.getSnapshot()
			expect(Object.keys(snapshotBefore.tombstones!).length).toBe(totalTombstones)

			// Schedule the throttled function then force it to run
			storage.pruneTombstones()
			storage.pruneTombstones.flush()

			const snapshotAfter = storage.getSnapshot()
			expect(Object.keys(snapshotAfter.tombstones!).length).toBeLessThan(totalTombstones)
			expect(Object.keys(snapshotAfter.tombstones!).length).toBeLessThanOrEqual(
				MAX_TOMBSTONES - TOMBSTONE_PRUNE_BUFFER_SIZE
			)
			expect(snapshotAfter.tombstoneHistoryStartsAtClock).toBeGreaterThan(0)
		})

		it('updates tombstoneHistoryStartsAtClock correctly', () => {
			const totalTombstones = MAX_TOMBSTONES * 2
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					documentClock: totalTombstones + 1000,
					tombstoneHistoryStartsAtClock: 0,
					tombstones: makeTombstoneMap(totalTombstones),
				})
			)

			const snapshotBefore = storage.getSnapshot()
			const initialHistoryClock = snapshotBefore.tombstoneHistoryStartsAtClock

			// Schedule the throttled function then force it to run
			storage.pruneTombstones()
			storage.pruneTombstones.flush()

			const snapshotAfter = storage.getSnapshot()

			// History clock should have advanced
			expect(snapshotAfter.tombstoneHistoryStartsAtClock).toBeGreaterThan(initialHistoryClock!)

			// The algorithm deletes the OLDEST tombstones and keeps the NEWEST ones.
			// tombstoneHistoryStartsAtClock is set to the oldest REMAINING clock.
			// Remaining tombstones have clocks >= tombstoneHistoryStartsAtClock.
			const historyClock = snapshotAfter.tombstoneHistoryStartsAtClock
			for (const clock of Object.values(snapshotAfter.tombstones!)) {
				expect(clock).toBeGreaterThanOrEqual(historyClock!)
			}
		})

		it('handles duplicate clock values across tombstones', () => {
			const totalTombstones = MAX_TOMBSTONES + 1
			const expectedCutoff = TOMBSTONE_PRUNE_BUFFER_SIZE + 1
			const overflow = 10
			const boundary = expectedCutoff + overflow
			const lowerClockVal = 1
			const upperClockVal = 2

			const tombstones: Record<string, number> = {}
			for (let i = 0; i < totalTombstones; i++) {
				tombstones[`doc${i}`] = i < boundary ? lowerClockVal : upperClockVal
			}

			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					documentClock: 3,
					tombstoneHistoryStartsAtClock: 0,
					tombstones,
				})
			)

			// Schedule the throttled function then force it to run
			storage.pruneTombstones()
			storage.pruneTombstones.flush()

			const snapshot = storage.getSnapshot()
			expect(Object.keys(snapshot.tombstones!).length).toEqual(
				MAX_TOMBSTONES - TOMBSTONE_PRUNE_BUFFER_SIZE - overflow
			)
			expect(Object.values(snapshot.tombstones!).every((clock) => clock === upperClockVal)).toBe(
				true
			)
		})

		it('handles all tombstones with same clock value', () => {
			const totalTombstones = MAX_TOMBSTONES * 2
			const sameClock = 100

			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					documentClock: 1000,
					tombstoneHistoryStartsAtClock: 0,
					tombstones: makeTombstoneMap(totalTombstones, () => sameClock),
				})
			)

			// Schedule the throttled function then force it to run
			storage.pruneTombstones()
			storage.pruneTombstones.flush()

			const snapshot = storage.getSnapshot()
			// When all have same clock, the cutoff extends to include all of them,
			// so all are pruned and history starts at documentClock
			expect(Object.keys(snapshot.tombstones!).length).toBe(0)
			expect(snapshot.tombstoneHistoryStartsAtClock).toBe(1000) // documentClock
		})

		it('does not prune at exactly MAX_TOMBSTONES', () => {
			const storage = getStorage(
				makeSnapshot(defaultRecords, {
					documentClock: MAX_TOMBSTONES + 1,
					tombstoneHistoryStartsAtClock: 0,
					tombstones: makeTombstoneMap(MAX_TOMBSTONES),
				})
			)

			// Schedule the throttled function then force it to run
			storage.pruneTombstones()
			storage.pruneTombstones.flush()

			const snapshot = storage.getSnapshot()
			// Should not prune at exactly the threshold
			expect(Object.keys(snapshot.tombstones!).length).toBe(MAX_TOMBSTONES)
		})
	})

	describe('Migration from TEXT to BLOB', () => {
		it('migrates existing TEXT data to BLOB format', () => {
			// Simulate a database created with the old schema (migration version 1, TEXT column)
			const db = new DatabaseSync(':memory:')

			// Create old schema with TEXT column (migration version 1)
			db.exec(`
				CREATE TABLE documents (
					id TEXT PRIMARY KEY,
					state TEXT NOT NULL,
					lastChangedClock INTEGER NOT NULL
				);
				CREATE INDEX idx_documents_lastChangedClock ON documents(lastChangedClock);
				CREATE TABLE tombstones (
					id TEXT PRIMARY KEY,
					clock INTEGER NOT NULL
				);
				CREATE INDEX idx_tombstones_clock ON tombstones(clock);
				CREATE TABLE metadata (
					migrationVersion INTEGER NOT NULL,
					documentClock INTEGER NOT NULL,
					tombstoneHistoryStartsAtClock INTEGER NOT NULL,
					schema TEXT NOT NULL
				);
				INSERT INTO metadata (migrationVersion, documentClock, tombstoneHistoryStartsAtClock, schema)
				VALUES (1, 5, 0, '${JSON.stringify(tlSchema.serialize()).replace(/'/g, "''")}');
			`)

			// Insert documents using the old TEXT format
			const doc1 = DocumentRecordType.create({ id: TLDOCUMENT_ID })
			const page1 = PageRecordType.create({
				id: PageRecordType.createId('migrated_page'),
				name: 'Migrated Page',
				index: ZERO_INDEX_KEY,
			})

			const insertStmt = db.prepare(
				'INSERT INTO documents (id, state, lastChangedClock) VALUES (?, ?, ?)'
			)
			insertStmt.run(doc1.id, JSON.stringify(doc1), 1)
			insertStmt.run(page1.id, JSON.stringify(page1), 2)

			// Add a tombstone
			db.exec("INSERT INTO tombstones (id, clock) VALUES ('shape:deleted', 3)")

			// Now create SQLiteSyncStorage which should trigger the migration
			const sql = new NodeSqliteWrapper(db)
			const storage = new SQLiteSyncStorage<TLRecord>({ sql })

			// Verify data is accessible after migration
			const snapshot = storage.getSnapshot()
			expect(snapshot.documents.length).toBe(2)
			expect(snapshot.documentClock).toBe(5)
			expect(snapshot.tombstones?.['shape:deleted']).toBe(3)

			// Verify we can read specific records
			storage.transaction((txn) => {
				const doc = txn.get(TLDOCUMENT_ID)
				expect(doc).toBeDefined()
				expect(doc?.id).toBe(TLDOCUMENT_ID)

				const page = txn.get(page1.id)
				expect(page).toBeDefined()
				expect((page as any)?.name).toBe('Migrated Page')
			})

			// Verify we can still write new records
			const newPage = PageRecordType.create({
				id: PageRecordType.createId('new_after_migration'),
				name: 'New After Migration',
				index: 'a2' as IndexKey,
			})

			storage.transaction((txn) => {
				txn.set(newPage.id, newPage)
			})

			const snapshotAfter = storage.getSnapshot()
			expect(snapshotAfter.documents.length).toBe(3)
			expect(snapshotAfter.documents.find((d) => d.state.id === newPage.id)).toBeDefined()
		})

		it('preserves migration version 2 for fresh databases', () => {
			const sql = createWrapper()
			new SQLiteSyncStorage<TLRecord>({ sql, snapshot: makeSnapshot(defaultRecords) })

			// Check the migration version is 2
			const row = sql
				.prepare<{ migrationVersion: number }>('SELECT migrationVersion FROM metadata')
				.all()[0]
			expect(row?.migrationVersion).toBe(2)
		})
	})

	describe('Schema migrations via migrateStorage', () => {
		/**
		 * Regression test for a bug where record-level migrations were applied multiple
		 * times to the same record when using SQLite storage.
		 *
		 * Root cause: SQLite iterators are live cursors. When a record is updated via
		 * storage.set(), the lastChangedClock column changes, which can reposition the
		 * row in the B-tree index and cause it to be visited again by the iterator.
		 *
		 * Fix: migrateStorage now collects updates during iteration and applies them
		 * after the iteration completes.
		 */
		it('should apply record migrations exactly once per record', () => {
			// Track how many times each record is migrated
			const migrationCounts = new Map<string, number>()

			interface TestRecord extends BaseRecord<'test', RecordId<TestRecord>> {
				value: number
				migrated?: boolean
			}

			const TestRecordType = createRecordType<TestRecord>('test', {
				validator: { validate: (r) => r as TestRecord },
				scope: 'document',
			})

			const testMigrations = createMigrationSequence({
				sequenceId: 'com.test.record',
				retroactive: true,
				sequence: [
					{
						id: 'com.test.record/1',
						scope: 'record',
						filter: (r: any) => r.typeName === 'test',
						up: (record: any) => {
							// Track how many times this record is migrated
							const count = migrationCounts.get(record.id) ?? 0
							migrationCounts.set(record.id, count + 1)
							record.migrated = true
						},
					},
				],
			})

			const oldSchema = StoreSchema.create({ test: TestRecordType })
			const newSchema = StoreSchema.create(
				{ test: TestRecordType },
				{ migrations: [testMigrations] }
			)

			// Create storage with the old schema (no migrations applied)
			const sql = createWrapper()
			const numRecords = 100

			// Build initial snapshot with many test records
			const testRecords: TestRecord[] = []
			for (let i = 0; i < numRecords; i++) {
				testRecords.push({
					id: `test:${i}` as RecordId<TestRecord>,
					typeName: 'test',
					value: i,
				})
			}

			const snapshot = {
				documents: testRecords.map((r) => ({ state: r, lastChangedClock: 0 })),
				clock: 0,
				documentClock: 0,
				schema: oldSchema.serialize(),
			}

			const storage = new SQLiteSyncStorage<TestRecord>({ sql, snapshot })

			// Run the migration within a transaction
			storage.transaction((txn) => {
				newSchema.migrateStorage(txn)
			})

			// Verify each record was migrated exactly once
			const migrationCountValues = Array.from(migrationCounts.values())
			const recordsMigratedMoreThanOnce = migrationCountValues.filter((count) => count > 1)

			// This assertion ensures migrations are applied exactly once per record
			expect(recordsMigratedMoreThanOnce).toEqual([])

			// Additional check: verify the total number of migrations equals number of records
			expect(migrationCounts.size).toBe(numRecords)
			for (const [_id, count] of migrationCounts) {
				expect(count).toBe(1)
			}

			// Verify all records now have the migrated flag
			const finalSnapshot = storage.getSnapshot()
			for (const doc of finalSnapshot.documents) {
				expect((doc.state as TestRecord).migrated).toBe(true)
			}
		})
	})
})

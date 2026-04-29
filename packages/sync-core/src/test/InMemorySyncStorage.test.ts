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
import { vi } from 'vitest'
import {
	InMemorySyncStorage,
	MAX_TOMBSTONES,
	TOMBSTONE_PRUNE_BUFFER_SIZE,
} from '../lib/InMemorySyncStorage'
import { RoomSnapshot } from '../lib/TLSyncRoom'
import { convertStoreSnapshotToRoomSnapshot, loadSnapshotIntoStorage } from '../lib/TLSyncStorage'

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

describe('InMemorySyncStorage', () => {
	describe('Constructor', () => {
		it('initializes documents from snapshot', () => {
			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(defaultRecords) })

			expect(storage.documents.size).toBe(2)
			expect(storage.documents.get(TLDOCUMENT_ID)?.state.id).toBe(TLDOCUMENT_ID)
		})

		it('initializes schema from snapshot', () => {
			const snapshot = makeSnapshot(defaultRecords)
			const storage = new InMemorySyncStorage<TLRecord>({ snapshot })

			expect(storage.schema.get()).toEqual(snapshot.schema)
		})

		it('initializes documentClock from snapshot', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, { documentClock: 42 }),
			})

			expect(storage.getClock()).toBe(42)
		})

		it('falls back to clock when documentClock is not present (legacy snapshot)', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeLegacySnapshot(defaultRecords, { clock: 15 }) as RoomSnapshot,
			})

			expect(storage.getClock()).toBe(15)
		})

		it('falls back to 0 when neither documentClock nor clock is present', () => {
			const snapshot = {
				documents: defaultRecords.map((r) => ({ state: r, lastChangedClock: 0 })),
				schema: tlSchema.serialize(),
			} as RoomSnapshot

			const storage = new InMemorySyncStorage<TLRecord>({ snapshot })

			expect(storage.getClock()).toBe(0)
		})

		it('initializes tombstones from snapshot', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					tombstones: { 'shape:deleted1': 5, 'shape:deleted2': 10 },
					tombstoneHistoryStartsAtClock: 0,
					documentClock: 15,
				}),
			})

			expect(storage.tombstones.size).toBe(2)
			expect(storage.tombstones.get('shape:deleted1')).toBe(5)
			expect(storage.tombstones.get('shape:deleted2')).toBe(10)
		})

		it('skips tombstones when tombstoneHistoryStartsAtClock equals documentClock', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					tombstones: { 'shape:deleted1': 5 },
					tombstoneHistoryStartsAtClock: 15,
					documentClock: 15,
				}),
			})

			// Tombstones should be skipped since history starts at current clock
			expect(storage.tombstones.size).toBe(0)
		})

		it('sets tombstoneHistoryStartsAtClock from snapshot', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					tombstoneHistoryStartsAtClock: 5,
					documentClock: 10,
				}),
			})

			expect(storage.tombstoneHistoryStartsAtClock.get()).toBe(5)
		})

		it('defaults tombstoneHistoryStartsAtClock to documentClock when not provided', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, { documentClock: 20 }),
			})

			expect(storage.tombstoneHistoryStartsAtClock.get()).toBe(20)
		})

		it('handles empty documents array', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot([]),
			})

			expect(storage.documents.size).toBe(0)
		})
	})

	describe('Transaction', () => {
		describe('get()', () => {
			it('returns record by id', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				storage.transaction((txn) => {
					const doc = txn.get(TLDOCUMENT_ID)
					expect(doc).toBeDefined()
					expect(doc?.id).toBe(TLDOCUMENT_ID)
				})
			})

			it('returns undefined for non-existent record', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				storage.transaction((txn) => {
					expect(txn.get('nonexistent')).toBeUndefined()
				})
			})
		})

		describe('set()', () => {
			it('creates new records', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				const newPage = PageRecordType.create({
					id: PageRecordType.createId('new_page'),
					name: 'New Page',
					index: 'a2' as IndexKey,
				})

				storage.transaction((txn) => {
					txn.set(newPage.id, newPage)
				})

				expect(storage.documents.size).toBe(3)
				expect(storage.documents.get(newPage.id)?.state).toEqual(newPage)
			})

			it('updates existing records', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				const pageId = PageRecordType.createId('page_1')
				const updatedPage = PageRecordType.create({
					id: pageId,
					name: 'Updated Page',
					index: ZERO_INDEX_KEY,
				})

				storage.transaction((txn) => {
					txn.set(pageId, updatedPage)
				})

				expect(storage.documents.get(pageId)?.state).toEqual(updatedPage)
			})

			it('clears tombstone when re-creating a deleted record', () => {
				const pageId = PageRecordType.createId('page_to_delete')
				const page = PageRecordType.create({
					id: pageId,
					name: 'Page',
					index: 'a2' as IndexKey,
				})

				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot([...defaultRecords, page]),
				})

				// Delete the page
				storage.transaction((txn) => {
					txn.delete(pageId)
				})

				expect(storage.tombstones.has(pageId)).toBe(true)
				expect(storage.documents.has(pageId)).toBe(false)

				// Re-create the page
				storage.transaction((txn) => {
					txn.set(pageId, page)
				})

				expect(storage.tombstones.has(pageId)).toBe(false)
				expect(storage.documents.has(pageId)).toBe(true)
			})

			it('sets lastChangedClock to the incremented clock', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, { documentClock: 5 }),
				})

				const newPage = PageRecordType.create({
					id: PageRecordType.createId('new_page'),
					name: 'New Page',
					index: 'a2' as IndexKey,
				})

				storage.transaction((txn) => {
					txn.set(newPage.id, newPage)
				})

				expect(storage.documents.get(newPage.id)?.lastChangedClock).toBe(6)
			})
		})

		describe('delete()', () => {
			it('removes records', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				const pageId = PageRecordType.createId('page_1')

				storage.transaction((txn) => {
					txn.delete(pageId)
				})

				expect(storage.documents.has(pageId)).toBe(false)
			})

			it('creates tombstones', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, { documentClock: 10 }),
				})

				const pageId = PageRecordType.createId('page_1')

				storage.transaction((txn) => {
					txn.delete(pageId)
				})

				expect(storage.tombstones.has(pageId)).toBe(true)
				expect(storage.tombstones.get(pageId)).toBe(11) // clock incremented to 11
			})
		})

		describe('getClock()', () => {
			it('returns current clock at start of transaction', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, { documentClock: 42 }),
				})

				storage.transaction((txn) => {
					expect(txn.getClock()).toBe(42)
				})
			})

			it('returns incremented clock after a write', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, { documentClock: 42 }),
				})

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
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, { documentClock: 10 }),
				})

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
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				storage.transaction((txn) => {
					const entries = Array.from(txn.entries())
					expect(entries.length).toBe(2)
					expect(entries.map(([id]) => id).sort()).toEqual(defaultRecords.map((r) => r.id).sort())
				})
			})
		})

		describe('keys()', () => {
			it('iterates over all document ids', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				storage.transaction((txn) => {
					const keys = Array.from(txn.keys())
					expect(keys.sort()).toEqual(defaultRecords.map((r) => r.id).sort())
				})
			})
		})

		describe('values()', () => {
			it('iterates over all document states', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				storage.transaction((txn) => {
					const values = Array.from(txn.values())
					expect(values.length).toBe(2)
					expect(values.map((v) => v.id).sort()).toEqual(defaultRecords.map((r) => r.id).sort())
				})
			})
		})

		describe('iterator consumption after transaction ends', () => {
			it('throws when entries() iterator is consumed after transaction ends', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

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
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				let iterator: Iterator<string>

				storage.transaction((txn) => {
					iterator = txn.keys()[Symbol.iterator]()
					iterator.next()
				})

				expect(() => iterator.next()).toThrow('Transaction has ended')
			})

			it('throws when values() iterator is consumed after transaction ends', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				let iterator: Iterator<TLRecord>

				storage.transaction((txn) => {
					iterator = txn.values()[Symbol.iterator]()
					iterator.next()
				})

				expect(() => iterator.next()).toThrow('Transaction has ended')
			})

			it('allows full consumption of iterator within transaction', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

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
				const snapshot = makeSnapshot(defaultRecords)
				const storage = new InMemorySyncStorage<TLRecord>({ snapshot })

				storage.transaction((txn) => {
					expect(txn.getSchema()).toEqual(snapshot.schema)
				})
			})

			it('sets the schema', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				const newSchema = { ...tlSchema.serialize(), schemaVersion: 99 as any }

				storage.transaction((txn) => {
					txn.setSchema(newSchema)
				})

				expect(storage.schema.get().schemaVersion).toBe(99)
			})
		})

		describe('transaction result', () => {
			it('returns result from callback', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				const { result } = storage.transaction((txn) => {
					return txn.get(TLDOCUMENT_ID)
				})

				expect(result?.id).toBe(TLDOCUMENT_ID)
			})

			it('returns didChange: false when no writes occur', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				const { didChange, documentClock } = storage.transaction((txn) => {
					txn.get(TLDOCUMENT_ID)
				})

				expect(didChange).toBe(false)
				expect(documentClock).toBe(0)
			})

			it('returns didChange: true when writes occur', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

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
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				expect(() => {
					storage.transaction(() => Promise.resolve() as any)
				}).toThrow('Transaction must return a value, not a promise')
				consoleSpy.mockRestore()
			})
		})
	})

	describe('getChangesSince', () => {
		it('returns puts for records changed after sinceClock', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					documents: [
						{ state: defaultRecords[0], lastChangedClock: 5 },
						{ state: defaultRecords[1], lastChangedClock: 10 },
					],
					documentClock: 15,
					tombstoneHistoryStartsAtClock: 0,
				}),
			})

			storage.transaction((txn) => {
				const changes = txn.getChangesSince(7)!
				const puts = Object.values(changes.diff.puts)

				expect(puts.length).toBe(1)
				expect((puts[0] as TLRecord).id).toBe(defaultRecords[1].id) // only record with clock 10 > 7
				expect(changes.wipeAll).toBe(false)
			})
		})

		it('returns all records when sinceClock is before all changes', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					documents: [
						{ state: defaultRecords[0], lastChangedClock: 5 },
						{ state: defaultRecords[1], lastChangedClock: 10 },
					],
					documentClock: 15,
					tombstoneHistoryStartsAtClock: 0,
				}),
			})

			storage.transaction((txn) => {
				const changes = txn.getChangesSince(0)!
				const puts = Object.values(changes.diff.puts)

				expect(puts.length).toBe(2)
			})
		})

		it('returns deletes for tombstones after sinceClock', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					tombstones: {
						'shape:deleted1': 5,
						'shape:deleted2': 12,
					},
					documentClock: 15,
					tombstoneHistoryStartsAtClock: 0,
				}),
			})

			storage.transaction((txn) => {
				const changes = txn.getChangesSince(7)!

				expect(changes.diff.deletes).toEqual(['shape:deleted2']) // only tombstone with clock 12 > 7
			})
		})

		it('returns wipeAll: true when sinceClock < tombstoneHistoryStartsAtClock', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					documentClock: 20,
					tombstoneHistoryStartsAtClock: 10,
				}),
			})

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
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					documentClock: 20,
					tombstoneHistoryStartsAtClock: 10,
				}),
			})

			storage.transaction((txn) => {
				const changes = txn.getChangesSince(15)!

				expect(changes.wipeAll).toBe(false)
			})
		})

		it('returns undefined when no changes since clock', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					documents: [
						{ state: defaultRecords[0], lastChangedClock: 5 },
						{ state: defaultRecords[1], lastChangedClock: 10 },
					],
					documentClock: 15,
					tombstoneHistoryStartsAtClock: 0,
				}),
			})

			storage.transaction((txn) => {
				const changes = txn.getChangesSince(15)
				expect(changes).toBeUndefined()
			})
		})
	})

	describe('onChange', () => {
		it('notifies listeners after changes', async () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords),
			})

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
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, { documentClock: 10 }),
			})

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
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords),
			})

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
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords),
			})

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
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords),
			})

			const listener = vi.fn()
			storage.onChange(listener)

			await Promise.resolve()

			storage.transaction((txn) => {
				txn.get(TLDOCUMENT_ID) // read only
			})

			await Promise.resolve()

			expect(listener).not.toHaveBeenCalled()
		})

		it('listener registered during same callstack does not receive preceding changes', async () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords),
			})

			const newPage = PageRecordType.create({
				id: PageRecordType.createId('new'),
				name: 'New',
				index: 'a2' as IndexKey,
			})

			// Make a change
			storage.transaction((txn) => {
				txn.set(newPage.id, newPage)
			})

			// Register listener in same callstack as the change
			const listener = vi.fn()
			storage.onChange(listener)

			// Wait for all microtasks
			await Promise.resolve()
			// Listener should not have received the earlier change
			expect(listener).not.toHaveBeenCalled()

			// perform a read-only transaction
			storage.transaction((txn) => {
				txn.get(newPage.id)
			})
			await Promise.resolve()

			// Listener should still not have received the earlier change
			expect(listener).not.toHaveBeenCalled()

			// perform a write transaction with id
			storage.transaction(
				(txn) => {
					txn.set(newPage.id, newPage)
				},
				{ id: 'my-transaction-id' }
			)

			await Promise.resolve()

			// Listener should have received the change
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'my-transaction-id',
				})
			)
		})

		it('unsubscribe before registration prevents registration', async () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords),
			})

			const listener = vi.fn()
			const unsubscribe = storage.onChange(listener)

			const newPage = PageRecordType.create({
				id: PageRecordType.createId('new'),
				name: 'New',
				index: 'a2' as IndexKey,
			})

			storage.transaction((txn) => {
				txn.set(newPage.id, newPage)
			})

			// Unsubscribe before the microtask runs
			unsubscribe()

			await Promise.resolve()

			expect(listener).not.toHaveBeenCalled()

			storage.transaction((txn) => {
				txn.set(newPage.id, { ...newPage, name: 'Updated' } as TLRecord)
			})

			await Promise.resolve()

			expect(listener).not.toHaveBeenCalled()
		})
	})

	describe('getSnapshot', () => {
		it('returns correct snapshot structure', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					documentClock: 15,
					tombstoneHistoryStartsAtClock: 5,
					tombstones: { 'shape:deleted': 10 },
				}),
			})

			const snapshot = storage.getSnapshot()

			expect(snapshot.documentClock).toBe(15)
			expect(snapshot.tombstoneHistoryStartsAtClock).toBe(5)
			expect(snapshot.documents.length).toBe(2)
			expect(snapshot.tombstones).toEqual({ 'shape:deleted': 10 })
			expect(snapshot.schema).toEqual(tlSchema.serialize())
		})

		it('reflects changes from transactions', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, { documentClock: 0 }),
			})

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

	describe('pruneTombstones', () => {
		it('does not prune when below MAX_TOMBSTONES', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					documentClock: 0,
					tombstoneHistoryStartsAtClock: 0,
				}),
			})

			// Add tombstones below threshold
			for (let i = 0; i < Math.floor(MAX_TOMBSTONES / 2); i++) {
				storage.tombstones.set(`doc${i}`, i + 1)
			}

			const initialSize = storage.tombstones.size
			const initialHistoryClock = storage.tombstoneHistoryStartsAtClock.get()

			// Schedule the throttled function then force it to run
			// (leading: false means first call schedules, flush forces execution)
			storage.pruneTombstones()
			storage.pruneTombstones.flush()

			expect(storage.tombstones.size).toBe(initialSize)
			expect(storage.tombstoneHistoryStartsAtClock.get()).toBe(initialHistoryClock)
		})

		it('prunes when exceeding MAX_TOMBSTONES', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					documentClock: 0,
					tombstoneHistoryStartsAtClock: 0,
				}),
			})

			// Add more than MAX_TOMBSTONES
			const totalTombstones = MAX_TOMBSTONES + 500
			for (let i = 0; i < totalTombstones; i++) {
				storage.tombstones.set(`doc${i}`, i + 1)
			}

			expect(storage.tombstones.size).toBe(totalTombstones)

			// Schedule the throttled function then force it to run
			storage.pruneTombstones()
			storage.pruneTombstones.flush()

			expect(storage.tombstones.size).toBeLessThan(totalTombstones)
			expect(storage.tombstones.size).toBeLessThanOrEqual(
				MAX_TOMBSTONES - TOMBSTONE_PRUNE_BUFFER_SIZE
			)
			expect(storage.tombstoneHistoryStartsAtClock.get()).toBeGreaterThan(0)
		})

		it('updates tombstoneHistoryStartsAtClock correctly', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					documentClock: 10000,
					tombstoneHistoryStartsAtClock: 0,
				}),
			})

			// Add more than MAX_TOMBSTONES with sequential clock values
			const totalTombstones = MAX_TOMBSTONES * 2
			for (let i = 0; i < totalTombstones; i++) {
				storage.tombstones.set(`doc${i}`, i + 1)
			}

			const initialHistoryClock = storage.tombstoneHistoryStartsAtClock.get()

			// Schedule the throttled function then force it to run
			storage.pruneTombstones()
			storage.pruneTombstones.flush()

			// History clock should have advanced
			expect(storage.tombstoneHistoryStartsAtClock.get()).toBeGreaterThan(initialHistoryClock)

			// The algorithm deletes the OLDEST tombstones and keeps the NEWEST ones.
			// tombstoneHistoryStartsAtClock is set to the oldest REMAINING clock.
			// Remaining tombstones have clocks >= tombstoneHistoryStartsAtClock.
			const historyClock = storage.tombstoneHistoryStartsAtClock.get()
			for (const [, clock] of storage.tombstones.entries()) {
				expect(clock).toBeGreaterThanOrEqual(historyClock)
			}
		})

		it('handles duplicate clock values across tombstones', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					documentClock: 3,
					tombstoneHistoryStartsAtClock: 0,
				}),
			})

			// Add tombstones with repeating clock values (10 per clock)
			const totalTombstones = MAX_TOMBSTONES + 1
			const expectedCutoff = TOMBSTONE_PRUNE_BUFFER_SIZE + 1
			const overflow = 10
			const boundary = expectedCutoff + overflow
			const lowerClockVal = 1
			const upperClockVal = 2
			for (let i = 0; i < totalTombstones; i++) {
				if (i < boundary) {
					storage.tombstones.set(`doc${i}`, lowerClockVal)
				} else {
					storage.tombstones.set(`doc${i}`, upperClockVal)
				}
			}

			// Schedule the throttled function then force it to run
			storage.pruneTombstones()
			storage.pruneTombstones.flush()

			expect(storage.tombstones.size).toEqual(
				MAX_TOMBSTONES - TOMBSTONE_PRUNE_BUFFER_SIZE - overflow
			)
			expect([...storage.tombstones.values()].every((clock) => clock === upperClockVal)).toBe(true)
		})

		it('handles all tombstones with same clock value', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					documentClock: 1000,
					tombstoneHistoryStartsAtClock: 0,
				}),
			})

			// Add tombstones all with the same clock value
			const totalTombstones = MAX_TOMBSTONES * 2
			const sameClock = 100
			for (let i = 0; i < totalTombstones; i++) {
				storage.tombstones.set(`doc${i}`, sameClock)
			}

			// Schedule the throttled function then force it to run
			storage.pruneTombstones()
			storage.pruneTombstones.flush()

			// When all have same clock, the cutoff extends to include all of them,
			// so all are pruned and history starts at documentClock
			expect(storage.tombstones.size).toBe(0)
			expect(storage.tombstoneHistoryStartsAtClock.get()).toBe(1000) // documentClock
		})

		it('does not prune at exactly MAX_TOMBSTONES', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, {
					documentClock: 0,
					tombstoneHistoryStartsAtClock: 0,
				}),
			})

			// Add exactly MAX_TOMBSTONES
			for (let i = 0; i < MAX_TOMBSTONES; i++) {
				storage.tombstones.set(`doc${i}`, i + 1)
			}

			// Schedule the throttled function then force it to run
			storage.pruneTombstones()
			storage.pruneTombstones.flush()

			// Should not prune at exactly the threshold
			expect(storage.tombstones.size).toBe(MAX_TOMBSTONES)
		})
	})

	describe('loadSnapshotIntoStorage', () => {
		it('loads records from snapshot', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot([]),
			})

			const newSnapshot = makeSnapshot(defaultRecords)

			storage.transaction((txn) => {
				loadSnapshotIntoStorage(txn, tlSchema, newSnapshot)
			})

			expect(storage.documents.size).toBe(2)
		})

		it('deletes records not in snapshot', () => {
			const extraPage = PageRecordType.create({
				id: PageRecordType.createId('extra'),
				name: 'Extra',
				index: 'a2' as IndexKey,
			})

			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot([...defaultRecords, extraPage]),
			})

			expect(storage.documents.size).toBe(3)

			// Load a snapshot without the extra page
			const newSnapshot = makeSnapshot(defaultRecords)

			storage.transaction((txn) => {
				loadSnapshotIntoStorage(txn, tlSchema, newSnapshot)
			})

			expect(storage.documents.size).toBe(2)
			expect(storage.documents.has(extraPage.id)).toBe(false)
			expect(storage.tombstones.has(extraPage.id)).toBe(true)
		})

		it('sets schema from snapshot', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords),
			})

			const newSnapshot = makeSnapshot(defaultRecords)

			storage.transaction((txn) => {
				loadSnapshotIntoStorage(txn, tlSchema, newSnapshot)
			})

			expect(storage.schema.get()).toEqual(newSnapshot.schema)
		})

		it('does not update unchanged records', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords, { documentClock: 5 }),
			})

			const initialClock = storage.getClock()

			// Load the same snapshot
			const sameSnapshot = makeSnapshot(defaultRecords)

			storage.transaction((txn) => {
				loadSnapshotIntoStorage(txn, tlSchema, sameSnapshot)
			})

			// Clock should not have changed since records were equal
			expect(storage.getClock()).toBe(initialClock)
		})

		it('throws when snapshot has no schema', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeSnapshot(defaultRecords),
			})

			const invalidSnapshot = {
				documents: [],
				clock: 0,
			} as any

			expect(() => {
				storage.transaction((txn) => {
					loadSnapshotIntoStorage(txn, tlSchema, invalidSnapshot)
				})
			}).toThrow('Schema is required')
			consoleSpy.mockRestore()
		})
	})

	describe('convertStoreSnapshotToRoomSnapshot', () => {
		it('passes through RoomSnapshot unchanged', () => {
			const roomSnapshot = makeSnapshot(defaultRecords, { documentClock: 42 })

			const result = convertStoreSnapshotToRoomSnapshot(roomSnapshot)

			expect(result).toBe(roomSnapshot)
		})

		it('converts TLStoreSnapshot to RoomSnapshot', () => {
			const storeSnapshot = {
				store: {
					[TLDOCUMENT_ID]: defaultRecords[0],
					[defaultRecords[1].id]: defaultRecords[1],
				},
				schema: tlSchema.serialize(),
			}

			const result = convertStoreSnapshotToRoomSnapshot(storeSnapshot)

			expect(result.clock).toBe(0)
			expect(result.documentClock).toBe(0)
			expect(result.documents.length).toBe(2)
			expect(result.documents[0].lastChangedClock).toBe(0)
			expect(result.tombstones).toEqual({})
			expect(result.schema).toEqual(storeSnapshot.schema)
		})

		it('sets all documents with lastChangedClock: 0', () => {
			const storeSnapshot = {
				store: {
					[TLDOCUMENT_ID]: defaultRecords[0],
					[defaultRecords[1].id]: defaultRecords[1],
				},
				schema: tlSchema.serialize(),
			}

			const result = convertStoreSnapshotToRoomSnapshot(storeSnapshot)

			for (const doc of result.documents) {
				expect(doc.lastChangedClock).toBe(0)
			}
		})
	})

	describe('Edge cases', () => {
		describe('Transaction error handling', () => {
			it('does not increment clock if transaction throws', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, { documentClock: 10 }),
				})

				expect(() => {
					storage.transaction(() => {
						throw new Error('Oops!')
					})
				}).toThrow('Oops!')

				// Clock should not have changed
				expect(storage.getClock()).toBe(10)
				consoleSpy.mockRestore()
			})

			it('rolls back changes if transaction throws after a write', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, { documentClock: 10 }),
				})

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

				// Document should not have been added
				expect(storage.documents.has(newPage.id)).toBe(false)
				// Clock should not have changed
				expect(storage.getClock()).toBe(10)
				consoleSpy.mockRestore()
			})
		})

		describe('Deleting non-existent records', () => {
			it('does not create a tombstone for records that never existed', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, { documentClock: 5 }),
				})

				storage.transaction((txn) => {
					txn.delete('nonexistent:record')
				})

				// No tombstone should be created for a record that never existed
				expect(storage.tombstones.has('nonexistent:record')).toBe(false)
				// Clock should not be incremented since nothing changed
				expect(storage.getClock()).toBe(5)
			})

			it('does not increment clock when deleting non-existent record', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, { documentClock: 10 }),
				})

				const { didChange, documentClock } = storage.transaction((txn) => {
					txn.delete('nonexistent:record')
				})

				expect(didChange).toBe(false)
				expect(documentClock).toBe(10)
			})
		})

		describe('Set with mismatched ID', () => {
			it('throws when key does not match record.id', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

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
				consoleSpy.mockRestore()
			})

			it('succeeds when key matches record.id', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				const page = PageRecordType.create({
					id: PageRecordType.createId('my_page'),
					name: 'Test',
					index: 'a2' as IndexKey,
				})

				// Store with matching key
				storage.transaction((txn) => {
					txn.set(page.id, page)
				})

				expect(storage.documents.has(page.id)).toBe(true)
				expect(storage.documents.get(page.id)?.state.id).toBe(page.id)
			})
		})

		describe('getChangesSince boundary conditions', () => {
			it('sinceClock exactly equal to tombstoneHistoryStartsAtClock is NOT wipeAll', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, {
						documentClock: 20,
						tombstoneHistoryStartsAtClock: 10,
					}),
				})

				storage.transaction((txn) => {
					// sinceClock === tombstoneHistoryStartsAtClock
					const changes = txn.getChangesSince(10)!
					expect(changes.wipeAll).toBe(false)
				})
			})

			it('sinceClock one less than tombstoneHistoryStartsAtClock IS wipeAll', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, {
						documentClock: 20,
						tombstoneHistoryStartsAtClock: 10,
					}),
				})

				storage.transaction((txn) => {
					const changes = txn.getChangesSince(9)!
					expect(changes.wipeAll).toBe(true)
				})
			})

			it('handles negative sinceClock', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, {
						documentClock: 10,
						tombstoneHistoryStartsAtClock: 0,
					}),
				})

				storage.transaction((txn) => {
					const changes = txn.getChangesSince(-1)!
					// -1 < 0, so wipeAll should be true
					expect(changes.wipeAll).toBe(true)
					// All documents should be returned
					expect(Object.values(changes.diff.puts).length).toBe(2)
				})
			})

			it('returns undefined when sinceClock equals current documentClock', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, {
						documents: [
							{ state: defaultRecords[0], lastChangedClock: 5 },
							{ state: defaultRecords[1], lastChangedClock: 10 },
						],
						documentClock: 10,
						tombstoneHistoryStartsAtClock: 0,
					}),
				})

				storage.transaction((txn) => {
					const changes = txn.getChangesSince(10)
					expect(changes).toBeUndefined()
				})
			})

			it('returns all changes when sinceClock is greater than documentClock', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, { documentClock: 10 }),
				})

				storage.transaction((txn) => {
					const changes = txn.getChangesSince(100)!
					expect(Object.values(changes.diff.puts).length).toBe(2)
					expect(changes.wipeAll).toBe(true)
				})
			})
		})

		describe('onChange callback edge cases', () => {
			it('handles unsubscribe called during callback', async () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				let unsubscribe = () => {}
				const listener = vi.fn(() => {
					unsubscribe()
				})

				unsubscribe = storage.onChange(listener)

				await Promise.resolve()

				const newPage = PageRecordType.create({
					id: PageRecordType.createId('new'),
					name: 'New',
					index: 'a2' as IndexKey,
				})

				// First change
				storage.transaction((txn) => {
					txn.set(newPage.id, newPage)
				})

				await Promise.resolve()

				expect(listener).toHaveBeenCalledTimes(1)

				// Second change - listener should NOT be called
				storage.transaction((txn) => {
					txn.delete(newPage.id)
				})

				await Promise.resolve()

				expect(listener).toHaveBeenCalledTimes(1)
			})
		})

		describe('Snapshot consistency edge cases', () => {
			it('clamps tombstoneHistoryStartsAtClock to documentClock when greater', () => {
				// When tombstoneHistoryStartsAtClock > documentClock, it gets clamped
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, {
						documentClock: 5,
						tombstoneHistoryStartsAtClock: 10, // Invalid: greater than documentClock
					}),
				})

				// Should be clamped to documentClock
				expect(storage.tombstoneHistoryStartsAtClock.get()).toBe(5)
				expect(storage.getClock()).toBe(5)
			})

			it('accepts tombstoneHistoryStartsAtClock equal to documentClock', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, {
						documentClock: 10,
						tombstoneHistoryStartsAtClock: 10,
					}),
				})

				expect(storage.getClock()).toBe(10)
				expect(storage.tombstoneHistoryStartsAtClock.get()).toBe(10)
			})

			it('accepts tombstoneHistoryStartsAtClock less than documentClock', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, {
						documentClock: 20,
						tombstoneHistoryStartsAtClock: 5,
					}),
				})

				expect(storage.getClock()).toBe(20)
				expect(storage.tombstoneHistoryStartsAtClock.get()).toBe(5)
			})

			it('handles duplicate document IDs in snapshot - last one wins', () => {
				const page1 = PageRecordType.create({
					id: PageRecordType.createId('dupe'),
					name: 'First',
					index: 'a1' as IndexKey,
				})
				const page2 = PageRecordType.create({
					id: PageRecordType.createId('dupe'),
					name: 'Second',
					index: 'a2' as IndexKey,
				})

				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: {
						documents: [
							{ state: page1, lastChangedClock: 1 },
							{ state: page2, lastChangedClock: 2 },
						],
						documentClock: 5,
						schema: tlSchema.serialize(),
					},
				})

				// Last one wins due to Map behavior
				expect(storage.documents.get('page:dupe')?.state).toEqual(page2)
				expect(storage.documents.get('page:dupe')?.lastChangedClock).toBe(2)
			})
		})

		describe('loadSnapshotIntoStorage edge cases', () => {
			it('deletes while iterating over keys', () => {
				const extraPage1 = PageRecordType.create({
					id: PageRecordType.createId('extra1'),
					name: 'Extra1',
					index: 'a2' as IndexKey,
				})
				const extraPage2 = PageRecordType.create({
					id: PageRecordType.createId('extra2'),
					name: 'Extra2',
					index: 'a3' as IndexKey,
				})

				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot([...defaultRecords, extraPage1, extraPage2]),
				})

				expect(storage.documents.size).toBe(4)

				// Load a snapshot with only the default records
				const newSnapshot = makeSnapshot(defaultRecords)

				storage.transaction((txn) => {
					loadSnapshotIntoStorage(txn, tlSchema, newSnapshot)
				})

				// Both extra pages should be deleted
				expect(storage.documents.size).toBe(2)
				expect(storage.documents.has(extraPage1.id)).toBe(false)
				expect(storage.documents.has(extraPage2.id)).toBe(false)
			})
		})

		describe('Record immutability', () => {
			it('freezes records stored via set()', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				const page = PageRecordType.create({
					id: PageRecordType.createId('mutable'),
					name: 'Original',
					index: 'a2' as IndexKey,
				})

				storage.transaction((txn) => {
					txn.set(page.id, page)
				})

				const stored = storage.documents.get(page.id)?.state as any

				// Records should be frozen
				expect(Object.isFrozen(stored)).toBe(true)
			})

			it('freezes records from constructor snapshot', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				const stored = storage.documents.get(TLDOCUMENT_ID)?.state as any

				expect(Object.isFrozen(stored)).toBe(true)
			})
		})

		describe('Clock overflow', () => {
			it('handles clock at MAX_SAFE_INTEGER', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, {
						documentClock: Number.MAX_SAFE_INTEGER - 1,
					}),
				})

				const newPage = PageRecordType.create({
					id: PageRecordType.createId('new'),
					name: 'New',
					index: 'a2' as IndexKey,
				})

				storage.transaction((txn) => {
					txn.set(newPage.id, newPage)
				})

				expect(storage.getClock()).toBe(Number.MAX_SAFE_INTEGER)

				// What happens if we try to increment past MAX_SAFE_INTEGER?
				storage.transaction((txn) => {
					txn.set(newPage.id, { ...newPage, name: 'Updated' } as TLRecord)
				})

				// Clock loses precision at MAX_SAFE_INTEGER + 1
				expect(storage.getClock()).toBe(Number.MAX_SAFE_INTEGER + 1)
			})
		})

		describe('Empty and special IDs', () => {
			it('handles empty string as record ID', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords),
				})

				// Create a record with empty string id (unusual but possible)
				const weirdRecord = { ...defaultRecords[0], id: '' } as TLRecord

				storage.transaction((txn) => {
					txn.set('', weirdRecord)
				})

				expect(storage.documents.has('')).toBe(true)
				expect(storage.documents.get('')?.state.id).toBe('')
			})
		})

		describe('Transaction result consistency', () => {
			it('didChange reflects whether clock was incremented', () => {
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, { documentClock: 10 }),
				})

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
				const storage = new InMemorySyncStorage<TLRecord>({
					snapshot: makeSnapshot(defaultRecords, { documentClock: 5 }),
				})

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

	describe('Schema migrations via migrateStorage', () => {
		it('should apply record migrations exactly once per record', () => {
			// This test verifies that record-level migrations are applied exactly once
			// per record, not multiple times due to iterator issues.

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

			const storage = new InMemorySyncStorage<TestRecord>({ snapshot })

			// Run the migration within a transaction
			storage.transaction((txn) => {
				newSchema.migrateStorage(txn)
			})

			// Verify each record was migrated exactly once
			const migrationCountValues = Array.from(migrationCounts.values())
			const recordsMigratedMoreThanOnce = migrationCountValues.filter((count) => count > 1)

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

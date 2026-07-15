import { DocumentRecordType, PageRecordType, TLDOCUMENT_ID, TLRecord } from '@tldraw/tlschema'
import { createTLSchema } from '@tldraw/tlschema'
import { IndexKey, ZERO_INDEX_KEY } from '@tldraw/utils'
import { vi } from 'vitest'
import { MAX_TOMBSTONES, TOMBSTONE_PRUNE_BUFFER_SIZE } from '../lib/InMemorySyncStorage'
import { RoomSnapshot } from '../lib/TLSyncRoom'
import { TLSyncStorage, TLSyncStorageOnChangeCallbackProps } from '../lib/TLSyncStorage'

export const contractSchema = createTLSchema()

export function makeContractSnapshot(
	records: TLRecord[],
	others: Partial<RoomSnapshot> = {}
): RoomSnapshot {
	return {
		documents: records.map((r) => ({ state: r, lastChangedClock: 0 })),
		clock: 0,
		documentClock: 0,
		schema: contractSchema.serialize(),
		...others,
	}
}

export const contractRecords = [
	DocumentRecordType.create({ id: TLDOCUMENT_ID }),
	PageRecordType.create({
		index: ZERO_INDEX_KEY,
		name: 'Page 1',
		id: PageRecordType.createId('page_1'),
	}),
]

export function makePage(id: string, name = id, index = 'a2') {
	return PageRecordType.create({
		id: PageRecordType.createId(id),
		name,
		index: index as IndexKey,
	})
}

export interface StorageContractFactory {
	create(opts?: {
		snapshot?: RoomSnapshot
		onChange?(arg: TLSyncStorageOnChangeCallbackProps): void
	}): TLSyncStorage<TLRecord>
}

/**
 * The shared behavior suite for the storage contract (SPEC.md section 10, SS rules).
 * Runs against both InMemorySyncStorage and SQLiteSyncStorage.
 */
export function registerStorageContractTests(factory: StorageContractFactory) {
	const create = (snapshot?: RoomSnapshot) => factory.create(snapshot ? { snapshot } : undefined)

	describe('storage contract', () => {
		it('[SS1] seeds from DEFAULT_INITIAL_SNAPSHOT when constructed without a snapshot', () => {
			const storage = factory.create()
			const snapshot = storage.getSnapshot!()
			expect(snapshot.documentClock).toBe(0)
			expect(snapshot.documents.map((d) => d.state.typeName).sort()).toEqual(['document', 'page'])
			expect(snapshot.documents.map((d) => d.lastChangedClock)).toEqual([0, 0])
		})

		describe('transactions', () => {
			it('[SS2] returns the callback result along with clock metadata', () => {
				const storage = create(makeContractSnapshot(contractRecords, { documentClock: 7 }))
				const res = storage.transaction((txn) => txn.get(TLDOCUMENT_ID))
				expect(res).toEqual({
					documentClock: 7,
					didChange: false,
					result: expect.objectContaining({ id: TLDOCUMENT_ID }),
					changes: undefined,
				})
			})

			it('[SS3] didChange is true exactly when the clock advanced', () => {
				const storage = create(makeContractSnapshot(contractRecords, { documentClock: 10 }))

				const read = storage.transaction((txn) => void txn.get(TLDOCUMENT_ID))
				expect(read.didChange).toBe(false)
				expect(read.documentClock).toBe(10)

				const write = storage.transaction((txn) =>
					txn.set(contractRecords[0].id, contractRecords[0])
				)
				expect(write.didChange).toBe(true)
				expect(write.documentClock).toBe(11)
				expect(storage.getClock()).toBe(11)
			})

			it('[SS4] a callback that returns a promise throws', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
				const storage = create(makeContractSnapshot(contractRecords))
				expect(() => storage.transaction(() => Promise.resolve() as any)).toThrow(
					'Transaction must return a value, not a promise'
				)
				consoleSpy.mockRestore()
			})

			it('[SS5] a throwing callback rolls back documents, tombstones, the schema, and the clock', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
				const storage = create(makeContractSnapshot(contractRecords, { documentClock: 10 }))
				const newPage = makePage('new')

				expect(() =>
					storage.transaction((txn) => {
						txn.set(newPage.id, newPage)
						txn.delete(contractRecords[1].id)
						txn.setSchema({ ...contractSchema.serialize(), schemaVersion: 99 as any })
						throw new Error('Oops after write!')
					})
				).toThrow('Oops after write!')

				const snapshot = storage.getSnapshot!()
				expect(storage.getClock()).toBe(10)
				expect(snapshot.documents.find((d) => d.state.id === newPage.id)).toBeUndefined()
				expect(snapshot.documents.find((d) => d.state.id === contractRecords[1].id)).toBeDefined()
				expect(snapshot.tombstones).toEqual({})
				expect(snapshot.schema).toEqual(contractSchema.serialize())
				consoleSpy.mockRestore()
			})

			it('[SS5] a throwing callback does not notify onChange', async () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
				const listener = vi.fn()
				const storage = factory.create({
					snapshot: makeContractSnapshot(contractRecords),
					onChange: listener,
				})
				await Promise.resolve()

				expect(() =>
					storage.transaction((txn) => {
						txn.set(contractRecords[1].id, { ...contractRecords[1], name: 'changed' } as TLRecord)
						throw new Error('rollback')
					})
				).toThrow('rollback')

				await Promise.resolve()
				await Promise.resolve()
				expect(listener).not.toHaveBeenCalled()
				consoleSpy.mockRestore()
			})

			it('[SS8] txn.getClock returns the start clock, then the incremented clock after a write', () => {
				const storage = create(makeContractSnapshot(contractRecords, { documentClock: 42 }))
				storage.transaction((txn) => {
					expect(txn.getClock()).toBe(42)
					const newPage = makePage('new')
					txn.set(newPage.id, newPage)
					expect(txn.getClock()).toBe(43)
				})
				expect(storage.getClock()).toBe(43)
			})

			it('[SS9] the clock increments exactly once per writing transaction', () => {
				const storage = create(makeContractSnapshot(contractRecords, { documentClock: 10 }))
				storage.transaction((txn) => {
					const p1 = makePage('p1', 'P1', 'a2')
					const p2 = makePage('p2', 'P2', 'a3')
					txn.set(p1.id, p1)
					expect(txn.getClock()).toBe(11)
					txn.set(p2.id, p2)
					expect(txn.getClock()).toBe(11)
					txn.delete(contractRecords[1].id)
					expect(txn.getClock()).toBe(11)
				})
				expect(storage.getClock()).toBe(11)
			})
		})

		describe('reads and writes', () => {
			it('[SS10] get returns the record, or undefined when absent', () => {
				const storage = create(makeContractSnapshot(contractRecords))
				storage.transaction((txn) => {
					expect(txn.get(TLDOCUMENT_ID)).toEqual(contractRecords[0])
					expect(txn.get('nonexistent')).toBeUndefined()
				})
			})

			it('[SS11] set creates and updates records, stamping lastChangedClock', () => {
				const storage = create(makeContractSnapshot(contractRecords, { documentClock: 5 }))
				const newPage = makePage('new_page', 'New Page')
				storage.transaction((txn) => {
					txn.set(newPage.id, newPage)
				})

				const entry = storage.getSnapshot!().documents.find((d) => d.state.id === newPage.id)
				expect(entry).toEqual({ state: newPage, lastChangedClock: 6 })

				const updated = { ...newPage, name: 'Updated' } as TLRecord
				storage.transaction((txn) => txn.set(newPage.id, updated))
				expect(storage.getSnapshot!().documents.find((d) => d.state.id === newPage.id)).toEqual({
					state: updated,
					lastChangedClock: 7,
				})
			})

			it('[SS11] set asserts that the key matches record.id', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
				const storage = create(makeContractSnapshot(contractRecords))
				const page = makePage('actual_id')
				expect(() =>
					storage.transaction((txn) => {
						txn.set('different:key', page)
					})
				).toThrow('Record id mismatch')
				consoleSpy.mockRestore()
			})

			it('[SS11] set clears the tombstone when re-creating a deleted record', () => {
				const page = makePage('page_to_delete')
				const storage = create(makeContractSnapshot([...contractRecords, page]))

				storage.transaction((txn) => txn.delete(page.id))
				expect(Object.keys(storage.getSnapshot!().tombstones!)).toEqual([page.id])

				storage.transaction((txn) => txn.set(page.id, page))
				expect(storage.getSnapshot!().tombstones).toEqual({})
				expect(storage.getSnapshot!().documents.find((d) => d.state.id === page.id)).toBeDefined()
			})

			it('[SS12] delete removes the record and writes a tombstone at the new clock', () => {
				const storage = create(makeContractSnapshot(contractRecords, { documentClock: 10 }))
				const pageId = contractRecords[1].id
				storage.transaction((txn) => txn.delete(pageId))

				const snapshot = storage.getSnapshot!()
				expect(snapshot.documents.find((d) => d.state.id === pageId)).toBeUndefined()
				expect(snapshot.tombstones).toEqual({ [pageId]: 11 })
			})

			it('[SS12] deleting an absent id is a complete no-op', () => {
				const storage = create(makeContractSnapshot(contractRecords, { documentClock: 10 }))
				const { didChange, documentClock } = storage.transaction((txn) =>
					txn.delete('nonexistent:record')
				)
				expect(didChange).toBe(false)
				expect(documentClock).toBe(10)
				expect(storage.getSnapshot!().tombstones).toEqual({})
			})
		})

		describe('iteration', () => {
			it('[SS13] entries/keys/values iterate the documents', () => {
				const storage = create(makeContractSnapshot(contractRecords))
				const ids = contractRecords.map((r) => r.id).sort()
				storage.transaction((txn) => {
					expect(
						Array.from(txn.entries())
							.map(([id]) => id)
							.sort()
					).toEqual(ids)
					expect(Array.from(txn.keys()).sort()).toEqual(ids)
					expect(
						Array.from(txn.values())
							.map((v) => v.id)
							.sort()
					).toEqual(ids)
				})
			})

			it.each(['entries', 'keys', 'values'] as const)(
				'[SS13] consuming the %s iterator after the transaction ends throws',
				(method) => {
					const storage = create(makeContractSnapshot(contractRecords))
					let iterator!: Iterator<unknown>
					storage.transaction((txn) => {
						iterator = txn[method]()[Symbol.iterator]()
						iterator.next()
					})
					expect(() => iterator.next()).toThrow('Transaction has ended')
				}
			)
		})

		describe('schema', () => {
			it('[SS14] getSchema and setSchema read and write the persisted schema', () => {
				const snapshot = makeContractSnapshot(contractRecords)
				const storage = create(snapshot)
				const newSchema = { ...contractSchema.serialize(), schemaVersion: 99 as any }
				storage.transaction((txn) => {
					expect(txn.getSchema()).toEqual(snapshot.schema)
					txn.setSchema(newSchema)
					expect(txn.getSchema()).toEqual(newSchema)
				})
				expect(storage.getSnapshot!().schema).toEqual(newSchema)
			})
		})

		describe('getChangesSince', () => {
			const seeded = () =>
				create(
					makeContractSnapshot(contractRecords, {
						documents: [
							{ state: contractRecords[0], lastChangedClock: 5 },
							{ state: contractRecords[1], lastChangedClock: 10 },
						],
						tombstones: { 'shape:deleted1': 5, 'shape:deleted2': 12 },
						documentClock: 15,
						tombstoneHistoryStartsAtClock: 0,
					})
				)

			it('[SS15] returns undefined when sinceClock equals the current clock', () => {
				seeded().transaction((txn) => {
					expect(txn.getChangesSince(15)).toBeUndefined()
				})
			})

			it('[SS15] returns puts for documents changed strictly after sinceClock', () => {
				seeded().transaction((txn) => {
					const changes = txn.getChangesSince(5)!
					expect(changes.wipeAll).toBe(false)
					expect(Object.keys(changes.diff.puts)).toEqual([contractRecords[1].id])
				})
			})

			it('[SS15] returns deletes for tombstones strictly after sinceClock', () => {
				seeded().transaction((txn) => {
					const changes = txn.getChangesSince(5)!
					expect(changes.diff.deletes).toEqual(['shape:deleted2'])
				})
			})

			it('[SS15] a sinceClock in the future is treated as "everything changed"', () => {
				seeded().transaction((txn) => {
					const changes = txn.getChangesSince(100)!
					expect(changes.wipeAll).toBe(true)
					expect(Object.keys(changes.diff.puts).length).toBe(2)
				})
			})

			it('[SS15] wipeAll is true when sinceClock predates tombstone history, with all documents and no deletes', () => {
				const storage = create(
					makeContractSnapshot(contractRecords, {
						tombstones: { 'shape:deleted1': 12 },
						documentClock: 20,
						tombstoneHistoryStartsAtClock: 10,
					})
				)
				storage.transaction((txn) => {
					const changes = txn.getChangesSince(9)!
					expect(changes.wipeAll).toBe(true)
					expect(Object.keys(changes.diff.puts).length).toBe(2)
					expect(changes.diff.deletes).toEqual([])
				})
			})

			it('[SS15] wipeAll boundary: sinceClock equal to tombstoneHistoryStartsAtClock is incremental', () => {
				const storage = create(
					makeContractSnapshot(contractRecords, {
						documentClock: 20,
						tombstoneHistoryStartsAtClock: 10,
					})
				)
				storage.transaction((txn) => {
					expect(txn.getChangesSince(10)!.wipeAll).toBe(false)
					expect(txn.getChangesSince(9)!.wipeAll).toBe(true)
				})
			})

			it('[SS15] sees writes made earlier in the same transaction', () => {
				const storage = create(makeContractSnapshot(contractRecords, { documentClock: 5 }))
				const newPage = makePage('new')
				storage.transaction((txn) => {
					txn.set(newPage.id, newPage)
					txn.delete(contractRecords[1].id)
					const changes = txn.getChangesSince(5)!
					expect(Object.keys(changes.diff.puts)).toEqual([newPage.id])
					expect(changes.diff.deletes).toEqual([contractRecords[1].id])
				})
			})
		})

		describe('emitChanges', () => {
			it('[SS7] emitChanges: "always" returns the forward diff of the transaction', () => {
				const storage = create(makeContractSnapshot(contractRecords, { documentClock: 5 }))
				const newPage = makePage('new')
				const { changes } = storage.transaction(
					(txn) => {
						txn.set(newPage.id, newPage)
						txn.delete(contractRecords[1].id)
					},
					{ emitChanges: 'always' }
				)
				expect(changes).toEqual({
					puts: { [newPage.id]: newPage },
					deletes: [contractRecords[1].id],
				})
			})

			it('[SS7] emitChanges: "when-different" never emits (changes apply verbatim)', () => {
				const storage = create(makeContractSnapshot(contractRecords))
				const newPage = makePage('new')
				const { changes } = storage.transaction(
					(txn) => {
						txn.set(newPage.id, newPage)
					},
					{ emitChanges: 'when-different' }
				)
				expect(changes).toBeUndefined()
			})

			it('[SS7] changes is undefined when emitChanges is not requested', () => {
				const storage = create(makeContractSnapshot(contractRecords))
				const newPage = makePage('new')
				const { changes } = storage.transaction((txn) => {
					txn.set(newPage.id, newPage)
				})
				expect(changes).toBeUndefined()
			})
		})

		describe('onChange', () => {
			it('[SS6] notifies listeners on a microtask with the new clock and transaction id', async () => {
				const storage = create(makeContractSnapshot(contractRecords, { documentClock: 10 }))
				const listener = vi.fn()
				storage.onChange(listener)
				await Promise.resolve()

				const newPage = makePage('new')
				storage.transaction(
					(txn) => {
						txn.set(newPage.id, newPage)
					},
					{ id: 'my-transaction-id' }
				)
				expect(listener).not.toHaveBeenCalled() // deferred to a microtask

				await Promise.resolve()
				expect(listener).toHaveBeenCalledTimes(1)
				expect(listener).toHaveBeenCalledWith({ id: 'my-transaction-id', documentClock: 11 })
			})

			it('[SS6] the id is undefined when the transaction has none', async () => {
				const storage = create(makeContractSnapshot(contractRecords))
				const listener = vi.fn()
				storage.onChange(listener)
				await Promise.resolve()

				const newPage = makePage('new')
				storage.transaction((txn) => txn.set(newPage.id, newPage))
				await Promise.resolve()
				expect(listener).toHaveBeenCalledWith({ id: undefined, documentClock: 1 })
			})

			it('[SS6] read-only transactions do not notify', async () => {
				const storage = create(makeContractSnapshot(contractRecords))
				const listener = vi.fn()
				storage.onChange(listener)
				await Promise.resolve()

				storage.transaction((txn) => void txn.get(TLDOCUMENT_ID))
				await Promise.resolve()
				expect(listener).not.toHaveBeenCalled()
			})

			it('[SS6] unsubscribing prevents future notifications', async () => {
				const storage = create(makeContractSnapshot(contractRecords))
				const listener = vi.fn()
				const unsubscribe = storage.onChange(listener)
				await Promise.resolve()
				unsubscribe()

				const newPage = makePage('new')
				storage.transaction((txn) => txn.set(newPage.id, newPage))
				await Promise.resolve()
				expect(listener).not.toHaveBeenCalled()
			})

			it('[SS6] a listener registered in the same callstack as a change does not receive it', async () => {
				const storage = create(makeContractSnapshot(contractRecords))
				const newPage = makePage('new')
				storage.transaction((txn) => txn.set(newPage.id, newPage))

				const listener = vi.fn()
				storage.onChange(listener)
				await Promise.resolve()
				await Promise.resolve()
				expect(listener).not.toHaveBeenCalled()
			})

			it('[SS6] an onChange callback passed to the constructor is registered the same way', async () => {
				const listener = vi.fn()
				const storage = factory.create({
					snapshot: makeContractSnapshot(contractRecords),
					onChange: listener,
				})
				await Promise.resolve()

				const newPage = makePage('new')
				storage.transaction((txn) => txn.set(newPage.id, newPage))
				await Promise.resolve()
				expect(listener).toHaveBeenCalledWith({ id: undefined, documentClock: 1 })
			})
		})

		describe('getSnapshot', () => {
			it('[SS16] returns the full room snapshot reflecting committed transactions', () => {
				const storage = create(
					makeContractSnapshot(contractRecords, {
						documentClock: 15,
						tombstoneHistoryStartsAtClock: 5,
						tombstones: { 'shape:deleted': 10 },
					})
				)
				const newPage = makePage('new')
				storage.transaction((txn) => txn.set(newPage.id, newPage))

				const snapshot = storage.getSnapshot!()
				expect(snapshot.documentClock).toBe(16)
				expect(snapshot.tombstoneHistoryStartsAtClock).toBe(5)
				expect(snapshot.documents.length).toBe(3)
				expect(snapshot.tombstones).toEqual({ 'shape:deleted': 10 })
				expect(snapshot.schema).toEqual(contractSchema.serialize())
			})
		})

		describe('snapshot fallbacks', () => {
			it('[SS17] falls back to the legacy clock field when documentClock is missing', () => {
				const snapshot = makeContractSnapshot(contractRecords) as any
				delete snapshot.documentClock
				snapshot.clock = 15
				const storage = create(snapshot)
				expect(storage.getClock()).toBe(15)
			})

			it('[SS17] falls back to 0 when neither documentClock nor clock is present', () => {
				const snapshot = makeContractSnapshot(contractRecords) as any
				delete snapshot.documentClock
				delete snapshot.clock
				const storage = create(snapshot)
				expect(storage.getClock()).toBe(0)
			})

			it('[SS17] tombstoneHistoryStartsAtClock defaults to the document clock', () => {
				const storage = create(makeContractSnapshot(contractRecords, { documentClock: 20 }))
				expect(storage.getSnapshot!().tombstoneHistoryStartsAtClock).toBe(20)
			})
		})

		describe('tombstone pruning', () => {
			const makeTombstones = (count: number) => {
				const tombstones: Record<string, number> = {}
				for (let i = 0; i < count; i++) {
					tombstones[`shape:doc${i}`] = i + 1
				}
				return tombstones
			}

			const flushPrune = (storage: TLSyncStorage<TLRecord>) => {
				const prune = (storage as any).pruneTombstones
				prune()
				prune.flush()
			}

			it('[SS18] does not prune at or below MAX_TOMBSTONES', () => {
				const storage = create(
					makeContractSnapshot(contractRecords, {
						tombstones: makeTombstones(MAX_TOMBSTONES),
						documentClock: MAX_TOMBSTONES + 1,
						tombstoneHistoryStartsAtClock: 0,
					})
				)
				flushPrune(storage)
				expect(Object.keys(storage.getSnapshot!().tombstones!).length).toBe(MAX_TOMBSTONES)
				expect(storage.getSnapshot!().tombstoneHistoryStartsAtClock).toBe(0)
			})

			it('[SS18] prunes the oldest tombstones past the buffer and advances the history clock', () => {
				const total = MAX_TOMBSTONES + 500
				const storage = create(
					makeContractSnapshot(contractRecords, {
						tombstones: makeTombstones(total),
						documentClock: total + 1,
						tombstoneHistoryStartsAtClock: 0,
					})
				)
				flushPrune(storage)

				const snapshot = storage.getSnapshot!()
				const remaining = Object.entries(snapshot.tombstones!)
				expect(remaining.length).toBe(MAX_TOMBSTONES - TOMBSTONE_PRUNE_BUFFER_SIZE)
				// the oldest were deleted; everything left is at or after the new history start
				const historyClock = snapshot.tombstoneHistoryStartsAtClock!
				expect(historyClock).toBeGreaterThan(0)
				for (const [, clock] of remaining) {
					expect(clock).toBeGreaterThanOrEqual(historyClock)
				}
			})

			it('[SS18] never splits tombstones sharing a clock value', () => {
				// 10 tombstones share the clock value at the cutoff boundary
				const total = MAX_TOMBSTONES + 1
				const expectedCutoff = TOMBSTONE_PRUNE_BUFFER_SIZE + 1
				const overflow = 10
				const boundary = expectedCutoff + overflow
				const tombstones: Record<string, number> = {}
				for (let i = 0; i < total; i++) {
					tombstones[`shape:doc${i}`] = i < boundary ? 1 : 2
				}
				const storage = create(
					makeContractSnapshot(contractRecords, {
						tombstones,
						documentClock: 3,
						tombstoneHistoryStartsAtClock: 0,
					})
				)
				flushPrune(storage)

				const remaining = Object.values(storage.getSnapshot!().tombstones!)
				expect(remaining.length).toBe(MAX_TOMBSTONES - TOMBSTONE_PRUNE_BUFFER_SIZE - overflow)
				expect(remaining.every((clock) => clock === 2)).toBe(true)
			})
		})
	})
}

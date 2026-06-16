import { TLDOCUMENT_ID, TLRecord } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import {
	contractRecords,
	makeContractSnapshot,
	makePage,
	registerStorageContractTests,
} from '../test/storageContractSuite'
import {
	computeTombstonePruning,
	InMemorySyncStorage,
	MAX_TOMBSTONES,
	TOMBSTONE_PRUNE_BUFFER_SIZE,
} from './InMemorySyncStorage'

// Helper to create a sorted tombstone array for computeTombstonePruning
function makeTombstones(
	count: number,
	clockFn: (i: number) => number = (i) => i + 1
): Array<{ id: string; clock: number }> {
	return Array.from({ length: count }, (_, i) => ({ id: `doc${i}`, clock: clockFn(i) }))
}

describe('InMemorySyncStorage', () => {
	registerStorageContractTests({
		create: (opts) => new InMemorySyncStorage<TLRecord>(opts),
	})

	describe('constructor clock handling', () => {
		it('[IM1] clamps the document clock up to the max lastChangedClock in the snapshot', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeContractSnapshot(contractRecords, {
					documents: [
						{ state: contractRecords[0], lastChangedClock: 10 },
						{ state: contractRecords[1], lastChangedClock: 3 },
					],
					documentClock: 3,
				}),
			})
			expect(storage.getClock()).toBe(10)
		})

		it('[IM1] clamps the document clock up to the max tombstone clock in the snapshot', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeContractSnapshot(contractRecords, {
					tombstones: { 'shape:gone': 25 },
					documentClock: 3,
					tombstoneHistoryStartsAtClock: 0,
				}),
			})
			expect(storage.getClock()).toBe(25)
		})

		it('[IM2] clamps tombstoneHistoryStartsAtClock down to the document clock', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeContractSnapshot(contractRecords, {
					documentClock: 5,
					tombstoneHistoryStartsAtClock: 10,
				}),
			})
			expect(storage.tombstoneHistoryStartsAtClock.get()).toBe(5)
			expect(storage.getClock()).toBe(5)
		})

		it('[IM3] discards snapshot tombstones when tombstoneHistoryStartsAtClock equals the document clock', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeContractSnapshot(contractRecords, {
					tombstones: { 'shape:deleted1': 5 },
					tombstoneHistoryStartsAtClock: 15,
					documentClock: 15,
				}),
			})
			expect(storage.tombstones.size).toBe(0)
		})

		it('[IM3] keeps snapshot tombstones when there is usable history', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeContractSnapshot(contractRecords, {
					tombstones: { 'shape:deleted1': 5, 'shape:deleted2': 10 },
					tombstoneHistoryStartsAtClock: 0,
					documentClock: 15,
				}),
			})
			expect(storage.tombstones.size).toBe(2)
			expect(storage.tombstones.get('shape:deleted1')).toBe(5)
		})
	})

	describe('record freezing', () => {
		it('[IM4] freezes records stored via set()', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeContractSnapshot(contractRecords),
			})
			const page = makePage('mutable')
			storage.transaction((txn) => txn.set(page.id, page))
			expect(Object.isFrozen(storage.documents.get(page.id)?.state)).toBe(true)
		})

		it('[IM4] freezes records loaded from the constructor snapshot', () => {
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: makeContractSnapshot(contractRecords),
			})
			expect(Object.isFrozen(storage.documents.get(TLDOCUMENT_ID)?.state)).toBe(true)
		})
	})

	describe('schema default', () => {
		it('[IM5] assumes the earliest tldraw schema when the snapshot has none', () => {
			const snapshot = makeContractSnapshot(contractRecords) as any
			delete snapshot.schema
			const storage = new InMemorySyncStorage<TLRecord>({ snapshot })
			// the earliest serialized schema pins every sequence to version 0
			const schema = storage.schema.get() as any
			expect(Object.values(schema.sequences).every((v) => v === 0)).toBe(true)
		})
	})

	describe('duplicate ids', () => {
		it('[IM6] the last entry wins for duplicate document ids in a snapshot', () => {
			const page1 = makePage('dupe', 'First', 'a1')
			const page2 = makePage('dupe', 'Second', 'a2')
			const storage = new InMemorySyncStorage<TLRecord>({
				snapshot: {
					documents: [
						{ state: page1, lastChangedClock: 1 },
						{ state: page2, lastChangedClock: 2 },
					],
					documentClock: 5,
					schema: makeContractSnapshot([]).schema,
				},
			})
			expect(storage.documents.get('page:dupe')).toEqual({ state: page2, lastChangedClock: 2 })
		})
	})

	describe('computeTombstonePruning', () => {
		describe('threshold', () => {
			it('[TP1] returns null when the count is below maxTombstones', () => {
				expect(
					computeTombstonePruning({
						tombstones: makeTombstones(100),
						documentClock: 1000,
						maxTombstones: 500,
					})
				).toBeNull()
			})

			it('[TP1] returns null when the count equals maxTombstones exactly', () => {
				expect(
					computeTombstonePruning({
						tombstones: makeTombstones(500),
						documentClock: 1000,
						maxTombstones: 500,
					})
				).toBeNull()
			})

			it('[TP1] returns null for an empty array', () => {
				expect(computeTombstonePruning({ tombstones: [], documentClock: 1000 })).toBeNull()
			})

			it('[TP1] does not prune at exactly MAX_TOMBSTONES with default constants', () => {
				expect(
					computeTombstonePruning({
						tombstones: makeTombstones(MAX_TOMBSTONES),
						documentClock: 100000,
					})
				).toBeNull()
			})
		})

		describe('cutoff calculation', () => {
			it('[TP2] deletes the oldest pruneBufferSize + excess tombstones', () => {
				// 10 tombstones, max 5, buffer 2 => delete 2 + 10 - 5 = 7
				const result = computeTombstonePruning({
					tombstones: makeTombstones(10),
					documentClock: 100,
					maxTombstones: 5,
					pruneBufferSize: 2,
				})
				expect(result).toEqual({
					idsToDelete: ['doc0', 'doc1', 'doc2', 'doc3', 'doc4', 'doc5', 'doc6'],
					newTombstoneHistoryStartsAtClock: 8, // clock of doc7, the oldest survivor
				})
			})

			it('[TP2] one over MAX_TOMBSTONES deletes the buffer plus one with default constants', () => {
				const result = computeTombstonePruning({
					tombstones: makeTombstones(MAX_TOMBSTONES + 1),
					documentClock: 100000,
				})
				expect(result!.idsToDelete.length).toBe(TOMBSTONE_PRUNE_BUFFER_SIZE + 1)
			})

			it('[TP2] works with a zero buffer size', () => {
				const result = computeTombstonePruning({
					tombstones: makeTombstones(101),
					documentClock: 1000,
					maxTombstones: 100,
					pruneBufferSize: 0,
				})
				expect(result!.idsToDelete).toEqual(['doc0'])
				expect(result!.newTombstoneHistoryStartsAtClock).toBe(2)
			})

			it('[TP2] extends the cutoff rather than splitting a clock value', () => {
				const tombstones = [
					{ id: 'a', clock: 1 },
					{ id: 'b1', clock: 2 },
					{ id: 'b2', clock: 2 },
					{ id: 'b3', clock: 2 },
					{ id: 'b4', clock: 2 },
					{ id: 'c', clock: 3 },
				]
				// max 4, buffer 1 => initial cutoff 3, which would split the clock-2 group
				const result = computeTombstonePruning({
					tombstones,
					documentClock: 100,
					maxTombstones: 4,
					pruneBufferSize: 1,
				})
				expect(result!.idsToDelete).toEqual(['a', 'b1', 'b2', 'b3', 'b4'])
				expect(result!.newTombstoneHistoryStartsAtClock).toBe(3)
			})

			it('[TP2] leaves the cutoff alone when it falls on a clock boundary', () => {
				const tombstones = [
					{ id: 'a1', clock: 1 },
					{ id: 'a2', clock: 1 },
					{ id: 'a3', clock: 1 },
					{ id: 'b1', clock: 2 },
					{ id: 'b2', clock: 2 },
					{ id: 'b3', clock: 2 },
					{ id: 'c1', clock: 3 },
					{ id: 'c2', clock: 3 },
					{ id: 'c3', clock: 3 },
					{ id: 'd1', clock: 4 },
				]
				// max 5, buffer 1 => cutoff 6, which lands exactly between clocks 2 and 3
				const result = computeTombstonePruning({
					tombstones,
					documentClock: 100,
					maxTombstones: 5,
					pruneBufferSize: 1,
				})
				expect(result!.idsToDelete).toEqual(['a1', 'a2', 'a3', 'b1', 'b2', 'b3'])
				expect(result!.newTombstoneHistoryStartsAtClock).toBe(3)
			})

			it('[TP2] handles non-contiguous clock values', () => {
				const tombstones = [
					{ id: 'a', clock: 1 },
					{ id: 'b', clock: 5 },
					{ id: 'c', clock: 10 },
					{ id: 'd', clock: 50 },
					{ id: 'e', clock: 100 },
				]
				const result = computeTombstonePruning({
					tombstones,
					documentClock: 200,
					maxTombstones: 3,
					pruneBufferSize: 1,
				})
				expect(result!.idsToDelete).toEqual(['a', 'b', 'c'])
				expect(result!.newTombstoneHistoryStartsAtClock).toBe(50)
			})
		})

		describe('history clock fallback', () => {
			it('[TP3] uses documentClock when every tombstone is deleted', () => {
				// max 5, buffer 10 => cutoff 15, but only 10 items exist
				const result = computeTombstonePruning({
					tombstones: makeTombstones(10),
					documentClock: 999,
					maxTombstones: 5,
					pruneBufferSize: 10,
				})
				expect(result!.idsToDelete.length).toBe(10)
				expect(result!.newTombstoneHistoryStartsAtClock).toBe(999)
			})

			it('[TP3] uses documentClock when a shared clock value forces deleting everything', () => {
				const result = computeTombstonePruning({
					tombstones: makeTombstones(100, () => 5),
					documentClock: 1000,
					maxTombstones: 50,
					pruneBufferSize: 10,
				})
				expect(result!.idsToDelete.length).toBe(100)
				expect(result!.newTombstoneHistoryStartsAtClock).toBe(1000)
			})
		})
	})
})

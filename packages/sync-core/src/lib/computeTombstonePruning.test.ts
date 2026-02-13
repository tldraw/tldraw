import { describe, expect, it } from 'vitest'
import {
	computeTombstonePruning,
	MAX_TOMBSTONES,
	TOMBSTONE_PRUNE_BUFFER_SIZE,
} from './InMemorySyncStorage'

// Helper to create tombstone array
function makeTombstones(
	count: number,
	clockFn: (i: number) => number = (i) => i + 1
): Array<{ id: string; clock: number }> {
	return Array.from({ length: count }, (_, i) => ({
		id: `doc${i}`,
		clock: clockFn(i),
	}))
}

describe('computeTombstonePruning', () => {
	describe('basic behavior', () => {
		it('returns null when tombstone count is below threshold', () => {
			const tombstones = makeTombstones(100)
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 1000,
				maxTombstones: 500,
			})
			expect(result).toBeNull()
		})

		it('returns null when tombstone count equals threshold exactly', () => {
			const tombstones = makeTombstones(500)
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 1000,
				maxTombstones: 500,
			})
			expect(result).toBeNull()
		})

		it('returns null for empty tombstones array', () => {
			const result = computeTombstonePruning({ tombstones: [], documentClock: 1000 })
			expect(result).toBeNull()
		})

		it('returns pruning result when exceeding threshold', () => {
			const tombstones = makeTombstones(600)
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 1000,
				maxTombstones: 500,
				pruneBufferSize: 50,
			})
			expect(result).not.toBeNull()
			expect(result!.idsToDelete.length).toBeGreaterThan(0)
		})
	})

	describe('pruning calculation', () => {
		it('deletes oldest tombstones first', () => {
			// 10 tombstones, max 5, buffer 2 => delete 10 - 5 + 2 = 7
			const tombstones = makeTombstones(10)
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 100,
				maxTombstones: 5,
				pruneBufferSize: 2,
			})

			expect(result).not.toBeNull()
			expect(result!.idsToDelete).toEqual(['doc0', 'doc1', 'doc2', 'doc3', 'doc4', 'doc5', 'doc6'])
			expect(result!.newTombstoneHistoryStartsAtClock).toBe(8) // clock of doc7
		})

		it('keeps newest tombstones', () => {
			const tombstones = makeTombstones(10)
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 100,
				maxTombstones: 5,
				pruneBufferSize: 2,
			})

			// Should keep doc7, doc8, doc9
			const keptIds = tombstones.map((t) => t.id).filter((id) => !result!.idsToDelete.includes(id))
			expect(keptIds).toEqual(['doc7', 'doc8', 'doc9'])
		})

		it('sets newTombstoneHistoryStartsAtClock to oldest remaining tombstone clock', () => {
			// Tombstones with clocks 1-20
			const tombstones = makeTombstones(20)
			// max 10, buffer 5 => delete 20 - 10 + 5 = 15
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 1000,
				maxTombstones: 10,
				pruneBufferSize: 5,
			})

			expect(result).not.toBeNull()
			// After deleting 15, oldest remaining is doc15 with clock 16
			expect(result!.newTombstoneHistoryStartsAtClock).toBe(16)
		})
	})

	describe('duplicate clock handling', () => {
		it('avoids splitting tombstones with the same clock value', () => {
			// Create tombstones where multiple have the same clock
			// Clocks: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4]
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

			// max 5, buffer 1 => initial cutoff = 10 - 5 + 1 = 6
			// cutoff 6 would split clock=2 (b3) from clock=3 (c1)
			// But tombstones[5].clock (2) !== tombstones[6].clock (3), so no adjustment needed
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 100,
				maxTombstones: 5,
				pruneBufferSize: 1,
			})

			expect(result).not.toBeNull()
			expect(result!.idsToDelete).toEqual(['a1', 'a2', 'a3', 'b1', 'b2', 'b3'])
			expect(result!.newTombstoneHistoryStartsAtClock).toBe(3) // clock of c1
		})

		it('extends cutoff when it would split a clock value', () => {
			// Clocks: [1, 2, 2, 2, 2, 3]
			const tombstones = [
				{ id: 'a', clock: 1 },
				{ id: 'b1', clock: 2 },
				{ id: 'b2', clock: 2 },
				{ id: 'b3', clock: 2 },
				{ id: 'b4', clock: 2 },
				{ id: 'c', clock: 3 },
			]

			// max 4, buffer 1 => initial cutoff = 6 - 4 + 1 = 3
			// cutoff 3 points to b3 (clock 2), cutoff-1 points to b2 (clock 2)
			// Same clock, so extend cutoff until boundary
			// cutoff 4: b4 (clock 2), cutoff-1: b3 (clock 2) - same, extend
			// cutoff 5: c (clock 3), cutoff-1: b4 (clock 2) - different, stop
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 100,
				maxTombstones: 4,
				pruneBufferSize: 1,
			})

			expect(result).not.toBeNull()
			// Must delete all clock=2 tombstones to avoid split
			expect(result!.idsToDelete).toEqual(['a', 'b1', 'b2', 'b3', 'b4'])
			expect(result!.newTombstoneHistoryStartsAtClock).toBe(3)
		})

		it('handles all tombstones with same clock value', () => {
			// All tombstones have clock=5
			const tombstones = makeTombstones(100, () => 5)
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 1000,
				maxTombstones: 50,
				pruneBufferSize: 10,
			})

			expect(result).not.toBeNull()
			// Since all have same clock, cutoff extends to delete all
			expect(result!.idsToDelete.length).toBe(100)
			// Falls back to documentClock since no remaining tombstones
			expect(result!.newTombstoneHistoryStartsAtClock).toBe(1000)
		})
	})

	describe('edge cases', () => {
		it('handles exactly one tombstone over threshold', () => {
			const tombstones = makeTombstones(101)
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 1000,
				maxTombstones: 100,
				pruneBufferSize: 0,
			})

			expect(result).not.toBeNull()
			expect(result!.idsToDelete).toEqual(['doc0'])
			expect(result!.newTombstoneHistoryStartsAtClock).toBe(2)
		})

		it('handles buffer size larger than excess', () => {
			// 105 tombstones, max 100, buffer 50
			// cutoff = 50 + 105 - 100 = 55
			const tombstones = makeTombstones(105)
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 1000,
				maxTombstones: 100,
				pruneBufferSize: 50,
			})

			expect(result).not.toBeNull()
			expect(result!.idsToDelete.length).toBe(55)
		})

		it('uses documentClock when all tombstones are deleted', () => {
			// Small array, aggressive pruning
			const tombstones = makeTombstones(10)
			// max 5, buffer 10 => cutoff = 10 + 10 - 5 = 15, but only 10 items
			// So all get deleted
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 999,
				maxTombstones: 5,
				pruneBufferSize: 10,
			})

			expect(result).not.toBeNull()
			expect(result!.idsToDelete.length).toBe(10)
			expect(result!.newTombstoneHistoryStartsAtClock).toBe(999)
		})

		it('handles non-contiguous clock values', () => {
			// Clocks with gaps: [1, 5, 10, 50, 100]
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

			expect(result).not.toBeNull()
			// cutoff = 1 + 5 - 3 = 3
			expect(result!.idsToDelete).toEqual(['a', 'b', 'c'])
			expect(result!.newTombstoneHistoryStartsAtClock).toBe(50)
		})

		it('handles large clock values', () => {
			const tombstones = [
				{ id: 'a', clock: 1_000_000_000 },
				{ id: 'b', clock: 1_000_000_001 },
				{ id: 'c', clock: 1_000_000_002 },
			]
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 2000000000,
				maxTombstones: 2,
				pruneBufferSize: 0,
			})

			expect(result).not.toBeNull()
			expect(result!.idsToDelete).toEqual(['a'])
			expect(result!.newTombstoneHistoryStartsAtClock).toBe(1_000_000_001)
		})
	})

	describe('with default constants', () => {
		it('does not prune at exactly MAX_TOMBSTONES', () => {
			const tombstones = makeTombstones(MAX_TOMBSTONES)
			const result = computeTombstonePruning({ tombstones, documentClock: 100000 })
			expect(result).toBeNull()
		})

		it('prunes when exceeding MAX_TOMBSTONES by 1', () => {
			const tombstones = makeTombstones(MAX_TOMBSTONES + 1)
			const result = computeTombstonePruning({ tombstones, documentClock: 100000 })

			expect(result).not.toBeNull()
			// cutoff = BUFFER + (MAX+1) - MAX = BUFFER + 1
			expect(result!.idsToDelete.length).toBe(TOMBSTONE_PRUNE_BUFFER_SIZE + 1)
		})

		it('prunes correctly with large excess', () => {
			const totalTombstones = MAX_TOMBSTONES * 2
			const tombstones = makeTombstones(totalTombstones)
			const result = computeTombstonePruning({ tombstones, documentClock: 100000 })

			expect(result).not.toBeNull()
			// cutoff = BUFFER + 2*MAX - MAX = BUFFER + MAX
			const expectedDeletes = TOMBSTONE_PRUNE_BUFFER_SIZE + MAX_TOMBSTONES
			expect(result!.idsToDelete.length).toBe(expectedDeletes)

			// Remaining should be MAX - BUFFER
			const remaining = totalTombstones - result!.idsToDelete.length
			expect(remaining).toBe(MAX_TOMBSTONES - TOMBSTONE_PRUNE_BUFFER_SIZE)
		})
	})

	describe('input validation assumptions', () => {
		it('assumes tombstones are sorted by clock ascending', () => {
			// If not sorted, results are undefined - this documents the assumption
			const sortedTombstones = [
				{ id: 'a', clock: 1 },
				{ id: 'b', clock: 2 },
				{ id: 'c', clock: 3 },
			]
			const result = computeTombstonePruning({
				tombstones: sortedTombstones,
				documentClock: 100,
				maxTombstones: 2,
				pruneBufferSize: 0,
			})
			expect(result).not.toBeNull()
			expect(result!.idsToDelete).toEqual(['a'])
		})

		it('works with zero buffer size', () => {
			const tombstones = makeTombstones(10)
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 100,
				maxTombstones: 5,
				pruneBufferSize: 0,
			})

			expect(result).not.toBeNull()
			// cutoff = 0 + 10 - 5 = 5
			expect(result!.idsToDelete.length).toBe(5)
		})

		it('works with zero max tombstones (aggressive pruning)', () => {
			const tombstones = makeTombstones(10)
			const result = computeTombstonePruning({
				tombstones,
				documentClock: 100,
				maxTombstones: 0,
				pruneBufferSize: 0,
			})

			expect(result).not.toBeNull()
			// cutoff = 0 + 10 - 0 = 10
			expect(result!.idsToDelete.length).toBe(10)
			expect(result!.newTombstoneHistoryStartsAtClock).toBe(100)
		})
	})
})

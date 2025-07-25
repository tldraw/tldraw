import { BaseRecord, createRecordType, RecordId, StoreSchema } from '@tldraw/store'
import { TLSyncRoom } from '../lib/TLSyncRoom'
import { findMin } from '../lib/findMin'

interface TestRecord extends BaseRecord<'test', RecordId<TestRecord>> {
	name: string
}

describe('TLSyncRoom pruneTombstones', () => {
	let room: TLSyncRoom<TestRecord, any>
	let TestRecordType: any
	let schema: StoreSchema<TestRecord, any>

	beforeEach(() => {
		TestRecordType = createRecordType<TestRecord>('test', {
			scope: 'document',
		})

		schema = StoreSchema.create({
			test: TestRecordType,
		})

		// Create room with empty snapshot to avoid default documents being converted to tombstones
		room = new TLSyncRoom({
			schema,
			snapshot: {
				clock: 0,
				documents: [],
			},
		})
	})

	it('should not prune when tombstone count is below threshold', () => {
		// Add some tombstones but below MAX_TOMBSTONES (3000)
		for (let i = 0; i < 100; i++) {
			room.tombstones.set(`doc${i}`, i + 1)
		}

		const initialSize = room.tombstones.size
		const initialHistoryClock = room.tombstoneHistoryStartsAtClock

		// Reset needsPrune flag and call pruneTombstones
		;(room as any).needsPrune = true
		;(room as any).pruneTombstones()

		// Should not have pruned anything
		expect(room.tombstones.size).toBe(initialSize)
		expect(room.tombstoneHistoryStartsAtClock).toBe(initialHistoryClock)

		expect(findMin(room.tombstones.values())).toBeGreaterThanOrEqual(
			room.tombstoneHistoryStartsAtClock
		)
	})

	it('should prune tombstones when count exceeds threshold', () => {
		// Add more tombstones than MAX_TOMBSTONES
		const totalTombstones = 3200 // Above MAX_TOMBSTONES (3000)
		for (let i = 0; i < totalTombstones; i++) {
			room.tombstones.set(`doc${i}`, i + 1)
		}

		const startCock = room.tombstoneHistoryStartsAtClock

		expect(room.tombstones.size).toBe(totalTombstones)

		// Reset needsPrune flag and call pruneTombstones
		;(room as any).needsPrune = true
		;(room as any).pruneTombstones()

		expect(room.tombstones.size).toBeLessThan(totalTombstones)
		expect(room.tombstoneHistoryStartsAtClock).toBeGreaterThan(startCock)

		expect(room.tombstones.size).toMatchInlineSnapshot(`2700`) // should be about 1500
		expect(room.tombstoneHistoryStartsAtClock).toMatchInlineSnapshot(`501`) // should be about 1700

		expect(findMin(room.tombstones.values())).toBeGreaterThanOrEqual(
			room.tombstoneHistoryStartsAtClock
		)
	})

	it('should handle tombstones with same clock value correctly', () => {
		// Add tombstones with some having the same clock values
		const totalTombstones = 3200
		for (let i = 0; i < totalTombstones; i++) {
			// Use clock values that repeat: 1, 1, 1, ..., 2, 2, 2, ..., 320, 320, 320
			const clock = Math.floor(i / 10) + 1
			room.tombstones.set(`doc${i}`, clock)
		}

		const startCock = room.tombstoneHistoryStartsAtClock

		// Reset needsPrune flag and call pruneTombstones
		;(room as any).needsPrune = true
		;(room as any).pruneTombstones()

		// The algorithm keeps the oldest tombstones (preserving history)
		// With repeating clock values, we have 10 tombstones for each clock 1-320
		// We keep the oldest 200 tombstones (clocks 1-20)
		// We delete the newest 3000 tombstones (clocks 21-320)
		expect(room.tombstones.size).toBeLessThan(totalTombstones)
		expect(room.tombstoneHistoryStartsAtClock).toBeGreaterThan(startCock)

		expect(room.tombstones.size).toMatchInlineSnapshot(`2700`) // should be about 1500
		expect(room.tombstoneHistoryStartsAtClock).toMatchInlineSnapshot(`51`) // should be about 150

		expect(findMin(room.tombstones.values())).toBeGreaterThanOrEqual(
			room.tombstoneHistoryStartsAtClock
		)
	})

	it('should handle edge case where all tombstones have same clock value', () => {
		// Add tombstones all with the same clock value
		const totalTombstones = 3200
		const sameClock = 100
		for (let i = 0; i < totalTombstones; i++) {
			room.tombstones.set(`doc${i}`, sameClock)
		}

		const startClock = room.tombstoneHistoryStartsAtClock

		// Reset needsPrune flag and call pruneTombstones
		;(room as any).needsPrune = true
		;(room as any).pruneTombstones()

		// When all tombstones have the same clock value, the algorithm deletes all of them
		// because the while loop advances to the end and all tombstones are marked for deletion
		expect(room.tombstones.size).toBeLessThan(totalTombstones)
		expect(room.tombstoneHistoryStartsAtClock).toBeGreaterThan(startClock)

		expect(room.tombstones.size).toMatchInlineSnapshot(`0`) // all deleted
		expect(room.tombstoneHistoryStartsAtClock).toMatchInlineSnapshot(`101`) // next clock after deletion

		expect(findMin(room.tombstones.values())).toBe(null) // findMin returns null for empty collections
	})

	it('should handle exact threshold case', () => {
		// Add exactly MAX_TOMBSTONES tombstones
		for (let i = 0; i < 3000; i++) {
			room.tombstones.set(`doc${i}`, i + 1)
		}

		const initialSize = room.tombstones.size
		expect(initialSize).toBe(3000)

		// Reset needsPrune flag and call pruneTombstones
		;(room as any).needsPrune = true
		;(room as any).pruneTombstones()

		// Should not prune anything since we're exactly at the threshold
		expect(room.tombstones.size).toBe(initialSize)
	})

	it('should handle very large tombstone counts', () => {
		// Test with a much larger number of tombstones
		const totalTombstones = 10000
		for (let i = 0; i < totalTombstones; i++) {
			room.tombstones.set(`doc${i}`, i + 1)
		}

		const startClock = room.tombstoneHistoryStartsAtClock

		// Reset needsPrune flag and call pruneTombstones
		;(room as any).needsPrune = true
		;(room as any).pruneTombstones()

		// The algorithm keeps the oldest tombstones (preserving history)
		// With 10000 tombstones, we keep about 7000 and delete about 3000
		expect(room.tombstones.size).toBeLessThan(totalTombstones)
		expect(room.tombstoneHistoryStartsAtClock).toBeGreaterThan(startClock)

		expect(room.tombstones.size).toMatchInlineSnapshot(`2700`) // should be about 1500
		expect(room.tombstoneHistoryStartsAtClock).toMatchInlineSnapshot(`7301`) // should be about 1500

		expect(findMin(room.tombstones.values())).toBeGreaterThanOrEqual(
			room.tombstoneHistoryStartsAtClock
		)
	})
})

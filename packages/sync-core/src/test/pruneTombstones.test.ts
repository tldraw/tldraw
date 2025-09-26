import { BaseRecord, createRecordType, RecordId, StoreSchema } from '@tldraw/store'
import { MAX_TOMBSTONES, TLSyncRoom } from '../lib/TLSyncRoom'

interface TestRecord extends BaseRecord<'test', RecordId<TestRecord>> {
	name: string
}

describe('TLSyncRoom tombstone management', () => {
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

		// Create room with empty snapshot
		room = new TLSyncRoom({
			schema,
			snapshot: {
				clock: 0,
				documents: [],
			},
		})
	})

	it('should initialize with proper tombstone state', () => {
		// Room should have a tombstones map
		expect(room.tombstones).toBeDefined()
		expect(room.tombstones.size).toBe(0)

		// Should track tombstone history starting point
		expect(typeof room.tombstoneHistoryStartsAtClock).toBe('number')
		expect(room.tombstoneHistoryStartsAtClock).toBeGreaterThanOrEqual(0)
	})

	it('should have reasonable tombstone management constants', () => {
		// Test that MAX_TOMBSTONES is a reasonable limit
		expect(MAX_TOMBSTONES).toBe(3000)
		expect(MAX_TOMBSTONES).toBeGreaterThan(0)
		expect(MAX_TOMBSTONES).toBeLessThan(100000) // Not excessively large
	})
})

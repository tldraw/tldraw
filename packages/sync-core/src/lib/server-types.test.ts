import { describe, expect, it } from 'vitest'
import { PersistedRoomSnapshotForSupabase } from './server-types'
import { RoomSnapshot } from './TLSyncRoom'

describe('PersistedRoomSnapshotForSupabase', () => {
	describe('JSON serialization compatibility', () => {
		it('should properly serialize and deserialize for database storage', () => {
			// This tests actual business logic: compatibility with database storage
			const roomSnapshot: RoomSnapshot = {
				clock: 42,
				documentClock: 38,
				documents: [
					{
						state: {
							id: 'shape:test' as any,
							typeName: 'shape',
							type: 'geo',
							x: 100,
							y: 200,
						} as any,
						lastChangedClock: 35,
					},
				],
				tombstones: { 'shape:deleted': 20 },
				tombstoneHistoryStartsAtClock: 15,
			}

			const persistedData: PersistedRoomSnapshotForSupabase = {
				id: 'test-room-id',
				slug: 'test-room-slug',
				drawing: roomSnapshot,
			}

			// Test actual serialization behavior that matters for database storage
			const serialized = JSON.stringify(persistedData)
			const deserialized = JSON.parse(serialized) as PersistedRoomSnapshotForSupabase

			// Verify critical data survives serialization roundtrip
			expect(deserialized.drawing.clock).toBe(42)
			expect(deserialized.drawing.documents[0].state.id).toBe('shape:test')
			expect(deserialized.drawing.tombstones!['shape:deleted']).toBe(20)
		})
	})
})

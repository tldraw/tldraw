import { UnknownRecord } from '@tldraw/store'
import { describe, expect, it } from 'vitest'
import { PersistedRoomSnapshotForSupabase } from './server-types'
import { RoomSnapshot } from './TLSyncRoom'

describe('PersistedRoomSnapshotForSupabase', () => {
	describe('interface structure and type safety', () => {
		it('should have correct property types', () => {
			const mockRecord: UnknownRecord = {
				id: 'shape:test123' as any as any,
				typeName: 'shape',
				x: 100,
				y: 200,
			} as any

			const roomSnapshot: RoomSnapshot = {
				clock: 42,
				documentClock: 35,
				documents: [{ state: mockRecord, lastChangedClock: 30 }],
				tombstones: { 'deleted:123': 25 },
				tombstoneHistoryStartsAtClock: 20,
			}

			const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
				id: 'room-uuid-123',
				slug: 'my-drawing-room',
				drawing: roomSnapshot,
			}

			// Verify property existence and types
			expect(typeof persistedSnapshot.id).toBe('string')
			expect(typeof persistedSnapshot.slug).toBe('string')
			expect(typeof persistedSnapshot.drawing).toBe('object')

			// Verify nested structure
			expect(typeof persistedSnapshot.drawing.clock).toBe('number')
			expect(Array.isArray(persistedSnapshot.drawing.documents)).toBe(true)
			expect(persistedSnapshot.drawing.documents[0].state).toEqual(mockRecord)
			expect(typeof persistedSnapshot.drawing.documents[0].lastChangedClock).toBe('number')
		})

		it('should work with minimal RoomSnapshot structure', () => {
			const minimalRoomSnapshot: RoomSnapshot = {
				clock: 1,
				documents: [],
			}

			const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
				id: 'minimal-room',
				slug: 'empty-room',
				drawing: minimalRoomSnapshot,
			}

			expect(persistedSnapshot.drawing.clock).toBe(1)
			expect(persistedSnapshot.drawing.documents).toEqual([])
			expect(persistedSnapshot.drawing.documentClock).toBeUndefined()
			expect(persistedSnapshot.drawing.tombstones).toBeUndefined()
			expect(persistedSnapshot.drawing.tombstoneHistoryStartsAtClock).toBeUndefined()
		})

		it('should work with complete RoomSnapshot structure', () => {
			const completeRoomSnapshot: RoomSnapshot = {
				clock: 100,
				documentClock: 95,
				documents: [
					{
						state: { id: 'doc1' as any, typeName: 'document', content: 'test' } as any,
						lastChangedClock: 90,
					},
					{
						state: { id: 'doc2' as any, typeName: 'document', content: 'test2' } as any,
						lastChangedClock: 85,
					},
				],
				tombstones: {
					'deleted:old1': 50,
					'deleted:old2': 60,
				},
				tombstoneHistoryStartsAtClock: 40,
			}

			const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
				id: 'complete-room-id',
				slug: 'complete-room-slug',
				drawing: completeRoomSnapshot,
			}

			// Verify all properties are preserved
			expect(persistedSnapshot.drawing.clock).toBe(100)
			expect(persistedSnapshot.drawing.documentClock).toBe(95)
			expect(persistedSnapshot.drawing.documents).toHaveLength(2)
			expect(persistedSnapshot.drawing.tombstones).toEqual({
				'deleted:old1': 50,
				'deleted:old2': 60,
			})
			expect(persistedSnapshot.drawing.tombstoneHistoryStartsAtClock).toBe(40)
		})
	})

	describe('realistic Supabase persistence scenarios', () => {
		it('should handle UUID-style room IDs', () => {
			const roomSnapshot: RoomSnapshot = { clock: 1, documents: [] }

			const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				slug: 'design-session-2024',
				drawing: roomSnapshot,
			}

			expect(persistedSnapshot.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
			expect(persistedSnapshot.slug).toBe('design-session-2024')
		})

		it('should handle URL-friendly slugs with various formats', () => {
			const roomSnapshot: RoomSnapshot = { clock: 1, documents: [] }

			const testCases = [
				'simple-room',
				'room-with-numbers-123',
				'room_with_underscores',
				'UPPERCASE-ROOM',
				'mixed-Case_Room123',
				'room-2024-01-15-meeting',
				'user-alice-project-beta',
			]

			for (const slug of testCases) {
				const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
					id: `id-for-${slug}`,
					slug,
					drawing: roomSnapshot,
				}

				expect(persistedSnapshot.slug).toBe(slug)
				expect(typeof persistedSnapshot.slug).toBe('string')
			}
		})

		it('should handle complex drawing state with multiple records', () => {
			const complexRoomSnapshot: RoomSnapshot = {
				clock: 500,
				documentClock: 490,
				documents: [
					{
						state: {
							id: 'shape:rectangle1' as any,
							typeName: 'shape',
							type: 'geo',
							x: 100,
							y: 200,
							w: 150,
							h: 75,
						} as any,
						lastChangedClock: 450,
					},
					{
						state: {
							id: 'shape:text1' as any,
							typeName: 'shape',
							type: 'text',
							x: 300,
							y: 100,
							text: 'Hello World',
						} as any,
						lastChangedClock: 480,
					},
					{
						state: {
							id: 'binding:arrow1' as any,
							typeName: 'binding',
							type: 'arrow',
							fromId: 'shape:rectangle1' as any,
							toId: 'shape:text1' as any,
						} as any,
						lastChangedClock: 490,
					},
				],
				tombstones: {
					'shape:deleted1': 400,
					'shape:deleted2': 350,
					'binding:old-connection': 300,
				},
				tombstoneHistoryStartsAtClock: 250,
			}

			const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
				id: 'complex-drawing-id',
				slug: 'collaborative-whiteboard-session',
				drawing: complexRoomSnapshot,
			}

			// Verify complex structure is preserved
			expect(persistedSnapshot.drawing.documents).toHaveLength(3)
			expect(persistedSnapshot.drawing.documents[0].state.id).toBe('shape:rectangle1')
			expect(persistedSnapshot.drawing.documents[1].state.id).toBe('shape:text1')
			expect(persistedSnapshot.drawing.documents[2].state.id).toBe('binding:arrow1')

			expect(Object.keys(persistedSnapshot.drawing.tombstones!)).toHaveLength(3)
			expect(persistedSnapshot.drawing.tombstones!['shape:deleted1']).toBe(400)
		})
	})

	describe('edge cases and boundaries', () => {
		it('should handle empty strings for id and slug', () => {
			const roomSnapshot: RoomSnapshot = { clock: 0, documents: [] }

			const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
				id: '',
				slug: '',
				drawing: roomSnapshot,
			}

			expect(persistedSnapshot.id).toBe('')
			expect(persistedSnapshot.slug).toBe('')
			expect(persistedSnapshot.drawing).toEqual(roomSnapshot)
		})

		it('should handle very large clock values', () => {
			const largeClockRoomSnapshot: RoomSnapshot = {
				clock: Number.MAX_SAFE_INTEGER,
				documentClock: Number.MAX_SAFE_INTEGER - 1,
				documents: [
					{
						state: { id: 'test' as any, typeName: 'test' } as any,
						lastChangedClock: Number.MAX_SAFE_INTEGER - 2,
					},
				],
				tombstones: {
					'deleted:old': Number.MAX_SAFE_INTEGER - 3,
				},
				tombstoneHistoryStartsAtClock: Number.MAX_SAFE_INTEGER - 4,
			}

			const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
				id: 'large-clock-room',
				slug: 'high-activity-room',
				drawing: largeClockRoomSnapshot,
			}

			expect(persistedSnapshot.drawing.clock).toBe(Number.MAX_SAFE_INTEGER)
			expect(persistedSnapshot.drawing.documentClock).toBe(Number.MAX_SAFE_INTEGER - 1)
			expect(persistedSnapshot.drawing.documents[0].lastChangedClock).toBe(
				Number.MAX_SAFE_INTEGER - 2
			)
		})

		it('should handle zero and negative clock values', () => {
			const zeroClockRoomSnapshot: RoomSnapshot = {
				clock: 0,
				documentClock: 0,
				documents: [
					{
						state: { id: 'initial' as any, typeName: 'document' } as any,
						lastChangedClock: 0,
					},
				],
				tombstones: {
					'never:existed': 0,
				},
				tombstoneHistoryStartsAtClock: 0,
			}

			const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
				id: 'zero-clock-room',
				slug: 'initial-state-room',
				drawing: zeroClockRoomSnapshot,
			}

			expect(persistedSnapshot.drawing.clock).toBe(0)
			expect(persistedSnapshot.drawing.documentClock).toBe(0)
			expect(persistedSnapshot.drawing.tombstoneHistoryStartsAtClock).toBe(0)
		})

		it('should handle very long id and slug values', () => {
			const longId = 'a'.repeat(1000)
			const longSlug = 'b'.repeat(500)
			const roomSnapshot: RoomSnapshot = { clock: 1, documents: [] }

			const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
				id: longId,
				slug: longSlug,
				drawing: roomSnapshot,
			}

			expect(persistedSnapshot.id).toHaveLength(1000)
			expect(persistedSnapshot.slug).toHaveLength(500)
			expect(persistedSnapshot.id).toBe(longId)
			expect(persistedSnapshot.slug).toBe(longSlug)
		})

		it('should handle special characters in id and slug', () => {
			const roomSnapshot: RoomSnapshot = { clock: 1, documents: [] }

			const specialCases = [
				{ id: 'id-with-spaces and symbols!@#$', slug: 'slug_with-mixed.chars' },
				{ id: 'id\nwith\nnewlines', slug: 'slug\twith\ttabs' },
				{ id: 'unicode-测试-🎨', slug: 'emojis-🚀-and-中文' },
				{ id: 'quotes"and\'apostrophes', slug: 'backslash\\and/forward' },
			]

			for (const testCase of specialCases) {
				const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
					id: testCase.id,
					slug: testCase.slug,
					drawing: roomSnapshot,
				}

				expect(persistedSnapshot.id).toBe(testCase.id)
				expect(persistedSnapshot.slug).toBe(testCase.slug)
			}
		})
	})

	describe('data consistency and integrity', () => {
		it('should preserve exact object references and deep equality', () => {
			const originalRecord: UnknownRecord = {
				id: 'shape:preserved' as any,
				typeName: 'shape',
				nested: {
					deep: {
						value: 'unchanged',
					},
				},
				array: [1, 2, 3, { inner: 'value' }],
			} as any

			const roomSnapshot: RoomSnapshot = {
				clock: 10,
				documents: [{ state: originalRecord, lastChangedClock: 8 }],
			}

			const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
				id: 'integrity-test',
				slug: 'data-consistency-check',
				drawing: roomSnapshot,
			}

			// Verify deep equality is preserved
			expect(persistedSnapshot.drawing.documents[0].state).toEqual(originalRecord)
			expect((persistedSnapshot.drawing.documents[0].state as any).nested).toEqual(
				(originalRecord as any).nested
			)
			expect((persistedSnapshot.drawing.documents[0].state as any).array).toEqual(
				(originalRecord as any).array
			)

			// Verify references are preserved (same object)
			expect(persistedSnapshot.drawing.documents[0].state).toBe(originalRecord)
		})

		it('should handle empty and null-like values correctly', () => {
			const roomSnapshotWithEmpty: RoomSnapshot = {
				clock: 1,
				documents: [],
				tombstones: {},
				tombstoneHistoryStartsAtClock: 0,
			}

			const persistedSnapshot: PersistedRoomSnapshotForSupabase = {
				id: 'empty-values-test',
				slug: 'null-handling',
				drawing: roomSnapshotWithEmpty,
			}

			expect(persistedSnapshot.drawing.documents).toEqual([])
			expect(persistedSnapshot.drawing.tombstones).toEqual({})
			expect(persistedSnapshot.drawing.tombstoneHistoryStartsAtClock).toBe(0)
		})

		it('should maintain consistency with optional properties', () => {
			// Test with some optional properties present
			const partialRoomSnapshot1: RoomSnapshot = {
				clock: 5,
				documentClock: 3,
				documents: [],
				// tombstones and tombstoneHistoryStartsAtClock are undefined
			}

			// Test with other optional properties present
			const partialRoomSnapshot2: RoomSnapshot = {
				clock: 8,
				documents: [],
				tombstones: { 'deleted:item': 7 },
				// documentClock and tombstoneHistoryStartsAtClock are undefined
			}

			const snapshot1: PersistedRoomSnapshotForSupabase = {
				id: 'partial1',
				slug: 'optional-props-test-1',
				drawing: partialRoomSnapshot1,
			}

			const snapshot2: PersistedRoomSnapshotForSupabase = {
				id: 'partial2',
				slug: 'optional-props-test-2',
				drawing: partialRoomSnapshot2,
			}

			// Verify defined properties are preserved
			expect(snapshot1.drawing.documentClock).toBe(3)
			expect(snapshot1.drawing.tombstones).toBeUndefined()

			expect(snapshot2.drawing.documentClock).toBeUndefined()
			expect(snapshot2.drawing.tombstones).toEqual({ 'deleted:item': 7 })
		})
	})

	describe('usage patterns and documentation examples', () => {
		it('should match the saving example from JSDoc', () => {
			// Simulate the example from the JSDoc comments
			const roomSnapshot: RoomSnapshot = {
				clock: 42,
				documentClock: 38,
				documents: [
					{
						state: {
							id: 'shape:whiteboard-element' as any,
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
				id: crypto.randomUUID(), // Would be a real UUID in practice
				slug: 'collaborative-whiteboard-session',
				drawing: roomSnapshot,
			}

			// Verify the structure matches what would be saved to Supabase
			expect(typeof persistedData.id).toBe('string')
			expect(persistedData.slug).toBe('collaborative-whiteboard-session')
			expect(persistedData.drawing).toBe(roomSnapshot)

			// Verify it can be serialized (as would happen in database storage)
			const serialized = JSON.stringify(persistedData)
			const deserialized = JSON.parse(serialized) as PersistedRoomSnapshotForSupabase

			expect(deserialized.drawing.clock).toBe(42)
			expect(deserialized.drawing.documents[0].state.id).toBe('shape:whiteboard-element')
		})

		it('should match the loading example from JSDoc', () => {
			// Simulate the loading example from JSDoc
			const mockSupabaseData: PersistedRoomSnapshotForSupabase = {
				id: 'db-record-uuid',
				slug: 'design-session-2024',
				drawing: {
					clock: 156,
					documentClock: 150,
					documents: [
						{
							state: {
								id: 'shape:loaded-element' as any,
								typeName: 'shape',
								data: 'restored from database',
							} as any,
							lastChangedClock: 145,
						},
					],
					tombstones: { 'shape:old': 100 },
					tombstoneHistoryStartsAtClock: 80,
				},
			}

			// Simulate retrieving from database and using the data
			const roomData = mockSupabaseData as PersistedRoomSnapshotForSupabase

			// Verify we can extract the room snapshot as expected
			expect(roomData.drawing).toBeDefined()
			expect(roomData.drawing.clock).toBe(156)
			expect(roomData.drawing.documents).toHaveLength(1)
			expect(roomData.drawing.documents[0].state.id).toBe('shape:loaded-element')

			// Verify the snapshot could be used to initialize a room
			const roomSnapshot = roomData.drawing
			expect(roomSnapshot.clock).toBeGreaterThan(0)
			expect(Array.isArray(roomSnapshot.documents)).toBe(true)
		})

		it('should support common database query patterns', () => {
			// Simulate multiple room records as would be returned by database queries
			const multipleRooms: PersistedRoomSnapshotForSupabase[] = [
				{
					id: 'room1',
					slug: 'team-brainstorm',
					drawing: { clock: 100, documents: [] },
				},
				{
					id: 'room2',
					slug: 'design-review',
					drawing: { clock: 200, documents: [] },
				},
				{
					id: 'room3',
					slug: 'client-presentation',
					drawing: { clock: 300, documents: [] },
				},
			]

			// Test filtering patterns
			const brainstormRoom = multipleRooms.find((room) => room.slug === 'team-brainstorm')
			expect(brainstormRoom).toBeDefined()
			expect(brainstormRoom!.drawing.clock).toBe(100)

			// Test sorting patterns (create a copy to avoid mutating original)
			const sortedByActivity = [...multipleRooms].sort((a, b) => b.drawing.clock - a.drawing.clock)
			expect(sortedByActivity[0].slug).toBe('client-presentation') // Highest clock
			expect(sortedByActivity[2].slug).toBe('team-brainstorm') // Lowest clock

			// Test mapping patterns (on original array)
			const slugs = multipleRooms.map((room) => room.slug)
			expect(slugs).toEqual(['team-brainstorm', 'design-review', 'client-presentation'])
		})
	})

	describe('type inference and TypeScript integration', () => {
		it('should allow proper type inference for all properties', () => {
			const createPersistedSnapshot = (
				id: string,
				slug: string,
				drawing: RoomSnapshot
			): PersistedRoomSnapshotForSupabase => {
				return { id, slug, drawing }
			}

			const roomSnapshot: RoomSnapshot = {
				clock: 1,
				documents: [],
			}

			const result = createPersistedSnapshot('test-id', 'test-slug', roomSnapshot)

			// TypeScript should infer the correct types
			expect(result.id).toBe('test-id')
			expect(result.slug).toBe('test-slug')
			expect(result.drawing).toBe(roomSnapshot)
		})

		it('should work with generic database operations', () => {
			// Simulate generic database operations that might use this interface
			const saveToDatabase = <T extends PersistedRoomSnapshotForSupabase>(data: T): T => {
				// Simulate database save operation
				return { ...data } // Return a copy as databases typically do
			}

			const loadFromDatabase = (id: string): PersistedRoomSnapshotForSupabase | null => {
				// Simulate database load operation
				if (id === 'existing') {
					return {
						id: 'existing',
						slug: 'found-room',
						drawing: { clock: 1, documents: [] },
					}
				}
				return null
			}

			const testData: PersistedRoomSnapshotForSupabase = {
				id: 'save-test',
				slug: 'generic-operations',
				drawing: { clock: 5, documents: [] },
			}

			const saved = saveToDatabase(testData)
			expect(saved.id).toBe('save-test')
			expect(saved).not.toBe(testData) // Should be a copy

			const loaded = loadFromDatabase('existing')
			expect(loaded).toBeDefined()
			expect(loaded!.slug).toBe('found-room')

			const notFound = loadFromDatabase('nonexistent')
			expect(notFound).toBeNull()
		})
	})
})

import { RoomSnapshot } from './TLSyncRoom'

/**
 * Database schema interface for persisting tldraw room snapshots in Supabase.
 *
 * This interface defines the structure used to store collaborative drawing rooms
 * in a Supabase database, containing both metadata and the complete room state.
 * The room snapshot includes all documents, tombstones, and synchronization clocks
 * needed to restore a collaborative session.
 *
 * @param id - Unique identifier for the persisted room record in the database
 * @param slug - Human-readable URL slug or identifier for the room (e.g., "my-drawing-123")
 * @param drawing - Complete room snapshot containing all synchronized state and metadata
 *
 * @example
 * ```ts
 * // Saving a room snapshot to Supabase
 * const roomSnapshot = syncRoom.getSnapshot()
 * const persistedData: PersistedRoomSnapshotForSupabase = {
 *   id: crypto.randomUUID(),
 *   slug: 'collaborative-whiteboard-session',
 *   drawing: roomSnapshot
 * }
 *
 * await supabase
 *   .from('rooms')
 *   .insert(persistedData)
 * ```
 *
 * @example
 * ```ts
 * // Loading a room snapshot from Supabase
 * const { data } = await supabase
 *   .from('rooms')
 *   .select('*')
 *   .eq('slug', roomSlug)
 *   .single()
 *
 * const roomData = data as PersistedRoomSnapshotForSupabase
 * const room = new TLSyncRoom({
 *   schema: mySchema,
 *   snapshot: roomData.drawing
 * })
 * ```
 *
 * @internal
 */
export interface PersistedRoomSnapshotForSupabase {
	id: string
	slug: string
	drawing: RoomSnapshot
}

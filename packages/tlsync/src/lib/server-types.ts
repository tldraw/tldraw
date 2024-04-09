import { RoomSnapshot, TLSyncRoom } from './TLSyncRoom'

/** @public */
export type RoomState = {
	// the slug of the room
	persistenceKey: string
	// the room
	room: TLSyncRoom<any>
}

/** @public */
export type PersistedRoomSnapshotForSupabase = { id: string; slug: string; drawing: RoomSnapshot }

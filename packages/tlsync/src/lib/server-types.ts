import { RoomSnapshot, TLSyncRoom } from './TLSyncRoom'

/** @public */
export interface RoomState {
	// the slug of the room
	persistenceKey: string
	// the room
	room: TLSyncRoom<any>
}

/** @public */
export interface PersistedRoomSnapshotForSupabase {
	id: string
	slug: string
	drawing: RoomSnapshot
}

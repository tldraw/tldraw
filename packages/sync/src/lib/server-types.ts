import { RoomSnapshot } from './TLSyncRoom'

/** @public */
export interface PersistedRoomSnapshotForSupabase {
	id: string
	slug: string
	drawing: RoomSnapshot
}

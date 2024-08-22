import { RoomSnapshot } from './TLSyncRoom'

/** @internal */
export interface PersistedRoomSnapshotForSupabase {
	id: string
	slug: string
	drawing: RoomSnapshot
}

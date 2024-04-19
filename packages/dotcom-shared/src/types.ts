import { SerializedSchema, SerializedStore, TLRecord } from 'tldraw'

export type Snapshot = {
	schema: SerializedSchema
	snapshot: SerializedStore<TLRecord>
}

export type CreateRoomRequestBody = {
	origin: string
	snapshot: Snapshot
}

export type CreateSnapshotRequestBody = {
	schema: SerializedSchema
	snapshot: SerializedStore<TLRecord>
	parent_slug?: string | string[] | undefined
}

export type CreateSnapshotResponseBody =
	| {
			error: false
			roomId: string
	  }
	| {
			error: true
			message: string
	  }

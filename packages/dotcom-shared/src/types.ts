import { SerializedSchema, SerializedStore, TLRecord } from 'tldraw'

export interface Snapshot {
	schema: SerializedSchema
	snapshot: SerializedStore<TLRecord>
}

export interface CreateRoomRequestBody {
	origin: string
	snapshot: Snapshot
}

export interface DuplicateRoomRequestBody {
	parent_slug?: string | undefined
}

export type DuplicateRoomResponseBody =
	| {
			error: false
			slug: string
	  }
	| {
			error: true
			message: string
	  }

export interface CreateSnapshotRequestBody {
	schema: SerializedSchema
	snapshot: SerializedStore<TLRecord>
	parent_slug?: string | undefined
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

export interface GetReadonlySlugResponseBody {
	slug: string
	isLegacy: boolean
}

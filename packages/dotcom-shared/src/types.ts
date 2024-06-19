import { RecordsDiff, SerializedSchema, SerializedStore, TLRecord } from 'tldraw'

export interface Snapshot {
	schema: SerializedSchema
	snapshot: SerializedStore<TLRecord>
}

export interface CreateRoomRequestBody {
	origin: string
	snapshot: Snapshot
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

export interface ASLoadServerMessage {
	type: 'load'
	snapshot: SerializedStore<TLRecord>
}

export interface ASUpdateServerMessage {
	type: 'update'
	clientId: string
	clientVersion: number
	changes: RecordsDiff<TLRecord>
}

export type ASServerMessage = ASLoadServerMessage | ASUpdateServerMessage

export interface ASLoadClientMessage {
	type: 'load'
}

export interface ASUpdateClientMessage {
	type: 'update'
	clientId: string
	clientVersion: number
	changes: RecordsDiff<TLRecord>
}

export type ASClientMessage = ASLoadClientMessage | ASUpdateClientMessage

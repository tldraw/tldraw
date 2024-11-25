import { stringEnum } from '@tldraw/utils'
import { SerializedSchema, SerializedStore, TLRecord } from 'tldraw'
import { TlaFile, TlaFileState, TlaUser } from './tlaSchema'

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

/* ----------------------- App ---------------------- */

export interface CreateFilesRequestBody {
	origin: string
	snapshots: Snapshot[]
}

export type CreateFilesResponseBody =
	| {
			error: false
			slugs: string[]
	  }
	| {
			error: true
			message: string
	  }

export type PublishFileResponseBody =
	| {
			error: false
	  }
	| {
			error: true
			message: string
	  }

export type UnpublishFileResponseBody =
	| {
			error: false
	  }
	| {
			error: true
			message: string
	  }

export interface ZStoreData {
	files: TlaFile[]
	fileStates: TlaFileState[]
	user: TlaUser
}

export interface ZRowUpdate {
	row: TlaFile | TlaFileState | TlaUser
	table: 'file' | 'file_state' | 'user'
	event: 'insert' | 'update' | 'delete'
}

export type ZTable = 'file' | 'file_state' | 'user'
export type ZEvent = 'insert' | 'update' | 'delete'

export const ZErrorCode = stringEnum(
	'publish_failed',
	'unpublish_failed',
	'republish_failed',
	'unknown_error',
	'forbidden',
	'bad_request',
	'rate_limit_exceeded'
)
export type ZErrorCode = keyof typeof ZErrorCode

export type ZServerSentMessage =
	| {
			type: 'initial_data'
			initialData: ZStoreData
	  }
	| {
			type: 'update'
			update: ZRowUpdate
	  }
	| {
			type: 'commit'
			mutationIds: string[]
	  }
	| {
			type: 'reject'
			mutationId: string
			errorCode: ZErrorCode
	  }

export interface ZClientSentMessage {
	type: 'mutate'
	mutationId: string
	updates: ZRowUpdate[]
}

export type TlaFileOpenMode = 'create' | 'duplicate' | null | undefined

export const UserPreferencesKeys = [
	'locale',
	'animationSpeed',
	'edgeScrollSpeed',
	'colorScheme',
	'isSnapMode',
	'isWrapMode',
	'isDynamicSizeMode',
	'isPasteAtCursorMode',
	'name',
	'color',
] as const satisfies Array<keyof TlaUser>

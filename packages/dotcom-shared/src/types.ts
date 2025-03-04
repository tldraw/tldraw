import { stringEnum } from '@tldraw/utils'
import type { SerializedSchema, SerializedStore, TLRecord } from 'tldraw'
import {
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
	TlaUser,
	TlaUserPartial,
} from './tlaSchema'

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
	lsn: string
}

export type ZRowUpdate = ZRowInsert | ZRowDeleteOrUpdate

export interface ZRowInsert {
	row: TlaFile | TlaFileState | TlaUser
	table: ZTable
	event: 'insert'
}

export interface ZRowDeleteOrUpdate {
	row: TlaFilePartial | TlaFileStatePartial | TlaUserPartial
	table: ZTable
	event: 'update' | 'delete'
}

export type ZTable = 'file' | 'file_state' | 'user'
export type ZEvent = 'insert' | 'update' | 'delete'

export const ZErrorCode = stringEnum(
	'publish_failed',
	'unpublish_failed',
	'republish_failed',
	'unknown_error',
	'client_too_old',
	'forbidden',
	'bad_request',
	'rate_limit_exceeded',
	'max_files_reached'
)
export type ZErrorCode = keyof typeof ZErrorCode

// increment this to force clients to reload
// e.g. if we make backwards-incompatible changes to the schema
export const Z_PROTOCOL_VERSION = 1

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

export interface SubmitFeedbackRequestBody {
	description: string
	allowContact: boolean
}

export const MAX_PROBLEM_DESCRIPTION_LENGTH = 2000

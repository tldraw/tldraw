import { stringEnum } from '@tldraw/utils'
import type { SerializedSchema, SerializedStore, TLRecord } from 'tldraw'
import {
	TlaFile,
	TlaFileFairy,
	TlaFileState,
	TlaGroup,
	TlaGroupFile,
	TlaGroupUser,
	TlaRow,
	TlaRowPartial,
	TlaUser,
	TlaUserFairy,
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

export interface HistoryResponseBody {
	timestamps: string[]
	hasMore: boolean
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

export type GetInviteInfoResponseBody =
	| {
			error: false
			groupId: string
			groupName: string
			isValid: true
			inviteSecret: string
	  }
	| {
			error: true
			message: string
	  }

export type AcceptInviteResponseBody =
	| {
			error: false
			message: string
			groupId: string
			groupName: string
			success: true
	  }
	| {
			error: false
			message: string
			groupId: string
			groupName: string
			alreadyMember: true
	  }
	| {
			error: true
			message: string
	  }

export interface ZStoreData {
	file: TlaFile[]
	file_state: TlaFileState[]
	user: TlaUser[]
	group: TlaGroup[]
	group_user: TlaGroupUser[]
	group_file: TlaGroupFile[]
	user_fairies: TlaUserFairy[]
	file_fairies: TlaFileFairy[]
	lsn: string
}

export type ZRowUpdate = ZRowInsert | ZRowDeleteOrUpdate

export interface ZRowInsert {
	row: TlaRow
	table: ZTable
	event: 'insert'
}

export interface ZRowDeleteOrUpdate {
	row: TlaRowPartial
	table: ZTable
	event: 'update' | 'delete'
}

export type ZTable =
	| 'file'
	| 'file_state'
	| 'user'
	| 'group'
	| 'group_user'
	| 'group_file'
	| 'user_fairies'
	| 'file_fairies'

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
	'max_groups_reached',
	'max_files_reached'
)
export type ZErrorCode = keyof typeof ZErrorCode

// increment this to force clients to reload
// e.g. if we make backwards-incompatible changes to the schema
export const Z_PROTOCOL_VERSION = 3
export const MIN_Z_PROTOCOL_VERSION = 3

export type ZServerSentPacket =
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

export type ZServerSentMessage = ZServerSentPacket[]

export interface ZClientSentMessage {
	type: 'mutator'
	mutationId: string
	name: string
	props: object
}

export const UserPreferencesKeys = [
	'locale',
	'animationSpeed',
	'areKeyboardShortcutsEnabled',
	'edgeScrollSpeed',
	'colorScheme',
	'isSnapMode',
	'isWrapMode',
	'isDynamicSizeMode',
	'isPasteAtCursorMode',
	'enhancedA11yMode',
	'inputMode',
	'name',
	'color',
] as const satisfies Array<keyof TlaUser>

export interface SubmitFeedbackRequestBody {
	description: string
	allowContact: boolean
	url: string
}

export const MAX_PROBLEM_DESCRIPTION_LENGTH = 2000

export type TLCustomServerEvent = { type: 'persistence_good' } | { type: 'persistence_bad' }

/* ----------------------- Fairy Access ---------------------- */

export interface PaddleCustomData {
	userId: string
	email?: string
}

export type FeatureFlagKey = 'fairies' | 'fairies_purchase'

export interface FeatureFlagValue {
	enabled: boolean
	description: string
}

export function hasActiveFairyAccess(
	fairyAccessExpiresAt: number | null,
	fairyLimit: number | null
): boolean {
	return (
		fairyLimit !== null &&
		fairyLimit > 0 &&
		fairyAccessExpiresAt !== null &&
		fairyAccessExpiresAt > Date.now()
	)
}

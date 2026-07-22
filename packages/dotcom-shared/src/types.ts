import { stringEnum } from '@tldraw/utils'
import type { SerializedSchema, SerializedStore, TLRecord } from 'tldraw'
import {
	TlaFile,
	TlaFileState,
	TlaGroup,
	TlaGroupFile,
	TlaGroupUser,
	TlaRow,
	TlaRowPartial,
	TlaUser,
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
			workspaceId: string
			workspaceName: string
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
			workspaceId: string
			workspaceName: string
			success: true
	  }
	| {
			error: false
			message: string
			workspaceId: string
			workspaceName: string
			alreadyMember: true
	  }
	| {
			error: true
			message: string
	  }

/**
 * The most pages the board-info tool will enumerate for a board. Bounds the page list the MCP
 * server returns and the valid page-ordinal range for screenshots.
 */
export const MAX_THUMBNAIL_PAGES = 40

// Thumbnail output dimensions, shared by the worker (cache keys, render tokens) and the client
// render page (page sizing, clamping) so both sides agree on the size and bounds.
export const DEFAULT_THUMBNAIL_WIDTH = 1200
export const DEFAULT_THUMBNAIL_HEIGHT = 630
export const MIN_THUMBNAIL_DIMENSION = 200
export const MAX_THUMBNAIL_DIMENSION = 1600

// Browser Run screenshot deadlines, shared so the worker and the client render page stay in sync.
// The worker's screenshot waits THUMBNAIL_RENDER_TIMEOUT_MS after navigation for the render page to
// set `data-thumbnail-ready`. That whole window is the render page's budget; it must spend most of
// it on the export itself (editor.toImage + base64 + paint), so it caps only the pre-export settle
// wait (fonts/asset warmup) at the much smaller THUMBNAIL_SETTLE_TIMEOUT_MS. Keeping the two derived
// from one place stops them drifting into a state where settle can starve the export of the window.
export const THUMBNAIL_RENDER_TIMEOUT_MS = 45_000
export const THUMBNAIL_SETTLE_TIMEOUT_MS = 10_000

export interface ThumbnailRenderParams {
	camera?: 'content'
	/** The TLPageId of the single page to render. When omitted, the page the snapshot opens to. */
	pageId?: string
	x: number
	y: number
	z: number
	width: number
	height: number
	theme: 'light' | 'dark'
}

export type ThumbnailSnapshotResponseBody =
	| {
			error: false
			records: TLRecord[]
			schema: SerializedSchema
			renderParams: ThumbnailRenderParams
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

export type ZTable = 'file' | 'file_state' | 'user' | 'group' | 'group_user' | 'group_file'

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
	'max_workspaces_reached',
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
	'isZoomDirectionInverted',
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

/* ----------------------- Feature Flags ---------------------- */

export const FEATURE_FLAG_KEYS = ['zero_enabled', 'zero_kill_switch', 'rum_enabled'] as const
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number]

export type FeatureFlagValue = BooleanFeatureFlag | PercentageFeatureFlag

export interface BooleanFeatureFlag {
	type: 'boolean'
	enabled: boolean
	description: string
}

export interface PercentageFeatureFlag {
	type: 'percentage'
	/** 0–100. Server evaluates per-user: enabled when hash(userId+flag) < percentage. */
	percentage: number
	/** Master toggle — when false, disabled for all users regardless of percentage. */
	enabled: boolean
	description: string
}

/** Returned by the user-facing endpoint — just the evaluated result, no server internals. */
export interface EvaluatedFeatureFlag {
	enabled: boolean
}

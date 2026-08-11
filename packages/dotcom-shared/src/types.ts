import { stringEnum } from '@tldraw/utils'
import type { SerializedSchema, SerializedStore, TLRecord } from 'tldraw'
import {
	TlaComment,
	TlaCommentMention,
	TlaCommentReaction,
	TlaCommentRead,
	TlaCommentThread,
	TlaFile,
	TlaFileState,
	TlaFileVisitor,
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
	/**
	 * `content` fits the page's content to the requested output size. When omitted, the render page
	 * sets the x/y/z viewport below directly. Every surface mints `content` today; the viewport path
	 * is kept because the render page and the worker deploy separately (see ThumbnailRenderJob).
	 */
	camera?: 'content'
	/** The TLPageId of the single page to render. When omitted, the page the snapshot opens to. */
	pageId?: string
	/**
	 * Restricts the export to these shapes: the camera fits their common bounds and only they are
	 * drawn, so neighbouring shapes never leak into the frame. When omitted the whole page renders.
	 */
	shapeIds?: string[]
	/** `measure` means: skip the export, POST the page's measured geometry back, then signal ready. */
	mode?: 'screenshot' | 'measure'
	x: number
	y: number
	z: number
	width: number
	height: number
	theme: 'light' | 'dark'
}

/**
 * What the editor reports for one shape: its page-space box, and the plain text its ShapeUtil says it
 * holds. Both are things only an editor can answer — sizing needs font metrics, and getText is shape
 * behaviour rather than something readable off the record.
 */
export interface ThumbnailShapeMeasurement {
	x: number
	y: number
	w: number
	h: number
	/** `ShapeUtil.getText(shape)`, absent when the shape has no text. */
	text?: string
}

/** Body of POST /app/thumbnail-render/result — `shapeId -> measurement`, as the editor measured it. */
export interface ThumbnailRenderResultRequestBody {
	token: string
	bounds: Record<string, ThumbnailShapeMeasurement>
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
	// Optional: comments are served via the proper-Zero synced query, not the legacy polyfill store,
	// so the polyfill never populates this. Present only so the CRUD types (generic over all schema
	// tables) compile.
	comment?: TlaComment[]
	// Same as comment: never populated by the legacy polyfill store, present only for the
	// generic CRUD types.
	comment_thread?: TlaCommentThread[]
	// Same as comment: never populated by the legacy polyfill store, present only for the
	// generic CRUD types.
	comment_read?: TlaCommentRead[]
	// Same as comment: never populated by the legacy polyfill store, present only for the
	// generic CRUD types.
	comment_mention?: TlaCommentMention[]
	// Same as comment: never populated by the legacy polyfill store, present only for the
	// generic CRUD types.
	comment_reaction?: TlaCommentReaction[]
	// Same as comment: the viewer roster is served via the proper-Zero synced query (fileVisitors),
	// never populated by the legacy polyfill store; present only for the generic CRUD types.
	file_visitor?: TlaFileVisitor[]
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
	| 'file_visitor'
	| 'user'
	| 'group'
	| 'group_user'
	| 'group_file'
	| 'comment'
	| 'comment_thread'
	| 'comment_read'
	| 'comment_mention'
	| 'comment_reaction'

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

export const FEATURE_FLAG_KEYS = [
	'rum_enabled',
	'commenting_enabled',
	'mcp_friends_and_family',
	'hidden_tab_suspend',
] as const
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

/**
 * One person on the MCP friends and family list that `mcp_friends_and_family` gates on. Admins enter
 * an email, which is resolved to a user id on save; matching is on the id, and the email is kept only
 * so the admin panel can show a readable list.
 */
export interface FriendsAndFamilyEntry {
	userId: string
	email: string
}

/** One unassociated or unverifiable asset in an admin asset-diagnostics report. */
export interface AdminFileAssetProblem {
	assetId: string
	objectName: string
	src: string
	fileIdMeta: string | null
	/** null = the bucket head check failed, not a confirmed absence */
	inBucket: boolean | null
	dbRow: { fileId: string } | null
}

/** Response of the admin file-assets diagnostics endpoint. */
export interface AdminFileAssetsResponseBody {
	file: Pick<
		TlaFile,
		'id' | 'name' | 'ownerId' | 'owningGroupId' | 'isDeleted' | 'createSource'
	> | null
	/** null exists = not checked (prefix needs slug translation) or the check failed */
	source: { raw: string; exists: boolean | null } | null
	shapes: {
		total: number
		byType: Record<string, number>
	}
	assets: {
		/** Every asset record in the snapshot, including `external` ones */
		total: number
		associated: number
		pending: number
		/** Assets the association pass can't act on: bookmarks, non-http srcs, R2-invalid names */
		external: number
		oldFormatUrls: number
		missingInBucket: number
		headFailures: number
		/** Sums sizes of assets found in the uploads bucket; missing or failed heads contribute 0 */
		totalSizeBytes: number
		largestSizeBytes: number
		problems: AdminFileAssetProblem[]
	}
	dbRows: { forThisFile: number; orphaned: number }
	warnings: string[]
}

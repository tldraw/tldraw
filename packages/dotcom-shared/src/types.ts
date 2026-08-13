import { stringEnum } from '@tldraw/utils'
import type { SerializedSchema, SerializedStore, TLRecord } from 'tldraw'
import { TlaEffectOutbox, TlaFile, TlaUser } from './tlaSchema'

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

/**
 * Response of the admin board-stats endpoint: the shape of a board without its contents.
 *
 * Every field is a count, an enum tally, a size, or a timestamp. Nothing here is text a user typed,
 * a URL they pasted, a shape id, or a person's id — so a report can be pasted into an issue, a
 * Sentry thread, or a support reply without leaking what's on the board or who made it. Anything
 * added here has to hold that line; use the asset diagnostics report when you need identifiers.
 */
export interface AdminFileStatsResponseBody {
	/** null when no `file` row exists — legacy rooms have a snapshot but no row */
	file: {
		ownerType: 'user' | 'group' | 'none'
		createdAt: number
		updatedAt: number
		isDeleted: boolean
		isEmpty: boolean
		published: boolean
		shared: boolean
		sharedLinkType: string
		/** Only the prefix (`file`, `room`, `publish`, `local`, …); the id half would name a board */
		createSourceKind: string | null
	} | null
	snapshot: {
		/** Stored size of the snapshot object in R2; null when the head check failed */
		sizeBytes: number | null
		clock: number | null
		documentClock: number | null
		tombstones: number
		records: number
		recordsByTypeName: Record<string, number>
		/** Serialized schema version, for spotting boards stuck behind a migration */
		schemaVersion: number | null
		/** Per-record-type sequence numbers from the serialized schema, when it has them */
		sequences: Record<string, number> | null
	}
	pages: { total: number; maxShapesOnAPage: number; empty: number }
	shapes: {
		total: number
		byType: Record<string, number>
		/** Deepest parent chain; 1 means every shape sits directly on a page */
		maxDepth: number
		locked: number
		rotated: number
		/**
		 * Shapes whose parent chain doesn't end at a page: a missing or unusable `parentId`, a chain
		 * that stops on a record that isn't a page, or a chain long enough to be a cycle.
		 */
		orphaned: number
		/**
		 * Bounds covering the shapes parented directly to a page, from x/y plus w/h where the shape
		 * has them. Nested shapes are left out — their x/y is relative to their frame or group, so
		 * mixing the two would give a meaningless box. Rotation is ignored.
		 */
		extent: { width: number; height: number } | null
	}
	/** Lengths only — never the text itself */
	text: { shapesWithText: number; totalCharacters: number; longestCharacters: number }
	bindings: {
		total: number
		byType: Record<string, number>
		/**
		 * The first three partition every arrow shape by how many of its terminals have a binding
		 * record. Whether the bound shape still exists is the separate `dangling` count, so an arrow
		 * bound to a deleted shape shows up in both `boundOneEnd` and `dangling`.
		 */
		arrows: {
			boundBothEnds: number
			boundOneEnd: number
			unbound: number
			/** Bindings pointing at a shape that isn't in the snapshot */
			dangling: number
		}
	}
	/** Value tallies for the enum style props, keyed by prop name then value */
	styles: Record<string, Record<string, number>>
	assets: { total: number; byType: Record<string, number>; totalSizeBytes: number }
	collaboration: { visitors: number; commentThreads: number; comments: number }
	warnings: string[]
}

/** One row of the admin effect-outbox listing, with derived fields the UI needs. */
export interface AdminOutboxRow extends Omit<TlaEffectOutbox, 'createdAt' | 'nextRetryAt'> {
	/** ISO string: crosses the wire as JSON, not a kysely Date. */
	createdAt: string
	/** ISO string: crosses the wire as JSON, not a kysely Date. */
	nextRetryAt: string | null
	ageSeconds: number
	parked: boolean
	/** Current `file` row for tableName 'file' rows; null if hard-deleted or not a file row */
	currentEntity: TlaFile | null
}

/** Response of the admin effect-outbox row listing endpoint. */
export interface AdminOutboxRowsResponseBody {
	rows: AdminOutboxRow[]
}

/** Response of the admin effect-outbox stats endpoint. */
export interface AdminOutboxStatsResponseBody {
	outbox: {
		pending: number
		parked: number
		oldestPendingAgeSeconds: number | null
	}
}

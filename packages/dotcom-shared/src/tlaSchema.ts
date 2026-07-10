import {
	boolean,
	createSchema,
	enumeration,
	json,
	number,
	relationships,
	Row,
	string,
	table,
} from '@rocicorp/zero'
import { IndexKey } from '@tldraw/utils'
import { Role } from './roles'

export interface ZColumn {
	optional?: boolean
	type: 'string' | 'number' | 'boolean' | 'json'
}

export const user = table('user')
	.columns({
		id: string(),
		name: string(),
		email: string(),
		avatar: string(),
		color: string(),
		exportFormat: string(),
		exportTheme: string(),
		exportBackground: boolean(),
		exportPadding: boolean(),
		createdAt: number(),
		updatedAt: number(),
		flags: string(),
		locale: string().optional(),
		animationSpeed: number().optional(),
		areKeyboardShortcutsEnabled: boolean().optional(),
		edgeScrollSpeed: number().optional(),
		colorScheme: string().optional(),
		isSnapMode: boolean().optional(),
		isWrapMode: boolean().optional(),
		isDynamicSizeMode: boolean().optional(),
		isPasteAtCursorMode: boolean().optional(),
		inputMode: string().optional(),
		enhancedA11yMode: boolean().optional(),
		isZoomDirectionInverted: boolean().optional(),
		allowAnalyticsCookie: boolean().optional(),
	})
	.primaryKey('id')

export const file_state = table('file_state')
	.columns({
		userId: string(),
		fileId: string(),
		firstVisitAt: number().optional(),
		lastEditAt: number().optional(),
		lastSessionState: string().optional(),
		lastVisitAt: number().optional(),
		isFileOwner: boolean().optional(),
		isPinned: boolean().optional(),
	})
	.primaryKey('userId', 'fileId')

export const file = table('file')
	.columns({
		id: string(),
		name: string(),
		ownerId: string().optional(),
		owningGroupId: string().optional(),
		ownerName: string(),
		ownerAvatar: string(),
		thumbnail: string(),
		shared: boolean(),
		sharedLinkType: string(),
		published: boolean(),
		lastPublished: number(),
		publishedSlug: string(),
		createdAt: number(),
		updatedAt: number(),
		isEmpty: boolean(),
		isDeleted: boolean(),
		createSource: string().optional(),
	})
	.primaryKey('id')

export const group = table('group')
	.columns({
		id: string(),
		name: string(),
		inviteSecret: string().optional(),
		// Whether the invite link currently lets people join. Toggling this off
		// disables the link without discarding inviteSecret, so re-enabling restores
		// the same link (cf. a file's `shared` flag). Optional so older cached rows
		// without the column read as enabled (defaulted true) until they refetch.
		inviteLinkEnabled: boolean().optional(),
		isDeleted: boolean(),
		createdAt: number(),
		updatedAt: number(),
	})
	.primaryKey('id')

export const group_user = table('group_user')
	.columns({
		userId: string(),
		groupId: string(),
		createdAt: number(),
		updatedAt: number(),
		role: enumeration<Role>(),
		userName: string(),
		userColor: string(),
		index: string<IndexKey>(),
	})
	.primaryKey('userId', 'groupId')

export const group_file = table('group_file')
	.columns({
		fileId: string(),
		groupId: string(),
		createdAt: number(),
		updatedAt: number(),
		index: string<IndexKey>().optional(),
	})
	.primaryKey('fileId', 'groupId')

// Client-visible subset of the comment record; the full column set adds the persistence-only
// columns (see CommentPersistenceColumns and DB below). Zero replicates this per user for the
// app-level /comments view; the in-document view reads from the file room instead. Server-written
// only. Thread anchor/resolution is read via the `thread` relationship rather than a denormalized
// `shapeId` column here, since a thread can be re-anchored after the comment is created.
export const comment = table('comment')
	.columns({
		id: string(),
		fileId: string(),
		threadId: string(),
		pageId: string(),
		authorId: string(),
		body: json(),
		createdAt: number(),
		updatedAt: number(),
	})
	.primaryKey('id')

// The comment thread's anchor location and resolution state, for app-level Zero queries (e.g.
// filtering resolved threads). Server-written only. Persistence-only columns
// (CommentThreadPersistenceColumns: anchor/resolvedBy/meta/lastChangedClock) are deliberately
// absent here so they never replicate to clients.
export const comment_thread = table('comment_thread')
	.columns({
		id: string(),
		fileId: string(),
		pageId: string(),
		// only set for shape-anchored threads; other anchor kinds have no shape
		shapeId: string().optional(),
		resolvedAt: number().optional(),
		createdBy: string(),
		createdAt: number(),
	})
	.primaryKey('id')

// Per-user read receipts for comments, for the app-level /comments view. Row present = read;
// marking unread deletes the row. Written via the comment.markRead/markUnread custom mutators
// (client-written, unlike comment/comment_thread which are server-written by the file's DO).
// Authors' own comments have no row: the client treats authorId === me as implicitly read.
export const comment_read = table('comment_read')
	.columns({
		userId: string(),
		commentId: string(),
		readAt: number(),
	})
	.primaryKey('userId', 'commentId')

const fileRelationships = relationships(file, ({ one, many }) => ({
	owner: one({
		sourceField: ['ownerId'],
		destField: ['id'],
		destSchema: user,
	}),
	states: many({
		sourceField: ['id'],
		destField: ['fileId'],
		destSchema: file_state,
	}),
	groupFiles: many({
		sourceField: ['id'],
		destField: ['fileId'],
		destSchema: group_file,
	}),
}))

const fileStateRelationships = relationships(file_state, ({ one }) => ({
	file: one({
		sourceField: ['fileId'],
		destField: ['id'],
		destSchema: file,
	}),
	user: one({
		sourceField: ['userId'],
		destField: ['id'],
		destSchema: user,
	}),
}))

const groupRelationships = relationships(group, ({ many }) => ({
	groupMembers: many({
		sourceField: ['id'],
		destField: ['groupId'],
		destSchema: group_user,
	}),
	groupFiles: many({
		sourceField: ['id'],
		destField: ['groupId'],
		destSchema: group_file,
	}),
}))

const groupUserRelationships = relationships(group_user, ({ one, many }) => ({
	user: one({
		sourceField: ['userId'],
		destField: ['id'],
		destSchema: user,
	}),
	group: one({
		sourceField: ['groupId'],
		destField: ['id'],
		destSchema: group,
	}),
	groupFiles: many({
		sourceField: ['groupId'],
		destField: ['groupId'],
		destSchema: group_file,
	}),
	groupMembers: many({
		sourceField: ['groupId'],
		destField: ['groupId'],
		destSchema: group_user,
	}),
}))

const groupFileRelationships = relationships(group_file, ({ one, many }) => ({
	file: one({
		sourceField: ['fileId'],
		destField: ['id'],
		destSchema: file,
	}),
	group: one({
		sourceField: ['groupId'],
		destField: ['id'],
		destSchema: group,
	}),
	groupMembers: many({
		sourceField: ['groupId'],
		destField: ['groupId'],
		destSchema: group_user,
	}),
}))

const commentRelationships = relationships(comment, ({ one, many }) => ({
	file: one({
		sourceField: ['fileId'],
		destField: ['id'],
		destSchema: file,
	}),
	author: one({
		sourceField: ['authorId'],
		destField: ['id'],
		destSchema: user,
	}),
	thread: one({
		sourceField: ['threadId'],
		destField: ['id'],
		destSchema: comment_thread,
	}),
	reads: many({
		sourceField: ['id'],
		destField: ['commentId'],
		destSchema: comment_read,
	}),
}))

const commentThreadRelationships = relationships(comment_thread, ({ one }) => ({
	file: one({
		sourceField: ['fileId'],
		destField: ['id'],
		destSchema: file,
	}),
}))

export type TlaFilePartial = Partial<TlaFile> & {
	id: TlaFile['id']
}

export type TlaFileStatePartial = Partial<TlaFileState> & {
	fileId: TlaFileState['fileId']
	userId: TlaFileState['userId']
}
export type TlaUserPartial = Partial<TlaUser> & {
	id: TlaUser['id']
}

export type TlaGroupPartial = Partial<TlaGroup> & {
	id: TlaGroup['id']
}

export type TlaGroupUserPartial = Partial<TlaGroupUser> & {
	userId: TlaGroupUser['userId']
	groupId: TlaGroupUser['groupId']
}

export type TlaGroupFilePartial = Partial<TlaGroupFile> & {
	fileId: TlaGroupFile['fileId']
	groupId: TlaGroupFile['groupId']
}

export type TlaCommentPartial = Partial<TlaComment> & {
	id: TlaComment['id']
}

export type TlaCommentThreadPartial = Partial<TlaCommentThread> & {
	id: TlaCommentThread['id']
}

export type TlaCommentReadPartial = Partial<TlaCommentRead> & {
	userId: TlaCommentRead['userId']
	commentId: TlaCommentRead['commentId']
}

export type TlaRow =
	| TlaFile
	| TlaFileState
	| TlaUser
	| TlaGroup
	| TlaGroupUser
	| TlaGroupFile
	| TlaComment
	| TlaCommentThread
	| TlaCommentRead
export type TlaRowPartial =
	| TlaFilePartial
	| TlaFileStatePartial
	| TlaUserPartial
	| TlaGroupPartial
	| TlaGroupUserPartial
	| TlaGroupFilePartial
	| TlaCommentPartial
	| TlaCommentThreadPartial
	| TlaCommentReadPartial
export interface TlaUserMutationNumber {
	userId: string
	mutationNumber: number
}

export const immutableColumns = {
	user: new Set<keyof TlaUser>(['email', 'createdAt', 'updatedAt', 'avatar']),
	file: new Set<keyof TlaFile>([
		'ownerName',
		'ownerAvatar',
		'owningGroupId',
		'publishedSlug',
		'ownerId',
		'thumbnail',
		'isDeleted',
		'createSource',
		'updatedAt',
		'createdAt',
	]),
	file_state: new Set<keyof TlaFileState>(['firstVisitAt', 'isFileOwner']),
} as const

export function isColumnMutable(tableName: keyof typeof immutableColumns, column: string) {
	return !immutableColumns[tableName].has(column as never)
}

export interface TlaAsset {
	objectName: string
	fileId: string
	userId: string | null
}

/**
 * The welcome-template pointer (see migration 035). Worker-side config only — not a Zero
 * table (absent from `createSchema` below), so it never replicates to clients.
 */
export interface TlaWelcomeTemplate {
	id: boolean
	fileId: string
	publishedSlug: string
	updatedAt: number
}

/**
 * Sync-worker-only persistence columns, absent from the Zero table definitions above so they
 * never replicate to clients. Together with the Zero-visible columns they carry every field of
 * the corresponding TLRecord, so the file's Durable Object can rebuild its room's comment
 * records from rows alone (see commentRows.ts in sync-worker).
 */
export interface CommentThreadPersistenceColumns {
	anchor: unknown
	resolvedBy: string | null
	meta: unknown
	lastChangedClock: number
}
export interface CommentPersistenceColumns {
	editedAt: number | null
	meta: unknown
	lastChangedClock: number
}

export interface DB {
	file: TlaFile
	file_state: TlaFileState
	user: TlaUser
	group: TlaGroup
	group_user: TlaGroupUser
	group_file: TlaGroupFile
	user_mutation_number: TlaUserMutationNumber
	asset: TlaAsset
	welcome_template: TlaWelcomeTemplate
	comment: TlaComment & CommentPersistenceColumns
	comment_thread: TlaCommentThread & CommentThreadPersistenceColumns
	comment_read: TlaCommentRead
}

export const schema = createSchema({
	tables: [
		user,
		file,
		file_state,
		group,
		group_user,
		group_file,
		comment,
		comment_thread,
		comment_read,
	],
	relationships: [
		fileRelationships,
		fileStateRelationships,
		groupRelationships,
		groupUserRelationships,
		groupFileRelationships,
		commentRelationships,
		commentThreadRelationships,
	],
})

export type TlaSchema = typeof schema
export type TlaUser = Row<typeof schema.tables.user>
export type TlaFile = Row<typeof schema.tables.file>
export type TlaFileState = Row<typeof schema.tables.file_state>
export type TlaGroup = Row<typeof schema.tables.group>
export type TlaGroupUser = Row<typeof schema.tables.group_user>
export type TlaGroupFile = Row<typeof schema.tables.group_file>
export type TlaComment = Row<typeof schema.tables.comment>
export type TlaCommentThread = Row<typeof schema.tables.comment_thread>
export type TlaCommentRead = Row<typeof schema.tables.comment_read>

// Permissions are now handled via Synced Queries in queries.ts

// No feature flags are currently defined. The user's `flags` column is kept as a
// free-form, comma/space-separated string (see parseFlags/userHasFlag); to add a flag,
// switch this back to a `stringEnum('flag_a', 'flag_b')` union.
export type TlaFlags = string

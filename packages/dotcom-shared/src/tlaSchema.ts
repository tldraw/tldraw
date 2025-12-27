import {
	boolean,
	createSchema,
	definePermissions,
	enumeration,
	ExpressionBuilder,
	number,
	PermissionsConfig,
	relationships,
	Row,
	string,
	table,
} from '@rocicorp/zero'
import { IndexKey, stringEnum } from '@tldraw/utils'

export interface ZColumn {
	optional?: boolean
	type: 'string' | 'number' | 'boolean'
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
		role: enumeration<'admin' | 'owner'>(),
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

export const user_fairies = table('user_fairies')
	.columns({
		userId: string(),
		fairies: string(),
		fairyLimit: number().optional(),
		fairyAccessExpiresAt: number().optional(),
		weeklyUsage: string(),
		weeklyLimit: number().optional(),
	})
	.primaryKey('userId')

export const file_fairies = table('file_fairies')
	.columns({
		fileId: string(),
		userId: string(),
		fairyState: string(),
	})
	.primaryKey('fileId', 'userId')

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

export type TlaUserFairyPartial = Partial<TlaUserFairy> & {
	userId: TlaUserFairy['userId']
}

export type TlaFileFairyPartial = Partial<TlaFileFairy> & {
	fileId: TlaFileFairy['fileId']
	userId: TlaFileFairy['userId']
}

export type TlaRow =
	| TlaFile
	| TlaFileState
	| TlaUser
	| TlaGroup
	| TlaGroupUser
	| TlaGroupFile
	| TlaUserFairy
	| TlaFileFairy
export type TlaRowPartial =
	| TlaFilePartial
	| TlaFileStatePartial
	| TlaUserPartial
	| TlaGroupPartial
	| TlaGroupUserPartial
	| TlaGroupFilePartial
	| TlaUserFairyPartial
	| TlaFileFairyPartial
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

// Override for user_fairies with proper JSONB types for Kysely
export interface TlaUserFairyDB extends Omit<TlaUserFairy, 'weeklyUsage'> {
	weeklyUsage: Record<string, number> // JSONB: { "2025-W48": 12.34 }
}

// Override for fairy_invite with proper JSONB types for Kysely
export interface TlaFairyInviteDB extends Omit<TlaFairyInvite, 'redeemedBy'> {
	redeemedBy: string[] // JSONB: ["email1@example.com", "email2@example.com"]
}

// paddle_transactions is backend-only, not part of Zero schema
export interface TlaPaddleTransaction {
	eventId: string
	transactionId: string
	eventType: string
	status: string
	userId: string | null
	processed: boolean
	processedAt: number | null
	processingError: string | null
	eventData: Record<string, unknown>
	occurredAt: number
	receivedAt: number
	updatedAt: number
}

export interface DB {
	file: TlaFile
	file_state: TlaFileState
	user: TlaUser
	group: TlaGroup
	group_user: TlaGroupUser
	group_file: TlaGroupFile
	user_fairies: TlaUserFairyDB
	file_fairies: TlaFileFairy
	fairy_invite: TlaFairyInviteDB
	user_mutation_number: TlaUserMutationNumber
	asset: TlaAsset
	file_fairy_messages: TlaFileFairyMessage
	paddle_transactions: TlaPaddleTransaction
}

export const schema = createSchema({
	tables: [user, file, file_state, group, group_user, group_file, user_fairies, file_fairies],
	relationships: [
		fileRelationships,
		fileStateRelationships,
		groupRelationships,
		groupUserRelationships,
		groupFileRelationships,
	],
})

export type TlaSchema = typeof schema
export type TlaUser = Row<typeof schema.tables.user>
export type TlaFile = Row<typeof schema.tables.file>
export type TlaFileState = Row<typeof schema.tables.file_state>
export type TlaGroup = Row<typeof schema.tables.group>
export type TlaGroupUser = Row<typeof schema.tables.group_user>
export type TlaGroupFile = Row<typeof schema.tables.group_file>
export type TlaUserFairy = Row<typeof schema.tables.user_fairies>
export type TlaFileFairy = Row<typeof schema.tables.file_fairies>

// file_fairy_messages is backend-only, not part of Zero schema
export interface TlaFileFairyMessage {
	id: string
	fileId: string
	userId: string
	message: string
	createdAt: number
	updatedAt: number
}

// fairy_invite is backend-only, not part of Zero schema
export interface TlaFairyInvite {
	id: string
	fairyLimit: number
	maxUses: number
	currentUses: number
	createdAt: number
	description: string | null
	redeemedBy: string[] // Array of emails
}

interface AuthData {
	sub: string | null
}

export const permissions = definePermissions<AuthData, TlaSchema>(schema, () => {
	const allowIfIsUser = (authData: AuthData, { cmp }: ExpressionBuilder<TlaSchema, 'user'>) =>
		cmp('id', '=', authData.sub!)

	const allowIfIsUserIdMatches = (
		authData: AuthData,
		{ cmp }: ExpressionBuilder<TlaSchema, 'file_state'>
	) => cmp('userId', '=', authData.sub!)

	const userCanAccessGroupMembershipListing = (
		authData: AuthData,
		{ or, cmp, exists }: ExpressionBuilder<TlaSchema, 'group_user'>
	) =>
		or(
			// User can see their own group memberships
			cmp('userId', '=', authData.sub!),
			// User can see memberships of groups they belong to
			exists('group', (q) =>
				q.whereExists('groupMembers', (q) => q.where('userId', '=', authData.sub!))
			)
		)

	const userCanAccessFile = (
		authData: AuthData,
		{ exists, cmp, or }: ExpressionBuilder<TlaSchema, 'file'>
	) =>
		or(
			// User owns the file directly (redundant given that every owned file will have a file_state now, but should be faster to check)
			cmp('ownerId', '=', authData.sub!),
			// User has a file_state (file is shared)
			exists('states', (q) => q.where('userId', '=', authData.sub!)),
			// User is a member of a group that has access to the file
			exists('groupFiles', (q) =>
				q.whereExists('groupMembers', (q) => q.where('userId', '=', authData.sub!))
			)
		)

	const userCanAccessGroup = (
		authData: AuthData,
		{ exists }: ExpressionBuilder<TlaSchema, 'group'>
	) =>
		// User can access groups they are members of
		exists('groupMembers', (q) => q.where('userId', '=', authData.sub!))

	const userCanAccessGroupFile = (
		authData: AuthData,
		{ exists }: ExpressionBuilder<TlaSchema, 'group_file'>
	) =>
		// User can access group_file records for groups they are members of
		exists('groupMembers', (q) => q.where('userId', '=', authData.sub!))

	return {
		user: {
			row: {
				select: [allowIfIsUser],
			},
		},
		file: {
			row: {
				select: [userCanAccessFile],
			},
		},
		file_state: {
			row: {
				select: [allowIfIsUserIdMatches],
			},
		},
		group: {
			row: {
				select: [userCanAccessGroup],
			},
		},
		group_user: {
			row: {
				select: [userCanAccessGroupMembershipListing],
			},
		},
		group_file: {
			row: {
				select: [userCanAccessGroupFile],
			},
		},
	} satisfies PermissionsConfig<AuthData, TlaSchema>
})

export const TlaFlags = stringEnum('groups_backend', 'groups_frontend')
export type TlaFlags = keyof typeof TlaFlags

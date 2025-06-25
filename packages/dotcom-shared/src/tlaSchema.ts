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
import { stringEnum } from '@tldraw/utils'

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
		userEmail: string(),
	})
	.primaryKey('userId', 'groupId')

export const user_presence = table('user_presence')
	.columns({
		sessionId: string(),
		fileId: string(),
		userId: string(),
		lastActivityAt: number(),
		name: string().optional(),
		color: string().optional(),
	})
	.primaryKey('fileId', 'sessionId')

export const group_file = table('group_file')
	.columns({
		fileId: string(),
		groupId: string(),
		createdAt: number(),
		updatedAt: number(),
	})
	.primaryKey('fileId', 'groupId')

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

const fileStateRelationships = relationships(file_state, ({ one, many }) => ({
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
	presences: many({
		sourceField: ['fileId'],
		destField: ['fileId'],
		destSchema: user_presence,
	}),
}))

const groupRelationships = relationships(group, ({ many }) => ({
	userGroups: many({
		sourceField: ['id'],
		destField: ['groupId'],
		destSchema: group_user,
	}),
	fileGroups: many({
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

const userPresenceRelationships = relationships(user_presence, ({ one, many }) => ({
	file: one({
		sourceField: ['fileId'],
		destField: ['id'],
		destSchema: file,
	}),
	fileStates: many({
		sourceField: ['fileId'],
		destField: ['fileId'],
		destSchema: file_state,
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
	groupUsers: many({
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

export type TlaUserGroupPartial = Partial<TlaGroupUser> & {
	userId: TlaGroupUser['userId']
	groupId: TlaGroupUser['groupId']
}

export type TlaUserPresencePartial = Partial<TlaUserPresence> & {
	sessionId: TlaUserPresence['sessionId']
}

export type TlaFileGroupPartial = Partial<TlaGroupFile> & {
	fileId: TlaGroupFile['fileId']
	groupId: TlaGroupFile['groupId']
}

export type TlaRow =
	| TlaFile
	| TlaFileState
	| TlaUser
	| TlaGroup
	| TlaGroupUser
	| TlaUserPresence
	| TlaGroupFile
export interface TlaUserMutationNumber {
	userId: string
	mutationNumber: number
}

export const immutableColumns = {
	user: new Set<keyof TlaUser>(['email', 'createdAt', 'updatedAt', 'avatar']),
	file: new Set<keyof TlaFile>([
		'ownerName',
		'ownerAvatar',
		'createSource',
		'updatedAt',
		'createdAt',
	]),
	file_state: new Set<keyof TlaFileState>(['firstVisitAt', 'isFileOwner']),
	group: new Set<keyof TlaGroup>(['createdAt', 'updatedAt']),
	group_user: new Set<keyof TlaGroupUser>(['createdAt', 'updatedAt']),
	user_presence: new Set<keyof TlaUserPresence>([]),
	group_file: new Set<keyof TlaGroupFile>(['createdAt', 'updatedAt']),
} as const

export function isColumnMutable(tableName: keyof typeof immutableColumns, column: string) {
	return !immutableColumns[tableName].has(column as never)
}

export interface TlaAsset {
	objectName: string
	fileId: string
	userId: string | null
}

export interface DB {
	file: TlaFile
	file_state: TlaFileState
	user: TlaUser
	group: TlaGroup
	group_user: TlaGroupUser
	user_presence: TlaUserPresence
	group_file: TlaGroupFile
	user_mutation_number: TlaUserMutationNumber
	asset: TlaAsset
}

export const schema = createSchema({
	tables: [user, file, file_state, group, group_user, user_presence, group_file],
	relationships: [
		fileRelationships,
		fileStateRelationships,
		groupRelationships,
		groupUserRelationships,
		userPresenceRelationships,
		groupFileRelationships,
	],
})

export type TlaSchema = typeof schema
export type TlaUser = Row<typeof schema.tables.user>
export type TlaFile = Row<typeof schema.tables.file>
export type TlaFileState = Row<typeof schema.tables.file_state>
export type TlaGroup = Row<typeof schema.tables.group>
export type TlaGroupUser = Row<typeof schema.tables.group_user>
export type TlaUserPresence = Row<typeof schema.tables.user_presence>
export type TlaGroupFile = Row<typeof schema.tables.group_file>

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
			cmp('userId', '=', authData.sub!),
			exists('group', (q) =>
				q.whereExists('userGroups', (q) => q.where('userId', '=', authData.sub!))
			)
		)

	const userCanAccessFile = (
		authData: AuthData,
		{ exists, and, cmp, or }: ExpressionBuilder<TlaSchema, 'file'>
	) =>
		or(
			cmp('ownerId', '=', authData.sub!),
			and(
				cmp('shared', '=', true),
				exists('states', (q) => q.where('userId', '=', authData.sub!))
			),
			exists('groupFiles', (q) =>
				q.whereExists('groupUsers', (q) => q.where('userId', '=', authData.sub!))
			)
		)

	const userCanAccessGroup = (
		authData: AuthData,
		{ exists }: ExpressionBuilder<TlaSchema, 'group'>
	) => exists('userGroups', (q) => q.where('userId', '=', authData.sub!))

	const userCanAccessPresence = (
		authData: AuthData,
		{ exists }: ExpressionBuilder<TlaSchema, 'user_presence'>
	) => exists('fileStates', (q) => q.where('userId', '=', authData.sub!))

	const userCanAccessGroupFile = (
		authData: AuthData,
		{ exists }: ExpressionBuilder<TlaSchema, 'group_file'>
	) => exists('groupUsers', (q) => q.where('userId', '=', authData.sub!))

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
		user_presence: {
			row: {
				select: [userCanAccessPresence],
			},
		},
		group_file: {
			row: {
				select: [userCanAccessGroupFile],
			},
		},
	} satisfies PermissionsConfig<AuthData, TlaSchema>
})

export const TlaFlags = stringEnum('groups')
export type TlaFlags = keyof typeof TlaFlags

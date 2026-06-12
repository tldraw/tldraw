import {
	boolean,
	createSchema,
	enumeration,
	number,
	relationships,
	Row,
	string,
	table,
} from '@rocicorp/zero'
import { IndexKey, stringEnum } from '@tldraw/utils'
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
		owningWorkspaceId: string().optional(),
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

export const workspace = table('workspace')
	.columns({
		id: string(),
		name: string(),
		inviteSecret: string().optional(),
		isDeleted: boolean(),
		createdAt: number(),
		updatedAt: number(),
	})
	.primaryKey('id')

export const workspace_user = table('workspace_user')
	.columns({
		userId: string(),
		workspaceId: string(),
		createdAt: number(),
		updatedAt: number(),
		role: enumeration<Role>(),
		userName: string(),
		userColor: string(),
		index: string<IndexKey>(),
	})
	.primaryKey('userId', 'workspaceId')

export const workspace_file = table('workspace_file')
	.columns({
		fileId: string(),
		workspaceId: string(),
		createdAt: number(),
		updatedAt: number(),
		index: string<IndexKey>().optional(),
	})
	.primaryKey('fileId', 'workspaceId')

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
	workspaceFiles: many({
		sourceField: ['id'],
		destField: ['fileId'],
		destSchema: workspace_file,
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

const workspaceRelationships = relationships(workspace, ({ many }) => ({
	workspaceMembers: many({
		sourceField: ['id'],
		destField: ['workspaceId'],
		destSchema: workspace_user,
	}),
	workspaceFiles: many({
		sourceField: ['id'],
		destField: ['workspaceId'],
		destSchema: workspace_file,
	}),
}))

const workspaceUserRelationships = relationships(workspace_user, ({ one, many }) => ({
	user: one({
		sourceField: ['userId'],
		destField: ['id'],
		destSchema: user,
	}),
	workspace: one({
		sourceField: ['workspaceId'],
		destField: ['id'],
		destSchema: workspace,
	}),
	workspaceFiles: many({
		sourceField: ['workspaceId'],
		destField: ['workspaceId'],
		destSchema: workspace_file,
	}),
	workspaceMembers: many({
		sourceField: ['workspaceId'],
		destField: ['workspaceId'],
		destSchema: workspace_user,
	}),
}))

const workspaceFileRelationships = relationships(workspace_file, ({ one, many }) => ({
	file: one({
		sourceField: ['fileId'],
		destField: ['id'],
		destSchema: file,
	}),
	workspace: one({
		sourceField: ['workspaceId'],
		destField: ['id'],
		destSchema: workspace,
	}),
	workspaceMembers: many({
		sourceField: ['workspaceId'],
		destField: ['workspaceId'],
		destSchema: workspace_user,
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

export type TlaWorkspacePartial = Partial<TlaWorkspace> & {
	id: TlaWorkspace['id']
}

export type TlaWorkspaceUserPartial = Partial<TlaWorkspaceUser> & {
	userId: TlaWorkspaceUser['userId']
	workspaceId: TlaWorkspaceUser['workspaceId']
}

export type TlaWorkspaceFilePartial = Partial<TlaWorkspaceFile> & {
	fileId: TlaWorkspaceFile['fileId']
	workspaceId: TlaWorkspaceFile['workspaceId']
}

export type TlaRow =
	| TlaFile
	| TlaFileState
	| TlaUser
	| TlaWorkspace
	| TlaWorkspaceUser
	| TlaWorkspaceFile
export type TlaRowPartial =
	| TlaFilePartial
	| TlaFileStatePartial
	| TlaUserPartial
	| TlaWorkspacePartial
	| TlaWorkspaceUserPartial
	| TlaWorkspaceFilePartial
export interface TlaUserMutationNumber {
	userId: string
	mutationNumber: number
}

export const immutableColumns = {
	user: new Set<keyof TlaUser>(['email', 'createdAt', 'updatedAt', 'avatar']),
	file: new Set<keyof TlaFile>([
		'ownerName',
		'ownerAvatar',
		'owningWorkspaceId',
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

export interface DB {
	file: TlaFile
	file_state: TlaFileState
	user: TlaUser
	workspace: TlaWorkspace
	workspace_user: TlaWorkspaceUser
	workspace_file: TlaWorkspaceFile
	user_mutation_number: TlaUserMutationNumber
	asset: TlaAsset
}

export const schema = createSchema({
	tables: [user, file, file_state, workspace, workspace_user, workspace_file],
	relationships: [
		fileRelationships,
		fileStateRelationships,
		workspaceRelationships,
		workspaceUserRelationships,
		workspaceFileRelationships,
	],
})

export type TlaSchema = typeof schema
export type TlaUser = Row<typeof schema.tables.user>
export type TlaFile = Row<typeof schema.tables.file>
export type TlaFileState = Row<typeof schema.tables.file_state>
export type TlaWorkspace = Row<typeof schema.tables.workspace>
export type TlaWorkspaceUser = Row<typeof schema.tables.workspace_user>
export type TlaWorkspaceFile = Row<typeof schema.tables.workspace_file>

// Permissions are now handled via Synced Queries in queries.ts

// These flag values are persisted in user.flags rows from the original groups
// rollout, so they keep the old "groups" naming even though the data model is
// now named "workspace".
export const TlaFlags = stringEnum('groups_backend', 'groups_frontend')
export type TlaFlags = keyof typeof TlaFlags

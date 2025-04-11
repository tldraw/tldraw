import {
	boolean,
	createSchema,
	definePermissions,
	ExpressionBuilder,
	number,
	PermissionsConfig,
	relationships,
	Row,
	string,
	table,
} from '@rocicorp/zero'

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
		ownerId: string(),
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
	.primaryKey('id', 'ownerId', 'publishedSlug')

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

export type TlaRow = TlaFile | TlaFileState | TlaUser
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
} as const

export function isColumnMutable(tableName: keyof typeof immutableColumns, column: string) {
	return !immutableColumns[tableName].has(column as never)
}

export interface TlaAsset {
	objectName: string
	fileId: string
}

export interface DB {
	file: TlaFile
	file_state: TlaFileState
	user: TlaUser
	user_mutation_number: TlaUserMutationNumber
	asset: TlaAsset
}

export const schema = createSchema({
	tables: [user, file, file_state],
	relationships: [fileRelationships, fileStateRelationships],
})

export type TlaSchema = typeof schema
export type TlaUser = Row<typeof schema.tables.user>
export type TlaFile = Row<typeof schema.tables.file>
export type TlaFileState = Row<typeof schema.tables.file_state>

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

	const userCanAccessFile = (
		authData: AuthData,
		{ exists, and, cmp, or }: ExpressionBuilder<TlaSchema, 'file'>
	) =>
		or(
			cmp('ownerId', '=', authData.sub!),
			and(
				cmp('shared', '=', true),
				exists('states', (q) => q.where('userId', '=', authData.sub!))
			)
		)

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
	} satisfies PermissionsConfig<AuthData, TlaSchema>
})

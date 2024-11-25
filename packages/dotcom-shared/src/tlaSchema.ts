interface TableSchema {
	tableName: string
	columns: Columns
	primaryKey: string[]
	relationships: any
}

export interface ZColumn {
	optional?: boolean
	type: 'string' | 'number' | 'boolean'
}

interface Columns {
	[key: string]: ZColumn
}

export const tlaUserSchema = {
	tableName: 'user',
	columns: {
		id: { type: 'string' },
		name: { type: 'string' },
		email: { type: 'string' },
		avatar: { type: 'string' },
		color: { type: 'string' },
		exportFormat: { type: 'string' },
		exportTheme: { type: 'string' },
		exportBackground: { type: 'boolean' },
		exportPadding: { type: 'boolean' },
		createdAt: { type: 'number' },
		updatedAt: { type: 'number' },
		flags: { type: 'string' },
		locale: { type: 'string', optional: true },
		animationSpeed: { type: 'number', optional: true },
		edgeScrollSpeed: { type: 'number', optional: true },
		colorScheme: { type: 'string', optional: true },
		isSnapMode: { type: 'boolean', optional: true },
		isWrapMode: { type: 'boolean', optional: true },
		isDynamicSizeMode: { type: 'boolean', optional: true },
		isPasteAtCursorMode: { type: 'boolean', optional: true },
	},
	primaryKey: ['id'],
	relationships: {},
} as const satisfies TableSchema

export const tlaFileSchema = {
	tableName: 'file',
	columns: {
		id: { type: 'string' },
		name: { type: 'string' },
		ownerId: { type: 'string' },
		thumbnail: { type: 'string' },
		shared: { type: 'boolean' },
		sharedLinkType: { type: 'string' },
		published: { type: 'boolean' },
		lastPublished: { type: 'number' },
		publishedSlug: { type: 'string' },
		createdAt: { type: 'number' },
		updatedAt: { type: 'number' },
		isEmpty: { type: 'boolean' },
	},
	primaryKey: ['id'],
	relationships: {
		owner: {
			source: 'ownerId',
			dest: {
				schema: () => tlaUserSchema,
				field: 'id',
			},
		},
	},
} as const satisfies TableSchema

export const tlaFileStateSchema = {
	tableName: 'file_state',
	columns: {
		userId: { type: 'string' },
		fileId: { type: 'string' },
		firstVisitAt: { type: 'number', optional: true },
		lastEditAt: { type: 'number', optional: true },
		lastSessionState: { type: 'string', optional: true },
		lastVisitAt: { type: 'number', optional: true },
		isFileOwner: { type: 'boolean', optional: true },
	},
	primaryKey: ['userId', 'fileId'],
	relationships: {
		user: {
			source: 'userId',
			dest: {
				schema: () => tlaUserSchema,
				field: 'id',
			},
		},
		file: {
			source: 'fileId',
			dest: {
				schema: () => tlaFileSchema,
				field: 'id',
			},
		},
	},
} as const satisfies TableSchema

// export const schema = {
// 	version: 1,
// 	tables: {
// 		user: userSchema,
// 		file: fileSchema,
// 		file_state: fileStateSchema,
// 	},
// }

// export type TlaSchema = typeof schema

type _ColumnToValue<T extends ZColumn> = T['type'] extends 'string'
	? string
	: T['type'] extends 'number'
		? number
		: T['type'] extends 'boolean'
			? boolean
			: never

type ColumnToValue<T extends ZColumn> = T['optional'] extends true
	? _ColumnToValue<T> | null
	: _ColumnToValue<T>

type SchemaToRow<T extends TableSchema> = {
	[K in keyof T['columns']]: ColumnToValue<T['columns'][K]>
}

export type TlaFile = SchemaToRow<typeof tlaFileSchema>
export type TlaFileState = SchemaToRow<typeof tlaFileStateSchema>
export type TlaUser = SchemaToRow<typeof tlaUserSchema>

export type TlaRow = TlaFile | TlaFileState | TlaUser

const immutableColumns: Record<string, Set<string>> = {
	user: new Set<keyof TlaUser>(['id', 'email', 'createdAt']),
	file: new Set<keyof TlaFile>(['id', 'ownerId', 'createdAt']),
	file_state: new Set<keyof TlaFileState>(['userId', 'fileId', 'firstVisitAt', 'isFileOwner']),
}

export function isColumnMutable(tableName: keyof typeof immutableColumns, column: string) {
	return !immutableColumns[tableName].has(column)
}

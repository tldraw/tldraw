interface TableSchema {
	tableName: string
	columns: Columns
	primaryKey: string[]
	relationships: any
}

export interface ZColumn {
	optional?: boolean
	type: 'string' | 'number' | 'boolean'
	canUpdate: boolean
}

interface Columns {
	[key: string]: ZColumn
}

export const tlaUserSchema = {
	tableName: 'user',
	columns: {
		id: { type: 'string', canUpdate: false },
		name: { type: 'string', canUpdate: true },
		email: { type: 'string', canUpdate: false },
		avatar: { type: 'string', canUpdate: true },
		color: { type: 'string', canUpdate: true },
		exportFormat: { type: 'string', canUpdate: true },
		exportTheme: { type: 'string', canUpdate: true },
		exportBackground: { type: 'boolean', canUpdate: true },
		exportPadding: { type: 'boolean', canUpdate: true },
		createdAt: { type: 'number', canUpdate: false },
		updatedAt: { type: 'number', canUpdate: true },
		flags: { type: 'string', canUpdate: true },
		locale: { type: 'string', optional: true, canUpdate: true },
		animationSpeed: { type: 'number', optional: true, canUpdate: true },
		edgeScrollSpeed: { type: 'number', optional: true, canUpdate: true },
		colorScheme: { type: 'string', optional: true, canUpdate: true },
		isSnapMode: { type: 'boolean', optional: true, canUpdate: true },
		isWrapMode: { type: 'boolean', optional: true, canUpdate: true },
		isDynamicSizeMode: { type: 'boolean', optional: true, canUpdate: true },
		isPasteAtCursorMode: { type: 'boolean', optional: true, canUpdate: true },
	},
	primaryKey: ['id'],
	relationships: {},
} as const satisfies TableSchema
export type TlaUserColumn = keyof (typeof tlaUserSchema)['columns']

export const tlaFileSchema = {
	tableName: 'file',
	columns: {
		id: { type: 'string', canUpdate: false },
		name: { type: 'string', canUpdate: true },
		ownerId: { type: 'string', canUpdate: false },
		thumbnail: { type: 'string', canUpdate: true },
		shared: { type: 'boolean', canUpdate: true },
		sharedLinkType: { type: 'string', canUpdate: true },
		published: { type: 'boolean', canUpdate: true },
		lastPublished: { type: 'number', canUpdate: true },
		publishedSlug: { type: 'string', canUpdate: true },
		createdAt: { type: 'number', canUpdate: false },
		updatedAt: { type: 'number', canUpdate: true },
		isEmpty: { type: 'boolean', canUpdate: true },
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
export type TlaFileColumn = keyof (typeof tlaFileSchema)['columns']

export const tlaFileStateSchema = {
	tableName: 'file_state',
	columns: {
		userId: { type: 'string', canUpdate: false },
		fileId: { type: 'string', canUpdate: true },
		firstVisitAt: { type: 'number', optional: true, canUpdate: false },
		lastEditAt: { type: 'number', optional: true, canUpdate: true },
		lastSessionState: { type: 'string', optional: true, canUpdate: true },
		lastVisitAt: { type: 'number', optional: true, canUpdate: true },
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
export type TlaFileStateColumn = keyof (typeof tlaFileStateSchema)['columns']

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

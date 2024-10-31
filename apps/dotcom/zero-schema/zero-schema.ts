// These data structures define your client-side schema.
// They must be equal to or a subset of the server-side schema.
// Note the "relationships" field, which defines first-class
// relationships between tables.
// See https://github.com/rocicorp/mono/blob/main/apps/zbugs/src/domain/schema.ts
// for more complex examples, including many-to-many.

import { createSchema, createTableSchema, SchemaToRow } from '@rocicorp/zero'

const userSchema = createTableSchema({
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
})

const fileSchema = createTableSchema({
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
				schema: () => userSchema,
				field: 'id',
			},
		},
	},
})

const fileStateSchema = createTableSchema({
	tableName: 'file_state',
	columns: {
		userId: { type: 'string' },
		fileId: { type: 'string' },
		firstVisitAt: { type: 'number', optional: true },
		lastEditAt: { type: 'number', optional: true },
		lastSessionState: { type: 'string', optional: true },
		lastVisitAt: { type: 'number', optional: true },
	},
	primaryKey: ['userId', 'fileId'],
	relationships: {
		user: {
			source: 'userId',
			dest: {
				schema: () => userSchema,
				field: 'id',
			},
		},
		file: {
			source: 'fileId',
			dest: {
				schema: () => fileSchema,
				field: 'id',
			},
		},
	},
})

export const schema = createSchema({
	version: 1,
	tables: {
		user: userSchema,
		file: fileSchema,
		file_state: fileStateSchema,
	},
})

export type TlaSchema = typeof schema
export type TlaFile = SchemaToRow<typeof fileSchema>
export type TlaFileState = SchemaToRow<typeof fileStateSchema>
export type TlaUser = SchemaToRow<typeof schema.tables.user>

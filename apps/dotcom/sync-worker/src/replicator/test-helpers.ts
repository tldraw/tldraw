import { DatabaseSync } from 'node:sqlite'
import { ZReplicationChange } from '../UserDataSyncer'
import { ChangeV2 } from './replicatorTypes'

// Mock Logger for testing
export class MockLogger {
	debug(_message: string, ..._args: any[]) {
		// console.log(`[DEBUG] ${message}`, ...args)
	}
}

// SqlStorage adapter for DatabaseSync to match the expected interface
export class SqlStorageAdapter {
	constructor(private db: DatabaseSync) {}

	exec<T = any>(sql: string, ...params: any[]): Iterable<T> & { toArray(): T[]; one(): T } {
		// Handle multi-statement SQL by splitting and executing each statement
		const statements = sql
			.split(';')
			.map((s) => s.trim())
			.filter((s) => s.length > 0)

		if (statements.length > 1) {
			// For multiple statements, execute them all
			for (const stmt of statements) {
				if (stmt.trim()) {
					this.db.exec(stmt)
				}
			}
			const emptyResult = [] as any as Iterable<T> & { toArray(): T[]; one(): T }
			emptyResult.toArray = () => []
			emptyResult.one = () => ({}) as T
			return emptyResult
		}

		// Single statement handling
		const trimmedSql = sql.trim()
		const isSelect =
			trimmedSql.toUpperCase().startsWith('SELECT') ||
			trimmedSql.toUpperCase().startsWith('WITH') ||
			trimmedSql.toUpperCase().startsWith('PRAGMA')

		if (isSelect) {
			const stmt = this.db.prepare(sql)
			const result = stmt.all(...params) as T[]

			// Make the result array iterable with additional methods
			const iterableResult = result as T[] & { toArray(): T[]; one(): T }
			iterableResult.toArray = () => [...result]
			iterableResult.one = () => {
				if (result.length === 0) {
					throw new Error('No results returned')
				}
				return result[0]
			}
			return iterableResult
		} else {
			// For non-SELECT statements (INSERT, UPDATE, DELETE, CREATE, etc.)
			if (params.length > 0) {
				const stmt = this.db.prepare(sql)
				stmt.run(...params)
			} else {
				this.db.exec(sql)
			}
			const emptyResult = [] as any as Iterable<T> & { toArray(): T[]; one(): T }
			emptyResult.toArray = () => []
			emptyResult.one = () => ({}) as T
			return emptyResult
		}
	}
}

// Helper function for creating mock file objects
export function createMockFile(
	fileId: string,
	ownerId: string,
	overrides: Partial<{
		name: string
		shared: boolean
		sharedLinkType: string
		published: boolean
		lastPublished: number
		createdAt: number
		updatedAt: number
	}> = {}
) {
	const now = Date.now()
	return {
		id: fileId,
		name: overrides.name || `Test Document ${fileId}`,
		ownerId,
		ownerName: `Owner ${ownerId}`,
		ownerAvatar: '',
		thumbnail: '',
		shared: overrides.shared || false,
		sharedLinkType: overrides.sharedLinkType || 'private',
		published: overrides.published || false,
		lastPublished: overrides.lastPublished || 0,
		publishedSlug: '',
		createdAt: overrides.createdAt || now,
		updatedAt: overrides.updatedAt || now,
		isEmpty: false,
		isDeleted: false,
		createSource: 'test',
	}
}

// Helper functions for creating mock objects with defaults
export function createMockFileChange(
	fileId: string,
	ownerId: string,
	overrides: Partial<{
		name: string
		shared: boolean
		sharedLinkType: string
		published: boolean
		event: 'insert' | 'update' | 'delete'
	}> = {}
): ZReplicationChange {
	return {
		type: 'row_update',
		table: 'file',
		event: overrides.event || 'update',
		row: createMockFile(fileId, ownerId, overrides),
	}
}

// Helper function for creating mock ChangeV2 objects for testing getEffects
export function createMockFileChangeV2(
	fileId: string,
	ownerId: string,
	command: 'insert' | 'update' | 'delete',
	overrides: Partial<{
		name: string
		shared: boolean
		sharedLinkType: string
		published: boolean
		lastPublished: number
		previous: any
	}> = {}
): ChangeV2 {
	return {
		event: {
			command,
			table: 'file',
		},
		row: createMockFile(fileId, ownerId, overrides),
		previous: overrides.previous,
		topics: [`user:${ownerId}`, `file:${fileId}`],
	}
}

export function createMockUserChange(
	userId: string,
	overrides: Partial<{
		name: string
		email: string
		event: 'insert' | 'update' | 'delete'
	}> = {}
): ZReplicationChange {
	return {
		type: 'row_update',
		table: 'user',
		event: overrides.event || 'update',
		row: createMockUser(userId, overrides),
	}
}

// Helper function for creating mock user objects
export function createMockUser(
	userId: string,
	overrides: Partial<{
		name: string
		email: string
	}> = {}
) {
	return {
		id: userId,
		name: overrides.name || userId.charAt(0).toUpperCase() + userId.slice(1),
		email: overrides.email || `${userId}@example.com`,
		avatar: '',
		color: '#000000',
		exportFormat: 'svg',
		exportTheme: 'light',
		exportBackground: true,
		exportPadding: true,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		flags: '',
		locale: 'en',
		animationSpeed: 1.0,
		areKeyboardShortcutsEnabled: true,
		enhancedA11yMode: false,
		edgeScrollSpeed: 1.0,
		colorScheme: 'auto',
		isSnapMode: false,
		isWrapMode: false,
		inputMode: null,
		isDynamicSizeMode: false,
		isPasteAtCursorMode: false,
		allowAnalyticsCookie: false,
	}
}

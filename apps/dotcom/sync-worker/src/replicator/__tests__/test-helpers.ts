import { DatabaseSync } from 'node:sqlite'

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

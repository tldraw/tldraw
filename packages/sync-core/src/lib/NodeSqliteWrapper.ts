import {
	type TLSqliteInputValue,
	type TLSqliteRow,
	type TLSyncSqliteStatement,
	type TLSyncSqliteWrapper,
	type TLSyncSqliteWrapperConfig,
} from './SQLiteSyncStorage'

/**
 * Minimal interface for a synchronous SQLite database.
 *
 * This interface is compatible with:
 * - `node:sqlite` DatabaseSync (Node.js 22.5+)
 * - `better-sqlite3` Database
 *
 * Any SQLite library that provides synchronous `exec` and `prepare` methods
 * with the signatures below can be used with {@link NodeSqliteWrapper}.
 *
 * @public
 */
export interface SyncSqliteDatabase {
	/** Execute raw SQL without returning results */
	exec(sql: string): void
	/** Prepare a statement for execution */
	prepare(sql: string): {
		iterate(...params: unknown[]): IterableIterator<unknown>
		all(...params: unknown[]): unknown[]
		run(...params: unknown[]): unknown
	}
}

/**
 * A wrapper around synchronous SQLite databases that implements TLSyncSqliteWrapper.
 * Works with both `node:sqlite` DatabaseSync (Node.js 22.5+) and `better-sqlite3` Database.
 *
 * Use this wrapper with SQLiteSyncStorage to persist tldraw sync state to a SQLite database
 * in Node.js environments.
 *
 * @example
 * ```ts
 * // With node:sqlite (Node.js 22.5+)
 * import { DatabaseSync } from 'node:sqlite'
 * import { SQLiteSyncStorage, NodeSqliteWrapper } from '@tldraw/sync-core'
 *
 * const db = new DatabaseSync(':memory:')
 * const sql = new NodeSqliteWrapper(db)
 * const storage = new SQLiteSyncStorage({ sql })
 * ```
 *
 * @example
 * ```ts
 * // With better-sqlite3
 * import Database from 'better-sqlite3'
 * import { SQLiteSyncStorage, NodeSqliteWrapper } from '@tldraw/sync-core'
 *
 * const db = new Database(':memory:')
 * const sql = new NodeSqliteWrapper(db)
 * const storage = new SQLiteSyncStorage({ sql })
 * ```
 *
 * @example
 * ```ts
 * // With table prefix to avoid conflicts with other tables
 * const sql = new NodeSqliteWrapper(db, { tablePrefix: 'tldraw_' })
 * // Creates tables: tldraw_documents, tldraw_tombstones, tldraw_metadata
 * ```
 *
 * @public
 */
export class NodeSqliteWrapper implements TLSyncSqliteWrapper {
	constructor(
		private db: SyncSqliteDatabase,
		public config?: TLSyncSqliteWrapperConfig
	) {}

	exec(sql: string): void {
		this.db.exec(sql)
	}

	prepare<
		TResult extends TLSqliteRow | void = void,
		TParams extends TLSqliteInputValue[] = TLSqliteInputValue[],
	>(sql: string): TLSyncSqliteStatement<TResult, TParams> {
		return this.db.prepare(sql) as unknown as TLSyncSqliteStatement<TResult, TParams>
	}

	transaction<T>(callback: () => T): T {
		this.db.exec('BEGIN')
		let result: T
		try {
			result = callback()
		} catch (e) {
			this.db.exec('ROLLBACK')
			throw e
		}
		this.db.exec('COMMIT')
		return result
	}
}

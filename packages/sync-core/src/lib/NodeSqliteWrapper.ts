import {
	type TLSqliteInputValue,
	type TLSqliteRow,
	type TLSyncSqliteStatement,
	type TLSyncSqliteWrapper,
	type TLSyncSqliteWrapperConfig,
} from './SqlLiteSyncStorage'

/**
 * Minimal interface for a synchronous SQLite database.
 * Compatible with both `node:sqlite` DatabaseSync and `better-sqlite3` Database.
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
 * @example
 * ```ts
 * // With node:sqlite
 * import { DatabaseSync } from 'node:sqlite'
 * import { SqlLiteSyncStorage, NodeSqliteSyncWrapper } from '@tldraw/sync-core'
 *
 * const db = new DatabaseSync(':memory:')
 * const wrapper = new NodeSqliteSyncWrapper(db)
 * const storage = new SqlLiteSyncStorage(wrapper)
 * ```
 *
 * @example
 * ```ts
 * // With better-sqlite3
 * import Database from 'better-sqlite3'
 * import { SqlLiteSyncStorage, NodeSqliteSyncWrapper } from '@tldraw/sync-core'
 *
 * const db = new Database(':memory:')
 * const wrapper = new NodeSqliteSyncWrapper(db)
 * const storage = new SqlLiteSyncStorage(wrapper)
 * ```
 *
 * @example
 * ```ts
 * // With table prefix
 * const wrapper = new NodeSqliteSyncWrapper(db, { tablePrefix: 'sync_' })
 * // Creates tables: sync_documents, sync_tombstones, sync_metadata
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
		TResult extends TLSqliteRow = TLSqliteRow,
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

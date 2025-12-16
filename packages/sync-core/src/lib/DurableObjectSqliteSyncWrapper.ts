import {
	type TLSqliteInputValue,
	type TLSqliteRow,
	type TLSyncSqliteStatement,
	type TLSyncSqliteWrapper,
	type TLSyncSqliteWrapperConfig,
} from './SQLiteSyncStorage'

/**
 * Mimics a prepared statement interface for Durable Objects SQLite.
 * Rather than actually preparing the statement, it just stores the SQL and
 * executes it fresh each time. This is still fast because DO SQLite maintains
 * an internal LRU cache of prepared statements.
 */
class DurableObjectStatement<
	TResult extends TLSqliteRow | void,
	TParams extends TLSqliteInputValue[],
> implements TLSyncSqliteStatement<TResult, TParams>
{
	constructor(
		private sql: {
			exec(sql: string, ...bindings: unknown[]): Iterable<any> & { toArray(): any[] }
		},
		private query: string
	) {}

	iterate(...bindings: TParams): IterableIterator<TResult> {
		const result = this.sql.exec(this.query, ...bindings)
		return result[Symbol.iterator]() as IterableIterator<TResult>
	}

	all(...bindings: TParams): TResult[] {
		return this.sql.exec(this.query, ...bindings).toArray()
	}

	run(...bindings: TParams): void {
		this.sql.exec(this.query, ...bindings)
	}
}

/**
 * A wrapper around Cloudflare Durable Object's SqlStorage that implements TLSyncSqliteWrapper.
 *
 * Use this wrapper with SQLiteSyncStorage to persist tldraw sync state using
 * Cloudflare Durable Object's built-in SQLite storage. This provides automatic
 * persistence that survives Durable Object hibernation and restarts.
 *
 * @example
 * ```ts
 * import { SQLiteSyncStorage, DurableObjectSqliteSyncWrapper } from '@tldraw/sync-core'
 *
 * // In your Durable Object class:
 * class MyDurableObject extends DurableObject {
 *   private storage: SQLiteSyncStorage
 *
 *   constructor(ctx: DurableObjectState, env: Env) {
 *     super(ctx, env)
 *     const sql = new DurableObjectSqliteSyncWrapper(ctx.storage)
 *     this.storage = new SQLiteSyncStorage({ sql })
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // With table prefix to avoid conflicts with other tables
 * const sql = new DurableObjectSqliteSyncWrapper(this.ctx.storage, { tablePrefix: 'tldraw_' })
 * // Creates tables: tldraw_documents, tldraw_tombstones, tldraw_metadata
 * ```
 *
 * @public
 */
export class DurableObjectSqliteSyncWrapper implements TLSyncSqliteWrapper {
	constructor(
		private storage: {
			sql: { exec(sql: string, ...bindings: unknown[]): Iterable<any> & { toArray(): any[] } }
			transactionSync(callback: () => any): any
		},
		public config?: TLSyncSqliteWrapperConfig
	) {}

	exec(sql: string): void {
		this.storage.sql.exec(sql)
	}

	prepare<TResult extends TLSqliteRow | void = void, TParams extends TLSqliteInputValue[] = []>(
		sql: string
	): TLSyncSqliteStatement<TResult, TParams> {
		return new DurableObjectStatement<TResult, TParams>(this.storage.sql, sql)
	}

	transaction<T>(callback: () => T): T {
		return this.storage.transactionSync(callback)
	}
}

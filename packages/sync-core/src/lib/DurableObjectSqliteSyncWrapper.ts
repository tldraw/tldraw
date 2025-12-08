import {
	type TLSqliteInputValue,
	type TLSqliteRow,
	type TLSyncSqliteStatement,
	type TLSyncSqliteWrapper,
	type TLSyncSqliteWrapperConfig,
} from './SqlLiteSyncStorage'

/**
 * A "prepared statement" for Durable Objects that just holds the SQL
 * and executes it fresh each time (since DO doesn't have real prepared statements).
 */
class DurableObjectStatement<TResult extends TLSqliteRow, TParams extends TLSqliteInputValue[]>
	implements TLSyncSqliteStatement<TResult, TParams>
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
 * Use this wrapper with SqlLiteSyncStorage to persist tldraw sync state using
 * Cloudflare Durable Object's built-in SQLite storage. This provides automatic
 * persistence that survives Durable Object hibernation and restarts.
 *
 * @example
 * ```ts
 * import { SqlLiteSyncStorage, DurableObjectSqliteSyncWrapper } from '@tldraw/sync-core'
 *
 * // In your Durable Object class:
 * class MyDurableObject extends DurableObject {
 *   private storage: SqlLiteSyncStorage
 *
 *   constructor(ctx: DurableObjectState, env: Env) {
 *     super(ctx, env)
 *     const wrapper = new DurableObjectSqliteSyncWrapper(ctx.storage)
 *     this.storage = new SqlLiteSyncStorage(wrapper)
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // With table prefix to avoid conflicts with other tables
 * const wrapper = new DurableObjectSqliteSyncWrapper(this.ctx.storage, { tablePrefix: 'tldraw_' })
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

	prepare<TResult extends TLSqliteRow, TParams extends TLSqliteInputValue[] = []>(
		sql: string
	): TLSyncSqliteStatement<TResult, TParams> {
		return new DurableObjectStatement<TResult, TParams>(this.storage.sql, sql)
	}

	transaction<T>(callback: () => T): T {
		return this.storage.transactionSync(callback)
	}
}

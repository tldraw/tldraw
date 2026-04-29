import { transaction } from '@tldraw/state'
import { SerializedSchema, StoreSnapshot, UnknownRecord } from '@tldraw/store'
import { assert, objectMapEntries, throttle } from '@tldraw/utils'
import {
	computeTombstonePruning,
	DEFAULT_INITIAL_SNAPSHOT,
	MAX_TOMBSTONES,
} from './InMemorySyncStorage'
import { MicrotaskNotifier } from './MicrotaskNotifier'
import { RoomSnapshot } from './TLSyncRoom'
import {
	convertStoreSnapshotToRoomSnapshot,
	TLSyncForwardDiff,
	TLSyncStorage,
	TLSyncStorageGetChangesSinceResult,
	TLSyncStorageOnChangeCallbackProps,
	TLSyncStorageTransaction,
	TLSyncStorageTransactionCallback,
	TLSyncStorageTransactionOptions,
	TLSyncStorageTransactionResult,
} from './TLSyncStorage'

/**
 * Valid input value types for SQLite query parameters.
 * These are the types that can be passed as bindings to prepared statements.
 * @public
 */
export type TLSqliteInputValue = null | number | bigint | string | Uint8Array

/**
 * Possible output value types returned from SQLite queries.
 * Includes all input types plus Uint8Array for BLOB columns.
 * @public
 */
export type TLSqliteOutputValue = null | number | bigint | string | Uint8Array

/**
 * A row returned from a SQLite query, mapping column names to their values.
 * @public
 */
export type TLSqliteRow = Record<string, TLSqliteOutputValue>

/**
 * A prepared statement that can be executed multiple times with different bindings.
 * @public
 */
export interface TLSyncSqliteStatement<
	TResult extends TLSqliteRow | void,
	TParams extends TLSqliteInputValue[] = [],
> {
	/** Execute the statement and iterate over results one at a time */
	iterate(...bindings: TParams): IterableIterator<TResult>
	/** Execute the statement and return all results as an array */
	all(...bindings: TParams): TResult[]
	/** Execute the statement without returning results (for DML) */
	run(...bindings: TParams): void
}

/**
 * Configuration for SQLiteSyncStorage.
 * @public
 */
export interface TLSyncSqliteWrapperConfig {
	/** Prefix for all table names (default: ''). E.g. 'sync_' creates tables 'sync_documents', 'sync_tombstones', 'sync_metadata' */
	tablePrefix?: string
}

/**
 * Interface for SQLite storage with prepare, exec and transaction capabilities.
 * @public
 */
export interface TLSyncSqliteWrapper {
	/** Optional configuration for table names. If not provided, defaults are used. */
	readonly config?: TLSyncSqliteWrapperConfig
	/** Prepare a SQL statement for execution */
	prepare<TResult extends TLSqliteRow | void, TParams extends TLSqliteInputValue[] = []>(
		sql: string
	): TLSyncSqliteStatement<TResult, TParams>
	/** Execute raw SQL (for DDL, multi-statement scripts) */
	exec(sql: string): void
	/** Execute a callback within a transaction */
	transaction<T>(callback: () => T): T
}

export function migrateSqliteSyncStorage(
	storage: TLSyncSqliteWrapper,
	{
		documentsTable = 'documents',
		tombstonesTable = 'tombstones',
		metadataTable = 'metadata',
	}: { documentsTable?: string; tombstonesTable?: string; metadataTable?: string } = {}
): void {
	let migrationVersion = 0
	try {
		const row = storage
			.prepare<{
				migrationVersion: number
			}>(`SELECT migrationVersion FROM ${metadataTable} LIMIT 1`)
			.all()[0]
		migrationVersion = row?.migrationVersion ?? 0
	} catch (_e) {
		// noop
	}

	if (migrationVersion === 0) {
		migrationVersion++
		storage.exec(`
			CREATE TABLE ${documentsTable} (
				id TEXT PRIMARY KEY,
				state BLOB NOT NULL,
				lastChangedClock INTEGER NOT NULL
			);

			CREATE INDEX idx_${documentsTable}_lastChangedClock ON ${documentsTable}(lastChangedClock);

			CREATE TABLE ${tombstonesTable} (
				id TEXT PRIMARY KEY,
				clock INTEGER NOT NULL
			);
			CREATE INDEX idx_${tombstonesTable}_clock ON ${tombstonesTable}(clock);

			-- This table is used to store the metadata for the sync storage.
			-- There should only be one row in this table.
			CREATE TABLE ${metadataTable} (
			  migrationVersion INTEGER NOT NULL,
				documentClock INTEGER NOT NULL,
				tombstoneHistoryStartsAtClock INTEGER NOT NULL,
				schema TEXT NOT NULL
			);
			
			INSERT INTO ${metadataTable} (migrationVersion, documentClock, tombstoneHistoryStartsAtClock, schema) VALUES (2, 0, 0, '')
		`)
		// Skip migration 2 since we created the table with BLOB already
		migrationVersion++
	}

	if (migrationVersion === 1) {
		// Migration 2: Convert state column from TEXT to BLOB
		// SQLite doesn't support ALTER COLUMN, so we need to recreate the table
		migrationVersion++
		storage.exec(`
			CREATE TABLE ${documentsTable}_new (
				id TEXT PRIMARY KEY,
				state BLOB NOT NULL,
				lastChangedClock INTEGER NOT NULL
			);
			
			INSERT INTO ${documentsTable}_new (id, state, lastChangedClock)
			SELECT id, CAST(state AS BLOB), lastChangedClock FROM ${documentsTable};
			
			DROP TABLE ${documentsTable};
			
			ALTER TABLE ${documentsTable}_new RENAME TO ${documentsTable};
			
			CREATE INDEX idx_${documentsTable}_lastChangedClock ON ${documentsTable}(lastChangedClock);
		`)
	}

	// add more migrations here if and when needed

	storage.exec(`UPDATE ${metadataTable} SET migrationVersion = ${migrationVersion}`)
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function encodeState(state: unknown): Uint8Array {
	return textEncoder.encode(JSON.stringify(state))
}

function decodeState<T>(state: Uint8Array): T {
	return JSON.parse(textDecoder.decode(state))
}

/**
 * SQLite-based implementation of TLSyncStorage.
 * Stores documents, tombstones, metadata, and clock values in SQLite tables.
 *
 * This storage backend provides persistent synchronization state that survives
 * process restarts, unlike InMemorySyncStorage which loses data when the process ends.
 *
 * @example
 * ```ts
 * // With Cloudflare Durable Objects
 * import { SQLiteSyncStorage, DurableObjectSqliteSyncWrapper } from '@tldraw/sync-core'
 *
 * const sql = new DurableObjectSqliteSyncWrapper(this.ctx.storage)
 * const storage = new SQLiteSyncStorage({ sql })
 * ```
 *
 * @example
 * ```ts
 * // With Node.js sqlite (Node 22.5+)
 * import { DatabaseSync } from 'node:sqlite'
 * import { SQLiteSyncStorage, NodeSqliteWrapper } from '@tldraw/sync-core'
 *
 * const db = new DatabaseSync('sync-state.db')
 * const sql = new NodeSqliteWrapper(db)
 * const storage = new SQLiteSyncStorage({ sql })
 * ```
 *
 * @example
 * ```ts
 * // Initialize with an existing snapshot
 * const storage = new SQLiteSyncStorage({ sql, snapshot: existingSnapshot })
 * ```
 *
 * @public
 */
export class SQLiteSyncStorage<R extends UnknownRecord> implements TLSyncStorage<R> {
	/**
	 * Check if the storage has been initialized (has data in the clock table).
	 * Useful for determining whether to load from an external source on first access.
	 */
	static hasBeenInitialized(storage: TLSyncSqliteWrapper): boolean {
		const prefix = storage.config?.tablePrefix ?? ''
		try {
			const schema = storage
				.prepare<{ schema: string }>(`SELECT schema FROM ${prefix}metadata LIMIT 1`)
				.all()[0]?.schema
			return !!schema
		} catch (_e) {
			return false
		}
	}

	/**
	 * Get the current document clock value from storage without fully initializing.
	 * Returns null if storage has not been initialized.
	 * Useful for comparing storage freshness against external sources.
	 */
	static getDocumentClock(storage: TLSyncSqliteWrapper): number | null {
		const prefix = storage.config?.tablePrefix ?? ''
		try {
			const row = storage
				.prepare<{ documentClock: number }>(`SELECT documentClock FROM ${prefix}metadata LIMIT 1`)
				.all()[0]
			// documentClock exists but could be 0, so we check if the storage is initialized
			if (row && SQLiteSyncStorage.hasBeenInitialized(storage)) {
				return row.documentClock
			}
			return null
		} catch (_e) {
			return null
		}
	}

	// Prepared statements - created once, reused many times
	private readonly stmts

	private readonly sql: TLSyncSqliteWrapper

	constructor({
		sql,
		snapshot,
		onChange,
	}: {
		sql: TLSyncSqliteWrapper
		snapshot?: RoomSnapshot | StoreSnapshot<R>
		onChange?(arg: TLSyncStorageOnChangeCallbackProps): unknown
	}) {
		this.sql = sql
		const prefix = sql.config?.tablePrefix ?? ''
		const documentsTable = `${prefix}documents`
		const tombstonesTable = `${prefix}tombstones`
		const metadataTable = `${prefix}metadata`

		migrateSqliteSyncStorage(this.sql, { documentsTable, tombstonesTable, metadataTable })

		// Prepare all statements once
		this.stmts = {
			// Metadata
			getDocumentClock: this.sql.prepare<{ documentClock: number }>(
				`SELECT documentClock FROM ${metadataTable} LIMIT 1`
			),
			getTombstoneHistoryStartsAtClock: this.sql.prepare<{ tombstoneHistoryStartsAtClock: number }>(
				`SELECT tombstoneHistoryStartsAtClock FROM ${metadataTable}`
			),
			getSchema: this.sql.prepare<{ schema: string }>(`SELECT schema FROM ${metadataTable}`),
			setSchema: this.sql.prepare<void, [schema: string]>(`UPDATE ${metadataTable} SET schema = ?`),
			setTombstoneHistoryStartsAtClock: this.sql.prepare<void, [clock: number]>(
				`UPDATE ${metadataTable} SET tombstoneHistoryStartsAtClock = ?`
			),
			incrementDocumentClock: this.sql.prepare<void>(
				`UPDATE ${metadataTable} SET documentClock = documentClock + 1`
			),

			// Documents
			getDocument: this.sql.prepare<{ state: Uint8Array }, [id: string]>(
				`SELECT state FROM ${documentsTable} WHERE id = ?`
			),
			insertDocument: this.sql.prepare<
				void,
				[id: string, state: Uint8Array, lastChangedClock: number]
			>(`INSERT OR REPLACE INTO ${documentsTable} (id, state, lastChangedClock) VALUES (?, ?, ?)`),
			deleteDocument: this.sql.prepare<void, [id: string]>(
				`DELETE FROM ${documentsTable} WHERE id = ?`
			),
			documentExists: this.sql.prepare<{ id: string }, [id: string]>(
				`SELECT id FROM ${documentsTable} WHERE id = ?`
			),
			iterateDocuments: this.sql.prepare<{ state: Uint8Array; lastChangedClock: number }>(
				`SELECT state, lastChangedClock FROM ${documentsTable}`
			),
			iterateDocumentEntries: this.sql.prepare<{ id: string; state: Uint8Array }>(
				`SELECT id, state FROM ${documentsTable}`
			),
			iterateDocumentKeys: this.sql.prepare<{ id: string }>(`SELECT id FROM ${documentsTable}`),
			iterateDocumentValues: this.sql.prepare<{ state: Uint8Array }>(
				`SELECT state FROM ${documentsTable}`
			),
			getDocumentsChangedSince: this.sql.prepare<{ state: Uint8Array }, [sinceClock: number]>(
				`SELECT state FROM ${documentsTable} WHERE lastChangedClock > ?`
			),

			// Tombstones
			insertTombstone: this.sql.prepare<void, [id: string, clock: number]>(
				`INSERT OR REPLACE INTO ${tombstonesTable} (id, clock) VALUES (?, ?)`
			),
			deleteTombstone: this.sql.prepare<void, [id: string]>(
				`DELETE FROM ${tombstonesTable} WHERE id = ?`
			),
			deleteTombstonesBefore: this.sql.prepare<void, [clock: number]>(
				`DELETE FROM ${tombstonesTable} WHERE clock < ?`
			),
			countTombstones: this.sql.prepare<{ count: number }>(
				`SELECT count(*) as count FROM ${tombstonesTable}`
			),
			iterateTombstones: this.sql.prepare<{ id: string; clock: number }>(
				`SELECT id, clock FROM ${tombstonesTable} ORDER BY clock ASC`
			),
			getTombstonesChangedSince: this.sql.prepare<{ id: string }, [sinceClock: number]>(
				`SELECT id FROM ${tombstonesTable} WHERE clock > ?`
			),

			// Initial setup (only used when loading a snapshot)
			updateMetadata: this.sql.prepare<
				void,
				[documentClock: number, tombstoneHistoryStartsAtClock: number, schema: string]
			>(
				`UPDATE ${metadataTable} SET documentClock = ?, tombstoneHistoryStartsAtClock = ?, schema = ?`
			),
		}

		// Check if we already have data
		const hasData = SQLiteSyncStorage.hasBeenInitialized(sql)

		if (snapshot || !hasData) {
			snapshot = convertStoreSnapshotToRoomSnapshot(snapshot ?? DEFAULT_INITIAL_SNAPSHOT)

			const documentClock = snapshot.documentClock ?? snapshot.clock ?? 0
			const tombstoneHistoryStartsAtClock = snapshot.tombstoneHistoryStartsAtClock ?? documentClock

			// Clear existing data
			this.sql.exec(`
				DELETE FROM ${documentsTable};
				DELETE FROM ${tombstonesTable};
			`)

			// Insert documents
			for (const doc of snapshot.documents) {
				this.stmts.insertDocument.run(doc.state.id, encodeState(doc.state), doc.lastChangedClock)
			}

			// Insert tombstones
			if (snapshot.tombstones) {
				for (const [id, clock] of objectMapEntries(snapshot.tombstones)) {
					this.stmts.insertTombstone.run(id, clock)
				}
			}

			// Insert metadata row
			this.stmts.updateMetadata.run(
				documentClock,
				tombstoneHistoryStartsAtClock,
				JSON.stringify(snapshot.schema)
			)
		}
		if (onChange) {
			this.onChange(onChange)
		}
	}

	private notifier = new MicrotaskNotifier<[TLSyncStorageOnChangeCallbackProps]>()
	onChange(callback: (arg: TLSyncStorageOnChangeCallbackProps) => void): () => void {
		return this.notifier.register(callback)
	}

	transaction<T>(
		callback: TLSyncStorageTransactionCallback<R, T>,
		opts?: TLSyncStorageTransactionOptions
	): TLSyncStorageTransactionResult<T, R> {
		const clockBefore = this.getClock()
		const trackChanges = opts?.emitChanges === 'always'
		return this.sql.transaction(() => {
			const txn = new SQLiteSyncStorageTransaction<R>(this, this.stmts)
			let result: T
			let changes: TLSyncForwardDiff<R> | undefined
			try {
				result = transaction(() => {
					return callback(txn)
				}) as T
				if (trackChanges) {
					changes = txn.getChangesSince(clockBefore)?.diff
				}
			} finally {
				txn.close()
			}
			if (
				typeof result === 'object' &&
				result &&
				'then' in result &&
				typeof result.then === 'function'
			) {
				throw new Error('Transaction must return a value, not a promise')
			}

			const clockAfter = this.getClock()
			const didChange = clockAfter > clockBefore
			if (didChange) {
				this.notifier.notify({ id: opts?.id, documentClock: clockAfter })
			}
			return { documentClock: clockAfter, didChange: clockAfter > clockBefore, result, changes }
		})
	}

	getClock(): number {
		const clockRow = this.stmts.getDocumentClock.all()[0]
		return clockRow?.documentClock ?? 0
	}

	/** @internal */
	_getTombstoneHistoryStartsAtClock(): number {
		const clockRow = this.stmts.getTombstoneHistoryStartsAtClock.all()[0]
		return clockRow?.tombstoneHistoryStartsAtClock ?? 0
	}

	/** @internal */
	_getSchema(): SerializedSchema {
		const clockRow = this.stmts.getSchema.all()[0]
		assert(clockRow, 'Storage not initialized - clock row missing')
		return JSON.parse(clockRow.schema)
	}

	/** @internal */
	_setSchema(schema: SerializedSchema): void {
		this.stmts.setSchema.run(JSON.stringify(schema))
	}

	/** @internal */
	pruneTombstones = throttle(
		() => {
			const tombstoneCount = this.stmts.countTombstones.all()[0].count as number
			if (tombstoneCount > MAX_TOMBSTONES) {
				// Get all tombstones sorted by clock ascending (oldest first)
				const tombstones = this.stmts.iterateTombstones.all()

				const result = computeTombstonePruning({ tombstones, documentClock: this.getClock() })
				if (result) {
					this.stmts.setTombstoneHistoryStartsAtClock.run(result.newTombstoneHistoryStartsAtClock)
					// Delete all tombstones with clock < newTombstoneHistoryStartsAtClock in one operation.
					// This works because computeTombstonePruning ensures we never split a clock value.
					this.stmts.deleteTombstonesBefore.run(result.newTombstoneHistoryStartsAtClock)
				}
			}
		},
		1000,
		// prevent this from running synchronously to avoid blocking requests
		{ leading: false }
	)

	getSnapshot(): RoomSnapshot {
		return {
			tombstoneHistoryStartsAtClock: this._getTombstoneHistoryStartsAtClock(),
			documentClock: this.getClock(),
			documents: Array.from(this._iterateDocuments()),
			tombstones: Object.fromEntries(this._iterateTombstones()),
			schema: this._getSchema(),
		}
	}
	private *_iterateDocuments(): IterableIterator<{ state: R; lastChangedClock: number }> {
		for (const row of this.stmts.iterateDocuments.iterate()) {
			yield { state: decodeState<R>(row.state), lastChangedClock: row.lastChangedClock }
		}
	}

	private *_iterateTombstones(): IterableIterator<[string, number]> {
		for (const row of this.stmts.iterateTombstones.iterate()) {
			yield [row.id, row.clock]
		}
	}
}

/**
 * Transaction implementation for SQLiteSyncStorage.
 * Provides access to documents, tombstones, and metadata within a transaction.
 *
 * @internal
 */
class SQLiteSyncStorageTransaction<R extends UnknownRecord> implements TLSyncStorageTransaction<R> {
	private _clock: number
	private _closed = false
	private _didIncrementClock: boolean = false

	constructor(
		private storage: SQLiteSyncStorage<R>,
		private stmts: SQLiteSyncStorage<R>['stmts']
	) {
		this._clock = this.storage.getClock()
	}

	/** @internal */
	close() {
		this._closed = true
	}

	private assertNotClosed() {
		assert(!this._closed, 'Transaction has ended, iterator cannot be consumed')
	}

	getClock(): number {
		return this._clock
	}

	private getNextClock(): number {
		if (!this._didIncrementClock) {
			this._didIncrementClock = true
			this.stmts.incrementDocumentClock.run()
			this._clock = this.storage.getClock()
		}
		return this._clock
	}

	get(id: string): R | undefined {
		this.assertNotClosed()
		const row = this.stmts.getDocument.all(id)[0]
		if (!row) return undefined
		return decodeState<R>(row.state)
	}

	set(id: string, record: R): void {
		this.assertNotClosed()
		assert(id === record.id, `Record id mismatch: key does not match record.id`)
		const clock = this.getNextClock()
		// Automatically clear tombstone if it exists
		this.stmts.deleteTombstone.run(id)
		this.stmts.insertDocument.run(id, encodeState(record), clock)
	}

	delete(id: string): void {
		this.assertNotClosed()
		// Only create a tombstone if the record actually exists
		const exists = this.stmts.documentExists.all(id)[0]
		if (!exists) return
		const clock = this.getNextClock()
		this.stmts.deleteDocument.run(id)
		this.stmts.insertTombstone.run(id, clock)
		this.storage.pruneTombstones()
	}

	*entries(): IterableIterator<[string, R]> {
		this.assertNotClosed()
		for (const row of this.stmts.iterateDocumentEntries.iterate()) {
			this.assertNotClosed()
			yield [row.id, decodeState<R>(row.state)]
		}
	}

	*keys(): IterableIterator<string> {
		this.assertNotClosed()
		for (const row of this.stmts.iterateDocumentKeys.iterate()) {
			this.assertNotClosed()
			yield row.id
		}
	}

	*values(): IterableIterator<R> {
		this.assertNotClosed()
		for (const row of this.stmts.iterateDocumentValues.iterate()) {
			this.assertNotClosed()
			yield decodeState<R>(row.state)
		}
	}

	getSchema(): SerializedSchema {
		this.assertNotClosed()
		return this.storage._getSchema()
	}

	setSchema(schema: SerializedSchema): void {
		this.assertNotClosed()
		this.storage._setSchema(schema)
	}

	getChangesSince(sinceClock: number): TLSyncStorageGetChangesSinceResult<R> | undefined {
		this.assertNotClosed()
		const clock = this.storage.getClock()
		if (sinceClock === clock) return undefined
		if (sinceClock > clock) {
			// something went wrong, wipe the slate clean
			sinceClock = -1
		}
		const diff: TLSyncForwardDiff<R> = { puts: {}, deletes: [] }
		const wipeAll = sinceClock < this.storage._getTombstoneHistoryStartsAtClock()

		if (wipeAll) {
			// If wipeAll, include all documents
			for (const row of this.stmts.iterateDocumentValues.iterate()) {
				const state = decodeState<R>(row.state)
				diff.puts[state.id] = state
			}
		} else {
			// Get documents changed since clock
			for (const row of this.stmts.getDocumentsChangedSince.iterate(sinceClock)) {
				const state = decodeState<R>(row.state)
				diff.puts[state.id] = state
			}
			// When wipeAll, deletes are redundant (full state is in puts). Only include tombstones otherwise.
			for (const row of this.stmts.getTombstonesChangedSince.iterate(sinceClock)) {
				diff.deletes.push(row.id)
			}
		}

		return { diff, wipeAll }
	}
}

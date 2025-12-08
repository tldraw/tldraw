import { transaction } from '@tldraw/state'
import { SerializedSchema, StoreSnapshot, UnknownRecord } from '@tldraw/store'
import { assert, objectMapEntries, throttle } from '@tldraw/utils'
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

const TOMBSTONE_PRUNE_BUFFER_SIZE = 1000
const MAX_TOMBSTONES = 5000

/** @public */
export type TLSqliteInputValue = null | number | bigint | string
/** @public */
export type TLSqliteOutputValue = null | number | bigint | string | Uint8Array
/** @public */
export type TLSqliteRow = Record<string, TLSqliteOutputValue>

/**
 * A prepared statement that can be executed multiple times with different bindings.
 * @public
 */
export interface TLSyncSqliteStatement<
	TResult extends TLSqliteRow,
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
 * Configuration for SqlLiteSyncStorage.
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
	prepare<TResult extends TLSqliteRow, TParams extends TLSqliteInputValue[] = []>(
		sql: string
	): TLSyncSqliteStatement<TResult, TParams>
	/** Execute raw SQL (for DDL, multi-statement scripts) */
	exec(sql: string): void
	/** Execute a callback within a transaction */
	transaction<T>(callback: () => T): T
}

/**
 * SQLite-based implementation of TLPersistentStorage.
 * Stores documents, tombstones, metadata, and clock values in SQLite tables.
 *
 * @public
 */
export class SqlLiteSyncStorage<R extends UnknownRecord> implements TLSyncStorage<R> {
	/**
	 * Check if the storage has been initialized (has data in the clock table).
	 * Useful for determining whether to load from an external source on first access.
	 */
	static hasBeenInitialized(storage: TLSyncSqliteWrapper): boolean {
		const prefix = storage.config?.tablePrefix ?? ''
		try {
			return storage.prepare(`SELECT 1 FROM ${prefix}metadata LIMIT 1`).all().length > 0
		} catch (_e) {
			return false
		}
	}

	// Prepared statements - created once, reused many times
	private readonly stmts

	constructor(
		private sql: TLSyncSqliteWrapper,
		snapshot?: RoomSnapshot | StoreSnapshot<R>
	) {
		const prefix = sql.config?.tablePrefix ?? ''
		const documentsTable = `${prefix}documents`
		const tombstonesTable = `${prefix}tombstones`
		const metadataTable = `${prefix}metadata`

		// Initialize all tables idempotently
		// TODO: add sql schema migrations
		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS ${documentsTable} (
				id TEXT PRIMARY KEY,
				state TEXT NOT NULL,
				lastChangedClock INTEGER NOT NULL
			);
			
			CREATE INDEX IF NOT EXISTS idx_${documentsTable}_lastChangedClock ON ${documentsTable}(lastChangedClock);
			
			CREATE TABLE IF NOT EXISTS ${tombstonesTable} (
				id TEXT PRIMARY KEY,
				clock INTEGER NOT NULL
			);
			
			CREATE TABLE IF NOT EXISTS ${metadataTable} (
				id INTEGER PRIMARY KEY CHECK (id = 0),
				documentClock INTEGER NOT NULL DEFAULT 0,
				tombstoneHistoryStartsAtClock INTEGER NOT NULL DEFAULT 0,
				schema TEXT NOT NULL
			);
		`)

		// Prepare all statements once
		this.stmts = {
			// Metadata
			getDocumentClock: this.sql.prepare<{ documentClock: number }>(
				`SELECT documentClock FROM ${metadataTable} LIMIT 1`
			),
			getTombstoneHistoryStartsAtClock: this.sql.prepare<{ tombstoneHistoryStartsAtClock: number }>(
				`SELECT tombstoneHistoryStartsAtClock FROM ${metadataTable} WHERE id = 0`
			),
			getSchema: this.sql.prepare<{ schema: string }>(
				`SELECT schema FROM ${metadataTable} WHERE id = 0`
			),
			setSchema: this.sql.prepare<TLSqliteRow, [schema: string]>(
				`UPDATE ${metadataTable} SET schema = ? WHERE id = 0`
			),
			setTombstoneHistoryStartsAtClock: this.sql.prepare<TLSqliteRow, [clock: number]>(
				`UPDATE ${metadataTable} SET tombstoneHistoryStartsAtClock = ? WHERE id = 0`
			),
			incrementDocumentClock: this.sql.prepare<TLSqliteRow>(
				`UPDATE ${metadataTable} SET documentClock = documentClock + 1 WHERE id = 0`
			),

			// Documents
			getDocument: this.sql.prepare<{ state: string }, [id: string]>(
				`SELECT state FROM ${documentsTable} WHERE id = ?`
			),
			insertDocument: this.sql.prepare<
				TLSqliteRow,
				[id: string, state: string, lastChangedClock: number]
			>(`INSERT OR REPLACE INTO ${documentsTable} (id, state, lastChangedClock) VALUES (?, ?, ?)`),
			deleteDocument: this.sql.prepare<TLSqliteRow, [id: string]>(
				`DELETE FROM ${documentsTable} WHERE id = ?`
			),
			documentExists: this.sql.prepare<{ id: string }, [id: string]>(
				`SELECT id FROM ${documentsTable} WHERE id = ?`
			),
			iterateDocuments: this.sql.prepare<{ state: string; lastChangedClock: number }>(
				`SELECT state, lastChangedClock FROM ${documentsTable}`
			),
			iterateDocumentEntries: this.sql.prepare<{ id: string; state: string }>(
				`SELECT id, state FROM ${documentsTable}`
			),
			iterateDocumentKeys: this.sql.prepare<{ id: string }>(`SELECT id FROM ${documentsTable}`),
			iterateDocumentValues: this.sql.prepare<{ state: string }>(
				`SELECT state FROM ${documentsTable}`
			),
			getDocumentsChangedSince: this.sql.prepare<{ state: string }, [sinceClock: number]>(
				`SELECT state FROM ${documentsTable} WHERE lastChangedClock > ?`
			),

			// Tombstones
			insertTombstone: this.sql.prepare<TLSqliteRow, [id: string, clock: number]>(
				`INSERT OR REPLACE INTO ${tombstonesTable} (id, clock) VALUES (?, ?)`
			),
			deleteTombstone: this.sql.prepare<TLSqliteRow, [id: string]>(
				`DELETE FROM ${tombstonesTable} WHERE id = ?`
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
			insertMetadata: this.sql.prepare<
				TLSqliteRow,
				[documentClock: number, tombstoneHistoryStartsAtClock: number, schema: string]
			>(
				`INSERT INTO ${metadataTable} (id, documentClock, tombstoneHistoryStartsAtClock, schema) VALUES (0, ?, ?, ?)`
			),
		}

		if (snapshot) {
			snapshot = convertStoreSnapshotToRoomSnapshot(snapshot)

			const documentClock = snapshot.documentClock ?? snapshot.clock ?? 0
			const tombstoneHistoryStartsAtClock = snapshot.tombstoneHistoryStartsAtClock ?? documentClock

			// Clear existing data
			this.sql.exec(`
				DELETE FROM ${documentsTable};
				DELETE FROM ${tombstonesTable};
				DELETE FROM ${metadataTable};
			`)

			// Insert documents
			for (const doc of snapshot.documents) {
				this.stmts.insertDocument.run(doc.state.id, JSON.stringify(doc.state), doc.lastChangedClock)
			}

			// Insert tombstones
			if (snapshot.tombstones) {
				for (const [id, clock] of objectMapEntries(snapshot.tombstones)) {
					this.stmts.insertTombstone.run(id, clock)
				}
			}

			// Insert metadata row
			this.stmts.insertMetadata.run(
				documentClock,
				tombstoneHistoryStartsAtClock,
				JSON.stringify(snapshot.schema)
			)
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
			const txn = new SqlLiteSyncStorageTransaction<R>(this, this.stmts)
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

				// determine how many to delete, avoiding partial history for a clock value
				let cutoff = TOMBSTONE_PRUNE_BUFFER_SIZE + tombstones.length - MAX_TOMBSTONES
				while (
					cutoff < tombstones.length &&
					tombstones[cutoff - 1]?.clock === tombstones[cutoff]?.clock
				) {
					cutoff++
				}

				// Set history start to the oldest remaining tombstone's clock
				// (or documentClock if we're deleting everything)
				const oldestRemaining = tombstones[cutoff]
				const newTombstoneHistoryStartsAtClock = oldestRemaining?.clock ?? this.getClock()

				// Update clock table
				this.stmts.setTombstoneHistoryStartsAtClock.run(newTombstoneHistoryStartsAtClock)

				// Delete the oldest tombstones (first cutoff entries)
				const toDelete = tombstones.slice(0, cutoff)
				for (const { id } of toDelete) {
					this.stmts.deleteTombstone.run(id)
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
			yield { state: JSON.parse(row.state) as R, lastChangedClock: row.lastChangedClock }
		}
	}

	private *_iterateTombstones(): IterableIterator<[string, number]> {
		for (const row of this.stmts.iterateTombstones.iterate()) {
			yield [row.id, row.clock]
		}
	}
}

/**
 * Transaction implementation for SqlLiteSyncStorage.
 * Provides access to documents, tombstones, and metadata within a transaction.
 *
 * @internal
 */
class SqlLiteSyncStorageTransaction<R extends UnknownRecord>
	implements TLSyncStorageTransaction<R>
{
	private _clock: number
	private _closed = false
	private _didIncrementClock: boolean = false

	constructor(
		private storage: SqlLiteSyncStorage<R>,
		private stmts: SqlLiteSyncStorage<R>['stmts']
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
		return JSON.parse(row.state) as R
	}

	set(id: string, record: R): void {
		this.assertNotClosed()
		assert(id === record.id, `Record id mismatch: key does not match record.id`)
		const clock = this.getNextClock()
		// Automatically clear tombstone if it exists
		this.stmts.deleteTombstone.run(id)
		this.stmts.insertDocument.run(id, JSON.stringify(record), clock)
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
			yield [row.id, JSON.parse(row.state) as R]
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
			yield JSON.parse(row.state) as R
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
				const state = JSON.parse(row.state) as R
				diff.puts[state.id] = state
			}
		} else {
			// Get documents changed since clock
			for (const row of this.stmts.getDocumentsChangedSince.iterate(sinceClock)) {
				const state = JSON.parse(row.state) as R
				diff.puts[state.id] = state
			}
		}

		// Get tombstones changed since clock
		for (const row of this.stmts.getTombstonesChangedSince.iterate(sinceClock)) {
			diff.deletes.push(row.id)
		}

		return { diff, wipeAll }
	}
}

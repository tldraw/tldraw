import { DurableObjectStorage, SqlStorage } from '@cloudflare/workers-types'
import { transaction } from '@tldraw/state'
import {
	MetadataKeys,
	TLPersistentStorage,
	TLPersistentStorageChange,
	TLPersistentStorageChangeOp,
	TLPersistentStorageTransaction,
	TLPersistentStorageTransactionResult,
	UnknownRecord,
} from '@tldraw/store'
import {
	createTLSchema,
	DocumentRecordType,
	PageRecordType,
	TLDOCUMENT_ID,
	TLPageId,
} from '@tldraw/tlschema'
import { IndexKey, objectMapEntries, throttle } from '@tldraw/utils'
import { RoomSnapshot } from './TLSyncRoom'

const TOMBSTONE_PRUNE_BUFFER_SIZE = 1000
const MAX_TOMBSTONES = 5000

export const DEFAULT_INITIAL_SNAPSHOT: RoomSnapshot = {
	documentClock: 0,
	schema: createTLSchema().serialize(),
	tombstoneHistoryStartsAtClock: 0,
	documents: [
		{
			state: DocumentRecordType.create({ id: TLDOCUMENT_ID }),
			lastChangedClock: 0,
		},
		{
			state: PageRecordType.create({
				id: 'page:page' as TLPageId,
				name: 'Page 1',
				index: 'a1' as IndexKey,
			}),
			lastChangedClock: 0,
		},
	],
}

/**
 * SQLite-based implementation of TLPersistentStorage.
 * Stores documents, tombstones, metadata, and clock values in SQLite tables.
 *
 * @public
 */
export class SqlLiteSyncStorage<R extends UnknownRecord> implements TLPersistentStorage<R> {
	/** @internal */
	storage: DurableObjectStorage
	sql: SqlStorage

	static hasBeenInitialized(storage: DurableObjectStorage): boolean {
		try {
			return storage.sql.exec('SELECT 1 FROM clock LIMIT 1').toArray().length > 0
		} catch (_e) {
			return false
		}
	}

	constructor(storage: DurableObjectStorage, snapshot?: RoomSnapshot) {
		this.storage = storage
		this.sql = storage.sql
		// Initialize all tables idempotently
		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS documents (
				id TEXT PRIMARY KEY,
				state TEXT NOT NULL,
				lastChangedClock INTEGER NOT NULL
			);
			
			CREATE INDEX IF NOT EXISTS idx_documents_lastChangedClock ON documents(lastChangedClock);
			
			CREATE TABLE IF NOT EXISTS tombstones (
				id TEXT PRIMARY KEY,
				clock INTEGER NOT NULL
			);
			
			CREATE TABLE IF NOT EXISTS metadata (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			);
			
			CREATE TABLE IF NOT EXISTS clock (
				documentClock INTEGER NOT NULL DEFAULT 0,
				tombstoneHistoryStartsAtClock INTEGER NOT NULL DEFAULT 0
			);
		`)

		if (snapshot) {
			const documentClock = snapshot.documentClock ?? snapshot.clock ?? 0
			const tombstoneHistoryStartsAtClock = snapshot.tombstoneHistoryStartsAtClock ?? documentClock

			// Clear existing data
			this.sql.exec('DELETE FROM documents')
			this.sql.exec('DELETE FROM tombstones')
			this.sql.exec('DELETE FROM metadata')
			this.sql.exec('DELETE FROM clock')

			// Insert documents
			for (const doc of snapshot.documents) {
				this.sql.exec(
					'INSERT INTO documents (id, state, lastChangedClock) VALUES (?, ?, ?)',
					doc.state.id,
					JSON.stringify(doc.state),
					doc.lastChangedClock
				)
			}

			// Insert tombstones
			if (snapshot.tombstones) {
				for (const [id, clock] of objectMapEntries(snapshot.tombstones)) {
					this.sql.exec('INSERT INTO tombstones (id, clock) VALUES (?, ?)', id, clock)
				}
			}

			// Insert metadata
			this.sql.exec(
				'INSERT INTO metadata (key, value) VALUES (?, ?)',
				MetadataKeys.schema,
				JSON.stringify(snapshot.schema)
			)

			// Insert clock
			this.sql.exec(
				'INSERT INTO clock (documentClock, tombstoneHistoryStartsAtClock) VALUES (?, ?)',
				documentClock,
				tombstoneHistoryStartsAtClock
			)
		}
	}

	private listeners = new Set<(source: string, documentClock: number) => void>()
	onChange(callback: (arg: { source: string; documentClock: number }) => void): () => void {
		const cb = (source: string, documentClock: number) => callback({ source, documentClock })
		this.listeners.add(cb)
		return () => {
			this.listeners.delete(cb)
		}
	}

	transaction<T>(
		source: string,
		callback: (txn: TLPersistentStorageTransaction<R>) => T
	): TLPersistentStorageTransactionResult<T> {
		const clockBefore = this.getClock()
		return this.storage.transactionSync(() => {
			const txn = new SqlLiteSyncStorageTransaction<R>(this)
			const result = transaction(() => {
				return callback(txn)
			})

			const clockAfter = this.getClock()
			const didChange = clockAfter > clockBefore
			if (didChange) {
				for (const listener of this.listeners) {
					listener(source, clockAfter)
				}
			}
			return { documentClock: clockAfter, didChange: clockAfter > clockBefore, result }
		})
	}

	getClock(): number {
		const clockRow = this.sql.exec('SELECT documentClock FROM clock LIMIT 1').one()
		return (clockRow as any).documentClock ?? 0
	}

	/** @internal */
	_getTombstoneHistoryStartsAtClock(): number {
		const clockRow = this.sql.exec('SELECT tombstoneHistoryStartsAtClock FROM clock LIMIT 1').one()
		return (clockRow as any).tombstoneHistoryStartsAtClock ?? 0
	}

	/** @internal */
	pruneTombstones = throttle(
		() => {
			const tombstoneCount = this.sql.exec('SELECT COUNT(*) as count FROM tombstones').one()
				.count as number
			if (tombstoneCount > MAX_TOMBSTONES) {
				// Get all tombstones sorted by clock descending
				const tombstones = this.sql
					.exec('SELECT id, clock FROM tombstones ORDER BY clock DESC')
					.toArray() as Array<{ id: string; clock: number }>

				// Find cutoff point
				let cutoff = TOMBSTONE_PRUNE_BUFFER_SIZE
				while (
					cutoff < tombstones.length &&
					tombstones[cutoff - 1]?.clock === tombstones[cutoff]?.clock
				) {
					cutoff++
				}

				const newTombstoneHistoryStartsAtClock = tombstones[cutoff]?.clock ?? this.getClock()

				// Update clock table
				this.sql.exec(
					'UPDATE clock SET tombstoneHistoryStartsAtClock = ?',
					newTombstoneHistoryStartsAtClock
				)

				// Delete old tombstones
				if (cutoff < tombstones.length) {
					const idsToDelete = tombstones.slice(cutoff).map((t) => t.id)
					for (const id of idsToDelete) {
						this.sql.exec('DELETE FROM tombstones WHERE id = ?', id)
					}
				}
			}
		},
		1000,
		{ leading: false }
	)
}

/**
 * Transaction implementation for SqlLiteSyncStorage.
 * Provides access to documents, tombstones, and metadata within a transaction.
 *
 * @internal
 */
class SqlLiteSyncStorageTransaction<R extends UnknownRecord>
	implements TLPersistentStorageTransaction<R>
{
	private _didIncrementClock: boolean = false

	constructor(private storage: SqlLiteSyncStorage<R>) {}

	getClock(): number {
		return this.storage.getClock()
	}

	private getNextClock(): number {
		if (!this._didIncrementClock) {
			this._didIncrementClock = true
			this.storage.sql.exec('UPDATE clock SET documentClock = documentClock + 1')
		}
		return this.getClock()
	}

	getDocument(id: string): { state: R; lastChangedClock: number } | undefined {
		// Query from database
		const row = this.storage.sql
			.exec<{
				state: string
				lastChangedClock: number
			}>('SELECT state, lastChangedClock FROM documents WHERE id = ?', id)
			.toArray()[0]
		if (!row) return undefined
		return {
			state: JSON.parse(row.state) as R,
			lastChangedClock: row.lastChangedClock,
		}
	}

	setDocument(id: string, state: R): void {
		const clock = this.getNextClock()
		this.storage.sql.exec(
			'INSERT OR REPLACE INTO documents (id, state, lastChangedClock) VALUES (?, ?, ?)',
			id,
			JSON.stringify(state),
			clock
		)
	}

	deleteDocument(id: string): void {
		const clock = this.getNextClock()
		this.storage.sql.exec('DELETE FROM documents WHERE id = ?', id)
		this.storage.sql.exec('INSERT INTO tombstones (id, clock) VALUES (?, ?)', id, clock)
		this.storage.pruneTombstones()
	}

	*documents(): IterableIterator<[string, { state: R; lastChangedClock: number }]> {
		// Get all documents from database
		for (const row of this.storage.sql.exec<{
			id: string
			state: string
			lastChangedClock: number
		}>('SELECT id, state, lastChangedClock FROM documents')) {
			yield [row.id, { state: JSON.parse(row.state) as R, lastChangedClock: row.lastChangedClock }]
		}
	}

	*documentIds(): IterableIterator<string> {
		for (const row of this.storage.sql.exec<{ id: string }>('SELECT id FROM documents')) {
			yield row.id
		}
	}

	getMetadata(key: string): string | null {
		// Query from database
		const row = this.storage.sql
			.exec<{ value: string }>('SELECT value FROM metadata WHERE key = ?', key)
			.toArray()[0]
		return row?.value ?? null
	}

	setMetadata(key: string, value: string): void {
		this.storage.sql.exec('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)', key, value)
	}

	*tombstones(): IterableIterator<[string, number]> {
		// Get all tombstones from database
		for (const row of this.storage.sql.exec<{ id: string; clock: number }>(
			'SELECT id, clock FROM tombstones'
		)) {
			yield [row.id, row.clock]
		}
	}

	getChangesSince(sinceClock: number): Iterable<TLPersistentStorageChange<R>> {
		const clock = this.getClock()
		if (sinceClock === clock) {
			return []
		}
		if (sinceClock > clock) {
			console.error('sinceClock is greater than clock', sinceClock, clock)
			sinceClock = -1
		}
		const changes: TLPersistentStorageChange<R>[] = []
		const tombstoneHistoryStartsAtClock = this.storage._getTombstoneHistoryStartsAtClock()

		if (sinceClock < tombstoneHistoryStartsAtClock) {
			sinceClock = -1
			changes.push([TLPersistentStorageChangeOp.WIPE_ALL])
		}

		// Get documents changed since clock
		const dbDocs = this.storage.sql
			.exec('SELECT state, lastChangedClock FROM documents WHERE lastChangedClock > ?', sinceClock)
			.toArray() as Array<{ state: string; lastChangedClock: number }>

		for (const row of dbDocs) {
			changes.push([TLPersistentStorageChangeOp.PUT, JSON.parse(row.state) as R])
		}

		// Get tombstones changed since clock
		const dbTombstones = this.storage.sql
			.exec('SELECT id, clock FROM tombstones WHERE clock > ?', sinceClock)
			.toArray() as Array<{ id: string; clock: number }>

		for (const row of dbTombstones) {
			changes.push([TLPersistentStorageChangeOp.DELETE, row.id])
		}

		return changes
	}
}

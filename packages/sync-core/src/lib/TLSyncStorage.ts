import { StoreSchema, SynchronousStorage, UnknownRecord } from '@tldraw/store'
import { assert, isEqual, objectMapEntriesIterable, objectMapValues } from '@tldraw/utils'
import { TLStoreSnapshot } from 'tldraw'
import { diffRecord, NetworkDiff, RecordOpType } from './diff'
import { RoomSnapshot } from './TLSyncRoom'

/**
 * Transaction interface for storage operations. Provides methods to read and modify
 * documents, tombstones, and metadata within a transaction.
 *
 * @public
 */
export interface TLSyncStorageTransaction<R extends UnknownRecord> extends SynchronousStorage<R> {
	/**
	 * Get the current clock value.
	 * If the clock has incremented during the transaction,
	 * the incremented value will be returned.
	 *
	 * @returns The current clock value
	 */
	getClock(): number

	/**
	 * Get all changes (document updates and deletions) since a given clock time.
	 * This is the main method for calculating diffs for client sync.
	 *
	 * @param sinceClock - The clock time to get changes since
	 * @returns Changes since the specified clock time
	 */
	getChangesSince(sinceClock: number): TLSyncStorageGetChangesSinceResult<R> | undefined
}

/**
 * Options for a transaction.
 * @public
 */
export interface TLSyncStorageTransactionOptions {
	/**
	 * Use this if you need to identify the transaction for logging or debugging purposes
	 * or for ignoring certain changes in onChange callbacks
	 */
	id?: string
	/**
	 * Controls when the storage layer should emit the actual changes that occurred during the transaction.
	 *
	 * - `'always'` - Always emit the changes, regardless of whether they were applied verbatim
	 * - `'when-different'` - Only emit changes if the storage layer modified/embellished the records
	 *   (e.g., added server timestamps, normalized data, etc.)
	 *
	 * When changes are emitted, they will be available in the `changes` field of the transaction result.
	 * This is useful when the storage layer may transform records and the caller needs to know
	 * what actually changed rather than what was requested.
	 */
	emitChanges?: 'always' | 'when-different'
}

/**
 * Callback type for a transaction.
 * The conditional return type ensures that the callback is synchronous.
 * @public
 */
export type TLSyncStorageTransactionCallback<R extends UnknownRecord, T> = (
	txn: TLSyncStorageTransaction<R>
) => T extends Promise<any>
	? {
			__error: 'Transaction callbacks cannot be async. Use synchronous operations only.'
		}
	: T

/**
 * Pluggable synchronous transactional storage layer for TLSyncRoom.
 * Provides methods for managing documents, tombstones, and clocks within transactions.
 *
 * @public
 */
export interface TLSyncStorage<R extends UnknownRecord> {
	transaction<T>(
		callback: TLSyncStorageTransactionCallback<R, T>,
		opts?: TLSyncStorageTransactionOptions
	): TLSyncStorageTransactionResult<T, R>

	getClock(): number

	onChange(callback: (arg: TLSyncStorageOnChangeCallbackProps) => unknown): () => void

	getSnapshot?(): RoomSnapshot
}

/**
 * Properties passed to the onChange callback.
 * @public
 */
export interface TLSyncStorageOnChangeCallbackProps {
	/**
	 * The ID of the transaction that caused the change.
	 * This is useful for ignoring certain changes in onChange callbacks.
	 */
	id?: string
	documentClock: number
}

/**
 * Result returned from a storage transaction.
 * @public
 */
export interface TLSyncStorageTransactionResult<T, R extends UnknownRecord = UnknownRecord> {
	documentClock: number
	didChange: boolean
	result: T
	/**
	 * The actual changes that occurred during the transaction, if requested via `emitChanges` option.
	 * This is a RecordsDiff where:
	 * - `added` contains records that were put (we don't have "from" state for emitted changes)
	 * - `removed` contains records that were deleted (with placeholder values since we only have IDs)
	 * - `updated` is empty (emitted changes don't track before/after pairs)
	 *
	 * Only populated when:
	 * - `emitChanges: 'always'` was specified, or
	 * - `emitChanges: 'when-different'` was specified and the storage layer modified records
	 */
	changes?: TLSyncForwardDiff<R>
}

/**
 * Respresents a diff of puts and deletes.
 * @public
 */
export interface TLSyncForwardDiff<R extends UnknownRecord> {
	puts: Record<string, R | [before: R, after: R]>
	deletes: string[]
}

/**
 * @internal
 */
export function toNetworkDiff<R extends UnknownRecord>(diff: TLSyncForwardDiff<R>): NetworkDiff<R> {
	const networkDiff: NetworkDiff<R> = {}
	for (const [id, put] of objectMapEntriesIterable(diff.puts)) {
		if (Array.isArray(put)) {
			const patch = diffRecord(put[0], put[1])
			if (patch) {
				networkDiff[id] = [RecordOpType.Patch, patch]
			}
		} else {
			networkDiff[id] = [RecordOpType.Put, put]
		}
	}
	for (const id of diff.deletes) {
		networkDiff[id] = [RecordOpType.Remove]
	}
	return networkDiff
}

/**
 * Result returned from getChangesSince, containing all changes since a given clock time.
 * @public
 */
export interface TLSyncStorageGetChangesSinceResult<R extends UnknownRecord> {
	/**
	 * The changes as a TLSyncForwardDiff.
	 */
	diff: TLSyncForwardDiff<R>
	/**
	 * If true, the client should wipe all local data and replace with the server's state.
	 * This happens when the client's clock is too old and we've lost tombstone history.
	 */
	wipeAll: boolean
}

/**
 * Loads a snapshot into storage during a transaction.
 * Migrates the snapshot to the current schema and loads it into storage.
 *
 * @public
 * @param txn - The transaction to load the snapshot into
 * @param schema - The current schema
 * @param snapshot - The snapshot to load
 */
export function loadSnapshotIntoStorage<R extends UnknownRecord>(
	txn: TLSyncStorageTransaction<R>,
	schema: StoreSchema<R, any>,
	snapshot: RoomSnapshot | TLStoreSnapshot
) {
	snapshot = convertStoreSnapshotToRoomSnapshot(snapshot)
	assert(snapshot.schema, 'Schema is required')
	const docIds = new Set<string>()
	for (const doc of snapshot.documents) {
		docIds.add(doc.state.id)
		const existing = txn.get(doc.state.id)
		if (isEqual(existing, doc.state)) continue
		txn.set(doc.state.id, doc.state as R)
	}
	for (const id of txn.keys()) {
		if (!docIds.has(id)) {
			txn.delete(id)
		}
	}
	txn.setSchema(snapshot.schema)
	schema.migrateStorage(txn)
}

export function convertStoreSnapshotToRoomSnapshot(
	snapshot: RoomSnapshot | TLStoreSnapshot
): RoomSnapshot {
	if ('documents' in snapshot) return snapshot
	return {
		clock: 0,
		documentClock: 0,
		documents: objectMapValues(snapshot.store).map((state) => ({
			state,
			lastChangedClock: 0,
		})),
		schema: snapshot.schema,
		tombstones: {},
	}
}

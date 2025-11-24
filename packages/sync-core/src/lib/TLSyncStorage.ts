import { SynchronousStorage, UnknownRecord } from '../../../store/src'

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
	 * This must not be called during a transaction.
	 *
	 * @param sinceClock - The clock time to get changes since
	 * ```
	 */
	getChangesSince(sinceClock: number): TLSyncStorageGetChangesSinceResult<R>
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
}

/**
 * Pluggable synchronous transactional storage layer for TLSyncRoom.
 * Provides methods for managing documents, tombstones, and clocks within transactions.
 *
 * @public
 */
export interface TLSyncStorage<R extends UnknownRecord> {
	transaction<T>(
		callback: (txn: TLSyncStorageTransaction<R>) => T,
		opts?: TLSyncStorageTransactionOptions
	): TLSyncStorageTransactionResult<T>

	getClock(): number

	onChange(callback: (arg: TLSyncStorageOnChangeCallbackProps) => unknown): () => void
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

export interface TLSyncStorageTransactionResult<T> {
	documentClock: number
	didChange: boolean
	result: T
}

export interface TLSyncStorageGetChangesSinceResult<R extends UnknownRecord> {
	puts: Iterable<R>
	deletes: Iterable<string>
	wipeAll: boolean
}

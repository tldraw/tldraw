import { stringEnum } from '@tldraw/utils'
import { UnknownRecord } from './BaseRecord'

/**
 * Standard metadata keys used by TLSyncRoom.
 *
 * @internal
 */
export const MetadataKeys = stringEnum('schema')

/**
 * Transaction interface for storage operations. Provides methods to read and modify
 * documents, tombstones, and metadata within a transaction.
 *
 * @public
 */
export interface TLPersistentStorageTransaction<R extends UnknownRecord> {
	/**
	 * Get the current clock value.
	 * If the clock has incremented during the transaction,
	 * the incremented value will be returned.
	 *
	 * @returns The current clock value
	 */
	getClock(): number

	/**
	 * Get a document by ID.
	 *
	 * @param id - The document ID
	 * @returns The document state and clock, or undefined if not found
	 */
	getDocument(id: string): { state: R; lastChangedClock: number } | undefined

	/**
	 * Set a document. Overwrites existing document if present.
	 * Automatically clears any existing tombstone for this document.
	 *
	 * @param id - The document ID
	 * @param state - The document state
	 * @param clock - The clock value when the document was last changed
	 */
	setDocument(id: string, state: R): void

	/**
	 * Delete a document by ID. Automatically creates a tombstone internally.
	 * The tombstone will be used by getChangesSince() to track deletions.
	 *
	 * @param id - The document ID
	 * @param clock - The clock value when the document was deleted
	 */
	deleteDocument(id: string): void

	/**
	 * Iterate over all documents.
	 *
	 * @returns Iterator of [id, { state, lastChangedClock }] pairs
	 */
	documents(): IterableIterator<[string, { state: R; lastChangedClock: number }]>

	/**
	 * Iterate over all document keys.
	 *
	 * @returns Iterator of document IDs
	 */
	documentIds(): IterableIterator<string>

	/**
	 * Get a metadata value by key. Returns the stored string value, or null if not found.
	 * Like localStorage.getItem().
	 *
	 * @param key - The metadata key
	 * @returns The metadata value as a string, or null if not found
	 */
	getMetadata(key: string): string | null

	/**
	 * Set a metadata value by key. Stores the value as a string.
	 * Like localStorage.setItem().
	 *
	 * @param key - The metadata key
	 * @param value - The metadata value (will be converted to string)
	 */
	setMetadata(key: string, value: string): void

	/**
	 * Get all changes (document updates and deletions) since a given clock time.
	 * This is the main method for calculating diffs for client sync.
	 * This must not be called during a transaction.
	 *
	 * @param sinceClock - The clock time to get changes since
	 * ```
	 */
	getChangesSince(sinceClock: number): Iterable<TLPersistentStorageChange<R>>
}

/**
 * Pluggable synchronous transactional storage layer for TLSyncRoom.
 * Provides methods for managing documents, tombstones, and clocks within transactions.
 *
 * @public
 */
export interface TLPersistentStorage<R extends UnknownRecord> {
	/**
	 * Execute a transaction. All storage operations within the callback are atomic.
	 * If the callback throws, all changes are reverted.
	 *
	 * @param callback - Function that receives a transaction object
	 * @returns The return value of the callback
	 *
	 * @example
	 * ```ts
	 * storage.transaction((txn) => {
	 *   const doc = txn.getDocument('id')
	 *   txn.setDocument('id', newState, clock)
	 * })
	 * ```
	 */
	transaction<T>(
		callback: (txn: TLPersistentStorageTransaction<R>) => T
	): TLPersistentStorageTransactionResult<T>
}

export interface TLPersistentStorageTransactionResult<T> {
	documentClock: number
	didChange: boolean
	result: T
}

export type TLPersistentStorageChange<R extends UnknownRecord> =
	| [TLPersistentStorageChangeOp.PUT, R]
	| [TLPersistentStorageChangeOp.DELETE, string]
	| [TLPersistentStorageChangeOp.WIPE_ALL]

/**
 * Enum representing the type of change that occurred.
 */
export enum TLPersistentStorageChangeOp {
	WIPE_ALL = 0,
	PUT = 1,
	DELETE = 2,
}

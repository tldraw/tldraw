import { transaction } from '@tldraw/state'
import { IdOf, RecordType, UnknownRecord } from '@tldraw/store'
import { Result } from '@tldraw/utils'
import { DocumentState } from './TLSyncRoom'
import { RoomSnapshot } from './TLSyncRoom'

/**
 * Interface for synchronous transactional storage used by TLSyncRoom.
 * Implementations can use SQLite (Cloudflare, Node, Bun, Deno) or in-memory storage.
 *
 * All operations must be synchronous and support rollback within transactions.
 *
 * @public
 */
export interface TLSyncStorage<R extends UnknownRecord> {
	/**
	 * Begin a new transaction. All operations within the transaction callback
	 * must be atomic - either all succeed or all are rolled back.
	 *
	 * @param callback - Function containing storage operations
	 * @param rollback - Function to call if transaction should be rolled back
	 * @returns Result of the transaction callback
	 */
	transaction<T>(
		callback: (tx: TLSyncStorageTransaction<R>) => T,
		rollback: () => void
	): T

	/**
	 * Get the current clock value (incremented on each push request)
	 */
	getClock(): number

	/**
	 * Increment and return the new clock value
	 */
	incrementClock(): number

	/**
	 * Set the clock value
	 */
	setClock(value: number): void

	/**
	 * Get the document clock (last time document data changed)
	 */
	getDocumentClock(): number

	/**
	 * Set the document clock
	 */
	setDocumentClock(value: number): void

	/**
	 * Get the tombstone history start clock
	 */
	getTombstoneHistoryStartsAtClock(): number

	/**
	 * Set the tombstone history start clock
	 */
	setTombstoneHistoryStartsAtClock(value: number): void

	/**
	 * Get all documents for snapshot generation
	 * Returns documents that match document types (filtered by caller)
	 */
	getAllDocuments(): Array<{ state: R; lastChangedClock: number }>

	/**
	 * Get all tombstones for snapshot generation
	 */
	getAllTombstones(): Record<string, number>

	/**
	 * Initialize storage from a snapshot (constructor-time only)
	 */
	initializeFromSnapshot(snapshot: RoomSnapshot, documentTypes: Set<string>, schema: any): void
}

/**
 * Transaction interface for making atomic storage operations.
 * All methods operate within the current transaction context.
 *
 * @public
 */
export interface TLSyncStorageTransaction<R extends UnknownRecord> {
	/**
	 * Get a document by ID, or null if not found
	 */
	getDocument(id: string): DocumentState<R> | null

	/**
	 * Set or update a document with its last changed clock
	 * Validates the record using the provided recordType
	 */
	setDocument(
		id: string,
		state: R,
		lastChangedClock: number,
		recordType: RecordType<R, any>
	): Result<void, Error>

	/**
	 * Delete a document
	 */
	deleteDocument(id: string): void

	/**
	 * Check if a tombstone exists for the given ID
	 */
	hasTombstone(id: string): boolean

	/**
	 * Set a tombstone with deletion clock
	 */
	setTombstone(id: string, deletedAtClock: number): void

	/**
	 * Delete a tombstone
	 */
	deleteTombstone(id: string): void

	/**
	 * Delete multiple tombstones at once
	 */
	deleteTombstones(ids: string[]): void

	/**
	 * Iterate over all documents
	 */
	iterateDocuments(): IterableIterator<[string, DocumentState<R>]>

	/**
	 * Iterate over all documents (values only)
	 */
	iterateDocumentValues(): IterableIterator<DocumentState<R>>

	/**
	 * Iterate over all document keys
	 */
	iterateDocumentKeys(): IterableIterator<string>

	/**
	 * Iterate over all tombstones (entries)
	 */
	iterateTombstones(): IterableIterator<[string, number]>

	/**
	 * Iterate over all tombstone clocks (values only)
	 */
	iterateTombstoneClocks(): IterableIterator<number>

	/**
	 * Query documents that changed after a given clock value
	 */
	getDocumentsChangedAfter(clock: number): Array<DocumentState<R>>

	/**
	 * Query tombstones that were deleted after a given clock value
	 */
	getTombstonesDeletedAfter(clock: number): Array<[string, number]>

	/**
	 * Get minimum tombstone clock value (for finding tombstoneHistoryStartsAtClock)
	 */
	getMinTombstoneClock(): number | null

	/**
	 * Get count of tombstones
	 */
	getTombstoneCount(): number
}


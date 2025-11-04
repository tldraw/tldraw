import { transaction } from '@tldraw/state'
import { AtomMap, RecordType, UnknownRecord } from '@tldraw/store'
import { assertExists, getOwnProperty, objectMapEntriesIterable, Result } from '@tldraw/utils'
import { DocumentState, RoomSnapshot } from './TLSyncRoom'
import { TLSyncStorage, TLSyncStorageTransaction } from './TLSyncStorage'
import { findMin } from './findMin'

/**
 * In-memory implementation of TLSyncStorage using AtomMap.
 * This is the default storage implementation for TLSyncRoom.
 *
 * @public
 */
export class InMemorySyncStorage<R extends UnknownRecord> implements TLSyncStorage<R> {
	private documents: AtomMap<string, DocumentState<R>>
	private tombstones: AtomMap<string, number>
	private clock: number
	private documentClock: number
	private tombstoneHistoryStartsAtClock: number

	constructor() {
		this.documents = new AtomMap('room documents')
		this.tombstones = new AtomMap('room tombstones')
		this.clock = 0
		this.documentClock = 0
		this.tombstoneHistoryStartsAtClock = 0
	}

	transaction<T>(callback: (tx: TLSyncStorageTransaction<R>) => T, rollback: () => void): T {
		return transaction((rollbackFn) => {
			try {
				const tx = new InMemoryStorageTransaction(this)
				return callback(tx)
			} catch (error) {
				rollbackFn()
				rollback()
				throw error
			}
		})
	}

	getClock(): number {
		return this.clock
	}

	incrementClock(): number {
		this.clock++
		return this.clock
	}

	setClock(value: number): void {
		this.clock = value
	}

	getDocumentClock(): number {
		return this.documentClock
	}

	setDocumentClock(value: number): void {
		this.documentClock = value
	}

	getTombstoneHistoryStartsAtClock(): number {
		return this.tombstoneHistoryStartsAtClock
	}

	setTombstoneHistoryStartsAtClock(value: number): void {
		this.tombstoneHistoryStartsAtClock = value
	}

	getAllDocuments(): Array<{ state: R; lastChangedClock: number }> {
		const documents: Array<{ state: R; lastChangedClock: number }> = []
		for (const doc of this.documents.values()) {
			documents.push({
				state: doc.state,
				lastChangedClock: doc.lastChangedClock,
			})
		}
		return documents
	}

	getAllTombstones(): Record<string, number> {
		return Object.fromEntries(this.tombstones.entries())
	}

	initializeFromSnapshot(snapshot: RoomSnapshot, documentTypes: Set<string>, schema: any): void {
		this.clock = snapshot.clock
		this.documentClock = snapshot.documentClock ?? snapshot.clock

		this.tombstones = new AtomMap(
			'room tombstones',
			objectMapEntriesIterable(snapshot.tombstones ?? {})
		)

		this.documents = new AtomMap(
			'room documents',
			(function* () {
				for (const doc of snapshot.documents) {
					if (documentTypes.has(doc.state.typeName)) {
						yield [
							doc.state.id,
							DocumentState.createWithoutValidating<R>(
								doc.state as R,
								doc.lastChangedClock,
								assertExists(getOwnProperty(schema.types, doc.state.typeName))
							),
						] as const
					}
				}
			})()
		)

		this.tombstoneHistoryStartsAtClock =
			snapshot.tombstoneHistoryStartsAtClock ?? findMin(this.tombstones.values()) ?? this.clock

		if (this.tombstoneHistoryStartsAtClock === 0) {
			// Before this comment was added, new clients would send '0' as their 'lastServerClock'
			// which was technically an error because clocks start at 0, but the error didn't manifest
			// because we initialized tombstoneHistoryStartsAtClock to 1 and then never updated it.
			// Now that we handle tombstoneHistoryStartsAtClock properly we need to increment it here to make sure old
			// clients still get data when they connect. This if clause can be deleted after a few months.
			this.tombstoneHistoryStartsAtClock++
		}
	}

	// Internal methods for transaction access
	getDocumentInternal(id: string): DocumentState<R> | null {
		return this.documents.get(id) ?? null
	}

	setDocumentInternal(id: string, doc: DocumentState<R>): void {
		this.documents.set(id, doc)
	}

	deleteDocumentInternal(id: string): void {
		this.documents.delete(id)
	}

	hasTombstoneInternal(id: string): boolean {
		return this.tombstones.has(id)
	}

	setTombstoneInternal(id: string, clock: number): void {
		this.tombstones.set(id, clock)
	}

	deleteTombstoneInternal(id: string): void {
		this.tombstones.delete(id)
	}

	deleteTombstonesInternal(ids: string[]): void {
		this.tombstones.deleteMany(ids)
	}

	iterateDocumentsInternal(): IterableIterator<[string, DocumentState<R>]> {
		return this.documents.entries()
	}

	iterateDocumentValuesInternal(): IterableIterator<DocumentState<R>> {
		return this.documents.values()
	}

	iterateDocumentKeysInternal(): IterableIterator<string> {
		return this.documents.keys()
	}

	iterateTombstonesInternal(): IterableIterator<[string, number]> {
		return this.tombstones.entries()
	}

	iterateTombstoneClocksInternal(): IterableIterator<number> {
		return this.tombstones.values()
	}

	getTombstoneCountInternal(): number {
		return this.tombstones.size
	}
}

class InMemoryStorageTransaction<R extends UnknownRecord> implements TLSyncStorageTransaction<R> {
	constructor(private readonly storage: InMemorySyncStorage<R>) {}

	getDocument(id: string): DocumentState<R> | null {
		return this.storage.getDocumentInternal(id)
	}

	setDocument(
		id: string,
		state: R,
		lastChangedClock: number,
		recordType: RecordType<R, any>
	): Result<void, Error> {
		const createResult = DocumentState.createAndValidate(state, lastChangedClock, recordType)
		if (!createResult.ok) return createResult
		this.storage.setDocumentInternal(id, createResult.value)
		return Result.ok(undefined)
	}

	deleteDocument(id: string): void {
		this.storage.deleteDocumentInternal(id)
	}

	hasTombstone(id: string): boolean {
		return this.storage.hasTombstoneInternal(id)
	}

	setTombstone(id: string, deletedAtClock: number): void {
		this.storage.setTombstoneInternal(id, deletedAtClock)
	}

	deleteTombstone(id: string): void {
		this.storage.deleteTombstoneInternal(id)
	}

	deleteTombstones(ids: string[]): void {
		this.storage.deleteTombstonesInternal(ids)
	}

	iterateDocuments(): IterableIterator<[string, DocumentState<R>]> {
		return this.storage.iterateDocumentsInternal()
	}

	iterateDocumentValues(): IterableIterator<DocumentState<R>> {
		return this.storage.iterateDocumentValuesInternal()
	}

	iterateDocumentKeys(): IterableIterator<string> {
		return this.storage.iterateDocumentKeysInternal()
	}

	iterateTombstones(): IterableIterator<[string, number]> {
		return this.storage.iterateTombstonesInternal()
	}

	iterateTombstoneClocks(): IterableIterator<number> {
		return this.storage.iterateTombstoneClocksInternal()
	}

	getDocumentsChangedAfter(clock: number): Array<DocumentState<R>> {
		const result: Array<DocumentState<R>> = []
		for (const doc of this.storage.iterateDocumentValuesInternal()) {
			if (doc.lastChangedClock > clock) {
				result.push(doc)
			}
		}
		return result
	}

	getTombstonesDeletedAfter(clock: number): Array<[string, number]> {
		const result: Array<[string, number]> = []
		for (const [id, deletedAtClock] of this.storage.iterateTombstonesInternal()) {
			if (deletedAtClock > clock) {
				result.push([id, deletedAtClock])
			}
		}
		return result
	}

	getMinTombstoneClock(): number | null {
		return findMin(this.storage.iterateTombstoneClocksInternal())
	}

	getTombstoneCount(): number {
		return this.storage.getTombstoneCountInternal()
	}
}

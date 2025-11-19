import {
	devFreeze,
	MetadataKeys,
	StoreSchema,
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
	TLStoreSnapshot,
} from '@tldraw/tlschema'
import {
	assert,
	ExecutionQueue,
	IndexKey,
	isEqual,
	objectMapEntries,
	objectMapValues,
	throttle,
} from '@tldraw/utils'
import { RoomSnapshot } from './TLSyncRoom'
import { ReadonlyValue, TransactionMap, TransactionValue } from './TransactionMap'

const TOMBSTONE_PRUNE_BUFFER_SIZE = 1000
const MAX_TOMBSTONES = 5000

export const DEFAULT_INITIAL_SNAPSHOT = {
	clock: 0,
	documentClock: 0,
	schema: createTLSchema().serialize(),
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
 * In-memory implementation of TLSyncStorage using AtomMap for documents and tombstones,
 * and atoms for clock values. This is the default storage implementation used by TLSyncRoom.
 *
 * @public
 */
export class InMemorySyncStorage<R extends UnknownRecord> implements TLPersistentStorage<R> {
	/** @internal */
	documents: ReadonlyMap<string, { state: R; lastChangedClock: number }>
	/** @internal */
	tombstones: ReadonlyMap<string, number>
	/** @internal */
	metadata: ReadonlyMap<string, string>
	/** @internal */
	documentClock: ReadonlyValue<number>
	/** @internal */
	tombstoneHistoryStartsAtClock: ReadonlyValue<number>

	private listeners = new Set<(source: string, documentClock: number) => void>()
	onChange(callback: (arg: { source: string; documentClock: number }) => void): () => void {
		const cb = (source: string, documentClock: number) => callback({ source, documentClock })
		this.listeners.add(cb)
		return () => {
			this.listeners.delete(cb)
		}
	}

	constructor(snapshot: RoomSnapshot = DEFAULT_INITIAL_SNAPSHOT) {
		assert(snapshot.schema, 'Schema is required')
		this.documents = new Map(
			snapshot.documents.map((d) => [
				d.state.id,
				{ state: devFreeze(d.state) as R, lastChangedClock: d.lastChangedClock },
			])
		)
		this.metadata = new Map([[MetadataKeys.schema, JSON.stringify(snapshot.schema)]])
		const documentClock = snapshot.documentClock ?? snapshot.clock ?? 0
		const tombstoneHistoryStartsAtClock = snapshot.tombstoneHistoryStartsAtClock ?? documentClock
		this.documentClock = new ReadonlyValue(documentClock)
		this.tombstoneHistoryStartsAtClock = new ReadonlyValue(tombstoneHistoryStartsAtClock)
		this.tombstones = new Map(
			// If the tombstone history starts now (or we didn't have the
			// tombstoneHistoryStartsAtClock) then there are no tombstones
			tombstoneHistoryStartsAtClock === documentClock
				? []
				: objectMapEntries(snapshot.tombstones ?? {})
		)
	}

	private txnQueue = new ExecutionQueue()

	async transaction<T>(
		source: string,
		callback: (txn: TLPersistentStorageTransaction<R>) => Promise<T>
	): Promise<TLPersistentStorageTransactionResult<T>> {
		return this.txnQueue.push(async () => {
			const clockBefore = this.documentClock.get()
			const result = await TransactionMap.transact(
				{
					documents: this.documents,
					tombstones: this.tombstones,
					metadata: this.metadata,
					documentClock: this.documentClock,
					tombstoneHistoryStartsAtClock: this.tombstoneHistoryStartsAtClock,
				},
				async ({
					documents,
					tombstones,
					metadata,
					documentClock,
					tombstoneHistoryStartsAtClock,
				}) => {
					const txn = new InMemorySyncStorageTransaction<R>({
						documents,
						tombstones,
						metadata,
						documentClock,
						tombstoneHistoryStartsAtClock,
						pruneTombstones: this.pruneTombstones,
					})
					return await callback(txn)
				}
			)

			const clockAfter = this.documentClock.get()
			const didChange = clockAfter > clockBefore
			if (didChange) {
				// todo: batch these updates
				for (const listener of this.listeners) {
					listener(source, clockAfter)
				}
			}
			return { documentClock: clockAfter, didChange: clockAfter > clockBefore, result }
		})
	}

	async getClock(): Promise<number> {
		return this.documentClock.get()
	}

	/** @internal */
	pruneTombstones = throttle(
		() => {
			if (this.tombstones.size > MAX_TOMBSTONES) {
				TransactionMap.transact(
					{
						tombstoneHistoryStartsAtClock: this.tombstoneHistoryStartsAtClock,
						tombstones: this.tombstones,
					},
					async ({ tombstoneHistoryStartsAtClock, tombstones }) => {
						// sort entries in ascending order by clock
						const sortedTombstones = Array.from(tombstones.entries()).sort((a, b) => b[1] - a[1])
						// avoid having partial history for the earliest clock value by trimming dupes
						let cutoff = TOMBSTONE_PRUNE_BUFFER_SIZE
						while (
							cutoff < sortedTombstones.length &&
							sortedTombstones[cutoff - 1][1] === sortedTombstones[cutoff][1]
						) {
							cutoff++
						}

						tombstoneHistoryStartsAtClock.set(
							sortedTombstones[cutoff][1] ?? this.documentClock.get()
						)
						// now remove the old tombstones
						sortedTombstones.length = cutoff
						tombstones.deleteMany(sortedTombstones.map(([id]) => id))
					}
				)
			}
		},
		1000,
		// prevent this from running synchronously to avoid blocking requests
		{ leading: false }
	)
}

async function* asyncIterator<T>(iterator: Iterable<T>): AsyncIterable<T> {
	for (const item of iterator) {
		yield item
	}
}

/**
 * Transaction implementation for InMemorySyncStorage.
 * Provides access to documents, tombstones, and metadata within a transaction.
 *
 * @internal
 */
class InMemorySyncStorageTransaction<R extends UnknownRecord>
	implements TLPersistentStorageTransaction<R>
{
	private _clock
	constructor(
		private storage: {
			documents: TransactionMap<string, { state: R; lastChangedClock: number }>
			tombstones: TransactionMap<string, number>
			metadata: TransactionMap<string, string>
			documentClock: TransactionValue<number>
			tombstoneHistoryStartsAtClock: TransactionValue<number>
			pruneTombstones(): any
		}
	) {
		this._clock = this.storage.documentClock.get()
	}

	async getClock(): Promise<number> {
		return this._clock
	}

	private didIncrementClock: boolean = false
	private getNextClock(): number {
		if (!this.didIncrementClock) {
			this.didIncrementClock = true
			this._clock++
			this.storage.documentClock.set(this._clock)
		}
		return this._clock
	}

	async getDocument(id: string): Promise<{ state: R; lastChangedClock: number } | undefined> {
		return this.storage.documents.get(id)
	}

	async setDocument(id: string, state: R) {
		const clock = this.getNextClock()
		// Automatically clear tombstone if it exists
		if (this.storage.tombstones.has(id)) {
			this.storage.tombstones.delete(id)
		}
		this.storage.documents.set(id, { state: devFreeze(state), lastChangedClock: clock })
	}

	async deleteDocument(id: string) {
		const clock = this.getNextClock()
		this.storage.documents.delete(id)
		this.storage.tombstones.set(id, clock)
		this.storage.pruneTombstones()
	}

	async documents(): Promise<AsyncIterable<[string, { state: R; lastChangedClock: number }]>> {
		return asyncIterator(this.storage.documents.entries())
	}

	async documentIds(): Promise<AsyncIterable<string>> {
		return asyncIterator(this.storage.documents.keys())
	}

	async getMetadata(key: string): Promise<string | null> {
		return this.storage.metadata.get(key) ?? null
	}

	async setMetadata(key: string, value: string): Promise<void> {
		this.storage.metadata.set(key, value)
	}

	async getChangesSince(sinceClock: number): Promise<AsyncIterable<TLPersistentStorageChange<R>>> {
		const changes: TLPersistentStorageChange<R>[] = []
		if (sinceClock < this.storage.tombstoneHistoryStartsAtClock.get()) {
			sinceClock = 0
			changes.push([TLPersistentStorageChangeOp.WIPE_ALL])
		}
		for (const doc of this.storage.documents.values()) {
			if (doc.lastChangedClock > sinceClock) {
				changes.push([TLPersistentStorageChangeOp.PUT, doc.state])
			}
		}
		for (const [id, clock] of this.storage.tombstones.entries()) {
			if (clock > sinceClock) {
				changes.push([TLPersistentStorageChangeOp.DELETE, id])
			}
		}
		return asyncIterator(changes)
	}
}

export async function loadSnapshotIntoStorage<R extends UnknownRecord>(
	storage: TLPersistentStorage<R>,
	schema: StoreSchema<R, any>,
	snapshot: RoomSnapshot,
	source: string
) {
	return await storage.transaction(source, async (txn) => {
		const docIds = new Set<string>()
		for (const doc of snapshot.documents) {
			docIds.add(doc.state.id)
			const existing = await txn.getDocument(doc.state.id)
			if (isEqual(existing?.state, doc.state)) continue
			await txn.setDocument(doc.state.id, doc.state as R)
		}
		for await (const id of await txn.documentIds()) {
			if (!docIds.has(id)) {
				await txn.deleteDocument(id)
			}
		}
		await txn.setMetadata(MetadataKeys.schema, JSON.stringify(snapshot.schema))
		await schema.migratePersistentStorageTxn(txn)
	})
}

export function getSnapshotFromInMemoryStorage<R extends UnknownRecord>(
	storage: InMemorySyncStorage<R>
): RoomSnapshot {
	return {
		tombstoneHistoryStartsAtClock: storage.tombstoneHistoryStartsAtClock.get(),
		documentClock: storage.documentClock.get(),
		documents: Array.from(storage.documents.values()),
		tombstones: Object.fromEntries(storage.tombstones.entries()),
		schema: JSON.parse(storage.metadata.get(MetadataKeys.schema) ?? '{}'),
	} satisfies RoomSnapshot
}

export function convertStoreSnapshotToRoomSnapshot(snapshot: TLStoreSnapshot): RoomSnapshot {
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

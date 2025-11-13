import { atom, Atom, transaction } from '@tldraw/state'
import {
	AtomMap,
	devFreeze,
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
import { assert, IndexKey, objectMapEntries, throttle } from '@tldraw/utils'
import { RoomSnapshot } from './TLSyncRoom'

const TOMBSTONE_PRUNE_BUFFER_SIZE = 1000
const MAX_TOMBSTONES = 5000

const DEFAULT_INITIAL_SNAPSHOT = {
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
	documents: AtomMap<string, { state: R; lastChangedClock: number }>
	/** @internal */
	tombstones: AtomMap<string, number>
	/** @internal */
	metadata: AtomMap<string, string>
	/** @internal */
	documentClock: Atom<number>
	/** @internal */
	tombstoneHistoryStartsAtClock: Atom<number>

	constructor(snapshot: RoomSnapshot = DEFAULT_INITIAL_SNAPSHOT) {
		assert(snapshot.schema, 'Schema is required')
		this.documents = new AtomMap(
			'room documents',
			snapshot.documents.map((d) => [
				d.state.id,
				{ state: devFreeze(d.state) as R, lastChangedClock: d.lastChangedClock },
			])
		)
		this.metadata = new AtomMap('room metadata')
		const documentClock = snapshot.documentClock ?? snapshot.clock ?? 0
		this.documentClock = atom('document clock', documentClock)
		const tombstoneHistoryStartsAtClock = snapshot.tombstoneHistoryStartsAtClock ?? documentClock
		this.tombstoneHistoryStartsAtClock = atom(
			'tombstone history starts at clock',
			tombstoneHistoryStartsAtClock
		)
		this.tombstones = new AtomMap(
			'room tombstones',
			// If the tombstone history starts now (or we didn't have the
			// tombstoneHistoryStartsAtClock) then there are no tombstones
			tombstoneHistoryStartsAtClock === documentClock
				? []
				: objectMapEntries(snapshot.tombstones ?? {})
		)
		this.metadata.set(MetadataKeys.schema, JSON.stringify(snapshot.schema))
	}

	transaction<T>(
		callback: (txn: TLPersistentStorageTransaction<R>) => T
	): TLPersistentStorageTransactionResult<T> {
		const clockBefore = this.documentClock.get()
		const result = transaction(() => {
			const txn = new InMemorySyncStorageTransaction<R>(this)
			return callback(txn)
		})

		const clockAfter = this.documentClock.get()
		return { documentClock: clockAfter, didChange: clockAfter > clockBefore, result }
	}

	getChangesSince(sinceClock: number): Iterable<TLPersistentStorageChange<R>> {
		const changes: TLPersistentStorageChange<R>[] = []
		if (sinceClock < this.tombstoneHistoryStartsAtClock.get()) {
			sinceClock = 0
			changes.push([TLPersistentStorageChangeOp.WIPE_ALL])
		}
		for (const doc of this.documents.values()) {
			if (doc.lastChangedClock > sinceClock) {
				changes.push([TLPersistentStorageChangeOp.PUT, doc.state])
			}
		}
		for (const [id, clock] of this.tombstones.entries()) {
			if (clock > sinceClock) {
				changes.push([TLPersistentStorageChangeOp.DELETE, id])
			}
		}
		return changes
	}

	/** @internal */
	pruneTombstones = throttle(
		() => {
			if (this.tombstones.size > MAX_TOMBSTONES) {
				const tombstones = Array.from(this.tombstones)
				// sort entries in ascending order by clock
				tombstones.sort((a, b) => b[1] - a[1])
				// avoid having partial history for the earliest clock value by trimming dupes
				let cutoff = TOMBSTONE_PRUNE_BUFFER_SIZE
				while (cutoff < tombstones.length && tombstones[cutoff - 1][1] === tombstones[cutoff][1]) {
					cutoff++
				}

				this.tombstoneHistoryStartsAtClock.set(tombstones[cutoff][1] ?? this.documentClock.get())
				// now remove the old tombstones
				tombstones.length = cutoff
				this.tombstones.deleteMany(tombstones.map(([id]) => id))
			}
		},
		1000,
		// prevent this from running synchronously to avoid blocking requests
		{ leading: false }
	)
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
	constructor(private storage: InMemorySyncStorage<R>) {
		this._clock = this.storage.documentClock.get()
	}

	getClock(): number {
		return this._clock
	}

	private didIncrementClock: boolean = false
	private getNextClock(): number {
		if (!this.didIncrementClock) {
			this.didIncrementClock = true
			this._clock = this.storage.documentClock.set(this.storage.documentClock.get() + 1)
		}
		return this._clock
	}

	getDocument(id: string): { state: R; lastChangedClock: number } | undefined {
		return this.storage.documents.get(id)
	}

	setDocument(id: string, state: R): void {
		const clock = this.getNextClock()
		// Automatically clear tombstone if it exists
		if (this.storage.tombstones.has(id)) {
			this.storage.tombstones.delete(id)
		}
		this.storage.documents.set(id, { state: devFreeze(state), lastChangedClock: clock })
	}

	deleteDocument(id: string): void {
		const clock = this.getNextClock()
		this.storage.documents.delete(id)
		this.storage.tombstones.set(id, clock)
		this.storage.pruneTombstones()
	}

	documents(): IterableIterator<[string, { state: R; lastChangedClock: number }]> {
		return this.storage.documents.entries()
	}

	documentIds(): IterableIterator<string> {
		return this.storage.documents.keys()
	}

	getMetadata(key: string): string | null {
		return this.storage.metadata.get(key) ?? null
	}

	setMetadata(key: string, value: string): void {
		this.storage.metadata.set(key, value)
	}

	tombstones(): IterableIterator<[string, number]> {
		return this.storage.tombstones.entries()
	}

	getChangesSince(sinceClock: number): Iterable<TLPersistentStorageChange<R>> {
		return this.storage.getChangesSince(sinceClock)
	}
}

import { atom, Atom, transaction } from '@tldraw/state'
import { AtomMap, devFreeze, SerializedSchema, StoreSchema, UnknownRecord } from '@tldraw/store'
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
	IndexKey,
	isEqual,
	objectMapEntries,
	objectMapValues,
	throttle,
} from '@tldraw/utils'
import { RoomSnapshot } from './TLSyncRoom'
import {
	TLSyncStorage,
	TLSyncStorageGetChangesSinceResult,
	TLSyncStorageOnChangeCallbackProps,
	TLSyncStorageTransaction,
	TLSyncStorageTransactionOptions,
	TLSyncStorageTransactionResult,
} from './TLSyncStorage'

const TOMBSTONE_PRUNE_BUFFER_SIZE = 1000
const MAX_TOMBSTONES = 5000

export const DEFAULT_INITIAL_SNAPSHOT = {
	clock: 0,
	documentClock: 0,
	tombstoneHistoryStartsAtClock: 0,
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
export class InMemorySyncStorage<R extends UnknownRecord> implements TLSyncStorage<R> {
	/** @internal */
	documents: AtomMap<string, { state: R; lastChangedClock: number }>
	/** @internal */
	tombstones: AtomMap<string, number>
	/** @internal */
	schema: Atom<SerializedSchema>
	/** @internal */
	documentClock: Atom<number>
	/** @internal */
	tombstoneHistoryStartsAtClock: Atom<number>

	private listeners = new Set<(arg: TLSyncStorageOnChangeCallbackProps) => unknown>()
	onChange(callback: (arg: TLSyncStorageOnChangeCallbackProps) => unknown): () => void {
		let didDelete = false
		// we put the callback registration in a microtask because the callback is invoked
		// in a microtask, and so this makes sure the callback is invoked after all the updates
		// that happened in the current callstack before this onChange registration have been processed.
		queueMicrotask(() => {
			if (didDelete) return
			this.listeners.add(callback)
		})
		return () => {
			if (didDelete) return
			didDelete = true
			this.listeners.delete(callback)
		}
	}

	constructor({ snapshot }: { snapshot: RoomSnapshot }) {
		assert(snapshot.schema, 'Schema is required')
		this.documents = new AtomMap(
			'room documents',
			snapshot.documents.map((d) => [
				d.state.id,
				{ state: devFreeze(d.state) as R, lastChangedClock: d.lastChangedClock },
			])
		)
		const documentClock = snapshot.documentClock ?? snapshot.clock ?? 0
		this.documentClock = atom('document clock', documentClock)
		const tombstoneHistoryStartsAtClock = snapshot.tombstoneHistoryStartsAtClock ?? documentClock
		this.tombstoneHistoryStartsAtClock = atom(
			'tombstone history starts at clock',
			tombstoneHistoryStartsAtClock
		)
		this.schema = atom('schema', snapshot.schema)
		this.tombstones = new AtomMap(
			'room tombstones',
			// If the tombstone history starts now (or we didn't have the
			// tombstoneHistoryStartsAtClock) then there are no tombstones
			tombstoneHistoryStartsAtClock === documentClock
				? []
				: objectMapEntries(snapshot.tombstones ?? {})
		)
	}

	transaction<T>(
		callback: (txn: TLSyncStorageTransaction<R>) => T,
		opts?: TLSyncStorageTransactionOptions
	): TLSyncStorageTransactionResult<T> {
		const clockBefore = this.documentClock.get()
		const result = transaction(() => {
			const txn = new InMemorySyncStorageTransaction<R>(this)
			return callback(txn)
		})
		if (
			typeof result === 'object' &&
			result &&
			'then' in result &&
			typeof result.then === 'function'
		) {
			throw new Error('Transaction must return a value, not a promise')
		}

		const clockAfter = this.documentClock.get()
		const didChange = clockAfter > clockBefore
		if (didChange) {
			// todo: batch these updates
			queueMicrotask(() => {
				const props: TLSyncStorageOnChangeCallbackProps = {
					id: opts?.id,
					documentClock: clockAfter,
				}
				for (const listener of this.listeners) {
					listener(props)
				}
			})
		}
		return { documentClock: clockAfter, didChange: clockAfter > clockBefore, result }
	}

	getClock(): number {
		return this.documentClock.get()
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

	getSnapshot(): RoomSnapshot {
		return {
			tombstoneHistoryStartsAtClock: this.tombstoneHistoryStartsAtClock.get(),
			documentClock: this.documentClock.get(),
			documents: Array.from(this.documents.values()),
			tombstones: Object.fromEntries(this.tombstones.entries()),
			schema: this.schema.get(),
		}
	}
}

/**
 * Transaction implementation for InMemorySyncStorage.
 * Provides access to documents, tombstones, and metadata within a transaction.
 *
 * @internal
 */
class InMemorySyncStorageTransaction<R extends UnknownRecord>
	implements TLSyncStorageTransaction<R>
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

	get(id: string): R | undefined {
		return this.storage.documents.get(id)?.state
	}

	set(id: string, record: R): void {
		const clock = this.getNextClock()
		// Automatically clear tombstone if it exists
		if (this.storage.tombstones.has(id)) {
			this.storage.tombstones.delete(id)
		}
		this.storage.documents.set(id, { state: devFreeze(record), lastChangedClock: clock })
	}

	delete(id: string): void {
		const clock = this.getNextClock()
		this.storage.documents.delete(id)
		this.storage.tombstones.set(id, clock)
		this.storage.pruneTombstones()
	}

	*entries(): IterableIterator<[string, R]> {
		for (const [id, record] of this.storage.documents.entries()) {
			yield [id, record.state as R]
		}
	}

	keys(): IterableIterator<string> {
		return this.storage.documents.keys()
	}

	*values(): IterableIterator<R> {
		for (const record of this.storage.documents.values()) {
			yield record.state as R
		}
	}

	getSchema(): SerializedSchema {
		return this.storage.schema.get()
	}

	setSchema(schema: SerializedSchema): void {
		this.storage.schema.set(schema)
	}

	getChangesSince(sinceClock: number): TLSyncStorageGetChangesSinceResult<R> {
		const puts: R[] = []
		const deletes: string[] = []
		const wipeAll = sinceClock < this.storage.tombstoneHistoryStartsAtClock.get()
		for (const doc of this.storage.documents.values()) {
			if (wipeAll || doc.lastChangedClock > sinceClock) {
				puts.push(doc.state)
			}
		}
		for (const [id, clock] of this.storage.tombstones.entries()) {
			if (clock > sinceClock) {
				deletes.push(id)
			}
		}
		return { puts, deletes, wipeAll }
	}
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
	snapshot: RoomSnapshot
) {
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

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

/** @internal */
export const TOMBSTONE_PRUNE_BUFFER_SIZE = 1000
/** @internal */
export const MAX_TOMBSTONES = 5000

export const DEFAULT_INITIAL_SNAPSHOT = {
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
		const maxClockValue = Math.max(
			0,
			...Object.values(snapshot.tombstones ?? {}),
			...Object.values(snapshot.documents.map((d) => d.lastChangedClock))
		)
		this.documents = new AtomMap(
			'room documents',
			snapshot.documents.map((d) => [
				d.state.id,
				{ state: devFreeze(d.state) as R, lastChangedClock: d.lastChangedClock },
			])
		)
		const documentClock = Math.max(maxClockValue, snapshot.documentClock ?? snapshot.clock ?? 0)

		this.documentClock = atom('document clock', documentClock)
		// math.min to make sure the tombstone history starts at or before the document clock
		const tombstoneHistoryStartsAtClock = Math.min(
			snapshot.tombstoneHistoryStartsAtClock ?? documentClock,
			documentClock
		)
		this.tombstoneHistoryStartsAtClock = atom(
			'tombstone history starts at clock',
			tombstoneHistoryStartsAtClock
		)
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		this.schema = atom('schema', snapshot.schema ?? createTLSchema().serializeEarliestVersion())
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
		const txn = new InMemorySyncStorageTransaction<R>(this)
		let result: T
		try {
			result = transaction(() => {
				return callback(txn)
			})
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
				// sort entries in ascending order by clock (oldest first)
				tombstones.sort((a, b) => a[1] - b[1])
				// determine how many to delete, avoiding partial history for a clock value
				let cutoff = TOMBSTONE_PRUNE_BUFFER_SIZE + this.tombstones.size - MAX_TOMBSTONES
				while (cutoff < tombstones.length && tombstones[cutoff - 1][1] === tombstones[cutoff][1]) {
					cutoff++
				}

				// Set history start to the oldest remaining tombstone's clock
				// (or documentClock if we're deleting everything)
				const oldestRemaining = tombstones[cutoff]
				this.tombstoneHistoryStartsAtClock.set(oldestRemaining?.[1] ?? this.documentClock.get())

				// Delete the oldest tombstones (first cutoff entries)
				const toDelete = tombstones.slice(0, cutoff)
				this.tombstones.deleteMany(toDelete.map(([id]) => id))
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
	private _closed = false

	constructor(private storage: InMemorySyncStorage<R>) {
		this._clock = this.storage.documentClock.get()
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
		assert(id === record.id, `Record id mismatch: key does not match record.id`)
		const clock = this.getNextClock()
		// Automatically clear tombstone if it exists
		if (this.storage.tombstones.has(id)) {
			this.storage.tombstones.delete(id)
		}
		this.storage.documents.set(id, { state: devFreeze(record), lastChangedClock: clock })
	}

	delete(id: string): void {
		// Only create a tombstone if the record actually exists
		if (!this.storage.documents.has(id)) return
		const clock = this.getNextClock()
		this.storage.documents.delete(id)
		this.storage.tombstones.set(id, clock)
		this.storage.pruneTombstones()
	}

	*entries(): IterableIterator<[string, R]> {
		for (const [id, record] of this.storage.documents.entries()) {
			this.assertNotClosed()
			yield [id, record.state as R]
		}
	}

	*keys(): IterableIterator<string> {
		for (const key of this.storage.documents.keys()) {
			this.assertNotClosed()
			yield key
		}
	}

	*values(): IterableIterator<R> {
		for (const record of this.storage.documents.values()) {
			this.assertNotClosed()
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
		if (sinceClock > this.storage.documentClock.get()) {
			// something went wrong, wipe the slate clean
			sinceClock = -1
		}
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

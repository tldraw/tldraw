import { throttledRaf } from '@tldraw/utils'
import { atom, Atom, computed, Computed, Reactor, reactor, transact } from 'signia'
import { BaseRecord, ID } from './BaseRecord'
import { Cache } from './Cache'
import { devFreeze } from './devFreeze'
import { StoreQueries } from './StoreQueries'
import { StoreSchema } from './StoreSchema'

type RecFromId<K extends ID> = K extends ID<infer R> ? R : never

/**
 * A diff describing the changes to a record.
 *
 * @public
 */
export type RecordsDiff<R extends BaseRecord> = {
	added: Record<string, R>
	updated: Record<string, [from: R, to: R]>
	removed: Record<string, R>
}

/**
 * A diff describing the changes to a collection.
 *
 * @public
 */
export type CollectionDiff<T> = { added?: Set<T>; removed?: Set<T> }

/**
 * An entry containing changes that originated either by user actions or remote changes.
 *
 * @public
 */
export type HistoryEntry<R extends BaseRecord = BaseRecord> = {
	changes: RecordsDiff<R>
	source: 'user' | 'remote'
}

/**
 * A function that will be called when the history changes.
 *
 * @public
 */
export type StoreListener<R extends BaseRecord> = (entry: HistoryEntry<R>) => void

/**
 * A record store is a collection of records of different types.
 *
 * @public
 */
export type ComputedCache<Data, R extends BaseRecord> = {
	get(id: ID<R>): Data | undefined
}

/**
 * A serialized snapshot of the record store's values.
 *
 * @public
 */
export type StoreSnapshot<R extends BaseRecord> = Record<string, R>

/** @public */
export type StoreValidator<R extends BaseRecord> = {
	validate: (record: unknown) => R
}

/** @public */
export type StoreValidators<R extends BaseRecord> = {
	[K in R['typeName']]: StoreValidator<Extract<R, { typeName: K }>>
}

/** @public */
export type StoreError = {
	error: Error
	phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests'
	recordBefore?: unknown
	recordAfter: unknown
	isExistingValidationIssue: boolean
}

/** @internal */
export type StoreRecord<S extends Store<any>> = S extends Store<infer R> ? R : never

/**
 * A store of records.
 *
 * @public
 */
export class Store<R extends BaseRecord = BaseRecord, Props = unknown> {
	/**
	 * An atom containing the store's atoms.
	 *
	 * @internal
	 * @readonly
	 */
	private readonly atoms: Atom<Record<ID<R>, Atom<R>>> = atom('store_atoms', {})

	/**
	 * An atom containing the store's history.
	 *
	 * @public
	 * @readonly
	 */
	readonly history: Atom<number, RecordsDiff<R>> = atom('history', 0, {
		historyLength: 1000,
	})

	/**
	 * A StoreQueries instance for this store.
	 *
	 * @public
	 * @readonly
	 */
	readonly query = new StoreQueries<R>(this.atoms, this.history)

	/**
	 * A set containing listeners that have been added to this store.
	 *
	 * @internal
	 */
	private listeners = new Set<StoreListener<R>>()

	/**
	 * An array of history entries that have not yet been flushed.
	 *
	 * @internal
	 */
	private historyAccumulator = new HistoryAccumulator<R>()

	/**
	 * A reactor that responds to changes to the history by squashing the accumulated history and
	 * notifying listeners of the changes.
	 *
	 * @internal
	 */
	private historyReactor: Reactor

	readonly schema: StoreSchema<R, Props>

	readonly props: Props

	constructor(config: {
		/** The store's initial data. */
		initialData?: StoreSnapshot<R>
		/**
		 * A map of validators for each record type. A record's validator will be called when the record
		 * is created or updated. It should throw an error if the record is invalid.
		 */
		schema: StoreSchema<R, Props>
		props: Props
	}) {
		const { initialData, schema } = config

		this.schema = schema
		this.props = config.props

		if (initialData) {
			this.atoms.set(
				Object.fromEntries(
					Object.entries(initialData).map(([id, record]) => [
						id,
						atom('atom:' + id, this.schema.validateRecord(this, record, 'initialize', null)),
					])
				)
			)
		}

		this.historyReactor = reactor(
			'Store.historyReactor',
			() => {
				// deref to make sure we're subscribed regardless of whether we need to propagate
				this.history.value
				// If we have accumulated history, flush it and update listeners
				this._flushHistory()
			},
			{ scheduleEffect: (cb) => throttledRaf(cb) }
		)
	}

	public _flushHistory() {
		// If we have accumulated history, flush it and update listeners
		if (this.historyAccumulator.hasChanges()) {
			const entries = this.historyAccumulator.flush()
			for (const { changes, source } of entries) {
				this.listeners.forEach((l) => l({ changes, source }))
			}
		}
	}

	/**
	 * Update the history with a diff of changes.
	 *
	 * @param changes - The changes to add to the history.
	 */
	private updateHistory(changes: RecordsDiff<R>): void {
		this.historyAccumulator.add({
			changes,
			source: this.isMergingRemoteChanges ? 'remote' : 'user',
		})
		if (this.listeners.size === 0) {
			this.historyAccumulator.clear()
		}
		this.history.set(this.history.value + 1, changes)
	}

	validate(phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests') {
		this.allRecords().forEach((record) => this.schema.validateRecord(this, record, phase, null))
	}

	/**
	 * A callback fired after a record is created. Use this to perform related updates to other
	 * records in the store.
	 *
	 * @param record - The record to be created
	 */
	onAfterCreate?: (record: R) => void

	/**
	 * A callback fired after each record's change.
	 *
	 * @param prev - The previous value, if any.
	 * @param next - The next value.
	 */
	onAfterChange?: (prev: R, next: R) => void

	/**
	 * A callback fired before a record is deleted.
	 *
	 * @param prev - The record that will be deleted.
	 */
	onBeforeDelete?: (prev: R) => void

	/**
	 * A callback fired after a record is deleted.
	 *
	 * @param prev - The record that will be deleted.
	 */
	onAfterDelete?: (prev: R) => void

	// used to avoid running callbacks when rolling back changes in sync client
	private _runCallbacks = true

	/**
	 * Add some records to the store. It's an error if they already exist.
	 *
	 * @param records - The records to add.
	 * @public
	 */
	put = (records: R[], phaseOverride?: 'initialize'): void => {
		transact(() => {
			const updates: Record<ID<R>, [from: R, to: R]> = {}
			const additions: Record<ID<R>, R> = {}

			const currentMap = this.atoms.__unsafe__getWithoutCapture()
			let map = null as null | Record<ID<R>, Atom<R>>

			// Iterate through all records, creating, updating or removing as needed
			let record: R

			// There's a chance that, despite having records, all of the values are
			// identical to what they were before; and so we'd end up with an "empty"
			// history entry. Let's keep track of whether we've actually made any
			// changes (e.g. additions, deletions, or updates that produce a new value).
			let didChange = false

			for (let i = 0, n = records.length; i < n; i++) {
				record = records[i]

				const recordAtom = (map ?? currentMap)[record.id]

				if (recordAtom) {
					// If we already have an atom for this record, update its value.

					const initialValue = recordAtom.__unsafe__getWithoutCapture()

					// Validate the record
					record = this.schema.validateRecord(
						this,
						record,
						phaseOverride ?? 'updateRecord',
						initialValue
					)

					recordAtom.set(devFreeze(record))

					// need to deref atom in case nextValue is not identical but is .equals?
					const finalValue = recordAtom.__unsafe__getWithoutCapture()

					// If the value has changed, assign it to updates.
					if (initialValue !== finalValue) {
						didChange = true
						updates[record.id] = [initialValue, finalValue]
					}
				} else {
					didChange = true

					// If we don't have an atom, create one.

					// Validate the record
					record = this.schema.validateRecord(
						this,
						record as R,
						phaseOverride ?? 'createRecord',
						null
					)

					// Mark the change as a new addition.
					additions[record.id] = record

					// Assign the atom to the map under the record's id.
					if (!map) {
						map = { ...currentMap }
					}
					map[record.id] = atom('atom:' + record.id, record)
				}
			}

			// Set the map of atoms to the store.
			if (map) {
				this.atoms.set(map)
			}

			// If we did change, update the history
			if (!didChange) return
			this.updateHistory({
				added: additions,
				updated: updates,
				removed: {},
			})

			const { onAfterCreate, onAfterChange } = this

			if (onAfterCreate && this._runCallbacks) {
				// Run the onAfterChange callback for addition.
				Object.values(additions).forEach((record) => {
					onAfterCreate(record)
				})
			}

			if (onAfterChange && this._runCallbacks) {
				// Run the onAfterChange callback for update.
				Object.values(updates).forEach(([from, to]) => {
					onAfterChange(from, to)
				})
			}
		})
	}

	/**
	 * Remove some records from the store via their ids.
	 *
	 * @param ids - The ids of the records to remove.
	 * @public
	 */
	remove = (ids: ID<R>[]): void => {
		transact(() => {
			if (this.onBeforeDelete && this._runCallbacks) {
				for (const id of ids) {
					const atom = this.atoms.__unsafe__getWithoutCapture()[id]
					if (!atom) continue

					this.onBeforeDelete(atom.value)
				}
			}

			let removed = undefined as undefined | RecordsDiff<R>['removed']

			// For each map in our atoms, remove the ids that we are removing.
			this.atoms.update((atoms) => {
				let result: typeof atoms | undefined = undefined

				for (const id of ids) {
					if (!(id in atoms)) continue
					if (!result) result = { ...atoms }
					if (!removed) removed = {}
					delete result[id]
					removed[id] = atoms[id].value
				}

				return result ?? atoms
			})

			if (!removed) return
			// Update the history with the removed records.
			this.updateHistory({ added: {}, updated: {}, removed })

			// If we have an onAfterChange, run it for each removed record.
			if (this.onAfterDelete && this._runCallbacks) {
				for (let i = 0, n = ids.length; i < n; i++) {
					this.onAfterDelete(removed[ids[i]])
				}
			}
		})
	}

	/**
	 * Get the value of a store record by its id.
	 *
	 * @param id - The id of the record to get.
	 * @public
	 */
	get = <K extends ID<R>>(id: K): RecFromId<K> | undefined => {
		return this.atoms.value[id]?.value as any
	}

	/**
	 * Get the value of a store record by its id without updating its epoch.
	 *
	 * @param id - The id of the record to get.
	 * @public
	 */
	unsafeGetWithoutCapture = <K extends ID<R>>(id: K): RecFromId<K> | undefined => {
		return this.atoms.value[id]?.__unsafe__getWithoutCapture() as any
	}

	/**
	 * Opposite of `deserialize`. Creates a JSON payload from the record store.
	 *
	 * @param filter - A function to filter structs that do not satisfy the predicate.
	 * @returns The record store snapshot as a JSON payload.
	 */
	serialize = (filter?: (record: R) => boolean): StoreSnapshot<R> => {
		const result: Record<string, any> = {}
		for (const [id, atom] of Object.entries(this.atoms.value)) {
			const record = atom.value
			if (typeof filter === 'function' && !filter(record)) continue
			result[id] = record
		}
		return result
	}

	/**
	 * Opposite of `serialize`. Replace the store's current records with records as defined by a
	 * simple JSON structure into the stores.
	 *
	 * @param snapshot - The JSON snapshot to deserialize.
	 * @public
	 */
	deserialize = (snapshot: StoreSnapshot<R>): void => {
		transact(() => {
			this.clear()
			this.put(Object.values(snapshot))
		})
	}

	/**
	 * Get an array of all values in the store.
	 *
	 * @returns An array of all values in the store.
	 * @public
	 */
	allRecords = (): R[] => {
		return Object.values(this.atoms.value).map((atom) => atom.value)
	}

	/**
	 * Removes all records from the store.
	 *
	 * @public
	 */
	clear = (): void => {
		this.remove(Object.keys(this.atoms.value) as any)
	}

	/**
	 * Update a record. To update multiple records at once, use the `update` method of the
	 * `TypedStore` class.
	 *
	 * @param id - The id of the record to update.
	 * @param updater - A function that updates the record.
	 */
	update = <K extends ID<R>>(id: K, updater: (record: RecFromId<K>) => RecFromId<K>) => {
		const atom = this.atoms.value[id]
		if (!atom) {
			console.error(`Record ${id} not found. This is probably an error`)
			return
		}
		this.put([updater(atom.__unsafe__getWithoutCapture() as any as RecFromId<K>) as any])
	}

	/**
	 * Get whether the record store has a id.
	 *
	 * @param id - The id of the record to check.
	 * @public
	 */
	has = <K extends ID<R>>(id: K): boolean => {
		return !!this.atoms.value[id]
	}

	/**
	 * Add a new listener to the store.
	 *
	 * @param listener - The listener to call when the store updates.
	 * @returns A function to remove the listener.
	 */
	listen = (listener: StoreListener<R>) => {
		// flush history so that this listener's history starts from exactly now
		this._flushHistory()

		this.listeners.add(listener)

		if (!this.historyReactor.scheduler.isActivelyListening) {
			this.historyReactor.start()
		}

		return () => {
			this.listeners.delete(listener)

			if (this.listeners.size === 0) {
				this.historyReactor.stop()
			}
		}
	}

	private isMergingRemoteChanges = false

	/**
	 * Merge changes from a remote source without triggering listeners.
	 *
	 * @param fn - A function that merges the external changes.
	 * @public
	 */
	mergeRemoteChanges = (fn: () => void) => {
		if (this.isMergingRemoteChanges) {
			return fn()
		}

		try {
			this.isMergingRemoteChanges = true
			transact(fn)
		} finally {
			this.isMergingRemoteChanges = false
		}
	}

	extractingChanges(fn: () => void): RecordsDiff<R> {
		const changes: Array<RecordsDiff<R>> = []
		const dispose = this.historyAccumulator.intercepting((entry) => changes.push(entry.changes))
		try {
			transact(fn)
			return squashRecordDiffs(changes)
		} finally {
			dispose()
		}
	}

	applyDiff(diff: RecordsDiff<R>, runCallbacks = true) {
		const prevRunCallbacks = this._runCallbacks
		try {
			this._runCallbacks = runCallbacks
			transact(() => {
				const toPut = Object.values(diff.added).concat(
					Object.values(diff.updated).map(([_from, to]) => to)
				)
				const toRemove = Object.keys(diff.removed) as ID<R>[]
				if (toPut.length) {
					this.put(toPut)
				}
				if (toRemove.length) {
					this.remove(toRemove)
				}
			})
		} finally {
			this._runCallbacks = prevRunCallbacks
		}
	}

	/**
	 * Create a computed cache.
	 *
	 * @param name - The name of the derivation cache.
	 * @param derive - A function used to derive the value of the cache.
	 * @public
	 */
	createComputedCache = <T, V extends R = R>(
		name: string,
		derive: (record: V) => T | undefined
	): ComputedCache<T, V> => {
		const cache = new Cache<Atom<any>, Computed<T | undefined>>()
		return {
			get: (id: ID<V>) => {
				const atom = this.atoms.value[id]
				if (!atom) {
					return undefined
				}
				return cache.get(atom, () =>
					computed<T | undefined>(name + ':' + id, () => derive(atom.value as V))
				).value
			},
		}
	}

	/**
	 * Create a computed cache from a selector
	 *
	 * @param name - The name of the derivation cache.
	 * @param selector - A function that returns a subset of the original shape
	 * @param derive - A function used to derive the value of the cache.
	 * @public
	 */
	createSelectedComputedCache = <T, J, V extends R = R>(
		name: string,
		selector: (record: V) => T | undefined,
		derive: (input: T) => J | undefined
	): ComputedCache<J, V> => {
		const cache = new Cache<Atom<any>, Computed<J | undefined>>()
		return {
			get: (id: ID<V>) => {
				const atom = this.atoms.value[id]
				if (!atom) {
					return undefined
				}

				const d = computed<T | undefined>(name + ':' + id + ':selector', () =>
					selector(atom.value as V)
				)
				return cache.get(atom, () =>
					computed<J | undefined>(name + ':' + id, () => derive(d.value as T))
				).value
			},
		}
	}

	private _integrityChecker?: () => void | undefined

	/** @internal */
	ensureStoreIsUsable() {
		this._integrityChecker ??= this.schema.createIntegrityChecker(this)
		this._integrityChecker?.()
	}

	private _isPossiblyCorrupted = false
	/** @internal */
	markAsPossiblyCorrupted() {
		this._isPossiblyCorrupted = true
	}
	/** @internal */
	isPossiblyCorrupted() {
		return this._isPossiblyCorrupted
	}
}

/**
 * Squash a collection of diffs into a single diff.
 *
 * @param diffs - An array of diffs to squash.
 * @returns A single diff that represents the squashed diffs.
 * @public
 */
export function squashRecordDiffs<T extends BaseRecord>(diffs: RecordsDiff<T>[]): RecordsDiff<T> {
	const result: RecordsDiff<T> = { added: {}, removed: {}, updated: {} }

	for (const diff of diffs) {
		for (const [id, value] of Object.entries(diff.added)) {
			if (result.removed[id]) {
				const original = result.removed[id]
				delete result.removed[id]
				if (original !== value) {
					result.updated[id] = [original, value]
				}
			} else {
				result.added[id] = value
			}
		}

		for (const [id, [_from, to]] of Object.entries(diff.updated)) {
			if (result.added[id]) {
				result.added[id] = to
				delete result.updated[id]
				delete result.removed[id]
				continue
			}
			if (result.updated[id]) {
				result.updated[id][1] = to
				delete result.removed[id]
				continue
			}

			result.updated[id] = diff.updated[id]
			delete result.removed[id]
		}

		for (const [id, value] of Object.entries(diff.removed)) {
			// the same record was added in this diff sequence, just drop it
			if (result.added[id]) {
				delete result.added[id]
			} else if (result.updated[id]) {
				result.removed[id] = result.updated[id][0]
				delete result.updated[id]
			} else {
				result.removed[id] = value
			}
		}
	}

	return result
}

/**
 * Collect all history entries by their sources.
 *
 * @param entries - The array of history entries.
 * @returns A map of history entries by their sources.
 * @public
 */
function squashHistoryEntries<T extends BaseRecord>(entries: HistoryEntry<T>[]): HistoryEntry<T>[] {
	const result: HistoryEntry<T>[] = []

	let current = entries[0]
	let entry: HistoryEntry<T>

	for (let i = 1, n = entries.length; i < n; i++) {
		entry = entries[i]

		if (current.source !== entry.source) {
			result.push(current)
			current = entry
		} else {
			current = {
				source: current.source,
				changes: squashRecordDiffs([current.changes, entry.changes]),
			}
		}
	}

	result.push(current)

	return result
}

/** @public */
export function reverseRecordsDiff(diff: RecordsDiff<any>) {
	const result: RecordsDiff<any> = { added: diff.removed, removed: diff.added, updated: {} }
	for (const [from, to] of Object.values(diff.updated)) {
		result.updated[from.id] = [to, from]
	}
	return result
}

class HistoryAccumulator<T extends BaseRecord> {
	private _history: HistoryEntry<T>[] = []

	private _inteceptors: Set<(entry: HistoryEntry<T>) => void> = new Set()

	intercepting(fn: (entry: HistoryEntry<T>) => void) {
		this._inteceptors.add(fn)
		return () => {
			this._inteceptors.delete(fn)
		}
	}

	add(entry: HistoryEntry<T>) {
		this._history.push(entry)
		for (const interceptor of this._inteceptors) {
			interceptor(entry)
		}
	}

	flush() {
		const history = squashHistoryEntries(this._history)
		this._history = []
		return history
	}

	clear() {
		this._history = []
	}

	hasChanges() {
		return this._history.length > 0
	}
}

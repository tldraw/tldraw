import { Atom, Computed, Reactor, atom, computed, reactor, transact } from '@tldraw/state'
import {
	filterEntries,
	objectMapEntries,
	objectMapFromEntries,
	objectMapKeys,
	objectMapValues,
	throttleToNextFrame,
} from '@tldraw/utils'
import { nanoid } from 'nanoid'
import { IdOf, RecordId, UnknownRecord } from './BaseRecord'
import { Cache } from './Cache'
import { RecordScope } from './RecordType'
import { RecordsDiff, WorkingRecordsDiff } from './RecordsDiff'
import { StoreQueries } from './StoreQueries'
import { SerializedSchema, StoreSchema } from './StoreSchema'
import { devFreeze } from './devFreeze'

type RecFromId<K extends RecordId<UnknownRecord>> = K extends RecordId<infer R> ? R : never

/**
 * A diff describing the changes to a collection.
 *
 * @public
 */
export type CollectionDiff<T> = { added?: Set<T>; removed?: Set<T> }

export type ChangeSource = 'user' | 'remote'

export type StoreListenerFilters = {
	source: ChangeSource | 'all'
	scope: RecordScope | 'all'
}

/**
 * An entry containing changes that originated either by user actions or remote changes.
 *
 * @public
 */
export type HistoryEntry<R extends UnknownRecord = UnknownRecord> = {
	changes: RecordsDiff<R>
	source: ChangeSource
}
type WorkingHistoryEntry<R extends UnknownRecord = UnknownRecord> = {
	changes: WorkingRecordsDiff<R>
	source: ChangeSource
}

/**
 * A function that will be called when the history changes.
 *
 * @public
 */
export type StoreListener<R extends UnknownRecord> = (entry: HistoryEntry<R>) => void

/**
 * A record store is a collection of records of different types.
 *
 * @public
 */
export type ComputedCache<Data, R extends UnknownRecord> = {
	get(id: IdOf<R>): Data | undefined
}

/**
 * A serialized snapshot of the record store's values.
 *
 * @public
 */
export type SerializedStore<R extends UnknownRecord> = Record<IdOf<R>, R>

/** @public */
export type StoreSnapshot<R extends UnknownRecord> = {
	store: SerializedStore<R>
	schema: SerializedSchema
}

/** @public */
export type StoreValidator<R extends UnknownRecord> = {
	validate: (record: unknown) => R
	validateUsingKnownGoodVersion?: (knownGoodVersion: R, record: unknown) => R
}

/** @public */
export type StoreValidators<R extends UnknownRecord> = {
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
export class Store<R extends UnknownRecord = UnknownRecord, Props = unknown> {
	/**
	 * The random id of the store.
	 */
	public readonly id: string
	/**
	 * An atom containing the store's atoms.
	 *
	 * @internal
	 * @readonly
	 */
	private readonly atoms = atom('store_atoms', {} as Record<IdOf<R>, Atom<R>>)

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
	private listeners = new Set<{ onHistory: StoreListener<R>; filters: StoreListenerFilters }>()

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

	public readonly scopedTypes: { readonly [K in RecordScope]: ReadonlySet<R['typeName']> }

	constructor(config: {
		id?: string
		/** The store's initial data. */
		initialData?: SerializedStore<R>
		/**
		 * A map of validators for each record type. A record's validator will be called when the record
		 * is created or updated. It should throw an error if the record is invalid.
		 */
		schema: StoreSchema<R, Props>
		props: Props
	}) {
		const { initialData, schema, id } = config

		this.id = id ?? nanoid()
		this.schema = schema
		this.props = config.props

		if (initialData) {
			this.atoms.set(
				objectMapFromEntries(
					objectMapEntries(initialData).map(([id, record]) => [
						id,
						atom(
							'atom:' + id,
							devFreeze(this.schema.validateRecord(this, record, 'initialize', null))
						),
					])
				)
			)
		}

		this.historyReactor = reactor(
			'Store.historyReactor',
			() => {
				// deref to make sure we're subscribed regardless of whether we need to propagate
				this.history.get()
				// If we have accumulated history, flush it and update listeners
				this._flushHistory()
			},
			{ scheduleEffect: (cb) => throttleToNextFrame(cb) }
		)
		this.scopedTypes = {
			document: new Set(
				objectMapValues(this.schema.types)
					.filter((t) => t.scope === 'document')
					.map((t) => t.typeName)
			),
			session: new Set(
				objectMapValues(this.schema.types)
					.filter((t) => t.scope === 'session')
					.map((t) => t.typeName)
			),
			presence: new Set(
				objectMapValues(this.schema.types)
					.filter((t) => t.scope === 'presence')
					.map((t) => t.typeName)
			),
		}
	}

	public _flushHistory() {
		// If we have accumulated history, flush it and update listeners
		if (this.historyAccumulator.hasChanges()) {
			const entries = this.historyAccumulator.flush()
			for (const { changes, source } of entries) {
				let instanceChanges = null as null | RecordsDiff<R>
				let documentChanges = null as null | RecordsDiff<R>
				let presenceChanges = null as null | RecordsDiff<R>
				for (const { onHistory, filters } of this.listeners) {
					if (filters.source !== 'all' && filters.source !== source) {
						continue
					}
					if (filters.scope !== 'all') {
						if (filters.scope === 'document') {
							documentChanges ??= this.filterChangesByScope(changes, 'document')
							if (!documentChanges) continue
							onHistory({ changes: documentChanges, source })
						} else if (filters.scope === 'session') {
							instanceChanges ??= this.filterChangesByScope(changes, 'session')
							if (!instanceChanges) continue
							onHistory({ changes: instanceChanges, source })
						} else {
							presenceChanges ??= this.filterChangesByScope(changes, 'presence')
							if (!presenceChanges) continue
							onHistory({ changes: presenceChanges, source })
						}
					} else {
						onHistory({ changes, source })
					}
				}
			}
		}
	}

	/**
	 * Filters out non-document changes from a diff. Returns null if there are no changes left.
	 * @param change - the records diff
	 * @returns
	 */
	filterChangesByScope(change: RecordsDiff<R>, scope: RecordScope) {
		const added = change.added
			? filterEntries(change.added, (_, r) => this.scopedTypes[scope].has(r.typeName))
			: null
		const updated = change.updated
			? filterEntries(change.updated, (_, r) => this.scopedTypes[scope].has(r[1].typeName))
			: null
		const removed = change.removed
			? filterEntries(change.removed, (_, r) => this.scopedTypes[scope].has(r.typeName))
			: null
		if (
			(!added || Object.keys(added).length === 0) &&
			(!updated || Object.keys(updated).length === 0) &&
			(!removed || Object.keys(removed).length === 0)
		) {
			return null
		}
		return { added, updated, removed }
	}

	// /**
	//  * Update the history with a diff of changes.
	//  *
	//  * @param changes - The changes to add to the history.
	//  */
	// private updateHistory(changes: RecordsDiff<R>): void {
	// 	this.historyAccumulator.add({
	// 		changes,
	// 		source: this.isMergingRemoteChanges ? 'remote' : 'user',
	// 	})
	// 	if (this.listeners.size === 0) {
	// 		this.historyAccumulator.clear()
	// 	}
	// 	this.history.set(this.history.get() + 1, changes)
	// }

	validate(phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests') {
		this.allRecords().forEach((record) => this.schema.validateRecord(this, record, phase, null))
	}

	/**
	 * A callback fired after each record's change.
	 *
	 * @param prev - The previous value, if any.
	 * @param next - The next value.
	 */
	onBeforeCreate?: (next: R, source: 'remote' | 'user') => R

	/**
	 * A callback fired after a record is created. Use this to perform related updates to other
	 * records in the store.
	 *
	 * @param record - The record to be created
	 */
	onAfterCreate?: (record: R, source: 'remote' | 'user') => void

	/**
	 * A callback before after each record's change.
	 *
	 * @param prev - The previous value, if any.
	 * @param next - The next value.
	 */
	onBeforeChange?: (prev: R, next: R, source: 'remote' | 'user') => R

	/**
	 * A callback fired after each record's change.
	 *
	 * @param prev - The previous value, if any.
	 * @param next - The next value.
	 */
	onAfterChange?: (prev: R, next: R, source: 'remote' | 'user') => void

	/**
	 * A callback fired before a record is deleted.
	 *
	 * @param prev - The record that will be deleted.
	 */
	onBeforeDelete?: (prev: R, source: 'remote' | 'user') => false | void

	/**
	 * A callback fired after a record is deleted.
	 *
	 * @param prev - The record that will be deleted.
	 */
	onAfterDelete?: (prev: R, source: 'remote' | 'user') => void

	// used to avoid running callbacks when rolling back changes in sync client
	private _runCallbacks = true

	/**
	 * Add some records to the store. It's an error if they already exist.
	 *
	 * @param records - The records to add.
	 * @public
	 */
	put = (records: R[], phaseOverride?: 'initialize'): void => {
		this.atomic(() => {
			const currentMap = this.atoms.__unsafe__getWithoutCapture()
			let map = null as null | Record<IdOf<UnknownRecord>, Atom<R>>

			// Iterate through all records, creating, updating or removing as needed
			let record: R

			const beforeCreate = this.onBeforeCreate && this._runCallbacks ? this.onBeforeCreate : null
			const beforeUpdate = this.onBeforeChange && this._runCallbacks ? this.onBeforeChange : null
			const source = this.isMergingRemoteChanges ? 'remote' : 'user'

			for (let i = 0, n = records.length; i < n; i++) {
				record = records[i]

				const recordAtom = (map ?? currentMap)[record.id as IdOf<R>]

				if (recordAtom) {
					// If we already have an atom for this record, update its value.
					const initialValue = recordAtom.__unsafe__getWithoutCapture()

					// If we have a beforeUpdate callback, run it against the initial and next records
					if (beforeUpdate) record = beforeUpdate(initialValue, record, source)

					// Validate the record
					const validated = this.schema.validateRecord(
						this,
						record,
						phaseOverride ?? 'updateRecord',
						initialValue
					)

					if (validated === initialValue) continue

					const updated = devFreeze(record)
					recordAtom.set(updated)

					this.atomicDiffAccumulator!.update(initialValue, updated)
				} else {
					if (beforeCreate) record = beforeCreate(record, source)

					// If we don't have an atom, create one.

					// Validate the record
					record = this.schema.validateRecord(
						this,
						record as R,
						phaseOverride ?? 'createRecord',
						null
					)

					// Mark the change as a new addition.
					this.atomicDiffAccumulator!.add(record)

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
		})
	}

	/**
	 * Remove some records from the store via their ids.
	 *
	 * @param ids - The ids of the records to remove.
	 * @public
	 */
	remove = (ids: IdOf<R>[]): void => {
		this.atomic(() => {
			const cancelled = [] as IdOf<R>[]
			const source = this.isMergingRemoteChanges ? 'remote' : 'user'

			if (this.onBeforeDelete && this._runCallbacks) {
				for (const id of ids) {
					const atom = this.atoms.__unsafe__getWithoutCapture()[id]
					if (!atom) continue

					if (this.onBeforeDelete(atom.get(), source) === false) {
						cancelled.push(id)
					}
				}
			}

			let removed = undefined as undefined | RecordsDiff<R>['removed']

			// For each map in our atoms, remove the ids that we are removing.
			this.atoms.update((atoms) => {
				let result: typeof atoms | undefined = undefined

				for (const id of ids) {
					if (cancelled.includes(id)) continue
					if (!(id in atoms)) continue
					if (!result) result = { ...atoms }
					if (!removed) removed = {} as Record<IdOf<R>, R>
					delete result[id]
					const record = atoms[id].get()
					removed[id] = record
					this.addDiffForAfterEvent(record, null, source)
				}

				return result ?? atoms
			})

			if (!removed) return
			// Update the history with the removed records.
			this.updateHistory({ added: {}, updated: {}, removed } as RecordsDiff<R>)
		})
	}

	/**
	 * Get the value of a store record by its id.
	 *
	 * @param id - The id of the record to get.
	 * @public
	 */
	get = <K extends IdOf<R>>(id: K): RecFromId<K> | undefined => {
		return this.atoms.get()[id]?.get() as any
	}

	/**
	 * Get the value of a store record by its id without updating its epoch.
	 *
	 * @param id - The id of the record to get.
	 * @public
	 */
	unsafeGetWithoutCapture = <K extends IdOf<R>>(id: K): RecFromId<K> | undefined => {
		return this.atoms.get()[id]?.__unsafe__getWithoutCapture() as any
	}

	/**
	 * Creates a JSON payload from the record store.
	 *
	 * @param scope - The scope of records to serialize. Defaults to 'document'.
	 * @returns The record store snapshot as a JSON payload.
	 */
	serialize = (scope: RecordScope | 'all' = 'document'): SerializedStore<R> => {
		const result = {} as SerializedStore<R>
		for (const [id, atom] of objectMapEntries(this.atoms.get())) {
			const record = atom.get()
			if (scope === 'all' || this.scopedTypes[scope].has(record.typeName)) {
				result[id as IdOf<R>] = record
			}
		}
		return result
	}

	/**
	 * Get a serialized snapshot of the store and its schema.
	 *
	 * ```ts
	 * const snapshot = store.getSnapshot()
	 * store.loadSnapshot(snapshot)
	 * ```
	 *
	 * @param scope - The scope of records to serialize. Defaults to 'document'.
	 *
	 * @public
	 */
	getSnapshot(scope: RecordScope | 'all' = 'document'): StoreSnapshot<R> {
		return {
			store: this.serialize(scope),
			schema: this.schema.serialize(),
		}
	}

	/**
	 * Migrate a serialized snapshot of the store and its schema.
	 *
	 * ```ts
	 * const snapshot = store.getSnapshot()
	 * store.migrateSnapshot(snapshot)
	 * ```
	 *
	 * @param snapshot - The snapshot to load.
	 * @public
	 */
	migrateSnapshot(snapshot: StoreSnapshot<R>): StoreSnapshot<R> {
		const migrationResult = this.schema.migrateStoreSnapshot(snapshot)

		if (migrationResult.type === 'error') {
			throw new Error(`Failed to migrate snapshot: ${migrationResult.reason}`)
		}

		return {
			store: migrationResult.value,
			schema: this.schema.serialize(),
		}
	}

	/**
	 * Load a serialized snapshot.
	 *
	 * ```ts
	 * const snapshot = store.getSnapshot()
	 * store.loadSnapshot(snapshot)
	 * ```
	 *
	 * @param snapshot - The snapshot to load.
	 * @public
	 */
	loadSnapshot(snapshot: StoreSnapshot<R>): void {
		const migrationResult = this.schema.migrateStoreSnapshot(snapshot)

		if (migrationResult.type === 'error') {
			throw new Error(`Failed to migrate snapshot: ${migrationResult.reason}`)
		}

		transact(() => {
			this.clear()
			this.put(Object.values(migrationResult.value))
			this.ensureStoreIsUsable()
		})
	}

	/**
	 * Get an array of all values in the store.
	 *
	 * @returns An array of all values in the store.
	 * @public
	 */
	allRecords = (): R[] => {
		return objectMapValues(this.atoms.get()).map((atom) => atom.get())
	}

	/**
	 * Removes all records from the store.
	 *
	 * @public
	 */
	clear = (): void => {
		this.remove(objectMapKeys(this.atoms.get()))
	}

	/**
	 * Update a record. To update multiple records at once, use the `update` method of the
	 * `TypedStore` class.
	 *
	 * @param id - The id of the record to update.
	 * @param updater - A function that updates the record.
	 */
	update = <K extends IdOf<R>>(id: K, updater: (record: RecFromId<K>) => RecFromId<K>) => {
		const atom = this.atoms.get()[id]
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
	has = <K extends IdOf<R>>(id: K): boolean => {
		return !!this.atoms.get()[id]
	}

	/**
	 * Add a new listener to the store.
	 *
	 * @param onHistory - The listener to call when the store updates.
	 * @param filters - Filters to apply to the listener.
	 * @returns A function to remove the listener.
	 */
	listen = (onHistory: StoreListener<R>, filters?: Partial<StoreListenerFilters>) => {
		// flush history so that this listener's history starts from exactly now
		this._flushHistory()

		const listener = {
			onHistory,
			filters: {
				source: filters?.source ?? 'all',
				scope: filters?.scope ?? 'all',
			},
		}

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

		if (this.atomicDiffAccumulator) {
			throw new Error('Cannot merge remote changes while in an atomic transaction')
		}

		try {
			this.isMergingRemoteChanges = true
			transact(fn)
		} finally {
			this.isMergingRemoteChanges = false
		}
	}

	/**
	 * Run `fn` and return a {@link RecordsDiff} of the changes that occurred as a result.
	 */
	extractingChanges(fn: () => void): RecordsDiff<R> {
		const changes: Array<RecordsDiff<R>> = []
		const dispose = this.historyAccumulator.addInterceptor((entry) => changes.push(entry.changes))
		try {
			transact(fn)
			return squashRecordDiffs(changes)
		} finally {
			dispose()
		}
	}

	applyDiff(diff: RecordsDiff<R>, runCallbacks = true) {
		this.atomic(() => {
			const toPut = objectMapValues(diff.added).concat(
				objectMapValues(diff.updated).map(([_from, to]) => to)
			)
			const toRemove = objectMapKeys(diff.removed)
			if (toPut.length) {
				this.put(toPut)
			}
			if (toRemove.length) {
				this.remove(toRemove)
			}
		}, runCallbacks)
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
		derive: (record: V) => T | undefined,
		isEqual?: (a: V, b: V) => boolean
	): ComputedCache<T, V> => {
		const cache = new Cache<Atom<any>, Computed<T | undefined>>()
		return {
			get: (id: IdOf<V>) => {
				const atom = this.atoms.get()[id]
				if (!atom) {
					return undefined
				}
				return cache
					.get(atom, () => {
						const recordSignal = isEqual
							? computed(atom.name + ':equals', () => atom.get(), { isEqual })
							: atom
						return computed<T | undefined>(name + ':' + id, () => {
							return derive(recordSignal.get() as V)
						})
					})
					.get()
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
			get: (id: IdOf<V>) => {
				const atom = this.atoms.get()[id]
				if (!atom) {
					return undefined
				}

				const d = computed<T | undefined>(name + ':' + id + ':selector', () =>
					selector(atom.get() as V)
				)
				return cache
					.get(atom, () => computed<J | undefined>(name + ':' + id, () => derive(d.get() as T)))
					.get()
			},
		}
	}

	getRecordType = <T extends R>(record: R): T => {
		const type = this.schema.types[record.typeName as R['typeName']]
		if (!type) {
			throw new Error(`Record type ${record.typeName} not found`)
		}
		return type as unknown as T
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

	private atomicDiffAccumulator: WorkingRecordsDiff<R> | null = null
	private atomic<T>(fn: () => T, runCallbacks = true): T {
		return transact(() => {
			if (this.atomicDiffAccumulator) return fn()

			const source = this.isMergingRemoteChanges ? 'remote' : 'user'
			this.atomicDiffAccumulator = new WorkingRecordsDiff()
			const prevRunCallbacks = this._runCallbacks
			this._runCallbacks = runCallbacks ?? prevRunCallbacks
			try {
				const result = fn()

				while (this.atomicDiffAccumulator) {
					const changes = this.atomicDiffAccumulator
					this.atomicDiffAccumulator = null

					this.historyAccumulator.add({ source, changes })

					if (!runCallbacks) continue

					if (changes.added && this.onAfterCreate) {
						for (const added of changes.added.values()) {
							this.onAfterCreate(added, source)
						}
					}
					if (changes.updated && this.onAfterChange) {
						for (const update of changes.updated.values()) {
							this.onAfterChange(update[0], update[1], source)
						}
					}
					if (changes.removed && this.onAfterDelete) {
						for (const removed of changes.removed.values()) {
							this.onAfterDelete(removed, source)
						}
					}
				}

				return result
			} finally {
				this.atomicDiffAccumulator = null
				this._runCallbacks = prevRunCallbacks
			}
		})
	}

	/** @internal */
	addHistoryInterceptor(fn: (entry: HistoryEntry<R>, source: ChangeSource) => void) {
		return this.historyAccumulator.addInterceptor((entry) =>
			fn(entry, this.isMergingRemoteChanges ? 'remote' : 'user')
		)
	}
}

/**
 * Squash a collection of diffs into a single diff.
 *
 * @param diffs - An array of diffs to squash.
 * @returns A single diff that represents the squashed diffs.
 * @public
 */
export function squashRecordDiffs<T extends UnknownRecord>(
	diffs: RecordsDiff<T>[]
): RecordsDiff<T> {
	const result = { added: {}, removed: {}, updated: {} } as RecordsDiff<T>

	squashRecordDiffsMutable(result, diffs)
	return result
}

/**
 * Apply the array `diffs` to the `target` diff, mutating it in-place.
 * @internal
 */
export function squashRecordDiffsMutable<T extends UnknownRecord>(
	target: RecordsDiff<T>,
	diffs: RecordsDiff<T>[]
): void {
	for (const diff of diffs) {
		for (const [id, value] of objectMapEntries(diff.added)) {
			if (target.removed[id]) {
				const original = target.removed[id]
				delete target.removed[id]
				if (original !== value) {
					target.updated[id] = [original, value]
				}
			} else {
				target.added[id] = value
			}
		}

		for (const [id, [_from, to]] of objectMapEntries(diff.updated)) {
			if (target.added[id]) {
				target.added[id] = to
				delete target.updated[id]
				delete target.removed[id]
				continue
			}
			if (target.updated[id]) {
				target.updated[id] = [target.updated[id][0], to]
				delete target.removed[id]
				continue
			}

			target.updated[id] = diff.updated[id]
			delete target.removed[id]
		}

		for (const [id, value] of objectMapEntries(diff.removed)) {
			// the same record was added in this diff sequence, just drop it
			if (target.added[id]) {
				delete target.added[id]
			} else if (target.updated[id]) {
				target.removed[id] = target.updated[id][0]
				delete target.updated[id]
			} else {
				target.removed[id] = value
			}
		}
	}
}

/**
 * Is a records diff empty?
 * @internal
 */
export function isRecordsDiffEmpty<T extends UnknownRecord>(diff: RecordsDiff<T>) {
	return (
		Object.keys(diff.added).length === 0 &&
		Object.keys(diff.updated).length === 0 &&
		Object.keys(diff.removed).length === 0
	)
}

/**
 * Collect all history entries by their adjacent sources.
 * For example, [user, user, remote, remote, user] would result in [user, remote, user],
 * with adjacent entries of the same source squashed into a single entry.
 *
 * @param entries - The array of history entries.
 * @returns A map of history entries by their sources.
 * @public
 */
function squashHistoryEntries<T extends UnknownRecord>(
	entries: WorkingHistoryEntry<T>[]
): HistoryEntry<T>[] {
	if (entries.length === 0) return []

	const chunked: WorkingHistoryEntry<T>[][] = []
	let chunk: WorkingHistoryEntry<T>[] = [entries[0]]
	let entry: WorkingHistoryEntry<T>

	for (let i = 1, n = entries.length; i < n; i++) {
		entry = entries[i]
		if (chunk[0].source !== entry.source) {
			chunked.push(chunk)
			chunk = []
		}
		chunk.push(entry)
	}
	// Push the last chunk
	chunked.push(chunk)

	return devFreeze(
		chunked.map((chunk) => ({
			source: chunk[0].source,
			changes: WorkingRecordsDiff.merged(chunk.map((e) => e.changes)).toJson(),
		}))
	)
}

/** @public */
export function reverseRecordsDiff<R extends UnknownRecord>(diff: RecordsDiff<R>) {
	const result = {
		added: diff.removed,
		removed: diff.added,
		updated: {} as Record<IdOf<R>, [R, R]>,
	}
	if (diff.updated) {
		for (const [from, to] of objectMapValues(diff.updated)) {
			result.updated[from.id as IdOf<R>] = [to, from]
		}
	}
	return result
}

class HistoryAccumulator<T extends UnknownRecord> {
	private _history: WorkingHistoryEntry<T>[] = []

	private _interceptors: Set<(entry: WorkingHistoryEntry<T>) => void> = new Set()

	addInterceptor(fn: (entry: WorkingHistoryEntry<T>) => void) {
		this._interceptors.add(fn)
		return () => {
			this._interceptors.delete(fn)
		}
	}

	add(entry: WorkingHistoryEntry<T>) {
		this._history.push(entry)
		for (const interceptor of this._interceptors) {
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

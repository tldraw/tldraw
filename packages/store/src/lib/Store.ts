import { Atom, Computed, Reactor, atom, computed, reactor, transact } from '@tldraw/state'
import {
	WeakCache,
	assert,
	filterEntries,
	getOwnProperty,
	objectMapEntries,
	objectMapFromEntries,
	objectMapKeys,
	objectMapValues,
	throttleToNextFrame,
} from '@tldraw/utils'
import { nanoid } from 'nanoid'
import { IdOf, RecordId, UnknownRecord } from './BaseRecord'
import { RecordScope } from './RecordType'
import { RecordsDiff, squashRecordDiffs } from './RecordsDiff'
import { StoreQueries } from './StoreQueries'
import { SerializedSchema, StoreSchema } from './StoreSchema'
import { StoreSideEffects } from './StoreSideEffects'
import { devFreeze } from './devFreeze'

type RecFromId<K extends RecordId<UnknownRecord>> = K extends RecordId<infer R> ? R : never

/**
 * A diff describing the changes to a collection.
 *
 * @public
 */
export interface CollectionDiff<T> {
	added?: Set<T>
	removed?: Set<T>
}

export type ChangeSource = 'user' | 'remote'

export interface StoreListenerFilters {
	source: ChangeSource | 'all'
	scope: RecordScope | 'all'
}

/**
 * An entry containing changes that originated either by user actions or remote changes.
 *
 * @public
 */
export interface HistoryEntry<R extends UnknownRecord = UnknownRecord> {
	changes: RecordsDiff<R>
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
export interface ComputedCache<Data, R extends UnknownRecord> {
	get(id: IdOf<R>): Data | undefined
}

/**
 * A serialized snapshot of the record store's values.
 *
 * @public
 */
export type SerializedStore<R extends UnknownRecord> = Record<IdOf<R>, R>

/** @public */
export interface StoreSnapshot<R extends UnknownRecord> {
	store: SerializedStore<R>
	schema: SerializedSchema
}

/** @public */
export interface StoreValidator<R extends UnknownRecord> {
	validate: (record: unknown) => R
	validateUsingKnownGoodVersion?: (knownGoodVersion: R, record: unknown) => R
}

/** @public */
export type StoreValidators<R extends UnknownRecord> = {
	[K in R['typeName']]: StoreValidator<Extract<R, { typeName: K }>>
}

/** @public */
export interface StoreError {
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

	public readonly sideEffects = new StoreSideEffects<R>(this)

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
		const result = {
			added: filterEntries(change.added, (_, r) => this.scopedTypes[scope].has(r.typeName)),
			updated: filterEntries(change.updated, (_, r) => this.scopedTypes[scope].has(r[1].typeName)),
			removed: filterEntries(change.removed, (_, r) => this.scopedTypes[scope].has(r.typeName)),
		}
		if (
			Object.keys(result.added).length === 0 &&
			Object.keys(result.updated).length === 0 &&
			Object.keys(result.removed).length === 0
		) {
			return null
		}
		return result
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
		this.history.set(this.history.get() + 1, changes)
	}

	validate(phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests') {
		this.allRecords().forEach((record) => this.schema.validateRecord(this, record, phase, null))
	}

	/**
	 * Add some records to the store. It's an error if they already exist.
	 *
	 * @param records - The records to add.
	 * @public
	 */
	put = (records: R[], phaseOverride?: 'initialize'): void => {
		this.atomic(() => {
			const updates: Record<IdOf<UnknownRecord>, [from: R, to: R]> = {}
			const additions: Record<IdOf<UnknownRecord>, R> = {}

			const currentMap = this.atoms.__unsafe__getWithoutCapture()
			let map = null as null | Record<IdOf<UnknownRecord>, Atom<R>>

			// Iterate through all records, creating, updating or removing as needed
			let record: R

			// There's a chance that, despite having records, all of the values are
			// identical to what they were before; and so we'd end up with an "empty"
			// history entry. Let's keep track of whether we've actually made any
			// changes (e.g. additions, deletions, or updates that produce a new value).
			let didChange = false

			const source = this.isMergingRemoteChanges ? 'remote' : 'user'

			for (let i = 0, n = records.length; i < n; i++) {
				record = records[i]

				const recordAtom = (map ?? currentMap)[record.id as IdOf<R>]

				if (recordAtom) {
					// If we already have an atom for this record, update its value.
					const initialValue = recordAtom.__unsafe__getWithoutCapture()

					// If we have a beforeUpdate callback, run it against the initial and next records
					record = this.sideEffects.handleBeforeChange(initialValue, record, source)

					// Validate the record
					const validated = this.schema.validateRecord(
						this,
						record,
						phaseOverride ?? 'updateRecord',
						initialValue
					)

					if (validated === initialValue) continue

					recordAtom.set(devFreeze(record))

					didChange = true
					const updated = recordAtom.__unsafe__getWithoutCapture()
					updates[record.id] = [initialValue, updated]
					this.addDiffForAfterEvent(initialValue, updated)
				} else {
					record = this.sideEffects.handleBeforeCreate(record, source)

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
					this.addDiffForAfterEvent(null, record)

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
				removed: {} as Record<IdOf<R>, R>,
			})
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
			const cancelled = new Set<IdOf<R>>()
			const source = this.isMergingRemoteChanges ? 'remote' : 'user'

			if (this.sideEffects.isEnabled()) {
				for (const id of ids) {
					const atom = this.atoms.__unsafe__getWithoutCapture()[id]
					if (!atom) continue

					if (this.sideEffects.handleBeforeDelete(atom.get(), source) === false) {
						cancelled.add(id)
					}
				}
			}

			let removed = undefined as undefined | RecordsDiff<R>['removed']

			// For each map in our atoms, remove the ids that we are removing.
			this.atoms.update((atoms) => {
				let result: typeof atoms | undefined = undefined

				for (const id of ids) {
					if (cancelled.has(id)) continue
					if (!(id in atoms)) continue
					if (!result) result = { ...atoms }
					if (!removed) removed = {} as Record<IdOf<R>, R>
					delete result[id]
					const record = atoms[id].get()
					removed[id] = record
					this.addDiffForAfterEvent(record, null)
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

		const prevSideEffectsEnabled = this.sideEffects.isEnabled()
		try {
			this.sideEffects.setIsEnabled(false)
			this.atomic(() => {
				this.clear()
				this.put(Object.values(migrationResult.value))
				this.ensureStoreIsUsable()
			})
		} finally {
			this.sideEffects.setIsEnabled(prevSideEffectsEnabled)
		}
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

		if (this._isInAtomicOp) {
			throw new Error('Cannot merge remote changes while in atomic operation')
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

	applyDiff(
		diff: RecordsDiff<R>,
		{
			runCallbacks = true,
			ignoreEphemeralKeys = false,
		}: { runCallbacks?: boolean; ignoreEphemeralKeys?: boolean } = {}
	) {
		this.atomic(() => {
			const toPut = objectMapValues(diff.added)

			for (const [_from, to] of objectMapValues(diff.updated)) {
				const type = this.schema.getType(to.typeName)
				if (ignoreEphemeralKeys && type.ephemeralKeySet.size) {
					const existing = this.get(to.id)
					if (!existing) {
						toPut.push(to)
						continue
					}
					let changed: R | null = null
					for (const [key, value] of Object.entries(to)) {
						if (type.ephemeralKeySet.has(key) || Object.is(value, getOwnProperty(existing, key))) {
							continue
						}

						if (!changed) changed = { ...existing } as R
						;(changed as any)[key] = value
					}
					if (changed) toPut.push(changed)
				} else {
					toPut.push(to)
				}
			}

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
	createComputedCache = <Result, Record extends R = R>(
		name: string,
		derive: (record: Record) => Result | undefined,
		isEqual?: (a: Record, b: Record) => boolean
	): ComputedCache<Result, Record> => {
		const cache = new WeakCache<Atom<any>, Computed<Result | undefined>>()
		return {
			get: (id: IdOf<Record>) => {
				const atom = this.atoms.get()[id]
				if (!atom) {
					return undefined
				}
				return cache
					.get(atom, () => {
						const recordSignal = isEqual
							? computed(atom.name + ':equals', () => atom.get(), { isEqual })
							: atom
						return computed<Result | undefined>(name + ':' + id, () => {
							return derive(recordSignal.get() as Record)
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
	createSelectedComputedCache = <Selection, Result, Record extends R = R>(
		name: string,
		selector: (record: Record) => Selection | undefined,
		derive: (input: Selection) => Result | undefined
	): ComputedCache<Result, Record> => {
		const cache = new WeakCache<Atom<any>, Computed<Result | undefined>>()
		return {
			get: (id: IdOf<Record>) => {
				const atom = this.atoms.get()[id]
				if (!atom) {
					return undefined
				}

				return cache
					.get(atom, () => {
						const d = computed<Selection | undefined>(name + ':' + id + ':selector', () =>
							selector(atom.get() as Record)
						)
						return computed<Result | undefined>(name + ':' + id, () => derive(d.get() as Selection))
					})
					.get()
			},
		}
	}

	private _integrityChecker?: () => void | undefined

	/** @internal */
	ensureStoreIsUsable() {
		this.atomic(() => {
			this._integrityChecker ??= this.schema.createIntegrityChecker(this)
			this._integrityChecker?.()
		})
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

	private pendingAfterEvents: Map<IdOf<R>, { before: R | null; after: R | null }> | null = null
	private addDiffForAfterEvent(before: R | null, after: R | null) {
		assert(this.pendingAfterEvents, 'must be in event operation')
		if (before === after) return
		if (before && after) assert(before.id === after.id)
		if (!before && !after) return
		const id = (before || after)!.id
		const existing = this.pendingAfterEvents.get(id)
		if (existing) {
			existing.after = after
		} else {
			this.pendingAfterEvents.set(id, { before, after })
		}
	}
	private flushAtomicCallbacks() {
		let updateDepth = 0
		const source = this.isMergingRemoteChanges ? 'remote' : 'user'
		while (this.pendingAfterEvents) {
			const events = this.pendingAfterEvents
			this.pendingAfterEvents = null

			if (!this.sideEffects.isEnabled()) continue

			updateDepth++
			if (updateDepth > 100) {
				throw new Error('Maximum store update depth exceeded, bailing out')
			}

			for (const { before, after } of events.values()) {
				if (before && after) {
					this.sideEffects.handleAfterChange(before, after, source)
				} else if (before && !after) {
					this.sideEffects.handleAfterDelete(before, source)
				} else if (!before && after) {
					this.sideEffects.handleAfterCreate(after, source)
				}
			}

			if (!this.pendingAfterEvents) {
				this.sideEffects.handleOperationComplete(source)
			}
		}
	}
	private _isInAtomicOp = false
	/** @internal */
	atomic<T>(fn: () => T, runCallbacks = true): T {
		return transact(() => {
			if (this._isInAtomicOp) {
				if (!this.pendingAfterEvents) this.pendingAfterEvents = new Map()
				return fn()
			}

			this.pendingAfterEvents = new Map()
			const prevSideEffectsEnabled = this.sideEffects.isEnabled()
			this.sideEffects.setIsEnabled(runCallbacks ?? prevSideEffectsEnabled)
			this._isInAtomicOp = true
			try {
				const result = fn()

				this.flushAtomicCallbacks()

				return result
			} finally {
				this.pendingAfterEvents = null
				this.sideEffects.setIsEnabled(prevSideEffectsEnabled)
				this._isInAtomicOp = false
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
 * Collect all history entries by their adjacent sources.
 * For example, [user, user, remote, remote, user] would result in [user, remote, user],
 * with adjacent entries of the same source squashed into a single entry.
 *
 * @param entries - The array of history entries.
 * @returns A map of history entries by their sources.
 * @public
 */
function squashHistoryEntries<T extends UnknownRecord>(
	entries: HistoryEntry<T>[]
): HistoryEntry<T>[] {
	if (entries.length === 0) return []

	const chunked: HistoryEntry<T>[][] = []
	let chunk: HistoryEntry<T>[] = [entries[0]]
	let entry: HistoryEntry<T>

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
			changes: squashRecordDiffs(chunk.map((e) => e.changes)),
		}))
	)
}

class HistoryAccumulator<T extends UnknownRecord> {
	private _history: HistoryEntry<T>[] = []

	private _interceptors: Set<(entry: HistoryEntry<T>) => void> = new Set()

	addInterceptor(fn: (entry: HistoryEntry<T>) => void) {
		this._interceptors.add(fn)
		return () => {
			this._interceptors.delete(fn)
		}
	}

	add(entry: HistoryEntry<T>) {
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

type StoreContext<R extends UnknownRecord> = Store<R> | { store: Store<R> }
type ContextRecordType<Context extends StoreContext<any>> =
	Context extends Store<infer R> ? R : Context extends { store: Store<infer R> } ? R : never

/**
 * Free version of {@link Store.createComputedCache}.
 *
 * @example
 * ```ts
 * const myCache = createComputedCache('myCache', (editor: Editor, shape: TLShape) => {
 *     return editor.getSomethingExpensive(shape)
 * })
 *
 * myCache.get(editor, shape.id)
 * ```
 *
 * @public
 */
export function createComputedCache<
	Context extends StoreContext<any>,
	Result,
	Record extends ContextRecordType<Context> = ContextRecordType<Context>,
>(
	name: string,
	derive: (context: Context, record: Record) => Result | undefined,
	isEqual?: (a: Record, b: Record) => boolean
) {
	const cache = new WeakCache<Context, ComputedCache<Result, Record>>()
	return {
		get(context: Context, id: IdOf<Record>) {
			const computedCache = cache.get(context, () => {
				const store = (context instanceof Store ? context : context.store) as Store<Record>
				return store.createComputedCache(name, (record) => derive(context, record), isEqual)
			})
			return computedCache.get(id)
		},
	}
}

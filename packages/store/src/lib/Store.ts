import { Atom, Reactor, Signal, atom, computed, reactor, transact } from '@tldraw/state'
import {
	WeakCache,
	assert,
	filterEntries,
	getOwnProperty,
	isEqual,
	objectMapEntries,
	objectMapKeys,
	objectMapValues,
	throttleToNextFrame,
	uniqueId,
} from '@tldraw/utils'
import { AtomMap } from './AtomMap'
import { IdOf, RecordId, UnknownRecord } from './BaseRecord'
import { RecordScope } from './RecordType'
import { RecordsDiff, squashRecordDiffs } from './RecordsDiff'
import { StoreQueries } from './StoreQueries'
import { SerializedSchema, StoreSchema } from './StoreSchema'
import { StoreSideEffects } from './StoreSideEffects'
import { devFreeze } from './devFreeze'

/** @public */
export type RecordFromId<K extends RecordId<UnknownRecord>> =
	K extends RecordId<infer R> ? R : never

/**
 * A diff describing the changes to a collection.
 *
 * @public
 */
export interface CollectionDiff<T> {
	added?: Set<T>
	removed?: Set<T>
}

/** @public */
export type ChangeSource = 'user' | 'remote'

/** @public */
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

/** @public */
export interface CreateComputedCacheOpts<Data, R extends UnknownRecord> {
	areRecordsEqual?(a: R, b: R): boolean
	areResultsEqual?(a: Data, b: Data): boolean
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
	validate(record: unknown): R
	validateUsingKnownGoodVersion?(knownGoodVersion: R, record: unknown): R
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
	 * An AtomMap containing the stores records.
	 *
	 * @internal
	 * @readonly
	 */
	private readonly records: AtomMap<IdOf<R>, R>

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
	readonly query: StoreQueries<R>

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

	/**
	 * Function to dispose of any in-flight timeouts.
	 *
	 * @internal
	 */
	private cancelHistoryReactor(): void {
		/* noop */
	}

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

		this.id = id ?? uniqueId()
		this.schema = schema
		this.props = config.props

		if (initialData) {
			this.records = new AtomMap(
				'store',
				objectMapEntries(initialData).map(([id, record]) => [
					id,
					devFreeze(this.schema.validateRecord(this, record, 'initialize', null)),
				])
			)
		} else {
			this.records = new AtomMap('store')
		}

		this.query = new StoreQueries<R>(this.records, this.history)

		this.historyReactor = reactor(
			'Store.historyReactor',
			() => {
				// deref to make sure we're subscribed regardless of whether we need to propagate
				this.history.get()
				// If we have accumulated history, flush it and update listeners
				this._flushHistory()
			},
			{ scheduleEffect: (cb) => (this.cancelHistoryReactor = throttleToNextFrame(cb)) }
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

	dispose() {
		this.cancelHistoryReactor()
	}

	/**
	 * Filters out non-document changes from a diff. Returns null if there are no changes left.
	 * @param change - the records diff
	 * @param scope - the records scope
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
	 * @param phaseOverride - The phase override.
	 * @public
	 */
	put(records: R[], phaseOverride?: 'initialize'): void {
		this.atomic(() => {
			const updates: Record<IdOf<UnknownRecord>, [from: R, to: R]> = {}
			const additions: Record<IdOf<UnknownRecord>, R> = {}

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

				const initialValue = this.records.__unsafe__getWithoutCapture(record.id)
				// If we already have an atom for this record, update its value.
				if (initialValue) {
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

					record = devFreeze(record)
					this.records.set(record.id, record)

					didChange = true
					updates[record.id] = [initialValue, record]
					this.addDiffForAfterEvent(initialValue, record)
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

					// freeze it
					record = devFreeze(record)

					// Mark the change as a new addition.
					additions[record.id] = record
					this.addDiffForAfterEvent(null, record)

					this.records.set(record.id, record)
				}
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
	remove(ids: IdOf<R>[]): void {
		this.atomic(() => {
			const toDelete = new Set<IdOf<R>>(ids)
			const source = this.isMergingRemoteChanges ? 'remote' : 'user'

			if (this.sideEffects.isEnabled()) {
				for (const id of ids) {
					const record = this.records.__unsafe__getWithoutCapture(id)
					if (!record) continue

					if (this.sideEffects.handleBeforeDelete(record, source) === false) {
						toDelete.delete(id)
					}
				}
			}

			const actuallyDeleted = this.records.deleteMany(toDelete)
			if (actuallyDeleted.length === 0) return

			const removed = {} as RecordsDiff<R>['removed']
			for (const [id, record] of actuallyDeleted) {
				removed[id] = record
				this.addDiffForAfterEvent(record, null)
			}

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
	get<K extends IdOf<R>>(id: K): RecordFromId<K> | undefined {
		return this.records.get(id) as RecordFromId<K> | undefined
	}

	/**
	 * Get the value of a store record by its id without updating its epoch.
	 *
	 * @param id - The id of the record to get.
	 * @public
	 */
	unsafeGetWithoutCapture<K extends IdOf<R>>(id: K): RecordFromId<K> | undefined {
		return this.records.__unsafe__getWithoutCapture(id) as RecordFromId<K> | undefined
	}

	/**
	 * Creates a JSON payload from the record store.
	 *
	 * @param scope - The scope of records to serialize. Defaults to 'document'.
	 * @returns The record store snapshot as a JSON payload.
	 */
	serialize(scope: RecordScope | 'all' = 'document'): SerializedStore<R> {
		const result = {} as SerializedStore<R>
		for (const [id, record] of this.records) {
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
	 * const snapshot = store.getStoreSnapshot()
	 * store.loadStoreSnapshot(snapshot)
	 * ```
	 *
	 * @param scope - The scope of records to serialize. Defaults to 'document'.
	 *
	 * @public
	 */
	getStoreSnapshot(scope: RecordScope | 'all' = 'document'): StoreSnapshot<R> {
		return {
			store: this.serialize(scope),
			schema: this.schema.serialize(),
		}
	}

	/**
	 * @deprecated use `getSnapshot` from the 'tldraw' package instead.
	 */
	getSnapshot(scope: RecordScope | 'all' = 'document') {
		console.warn(
			'[tldraw] `Store.getSnapshot` is deprecated and will be removed in a future release. Use `getSnapshot` from the `tldraw` package instead.'
		)
		return this.getStoreSnapshot(scope)
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
	 * const snapshot = store.getStoreSnapshot()
	 * store.loadStoreSnapshot(snapshot)
	 * ```
	 *
	 * @param snapshot - The snapshot to load.
	 * @public
	 */
	loadStoreSnapshot(snapshot: StoreSnapshot<R>): void {
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
	 * @public
	 * @deprecated use `loadSnapshot` from the 'tldraw' package instead.
	 */
	loadSnapshot(snapshot: StoreSnapshot<R>) {
		console.warn(
			"[tldraw] `Store.loadSnapshot` is deprecated and will be removed in a future release. Use `loadSnapshot` from the 'tldraw' package instead."
		)
		this.loadStoreSnapshot(snapshot)
	}

	/**
	 * Get an array of all values in the store.
	 *
	 * @returns An array of all values in the store.
	 * @public
	 */
	allRecords(): R[] {
		return Array.from(this.records.values())
	}

	/**
	 * Removes all records from the store.
	 *
	 * @public
	 */
	clear(): void {
		this.remove(Array.from(this.records.keys()))
	}

	/**
	 * Update a record. To update multiple records at once, use the `update` method of the
	 * `TypedStore` class.
	 *
	 * @param id - The id of the record to update.
	 * @param updater - A function that updates the record.
	 */
	update<K extends IdOf<R>>(id: K, updater: (record: RecordFromId<K>) => RecordFromId<K>) {
		const existing = this.unsafeGetWithoutCapture(id)
		if (!existing) {
			console.error(`Record ${id} not found. This is probably an error`)
			return
		}

		this.put([updater(existing) as any])
	}

	/**
	 * Get whether the record store has a id.
	 *
	 * @param id - The id of the record to check.
	 * @public
	 */
	has<K extends IdOf<R>>(id: K): boolean {
		return this.records.has(id)
	}

	/**
	 * Add a new listener to the store.
	 *
	 * @param onHistory - The listener to call when the store updates.
	 * @param filters - Filters to apply to the listener.
	 * @returns A function to remove the listener.
	 */
	listen(onHistory: StoreListener<R>, filters?: Partial<StoreListenerFilters>) {
		// flush history so that this listener's history starts from exactly now
		this._flushHistory()

		const listener = {
			onHistory,
			filters: {
				source: filters?.source ?? 'all',
				scope: filters?.scope ?? 'all',
			},
		}

		if (!this.historyReactor.scheduler.isActivelyListening) {
			this.historyReactor.start()
			this.historyReactor.scheduler.execute()
		}

		this.listeners.add(listener)

		return () => {
			this.listeners.delete(listener)

			if (this.listeners.size === 0) {
				this.historyReactor.stop()
			}
		}
	}

	private isMergingRemoteChanges = false

	/**
	 * Merge changes from a remote source
	 *
	 * @param fn - A function that merges the external changes.
	 * @public
	 */
	mergeRemoteChanges(fn: () => void) {
		if (this.isMergingRemoteChanges) {
			return fn()
		}

		if (this._isInAtomicOp) {
			throw new Error('Cannot merge remote changes while in atomic operation')
		}

		try {
			this.atomic(fn, true, true)
		} finally {
			this.ensureStoreIsUsable()
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
	 * Create a cache based on values in the store. Pass in a function that takes and ID and a
	 * signal for the underlying record. Return a signal (usually a computed) for the cached value.
	 * For simple derivations, use {@link Store.createComputedCache}. This function is useful if you
	 * need more precise control over intermediate values.
	 */
	createCache<Result, Record extends R = R>(
		create: (id: IdOf<Record>, recordSignal: Signal<R>) => Signal<Result>
	) {
		const cache = new WeakCache<Atom<any>, Signal<Result>>()
		return {
			get: (id: IdOf<Record>) => {
				const atom = this.records.getAtom(id)
				if (!atom) return undefined
				return cache.get(atom, () => create(id, atom as Signal<R>)).get()
			},
		}
	}

	/**
	 * Create a computed cache.
	 *
	 * @param name - The name of the derivation cache.
	 * @param derive - A function used to derive the value of the cache.
	 * @param opts - Options for the computed cache.
	 * @public
	 */
	createComputedCache<Result, Record extends R = R>(
		name: string,
		derive: (record: Record) => Result | undefined,
		opts?: CreateComputedCacheOpts<Result, Record>
	): ComputedCache<Result, Record> {
		return this.createCache((id, record) => {
			const recordSignal = opts?.areRecordsEqual
				? computed(`${name}:${id}:isEqual`, () => record.get(), { isEqual: opts.areRecordsEqual })
				: record

			return computed<Result | undefined>(
				name + ':' + id,
				() => {
					return derive(recordSignal.get() as Record)
				},
				{
					isEqual: opts?.areResultsEqual,
				}
			)
		})
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
	private flushAtomicCallbacks(isMergingRemoteChanges: boolean) {
		let updateDepth = 0
		let source: ChangeSource = isMergingRemoteChanges ? 'remote' : 'user'
		while (this.pendingAfterEvents) {
			const events = this.pendingAfterEvents
			this.pendingAfterEvents = null

			if (!this.sideEffects.isEnabled()) continue

			updateDepth++
			if (updateDepth > 100) {
				throw new Error('Maximum store update depth exceeded, bailing out')
			}

			for (const { before, after } of events.values()) {
				if (before && after && before !== after && !isEqual(before, after)) {
					this.sideEffects.handleAfterChange(before, after, source)
				} else if (before && !after) {
					this.sideEffects.handleAfterDelete(before, source)
				} else if (!before && after) {
					this.sideEffects.handleAfterCreate(after, source)
				}
			}

			if (!this.pendingAfterEvents) {
				this.sideEffects.handleOperationComplete(source)
			} else {
				// if the side effects triggered by a remote operation resulted in more effects,
				// those extra effects should not be marked as originating remotely.
				source = 'user'
			}
		}
	}
	private _isInAtomicOp = false
	/** @internal */
	atomic<T>(fn: () => T, runCallbacks = true, isMergingRemoteChanges = false): T {
		return transact(() => {
			if (this._isInAtomicOp) {
				if (!this.pendingAfterEvents) this.pendingAfterEvents = new Map()
				const prevSideEffectsEnabled = this.sideEffects.isEnabled()
				assert(!isMergingRemoteChanges, 'cannot call mergeRemoteChanges while in atomic operation')
				try {
					// if we are in an atomic context with side effects ON allow switching before* callbacks OFF.
					// but don't allow switching them ON if they had been marked OFF before.
					if (prevSideEffectsEnabled && !runCallbacks) {
						this.sideEffects.setIsEnabled(false)
					}
					return fn()
				} finally {
					this.sideEffects.setIsEnabled(prevSideEffectsEnabled)
				}
			}

			this.pendingAfterEvents = new Map()
			const prevSideEffectsEnabled = this.sideEffects.isEnabled()
			this.sideEffects.setIsEnabled(runCallbacks ?? prevSideEffectsEnabled)
			this._isInAtomicOp = true

			if (isMergingRemoteChanges) {
				this.isMergingRemoteChanges = true
			}

			try {
				const result = fn()
				this.isMergingRemoteChanges = false

				this.flushAtomicCallbacks(isMergingRemoteChanges)

				return result
			} finally {
				this.pendingAfterEvents = null
				this.sideEffects.setIsEnabled(prevSideEffectsEnabled)
				this._isInAtomicOp = false
				this.isMergingRemoteChanges = false
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

/** @public */
export type StoreObject<R extends UnknownRecord> = Store<R> | { store: Store<R> }
/** @public */
export type StoreObjectRecordType<Context extends StoreObject<any>> =
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
	Context extends StoreObject<any>,
	Result,
	Record extends StoreObjectRecordType<Context> = StoreObjectRecordType<Context>,
>(
	name: string,
	derive: (context: Context, record: Record) => Result | undefined,
	opts?: CreateComputedCacheOpts<Result, Record>
) {
	const cache = new WeakCache<Context, ComputedCache<Result, Record>>()
	return {
		get(context: Context, id: IdOf<Record>) {
			const computedCache = cache.get(context, () => {
				const store = (context instanceof Store ? context : context.store) as Store<Record>
				return store.createComputedCache(name, (record) => derive(context, record), opts)
			})
			return computedCache.get(id)
		},
	}
}

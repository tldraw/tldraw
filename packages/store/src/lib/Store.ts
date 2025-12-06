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

/**
 * Extracts the record type from a record ID type.
 *
 * @example
 * ```ts
 * type BookId = RecordId<Book>
 * type BookType = RecordFromId<BookId> // Book
 * ```
 *
 * @public
 */
export type RecordFromId<K extends RecordId<UnknownRecord>> =
	K extends RecordId<infer R> ? R : never

/**
 * A diff describing the changes to a collection.
 *
 * @example
 * ```ts
 * const diff: CollectionDiff<string> = {
 *   added: new Set(['newItem']),
 *   removed: new Set(['oldItem'])
 * }
 * ```
 *
 * @public
 */
export interface CollectionDiff<T> {
	/** Items that were added to the collection */
	added?: Set<T>
	/** Items that were removed from the collection */
	removed?: Set<T>
}

/**
 * The source of a change to the store.
 * - `'user'` - Changes originating from local user actions
 * - `'remote'` - Changes originating from remote synchronization
 *
 * @public
 */
export type ChangeSource = 'user' | 'remote'

/**
 * Filters for store listeners to control which changes trigger the listener.
 *
 * @example
 * ```ts
 * const filters: StoreListenerFilters = {
 *   source: 'user', // Only listen to user changes
 *   scope: 'document' // Only listen to document-scoped records
 * }
 * ```
 *
 * @public
 */
export interface StoreListenerFilters {
	/** Filter by the source of changes */
	source: ChangeSource | 'all'
	/** Filter by the scope of records */
	scope: RecordScope | 'all'
}

/**
 * An entry containing changes that originated either by user actions or remote changes.
 * History entries are used to track and replay changes to the store.
 *
 * @example
 * ```ts
 * const entry: HistoryEntry<Book> = {
 *   changes: {
 *     added: { 'book:123': bookRecord },
 *     updated: {},
 *     removed: {}
 *   },
 *   source: 'user'
 * }
 * ```
 *
 * @public
 */
export interface HistoryEntry<R extends UnknownRecord = UnknownRecord> {
	/** The changes that occurred in this history entry */
	changes: RecordsDiff<R>
	/** The source of these changes */
	source: ChangeSource
}

/**
 * A function that will be called when the history changes.
 *
 * @example
 * ```ts
 * const listener: StoreListener<Book> = (entry) => {
 *   console.log('Changes:', entry.changes)
 *   console.log('Source:', entry.source)
 * }
 *
 * store.listen(listener)
 * ```
 *
 * @param entry - The history entry containing the changes
 *
 * @public
 */
export type StoreListener<R extends UnknownRecord> = (entry: HistoryEntry<R>) => void

/**
 * A computed cache that stores derived data for records.
 * The cache automatically updates when underlying records change and cleans up when records are deleted.
 *
 * @example
 * ```ts
 * const expensiveCache = store.createComputedCache(
 *   'expensive',
 *   (book: Book) => performExpensiveCalculation(book)
 * )
 *
 * const result = expensiveCache.get(bookId)
 * ```
 *
 * @public
 */
export interface ComputedCache<Data, R extends UnknownRecord> {
	/**
	 * Get the cached data for a record by its ID.
	 *
	 * @param id - The ID of the record
	 * @returns The cached data or undefined if the record doesn't exist
	 */
	get(id: IdOf<R>): Data | undefined
}

/**
 * Options for creating a computed cache.
 *
 * @example
 * ```ts
 * const options: CreateComputedCacheOpts<string[], Book> = {
 *   areRecordsEqual: (a, b) => a.title === b.title,
 *   areResultsEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b)
 * }
 * ```
 *
 * @public
 */
export interface CreateComputedCacheOpts<Data, R extends UnknownRecord> {
	/** Custom equality function for comparing records */
	areRecordsEqual?(a: R, b: R): boolean
	/** Custom equality function for comparing results */
	areResultsEqual?(a: Data, b: Data): boolean
}

/**
 * A serialized snapshot of the record store's values.
 * This is a plain JavaScript object that can be saved to storage or transmitted over the network.
 *
 * @example
 * ```ts
 * const serialized: SerializedStore<Book> = {
 *   'book:123': { id: 'book:123', typeName: 'book', title: 'The Lathe of Heaven' },
 *   'book:456': { id: 'book:456', typeName: 'book', title: 'The Left Hand of Darkness' }
 * }
 * ```
 *
 * @public
 */
export type SerializedStore<R extends UnknownRecord> = Record<IdOf<R>, R>

/**
 * A snapshot of the store including both data and schema information.
 * This enables proper migration when loading data from different schema versions.
 *
 * @example
 * ```ts
 * const snapshot = store.getStoreSnapshot()
 * // Later...
 * store.loadStoreSnapshot(snapshot)
 * ```
 *
 * @public
 */
export interface StoreSnapshot<R extends UnknownRecord> {
	/** The serialized store data */
	store: SerializedStore<R>
	/** The serialized schema information */
	schema: SerializedSchema
}

/**
 * A validator for store records that ensures data integrity.
 * Validators are called when records are created or updated.
 *
 * @example
 * ```ts
 * const bookValidator: StoreValidator<Book> = {
 *   validate(record: unknown): Book {
 *     // Validate and return the record
 *     if (typeof record !== 'object' || !record.title) {
 *       throw new Error('Invalid book')
 *     }
 *     return record as Book
 *   }
 * }
 * ```
 *
 * @public
 */
export interface StoreValidator<R extends UnknownRecord> {
	/**
	 * Validate a record.
	 *
	 * @param record - The record to validate
	 * @returns The validated record
	 * @throws When validation fails
	 */
	validate(record: unknown): R
	/**
	 * Validate a record using a known good version for reference.
	 *
	 * @param knownGoodVersion - A known valid version of the record
	 * @param record - The record to validate
	 * @returns The validated record
	 */
	validateUsingKnownGoodVersion?(knownGoodVersion: R, record: unknown): R
}

/**
 * A map of validators for each record type in the store.
 *
 * @example
 * ```ts
 * const validators: StoreValidators<Book | Author> = {
 *   book: bookValidator,
 *   author: authorValidator
 * }
 * ```
 *
 * @public
 */
export type StoreValidators<R extends UnknownRecord> = {
	[K in R['typeName']]: StoreValidator<Extract<R, { typeName: K }>>
}

/**
 * Information about an error that occurred in the store.
 *
 * @example
 * ```ts
 * const error: StoreError = {
 *   error: new Error('Validation failed'),
 *   phase: 'updateRecord',
 *   recordBefore: oldRecord,
 *   recordAfter: newRecord,
 *   isExistingValidationIssue: false
 * }
 * ```
 *
 * @public
 */
export interface StoreError {
	/** The error that occurred */
	error: Error
	/** The phase during which the error occurred */
	phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests'
	/** The record state before the operation (if applicable) */
	recordBefore?: unknown
	/** The record state after the operation */
	recordAfter: unknown
	/** Whether this is an existing validation issue */
	isExistingValidationIssue: boolean
}

/**
 * Extract the record type from a Store type.
 * Used internally for type inference.
 *
 * @internal
 */
export type StoreRecord<S extends Store<any>> = S extends Store<infer R> ? R : never

/**
 * A reactive store that manages collections of typed records.
 *
 * The Store is the central container for your application's data, providing:
 * - Reactive state management with automatic updates
 * - Type-safe record operations
 * - History tracking and change notifications
 * - Schema validation and migrations
 * - Side effects and business logic hooks
 * - Efficient querying and indexing
 *
 * @example
 * ```ts
 * // Create a store with schema
 * const schema = StoreSchema.create({
 *   book: Book,
 *   author: Author
 * })
 *
 * const store = new Store({
 *   schema,
 *   props: {}
 * })
 *
 * // Add records
 * const book = Book.create({ title: 'The Lathe of Heaven', author: 'Le Guin' })
 * store.put([book])
 *
 * // Listen to changes
 * store.listen((entry) => {
 *   console.log('Changes:', entry.changes)
 * })
 * ```
 *
 * @public
 */
export class Store<R extends UnknownRecord = UnknownRecord, Props = unknown> {
	/**
	 * The unique identifier of the store instance.
	 *
	 * @public
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
	 * Reactive queries and indexes for efficiently accessing store data.
	 * Provides methods for filtering, indexing, and subscribing to subsets of records.
	 *
	 * @example
	 * ```ts
	 * // Create an index by a property
	 * const booksByAuthor = store.query.index('book', 'author')
	 *
	 * // Get records matching criteria
	 * const inStockBooks = store.query.records('book', () => ({
	 *   inStock: { eq: true }
	 * }))
	 * ```
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

	/**
	 * The schema that defines the structure and validation rules for records in this store.
	 *
	 * @public
	 */
	readonly schema: StoreSchema<R, Props>

	/**
	 * Custom properties associated with this store instance.
	 *
	 * @public
	 */
	readonly props: Props

	/**
	 * A mapping of record scopes to the set of record type names that belong to each scope.
	 * Used to filter records by their persistence and synchronization behavior.
	 *
	 * @public
	 */
	public readonly scopedTypes: { readonly [K in RecordScope]: ReadonlySet<R['typeName']> }

	/**
	 * Side effects manager that handles lifecycle events for record operations.
	 * Allows registration of callbacks for create, update, delete, and validation events.
	 *
	 * @example
	 * ```ts
	 * store.sideEffects.registerAfterCreateHandler('book', (book) => {
	 *   console.log('Book created:', book.title)
	 * })
	 * ```
	 *
	 * @public
	 */
	public readonly sideEffects = new StoreSideEffects<R>(this)

	/**
	 * Creates a new Store instance.
	 *
	 * @example
	 * ```ts
	 * const store = new Store({
	 *   schema: StoreSchema.create({ book: Book }),
	 *   props: { appName: 'MyLibrary' },
	 *   initialData: savedData
	 * })
	 * ```
	 *
	 * @param config - Configuration object for the store
	 */
	constructor(config: {
		/** Optional unique identifier for the store */
		id?: string
		/** The store's initial data to populate on creation */
		initialData?: SerializedStore<R>
		/** The schema defining record types, validation, and migrations */
		schema: StoreSchema<R, Props>
		/** Custom properties for the store instance */
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
	 * Add or update records in the store. If a record with the same ID already exists, it will be updated.
	 * Otherwise, a new record will be created.
	 *
	 * @example
	 * ```ts
	 * // Add new records
	 * const book = Book.create({ title: 'Lathe Of Heaven', author: 'Le Guin' })
	 * store.put([book])
	 *
	 * // Update existing record
	 * store.put([{ ...book, title: 'The Lathe of Heaven' }])
	 * ```
	 *
	 * @param records - The records to add or update
	 * @param phaseOverride - Override the validation phase (used internally)
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
	 * Remove records from the store by their IDs.
	 *
	 * @example
	 * ```ts
	 * // Remove a single record
	 * store.remove([book.id])
	 *
	 * // Remove multiple records
	 * store.remove([book1.id, book2.id, book3.id])
	 * ```
	 *
	 * @param ids - The IDs of the records to remove
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
	 * Get a record by its ID. This creates a reactive subscription to the record.
	 *
	 * @example
	 * ```ts
	 * const book = store.get(bookId)
	 * if (book) {
	 *   console.log(book.title)
	 * }
	 * ```
	 *
	 * @param id - The ID of the record to get
	 * @returns The record if it exists, undefined otherwise
	 * @public
	 */
	get<K extends IdOf<R>>(id: K): RecordFromId<K> | undefined {
		return this.records.get(id) as RecordFromId<K> | undefined
	}

	/**
	 * Get a record by its ID without creating a reactive subscription.
	 * Use this when you need to access a record but don't want reactive updates.
	 *
	 * @example
	 * ```ts
	 * // Won't trigger reactive updates when this record changes
	 * const book = store.unsafeGetWithoutCapture(bookId)
	 * ```
	 *
	 * @param id - The ID of the record to get
	 * @returns The record if it exists, undefined otherwise
	 * @public
	 */
	unsafeGetWithoutCapture<K extends IdOf<R>>(id: K): RecordFromId<K> | undefined {
		return this.records.__unsafe__getWithoutCapture(id) as RecordFromId<K> | undefined
	}

	/**
	 * Serialize the store's records to a plain JavaScript object.
	 * Only includes records matching the specified scope.
	 *
	 * @example
	 * ```ts
	 * // Serialize only document records (default)
	 * const documentData = store.serialize('document')
	 *
	 * // Serialize all records
	 * const allData = store.serialize('all')
	 * ```
	 *
	 * @param scope - The scope of records to serialize. Defaults to 'document'
	 * @returns The serialized store data
	 * @public
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
	 * This includes both the data and schema information needed for proper migration.
	 *
	 * @example
	 * ```ts
	 * const snapshot = store.getStoreSnapshot()
	 * localStorage.setItem('myApp', JSON.stringify(snapshot))
	 *
	 * // Later...
	 * const saved = JSON.parse(localStorage.getItem('myApp'))
	 * store.loadStoreSnapshot(saved)
	 * ```
	 *
	 * @param scope - The scope of records to serialize. Defaults to 'document'
	 * @returns A snapshot containing both store data and schema information
	 * @public
	 */
	getStoreSnapshot(scope: RecordScope | 'all' = 'document'): StoreSnapshot<R> {
		return {
			store: this.serialize(scope),
			schema: this.schema.serialize(),
		}
	}

	/**
	 * Migrate a serialized snapshot to the current schema version.
	 * This applies any necessary migrations to bring old data up to date.
	 *
	 * @example
	 * ```ts
	 * const oldSnapshot = JSON.parse(localStorage.getItem('myApp'))
	 * const migratedSnapshot = store.migrateSnapshot(oldSnapshot)
	 * ```
	 *
	 * @param snapshot - The snapshot to migrate
	 * @returns The migrated snapshot with current schema version
	 * @throws Error if migration fails
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
	 * Load a serialized snapshot into the store, replacing all current data.
	 * The snapshot will be automatically migrated to the current schema version if needed.
	 *
	 * @example
	 * ```ts
	 * const snapshot = JSON.parse(localStorage.getItem('myApp'))
	 * store.loadStoreSnapshot(snapshot)
	 * ```
	 *
	 * @param snapshot - The snapshot to load
	 * @throws Error if migration fails or snapshot is invalid
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
	 * Get an array of all records in the store.
	 *
	 * @example
	 * ```ts
	 * const allRecords = store.allRecords()
	 * const books = allRecords.filter(r => r.typeName === 'book')
	 * ```
	 *
	 * @returns An array containing all records in the store
	 * @public
	 */
	allRecords(): R[] {
		return Array.from(this.records.values())
	}

	/**
	 * Remove all records from the store.
	 *
	 * @example
	 * ```ts
	 * store.clear()
	 * console.log(store.allRecords().length) // 0
	 * ```
	 *
	 * @public
	 */
	clear(): void {
		this.remove(Array.from(this.records.keys()))
	}

	/**
	 * Update a single record using an updater function. To update multiple records at once,
	 * use the `update` method of the `TypedStore` class.
	 *
	 * @example
	 * ```ts
	 * store.update(book.id, (book) => ({
	 *   ...book,
	 *   title: 'Updated Title'
	 * }))
	 * ```
	 *
	 * @param id - The ID of the record to update
	 * @param updater - A function that receives the current record and returns the updated record
	 * @public
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
	 * Check whether a record with the given ID exists in the store.
	 *
	 * @example
	 * ```ts
	 * if (store.has(bookId)) {
	 *   console.log('Book exists!')
	 * }
	 * ```
	 *
	 * @param id - The ID of the record to check
	 * @returns True if the record exists, false otherwise
	 * @public
	 */
	has<K extends IdOf<R>>(id: K): boolean {
		return this.records.has(id)
	}

	/**
	 * Add a listener that will be called when the store changes.
	 * Returns a function to remove the listener.
	 *
	 * @example
	 * ```ts
	 * const removeListener = store.listen((entry) => {
	 *   console.log('Changes:', entry.changes)
	 *   console.log('Source:', entry.source)
	 * })
	 *
	 * // Listen only to user changes to document records
	 * const removeDocumentListener = store.listen(
	 *   (entry) => console.log('Document changed:', entry),
	 *   { source: 'user', scope: 'document' }
	 * )
	 *
	 * // Later, remove the listener
	 * removeListener()
	 * ```
	 *
	 * @param onHistory - The listener function to call when changes occur
	 * @param filters - Optional filters to control when the listener is called
	 * @returns A function that removes the listener when called
	 * @public
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
	 * Merge changes from a remote source. Changes made within the provided function
	 * will be marked with source 'remote' instead of 'user'.
	 *
	 * @example
	 * ```ts
	 * // Changes from sync/collaboration
	 * store.mergeRemoteChanges(() => {
	 *   store.put(remoteRecords)
	 *   store.remove(deletedIds)
	 * })
	 * ```
	 *
	 * @param fn - A function that applies the remote changes
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
 * Collect and squash history entries by their adjacent sources.
 * Adjacent entries from the same source are combined into a single entry.
 *
 * For example: [user, user, remote, remote, user] becomes [user, remote, user]
 *
 * @example
 * ```ts
 * const entries = [
 *   { source: 'user', changes: userChanges1 },
 *   { source: 'user', changes: userChanges2 },
 *   { source: 'remote', changes: remoteChanges }
 * ]
 *
 * const squashed = squashHistoryEntries(entries)
 * // Results in 2 entries: combined user changes + remote changes
 * ```
 *
 * @param entries - The array of history entries to squash
 * @returns An array of squashed history entries
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

/**
 * Internal class that accumulates history entries before they are flushed to listeners.
 * Handles batching and squashing of adjacent entries from the same source.
 *
 * @internal
 */
class HistoryAccumulator<T extends UnknownRecord> {
	private _history: HistoryEntry<T>[] = []

	private _interceptors: Set<(entry: HistoryEntry<T>) => void> = new Set()

	/**
	 * Add an interceptor that will be called for each history entry.
	 * Returns a function to remove the interceptor.
	 */
	addInterceptor(fn: (entry: HistoryEntry<T>) => void) {
		this._interceptors.add(fn)
		return () => {
			this._interceptors.delete(fn)
		}
	}

	/**
	 * Add a history entry to the accumulator.
	 * Calls all registered interceptors with the entry.
	 */
	add(entry: HistoryEntry<T>) {
		this._history.push(entry)
		for (const interceptor of this._interceptors) {
			interceptor(entry)
		}
	}

	/**
	 * Flush all accumulated history entries, squashing adjacent entries from the same source.
	 * Clears the internal history buffer.
	 */
	flush() {
		const history = squashHistoryEntries(this._history)
		this._history = []
		return history
	}

	/**
	 * Clear all accumulated history entries without flushing.
	 */
	clear() {
		this._history = []
	}

	/**
	 * Check if there are any accumulated history entries.
	 */
	hasChanges() {
		return this._history.length > 0
	}
}

/**
 * A store or an object containing a store.
 * This type is used for APIs that can accept either a store directly or an object with a store property.
 *
 * @example
 * ```ts
 * function useStore(storeOrObject: StoreObject<MyRecord>) {
 *   const store = storeOrObject instanceof Store ? storeOrObject : storeOrObject.store
 *   return store
 * }
 * ```
 *
 * @public
 */
export type StoreObject<R extends UnknownRecord> = Store<R> | { store: Store<R> }
/**
 * Extract the record type from a StoreObject.
 *
 * @example
 * ```ts
 * type MyStoreObject = { store: Store<Book | Author> }
 * type Records = StoreObjectRecordType<MyStoreObject> // Book | Author
 * ```
 *
 * @public
 */
export type StoreObjectRecordType<Context extends StoreObject<any>> =
	Context extends Store<infer R> ? R : Context extends { store: Store<infer R> } ? R : never

/**
 * Create a computed cache that works with any StoreObject (store or object containing a store).
 * This is a standalone version of Store.createComputedCache that can work with multiple store instances.
 *
 * @example
 * ```ts
 * const expensiveCache = createComputedCache(
 *   'expensiveData',
 *   (context: { store: Store<Book> }, book: Book) => {
 *     return performExpensiveCalculation(book)
 *   }
 * )
 *
 * // Use with different store instances
 * const result1 = expensiveCache.get(storeObject1, bookId)
 * const result2 = expensiveCache.get(storeObject2, bookId)
 * ```
 *
 * @param name - A unique name for the cache (used for debugging)
 * @param derive - Function that derives a value from the context and record
 * @param opts - Optional configuration for equality checks
 * @returns A cache that can be used with multiple store instances
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

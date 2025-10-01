import {
	Atom,
	computed,
	Computed,
	EMPTY_ARRAY,
	isUninitialized,
	RESET_VALUE,
	withDiff,
} from '@tldraw/state'
import { areArraysShallowEqual, isEqual, objectMapValues } from '@tldraw/utils'
import { AtomMap } from './AtomMap'
import { IdOf, UnknownRecord } from './BaseRecord'
import { executeQuery, objectMatchesQuery, QueryExpression } from './executeQuery'
import { IncrementalSetConstructor } from './IncrementalSetConstructor'
import { RecordsDiff } from './RecordsDiff'
import { diffSets } from './setUtils'
import { CollectionDiff } from './Store'

/**
 * A type representing the diff of changes to a reactive store index.
 * Maps property values to the collection differences for record IDs that have that property value.
 *
 * @example
 * ```ts
 * // For an index on book titles, the diff might look like:
 * const titleIndexDiff: RSIndexDiff<Book, 'title'> = new Map([
 *   ['The Lathe of Heaven', { added: new Set(['book:1']), removed: new Set() }],
 *   ['Animal Farm', { added: new Set(), removed: new Set(['book:2']) }]
 * ])
 * ```
 *
 * @public
 */
export type RSIndexDiff<
	R extends UnknownRecord,
	Property extends string & keyof R = string & keyof R,
> = Map<R[Property], CollectionDiff<IdOf<R>>>

/**
 * A type representing a reactive store index as a map from property values to sets of record IDs.
 * This is used to efficiently look up records by a specific property value.
 *
 * @example
 * ```ts
 * // Index mapping book titles to the IDs of books with that title
 * const titleIndex: RSIndexMap<Book, 'title'> = new Map([
 *   ['The Lathe of Heaven', new Set(['book:1'])],
 *   ['Animal Farm', new Set(['book:2', 'book:3'])]
 * ])
 * ```
 *
 * @public
 */
export type RSIndexMap<
	R extends UnknownRecord,
	Property extends string & keyof R = string & keyof R,
> = Map<R[Property], Set<IdOf<R>>>

/**
 * A reactive computed index that provides efficient lookups of records by property values.
 * Returns a computed value containing an RSIndexMap with diffs for change tracking.
 *
 * @example
 * ```ts
 * // Create an index on book authors
 * const authorIndex: RSIndex<Book, 'authorId'> = store.query.index('book', 'authorId')
 *
 * // Get all books by a specific author
 * const leguinBooks = authorIndex.get().get('author:leguin')
 * ```
 *
 * @public
 */
export type RSIndex<
	R extends UnknownRecord,
	Property extends string & keyof R = string & keyof R,
> = Computed<RSIndexMap<R, Property>, RSIndexDiff<R, Property>>

/**
 * A class that provides reactive querying capabilities for a record store.
 * Offers methods to create indexes, filter records, and perform efficient lookups with automatic cache management.
 * All queries are reactive and will automatically update when the underlying store data changes.
 *
 * @example
 * ```ts
 * // Create a store with books
 * const store = new Store({ schema: StoreSchema.create({ book: Book, author: Author }) })
 *
 * // Get reactive queries for books
 * const booksByAuthor = store.query.index('book', 'authorId')
 * const inStockBooks = store.query.records('book', () => ({ inStock: { eq: true } }))
 * ```
 *
 * @public
 */
export class StoreQueries<R extends UnknownRecord> {
	/**
	 * Creates a new StoreQueries instance.
	 *
	 * recordMap - The atom map containing all records in the store
	 * history - The atom tracking the store's change history with diffs
	 *
	 * @internal
	 */
	constructor(
		private readonly recordMap: AtomMap<IdOf<R>, R>,
		private readonly history: Atom<number, RecordsDiff<R>>
	) {}

	/**
	 * A cache of derivations (indexes).
	 *
	 * @internal
	 */
	private indexCache = new Map<string, RSIndex<R>>()

	/**
	 * A cache of derivations (filtered histories).
	 *
	 * @internal
	 */
	private historyCache = new Map<string, Computed<number, RecordsDiff<R>>>()

	/**
	 * Creates a reactive computed that tracks the change history for records of a specific type.
	 * The returned computed provides incremental diffs showing what records of the given type
	 * have been added, updated, or removed.
	 *
	 * @param typeName - The type name to filter the history by
	 * @returns A computed value containing the current epoch and diffs of changes for the specified type
	 *
	 * @example
	 * ```ts
	 * // Track changes to book records only
	 * const bookHistory = store.query.filterHistory('book')
	 *
	 * // React to book changes
	 * react('book-changes', () => {
	 *   const currentEpoch = bookHistory.get()
	 *   console.log('Books updated at epoch:', currentEpoch)
	 * })
	 * ```
	 *
	 * @public
	 */
	public filterHistory<TypeName extends R['typeName']>(
		typeName: TypeName
	): Computed<number, RecordsDiff<Extract<R, { typeName: TypeName }>>> {
		type S = Extract<R, { typeName: TypeName }>

		if (this.historyCache.has(typeName)) {
			return this.historyCache.get(typeName) as any
		}

		const filtered = computed<number, RecordsDiff<S>>(
			'filterHistory:' + typeName,
			(lastValue, lastComputedEpoch) => {
				if (isUninitialized(lastValue)) {
					return this.history.get()
				}

				const diff = this.history.getDiffSince(lastComputedEpoch)
				if (diff === RESET_VALUE) return this.history.get()

				const res = { added: {}, removed: {}, updated: {} } as RecordsDiff<S>
				let numAdded = 0
				let numRemoved = 0
				let numUpdated = 0

				for (const changes of diff) {
					for (const added of objectMapValues(changes.added)) {
						if (added.typeName === typeName) {
							if (res.removed[added.id as IdOf<S>]) {
								const original = res.removed[added.id as IdOf<S>]
								delete res.removed[added.id as IdOf<S>]
								numRemoved--
								if (original !== added) {
									res.updated[added.id as IdOf<S>] = [original, added as S]
									numUpdated++
								}
							} else {
								res.added[added.id as IdOf<S>] = added as S
								numAdded++
							}
						}
					}

					for (const [from, to] of objectMapValues(changes.updated)) {
						if (to.typeName === typeName) {
							if (res.added[to.id as IdOf<S>]) {
								res.added[to.id as IdOf<S>] = to as S
							} else if (res.updated[to.id as IdOf<S>]) {
								res.updated[to.id as IdOf<S>] = [res.updated[to.id as IdOf<S>][0], to as S]
							} else {
								res.updated[to.id as IdOf<S>] = [from as S, to as S]
								numUpdated++
							}
						}
					}

					for (const removed of objectMapValues(changes.removed)) {
						if (removed.typeName === typeName) {
							if (res.added[removed.id as IdOf<S>]) {
								// was added during this diff sequence, so just undo the add
								delete res.added[removed.id as IdOf<S>]
								numAdded--
							} else if (res.updated[removed.id as IdOf<S>]) {
								// remove oldest version
								res.removed[removed.id as IdOf<S>] = res.updated[removed.id as IdOf<S>][0]
								delete res.updated[removed.id as IdOf<S>]
								numUpdated--
								numRemoved++
							} else {
								res.removed[removed.id as IdOf<S>] = removed as S
								numRemoved++
							}
						}
					}
				}

				if (numAdded || numRemoved || numUpdated) {
					return withDiff(this.history.get(), res)
				} else {
					return lastValue
				}
			},
			{ historyLength: 100 }
		)

		this.historyCache.set(typeName, filtered)

		return filtered
	}

	/**
	 * Creates a reactive index that maps property values to sets of record IDs for efficient lookups.
	 * The index automatically updates when records are added, updated, or removed, and results are cached
	 * for performance.
	 *
	 * @param typeName - The type name of records to index
	 * @param property - The property name to index by
	 * @returns A reactive computed containing the index map with change diffs
	 *
	 * @example
	 * ```ts
	 * // Create an index of books by author ID
	 * const booksByAuthor = store.query.index('book', 'authorId')
	 *
	 * // Get all books by a specific author
	 * const authorBooks = booksByAuthor.get().get('author:leguin')
	 * console.log(authorBooks) // Set<RecordId<Book>>
	 *
	 * // Index by title for quick title lookups
	 * const booksByTitle = store.query.index('book', 'title')
	 * const booksLatheOfHeaven = booksByTitle.get().get('The Lathe of Heaven')
	 * ```
	 *
	 * @public
	 */
	public index<
		TypeName extends R['typeName'],
		Property extends string & keyof Extract<R, { typeName: TypeName }>,
	>(typeName: TypeName, property: Property): RSIndex<Extract<R, { typeName: TypeName }>, Property> {
		const cacheKey = typeName + ':' + property

		if (this.indexCache.has(cacheKey)) {
			return this.indexCache.get(cacheKey) as any
		}

		const index = this.__uncached_createIndex(typeName, property)

		this.indexCache.set(cacheKey, index as any)

		return index
	}

	/**
	 * Creates a new index without checking the cache. This method performs the actual work
	 * of building the reactive index computation that tracks property values to record ID sets.
	 *
	 * @param typeName - The type name of records to index
	 * @param property - The property name to index by
	 * @returns A reactive computed containing the index map with change diffs
	 *
	 * @internal
	 */
	__uncached_createIndex<
		TypeName extends R['typeName'],
		Property extends string & keyof Extract<R, { typeName: TypeName }>,
	>(typeName: TypeName, property: Property): RSIndex<Extract<R, { typeName: TypeName }>, Property> {
		type S = Extract<R, { typeName: TypeName }>

		const typeHistory = this.filterHistory(typeName)

		const fromScratch = () => {
			// deref typeHistory early so that the first time the incremental version runs
			// it gets a diff to work with instead of having to bail to this from-scratch version
			typeHistory.get()
			const res = new Map<S[Property], Set<IdOf<S>>>()
			for (const record of this.recordMap.values()) {
				if (record.typeName === typeName) {
					const value = (record as S)[property]
					if (!res.has(value)) {
						res.set(value, new Set())
					}
					res.get(value)!.add(record.id)
				}
			}

			return res
		}

		return computed<RSIndexMap<S, Property>, RSIndexDiff<S, Property>>(
			'index:' + typeName + ':' + property,
			(prevValue, lastComputedEpoch) => {
				if (isUninitialized(prevValue)) return fromScratch()

				const history = typeHistory.getDiffSince(lastComputedEpoch)
				if (history === RESET_VALUE) {
					return fromScratch()
				}

				const setConstructors = new Map<any, IncrementalSetConstructor<IdOf<S>>>()

				const add = (value: S[Property], id: IdOf<S>) => {
					let setConstructor = setConstructors.get(value)
					if (!setConstructor)
						setConstructor = new IncrementalSetConstructor<IdOf<S>>(
							prevValue.get(value) ?? new Set()
						)
					setConstructor.add(id)
					setConstructors.set(value, setConstructor)
				}

				const remove = (value: S[Property], id: IdOf<S>) => {
					let set = setConstructors.get(value)
					if (!set) set = new IncrementalSetConstructor<IdOf<S>>(prevValue.get(value) ?? new Set())
					set.remove(id)
					setConstructors.set(value, set)
				}

				for (const changes of history) {
					for (const record of objectMapValues(changes.added)) {
						if (record.typeName === typeName) {
							const value = (record as S)[property]
							add(value, record.id)
						}
					}
					for (const [from, to] of objectMapValues(changes.updated)) {
						if (to.typeName === typeName) {
							const prev = (from as S)[property]
							const next = (to as S)[property]
							if (prev !== next) {
								remove(prev, to.id)
								add(next, to.id)
							}
						}
					}
					for (const record of objectMapValues(changes.removed)) {
						if (record.typeName === typeName) {
							const value = (record as S)[property]
							remove(value, record.id)
						}
					}
				}

				let nextValue: undefined | RSIndexMap<S, Property> = undefined
				let nextDiff: undefined | RSIndexDiff<S, Property> = undefined

				for (const [value, setConstructor] of setConstructors) {
					const result = setConstructor.get()
					if (!result) continue
					if (!nextValue) nextValue = new Map(prevValue)
					if (!nextDiff) nextDiff = new Map()
					if (result.value.size === 0) {
						nextValue.delete(value)
					} else {
						nextValue.set(value, result.value)
					}
					nextDiff.set(value, result.diff)
				}

				if (nextValue && nextDiff) {
					return withDiff(nextValue, nextDiff)
				}

				return prevValue
			},
			{ historyLength: 100 }
		)
	}

	/**
	 * Creates a reactive query that returns the first record matching the given query criteria.
	 * Returns undefined if no matching record is found. The query automatically updates
	 * when records change.
	 *
	 * @param typeName - The type name of records to query
	 * @param queryCreator - Function that returns the query expression object to match against
	 * @param name - Optional name for the query computation (used for debugging)
	 * @returns A computed value containing the first matching record or undefined
	 *
	 * @example
	 * ```ts
	 * // Find the first book with a specific title
	 * const bookLatheOfHeaven = store.query.record('book', () => ({ title: { eq: 'The Lathe of Heaven' } }))
	 * console.log(bookLatheOfHeaven.get()?.title) // 'The Lathe of Heaven' or undefined
	 *
	 * // Find any book in stock
	 * const anyInStockBook = store.query.record('book', () => ({ inStock: { eq: true } }))
	 * ```
	 *
	 * @public
	 */
	record<TypeName extends R['typeName']>(
		typeName: TypeName,
		queryCreator: () => QueryExpression<Extract<R, { typeName: TypeName }>> = () => ({}),
		name = 'record:' + typeName + (queryCreator ? ':' + queryCreator.toString() : '')
	): Computed<Extract<R, { typeName: TypeName }> | undefined> {
		type S = Extract<R, { typeName: TypeName }>
		const ids = this.ids(typeName, queryCreator, name)

		return computed<S | undefined>(name, () => {
			for (const id of ids.get()) {
				return this.recordMap.get(id) as S | undefined
			}
			return undefined
		})
	}

	/**
	 * Creates a reactive query that returns an array of all records matching the given query criteria.
	 * The array automatically updates when records are added, updated, or removed.
	 *
	 * @param typeName - The type name of records to query
	 * @param queryCreator - Function that returns the query expression object to match against
	 * @param name - Optional name for the query computation (used for debugging)
	 * @returns A computed value containing an array of all matching records
	 *
	 * @example
	 * ```ts
	 * // Get all books in stock
	 * const inStockBooks = store.query.records('book', () => ({ inStock: { eq: true } }))
	 * console.log(inStockBooks.get()) // Book[]
	 *
	 * // Get all books by a specific author
	 * const leguinBooks = store.query.records('book', () => ({ authorId: { eq: 'author:leguin' } }))
	 *
	 * // Get all books (no filter)
	 * const allBooks = store.query.records('book')
	 * ```
	 *
	 * @public
	 */
	records<TypeName extends R['typeName']>(
		typeName: TypeName,
		queryCreator: () => QueryExpression<Extract<R, { typeName: TypeName }>> = () => ({}),
		name = 'records:' + typeName + (queryCreator ? ':' + queryCreator.toString() : '')
	): Computed<Array<Extract<R, { typeName: TypeName }>>> {
		type S = Extract<R, { typeName: TypeName }>
		const ids = this.ids(typeName, queryCreator, 'ids:' + name)

		return computed<S[]>(
			name,
			() => {
				return Array.from(ids.get(), (id) => this.recordMap.get(id) as S)
			},
			{
				isEqual: areArraysShallowEqual,
			}
		)
	}

	/**
	 * Creates a reactive query that returns a set of record IDs matching the given query criteria.
	 * This is more efficient than `records()` when you only need the IDs and not the full record objects.
	 * The set automatically updates with collection diffs when records change.
	 *
	 * @param typeName - The type name of records to query
	 * @param queryCreator - Function that returns the query expression object to match against
	 * @param name - Optional name for the query computation (used for debugging)
	 * @returns A computed value containing a set of matching record IDs with collection diffs
	 *
	 * @example
	 * ```ts
	 * // Get IDs of all books in stock
	 * const inStockBookIds = store.query.ids('book', () => ({ inStock: { eq: true } }))
	 * console.log(inStockBookIds.get()) // Set<RecordId<Book>>
	 *
	 * // Get all book IDs (no filter)
	 * const allBookIds = store.query.ids('book')
	 *
	 * // Use with other queries for efficient lookups
	 * const authorBookIds = store.query.ids('book', () => ({ authorId: { eq: 'author:leguin' } }))
	 * ```
	 *
	 * @public
	 */
	ids<TypeName extends R['typeName']>(
		typeName: TypeName,
		queryCreator: () => QueryExpression<Extract<R, { typeName: TypeName }>> = () => ({}),
		name = 'ids:' + typeName + (queryCreator ? ':' + queryCreator.toString() : '')
	): Computed<
		Set<IdOf<Extract<R, { typeName: TypeName }>>>,
		CollectionDiff<IdOf<Extract<R, { typeName: TypeName }>>>
	> {
		type S = Extract<R, { typeName: TypeName }>

		const typeHistory = this.filterHistory(typeName)

		const fromScratch = () => {
			// deref type history early to allow first incremental update to use diffs
			typeHistory.get()
			const query: QueryExpression<S> = queryCreator()
			if (Object.keys(query).length === 0) {
				const ids = new Set<IdOf<S>>()
				for (const record of this.recordMap.values()) {
					if (record.typeName === typeName) ids.add(record.id)
				}
				return ids
			}

			return executeQuery(this, typeName, query)
		}

		const fromScratchWithDiff = (prevValue: Set<IdOf<S>>) => {
			const nextValue = fromScratch()
			const diff = diffSets(prevValue, nextValue)
			if (diff) {
				return withDiff(nextValue, diff)
			} else {
				return prevValue
			}
		}
		const cachedQuery = computed('ids_query:' + name, queryCreator, {
			isEqual,
		})

		return computed(
			'query:' + name,
			(prevValue, lastComputedEpoch) => {
				const query = cachedQuery.get()
				if (isUninitialized(prevValue)) {
					return fromScratch()
				}

				// if the query changed since last time this ran then we need to start again
				if (lastComputedEpoch < cachedQuery.lastChangedEpoch) {
					return fromScratchWithDiff(prevValue)
				}

				// otherwise iterate over the changes from the store and apply them to the previous value if needed
				const history = typeHistory.getDiffSince(lastComputedEpoch)
				if (history === RESET_VALUE) {
					return fromScratchWithDiff(prevValue)
				}

				const setConstructor = new IncrementalSetConstructor<IdOf<S>>(
					prevValue
				) as IncrementalSetConstructor<IdOf<S>>

				for (const changes of history) {
					for (const added of objectMapValues(changes.added)) {
						if (added.typeName === typeName && objectMatchesQuery(query, added)) {
							setConstructor.add(added.id)
						}
					}
					for (const [_, updated] of objectMapValues(changes.updated)) {
						if (updated.typeName === typeName) {
							if (objectMatchesQuery(query, updated)) {
								setConstructor.add(updated.id)
							} else {
								setConstructor.remove(updated.id)
							}
						}
					}
					for (const removed of objectMapValues(changes.removed)) {
						if (removed.typeName === typeName) {
							setConstructor.remove(removed.id)
						}
					}
				}

				const result = setConstructor.get()
				if (!result) {
					return prevValue
				}

				return withDiff(result.value, result.diff)
			},
			{ historyLength: 50 }
		)
	}

	/**
	 * Executes a one-time query against the current store state and returns matching records.
	 * This is a non-reactive query that returns results immediately without creating a computed value.
	 * Use this when you need a snapshot of data at a specific point in time.
	 *
	 * @param typeName - The type name of records to query
	 * @param query - The query expression object to match against
	 * @returns An array of records that match the query at the current moment
	 *
	 * @example
	 * ```ts
	 * // Get current in-stock books (non-reactive)
	 * const currentInStockBooks = store.query.exec('book', { inStock: { eq: true } })
	 * console.log(currentInStockBooks) // Book[]
	 *
	 * // Unlike records(), this won't update when the data changes
	 * const staticBookList = store.query.exec('book', { authorId: { eq: 'author:leguin' } })
	 * ```
	 *
	 * @public
	 */
	exec<TypeName extends R['typeName']>(
		typeName: TypeName,
		query: QueryExpression<Extract<R, { typeName: TypeName }>>
	): Array<Extract<R, { typeName: TypeName }>> {
		const ids = executeQuery(this, typeName, query)
		if (ids.size === 0) {
			return EMPTY_ARRAY
		}
		return Array.from(ids, (id) => this.recordMap.get(id) as Extract<R, { typeName: TypeName }>)
	}
}

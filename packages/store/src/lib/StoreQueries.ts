import {
	Atom,
	computed,
	Computed,
	EMPTY_ARRAY,
	isUninitialized,
	RESET_VALUE,
	withDiff,
} from '@tldraw/state'
import { areArraysShallowEqual, objectMapValues } from '@tldraw/utils'
import isEqual from 'lodash.isequal'
import { AtomMap } from './AtomMap'
import { IdOf, UnknownRecord } from './BaseRecord'
import { executeQuery, objectMatchesQuery, QueryExpression } from './executeQuery'
import { IncrementalSetConstructor } from './IncrementalSetConstructor'
import { RecordsDiff } from './RecordsDiff'
import { diffSets } from './setUtils'
import { CollectionDiff } from './Store'

/** @public */
export type RSIndexDiff<
	R extends UnknownRecord,
	Property extends string & keyof R = string & keyof R
> = Map

/** @public */
export type RSIndexMap<
	R extends UnknownRecord,
	Property extends string & keyof R = string & keyof R
> = Map

/** @public */
export type RSIndex<
	R extends UnknownRecord,
	Property extends string & keyof R = string & keyof R
> = Computed

/**
 * A class that provides a 'namespace' for the various kinds of indexes one may wish to derive from
 * the record store.
 * @public
 */
export class StoreQueries<R extends UnknownRecord> {
	constructor(private readonly recordMap: AtomMap, private readonly history: Atom) {}

	/**
	 * A cache of derivations (indexes).
	 *
	 * @internal
	 */
	private indexCache = new Map<string, RSIndex>()

	/**
	 * A cache of derivations (filtered histories).
	 *
	 * @internal
	 */
	private historyCache = new Map<string, Computed>()

	/**
	 * Create a derivation that contains the history for a given type
	 *
	 * @param typeName - The name of the type to filter by.
	 * @returns A derivation that returns the ids of all records of the given type.
	 * @public
	 */
	public filterHistory<TypeName extends R['typeName']>(typeName: TypeName): Computed {
		type S = Extract

		if (this.historyCache.has(typeName)) {
			return this.historyCache.get(typeName) as any
		}

		const filtered = computed<number, RecordsDiff>(
			'filterHistory:' + typeName,
			(lastValue, lastComputedEpoch) => {
				if (isUninitialized(lastValue)) {
					return this.history.get()
				}

				const diff = this.history.getDiffSince(lastComputedEpoch)
				if (diff === RESET_VALUE) return this.history.get()

				const res = { added: {}, removed: {}, updated: {} } as RecordsDiff
				let numAdded = 0
				let numRemoved = 0
				let numUpdated = 0

				for (const changes of diff) {
					for (const added of objectMapValues(changes.added)) {
						if (added.typeName === typeName) {
							if (res.removed[added.id as IdOf]) {
								const original = res.removed[added.id as IdOf]
								delete res.removed[added.id as IdOf]
								numRemoved--
								if (original !== added) {
									res.updated[added.id as IdOf] = [original, added as S]
									numUpdated++
								}
							} else {
								res.added[added.id as IdOf] = added as S
								numAdded++
							}
						}
					}

					for (const [from, to] of objectMapValues(changes.updated)) {
						if (to.typeName === typeName) {
							if (res.added[to.id as IdOf]) {
								res.added[to.id as IdOf] = to as S
							} else if (res.updated[to.id as IdOf]) {
								res.updated[to.id as IdOf] = [res.updated[to.id as IdOf][0], to as S]
							} else {
								res.updated[to.id as IdOf] = [from as S, to as S]
								numUpdated++
							}
						}
					}

					for (const removed of objectMapValues(changes.removed)) {
						if (removed.typeName === typeName) {
							if (res.added[removed.id as IdOf]) {
								// was added during this diff sequence, so just undo the add
								delete res.added[removed.id as IdOf]
								numAdded--
							} else if (res.updated[removed.id as IdOf]) {
								// remove oldest version
								res.removed[removed.id as IdOf] = res.updated[removed.id as IdOf][0]
								delete res.updated[removed.id as IdOf]
								numUpdated--
								numRemoved++
							} else {
								res.removed[removed.id as IdOf] = removed as S
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
	 * Create a derivation that returns an index on a property for the given type.
	 *
	 * @param typeName - The name of the type.
	 * @param property - The name of the property.
	 * @public
	 */
	public index<TypeName extends R['typeName'], Property extends string & keyof Extract>(
		typeName: TypeName,
		property: Property
	): RSIndex {
		const cacheKey = typeName + ':' + property

		if (this.indexCache.has(cacheKey)) {
			return this.indexCache.get(cacheKey) as any
		}

		const index = this.__uncached_createIndex(typeName, property)

		this.indexCache.set(cacheKey, index as any)

		return index
	}

	/**
	 * Create a derivation that returns an index on a property for the given type.
	 *
	 * @param typeName - The name of the type?.
	 * @param property - The name of the property?.
	 * @internal
	 */
	__uncached_createIndex<TypeName extends R['typeName'], Property extends string & keyof Extract>(
		typeName: TypeName,
		property: Property
	): RSIndex {
		type S = Extract

		const typeHistory = this.filterHistory(typeName)

		const fromScratch = () => {
			// deref typeHistory early so that the first time the incremental version runs
			// it gets a diff to work with instead of having to bail to this from-scratch version
			typeHistory.get()
			const res = new Map<S[Property], Set>()
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

		return computed<RSIndexMap, RSIndexDiff>(
			'index:' + typeName + ':' + property,
			(prevValue, lastComputedEpoch) => {
				if (isUninitialized(prevValue)) return fromScratch()

				const history = typeHistory.getDiffSince(lastComputedEpoch)
				if (history === RESET_VALUE) {
					return fromScratch()
				}

				const setConstructors = new Map<any, IncrementalSetConstructor>()

				const add = (value: S[Property], id: IdOf) => {
					let setConstructor = setConstructors.get(value)
					if (!setConstructor)
						setConstructor = new IncrementalSetConstructor<IdOf>(prevValue.get(value) ?? new Set())
					setConstructor.add(id)
					setConstructors.set(value, setConstructor)
				}

				const remove = (value: S[Property], id: IdOf) => {
					let set = setConstructors.get(value)
					if (!set) set = new IncrementalSetConstructor<IdOf>(prevValue.get(value) ?? new Set())
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

				let nextValue: undefined | RSIndexMap = undefined
				let nextDiff: undefined | RSIndexDiff = undefined

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
	 * Create a derivation that will return a signle record matching the given query.
	 *
	 * It will return undefined if there is no matching record
	 *
	 * @param typeName - The name of the type?
	 * @param queryCreator - A function that returns the query expression.
	 * @param name - (optional) The name of the query.
	 */
	record<TypeName extends R['typeName']>(
		typeName: TypeName,
		queryCreator: () => QueryExpression = () => ({}),
		name = 'record:' + typeName + (queryCreator ? ':' + queryCreator.toString() : '')
	): Computed {
		type S = Extract
		const ids = this.ids(typeName, queryCreator, name)

		return computed<S | undefined>(name, () => {
			for (const id of ids.get()) {
				return this.recordMap.get(id) as S | undefined
			}
			return undefined
		})
	}

	/**
	 * Create a derivation that will return an array of records matching the given query
	 *
	 * @param typeName - The name of the type?
	 * @param queryCreator - A function that returns the query expression.
	 * @param name - (optinal) The name of the query.
	 */
	records<TypeName extends R['typeName']>(
		typeName: TypeName,
		queryCreator: () => QueryExpression = () => ({}),
		name = 'records:' + typeName + (queryCreator ? ':' + queryCreator.toString() : '')
	): Computed {
		type S = Extract
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
	 * Create a derivation that will return the ids of all records of the given type.
	 *
	 * @param typeName - The name of the type.
	 * @param queryCreator - A function that returns the query expression.
	 * @param name - (optinal) The name of the query.
	 */
	ids<TypeName extends R['typeName']>(
		typeName: TypeName,
		queryCreator: () => QueryExpression = () => ({}),
		name = 'ids:' + typeName + (queryCreator ? ':' + queryCreator.toString() : '')
	): Computed {
		type S = Extract

		const typeHistory = this.filterHistory(typeName)

		const fromScratch = () => {
			// deref type history early to allow first incremental update to use diffs
			typeHistory.get()
			const query: QueryExpression = queryCreator()
			if (Object.keys(query).length === 0) {
				const ids = new Set<IdOf>()
				for (const record of this.recordMap.values()) {
					if (record.typeName === typeName) ids.add(record.id)
				}
				return ids
			}

			return executeQuery(this, typeName, query)
		}

		const fromScratchWithDiff = (prevValue: Set) => {
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

				const setConstructor = new IncrementalSetConstructor<IdOf>(
					prevValue
				) as IncrementalSetConstructor

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

	exec<TypeName extends R['typeName']>(typeName: TypeName, query: QueryExpression): Array {
		const ids = executeQuery(this, typeName, query)
		if (ids.size === 0) {
			return EMPTY_ARRAY
		}
		return Array.from(ids, (id) => this.recordMap.get(id) as Extract)
	}
}

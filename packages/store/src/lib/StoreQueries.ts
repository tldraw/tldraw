import {
	Atom,
	computed,
	Computed,
	EMPTY_ARRAY,
	isUninitialized,
	RESET_VALUE,
	withDiff,
} from '@tldraw/state'
import { objectMapValues } from '@tldraw/utils'
import isEqual from 'lodash.isequal'
import { IdOf, UnknownRecord } from './BaseRecord'
import { executeQuery, objectMatchesQuery, QueryExpression } from './executeQuery'
import { IncrementalSetConstructor } from './IncrementalSetConstructor'
import { diffSets } from './setUtils'
import { CollectionDiff, RecordsDiff } from './Store'

export type RSIndexDiff<
	R extends UnknownRecord,
	Property extends string & keyof R = string & keyof R
> = Map<R[Property], CollectionDiff<IdOf<R>>>

export type RSIndexMap<
	R extends UnknownRecord,
	Property extends string & keyof R = string & keyof R
> = Map<R[Property], Set<IdOf<R>>>

export type RSIndex<
	R extends UnknownRecord,
	Property extends string & keyof R = string & keyof R
> = Computed<Map<R[Property], Set<IdOf<R>>>, RSIndexDiff<R, Property>>

/**
 * A class that provides a 'namespace' for the various kinds of indexes one may wish to derive from
 * the record store.
 */
export class StoreQueries<R extends UnknownRecord> {
	constructor(
		private readonly atoms: Atom<Record<IdOf<R>, Atom<R>>>,
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
	 * Create a derivation that contains the hisotry for a given type
	 *
	 * @param typeName - The name of the type to filter by.
	 * @returns A derivation that returns the ids of all records of the given type.
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
					return this.history.value
				}

				const diff = this.history.getDiffSince(lastComputedEpoch)
				if (diff === RESET_VALUE) return this.history.value

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
					return withDiff(this.history.value, res)
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
	public index<
		TypeName extends R['typeName'],
		Property extends string & keyof Extract<R, { typeName: TypeName }>
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
	 * Create a derivation that returns an index on a property for the given type.
	 *
	 * @param typeName - The name of the type?.
	 * @param property - The name of the property?.
	 * @internal
	 */
	__uncached_createIndex<
		TypeName extends R['typeName'],
		Property extends string & keyof Extract<R, { typeName: TypeName }>
	>(typeName: TypeName, property: Property): RSIndex<Extract<R, { typeName: TypeName }>, Property> {
		type S = Extract<R, { typeName: TypeName }>

		const typeHistory = this.filterHistory(typeName)

		const fromScratch = () => {
			// deref typeHistory early so that the first time the incremental version runs
			// it gets a diff to work with instead of having to bail to this from-scratch version
			typeHistory.value
			const res = new Map<S[Property], Set<IdOf<S>>>()
			for (const atom of objectMapValues(this.atoms.value)) {
				const record = atom.value
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
	 * Create a derivation that will return a signle record matching the given query.
	 *
	 * It will return undefined if there is no matching record
	 *
	 * @param typeName - The name of the type?
	 * @param queryCreator - A function that returns the query expression.
	 * @param name - (optinal) The name of the query.
	 */
	record<TypeName extends R['typeName']>(
		typeName: TypeName,
		queryCreator: () => QueryExpression<Extract<R, { typeName: TypeName }>> = () => ({}),
		name = 'record:' + typeName + (queryCreator ? ':' + queryCreator.toString() : '')
	): Computed<Extract<R, { typeName: TypeName }> | undefined> {
		type S = Extract<R, { typeName: TypeName }>
		const ids = this.ids(typeName, queryCreator, name)

		return computed<S | undefined>(name, () => {
			for (const id of ids.value) {
				return this.atoms.value[id]?.value as S
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
		queryCreator: () => QueryExpression<Extract<R, { typeName: TypeName }>> = () => ({}),
		name = 'records:' + typeName + (queryCreator ? ':' + queryCreator.toString() : '')
	): Computed<Array<Extract<R, { typeName: TypeName }>>> {
		type S = Extract<R, { typeName: TypeName }>
		const ids = this.ids(typeName, queryCreator, 'ids:' + name)

		return computed<S[]>(name, () => {
			return [...ids.value].map((id) => {
				const atom = this.atoms.value[id]
				if (!atom) {
					throw new Error('no atom found for record id: ' + id)
				}
				return atom.value as S
			})
		})
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
			typeHistory.value
			const query: QueryExpression<S> = queryCreator()
			if (Object.keys(query).length === 0) {
				return new Set<IdOf<S>>(
					objectMapValues(this.atoms.value).flatMap((v) => {
						const r = v.value
						if (r.typeName === typeName) {
							return r.id
						} else {
							return []
						}
					})
				)
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
				const query = cachedQuery.value
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

	exec<TypeName extends R['typeName']>(
		typeName: TypeName,
		query: QueryExpression<Extract<R, { typeName: TypeName }>>
	): Array<Extract<R, { typeName: TypeName }>> {
		const ids = executeQuery(this, typeName, query)
		if (ids.size === 0) {
			return EMPTY_ARRAY
		}
		const atoms = this.atoms.value
		return [...ids].map((id) => atoms[id].value as Extract<R, { typeName: TypeName }>)
	}
}

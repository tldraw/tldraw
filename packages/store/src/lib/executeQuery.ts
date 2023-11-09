import { IdOf, UnknownRecord } from './BaseRecord'
import { intersectSets } from './setUtils'
import { StoreQueries } from './StoreQueries'

export type ValueMatcher<T> = { eq: T } | { neq: T } | { gt: number }

export type QueryExpression<R extends object> = {
	[k in keyof R & string]?: ValueMatcher<R[k]>
	// todo: handle nesting
	// | (R[k] extends object ? { match: QueryExpression<R[k]> } : never)
}

export function objectMatchesQuery<T extends object>(query: QueryExpression<T>, object: T) {
	for (const [key, _matcher] of Object.entries(query)) {
		const matcher = _matcher as ValueMatcher<T>
		const value = object[key as keyof T]
		// if you add matching logic here, make sure you also update executeQuery,
		// where initial data is pulled out of the indexes, since that requires different
		// matching logic
		if ('eq' in matcher && value !== matcher.eq) return false
		if ('neq' in matcher && value === matcher.neq) return false
		if ('gt' in matcher && (typeof value !== 'number' || value <= matcher.gt)) return false
	}
	return true
}

export function executeQuery<R extends UnknownRecord, TypeName extends R['typeName']>(
	store: StoreQueries<R>,
	typeName: TypeName,
	query: QueryExpression<Extract<R, { typeName: TypeName }>>
): Set<IdOf<Extract<R, { typeName: TypeName }>>> {
	const matchIds = Object.fromEntries(Object.keys(query).map((key) => [key, new Set()]))

	for (const [k, matcher] of Object.entries(query)) {
		if ('eq' in matcher) {
			const index = store.index(typeName, k as any)
			const ids = index.get().get(matcher.eq)
			if (ids) {
				for (const id of ids) {
					matchIds[k].add(id)
				}
			}
		} else if ('neq' in matcher) {
			const index = store.index(typeName, k as any)
			for (const [value, ids] of index.get()) {
				if (value !== matcher.neq) {
					for (const id of ids) {
						matchIds[k].add(id)
					}
				}
			}
		} else if ('gt' in matcher) {
			const index = store.index(typeName, k as any)
			for (const [value, ids] of index.get()) {
				if (value > matcher.gt) {
					for (const id of ids) {
						matchIds[k].add(id)
					}
				}
			}
		}
	}

	return intersectSets(Object.values(matchIds)) as Set<IdOf<Extract<R, { typeName: TypeName }>>>
}

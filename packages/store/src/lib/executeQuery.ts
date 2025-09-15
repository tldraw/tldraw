import { IdOf, UnknownRecord } from './BaseRecord'
import { intersectSets } from './setUtils'
import { StoreQueries } from './StoreQueries'

/**
 * Defines matching criteria for query values. Supports equality, inequality, and greater-than comparisons.
 *
 * @example
 * ```ts
 * // Exact match
 * const exactMatch: QueryValueMatcher<string> = { eq: 'Science Fiction' }
 *
 * // Not equal to
 * const notMatch: QueryValueMatcher<string> = { neq: 'Romance' }
 *
 * // Greater than (numeric values only)
 * const greaterThan: QueryValueMatcher<number> = { gt: 2020 }
 * ```
 *
 * @public
 */
export type QueryValueMatcher<T> = { eq: T } | { neq: T } | { gt: number }

/**
 * Query expression for filtering records by their property values. Maps record property names
 * to matching criteria.
 *
 * @example
 * ```ts
 * // Query for books published after 2020 that are in stock
 * const bookQuery: QueryExpression<Book> = {
 *   publishedYear: { gt: 2020 },
 *   inStock: { eq: true }
 * }
 *
 * // Query for books not by a specific author
 * const notByAuthor: QueryExpression<Book> = {
 *   authorId: { neq: 'author:tolkien' }
 * }
 * ```
 *
 * @public
 */
export type QueryExpression<R extends object> = {
	[k in keyof R & string]?: QueryValueMatcher<R[k]>
	// todo: handle nesting
	// | (R[k] extends object ? { match: QueryExpression<R[k]> } : never)
}

/**
 * Tests whether an object matches the given query expression by checking each property
 * against its corresponding matcher criteria.
 *
 * @param query - The query expression containing matching criteria for object properties
 * @param object - The object to test against the query
 * @returns True if the object matches all criteria in the query, false otherwise
 *
 * @example
 * ```ts
 * const book = { title: '1984', publishedYear: 1949, inStock: true }
 * const query = { publishedYear: { gt: 1945 }, inStock: { eq: true } }
 *
 * const matches = objectMatchesQuery(query, book) // true
 * ```
 *
 * @public
 */
export function objectMatchesQuery<T extends object>(query: QueryExpression<T>, object: T) {
	for (const [key, _matcher] of Object.entries(query)) {
		const matcher = _matcher as QueryValueMatcher<T>
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

/**
 * Executes a query against the store using reactive indexes to efficiently find matching record IDs.
 * Uses the store's internal indexes for optimal performance, especially for equality matches.
 *
 * @param store - The store queries interface providing access to reactive indexes
 * @param typeName - The type name of records to query (e.g., 'book', 'author')
 * @param query - Query expression defining the matching criteria
 * @returns A Set containing the IDs of all records that match the query criteria
 *
 * @example
 * ```ts
 * // Find IDs of all books published after 2020 that are in stock
 * const bookIds = executeQuery(store, 'book', {
 *   publishedYear: { gt: 2020 },
 *   inStock: { eq: true }
 * })
 *
 * // Find IDs of books not by a specific author
 * const otherBookIds = executeQuery(store, 'book', {
 *   authorId: { neq: 'author:tolkien' }
 * })
 * ```
 *
 * @public
 */
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

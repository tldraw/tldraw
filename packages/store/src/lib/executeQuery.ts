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
 *
 * // Query with nested properties
 * const nestedQuery: QueryExpression<Book> = {
 *   metadata: { sessionId: { eq: 'session:alpha' } }
 * }
 * ```
 *
 * @public
 */
/** @public */
export type QueryExpression<R extends object> = {
	[k in keyof R & string]?: R[k] extends string | number | boolean | null | undefined
		? QueryValueMatcher<R[k]>
		: R[k] extends object
			? QueryExpression<R[k]>
			: QueryValueMatcher<R[k]>
}

function isQueryValueMatcher(value: unknown): value is QueryValueMatcher<unknown> {
	if (typeof value !== 'object' || value === null) return false
	return 'eq' in value || 'neq' in value || 'gt' in value
}

function extractMatcherPaths(
	query: QueryExpression<any>,
	prefix: string = ''
): Array<{ path: string; matcher: QueryValueMatcher<any> }> {
	const paths: Array<{ path: string; matcher: QueryValueMatcher<any> }> = []

	for (const [key, value] of Object.entries(query)) {
		const currentPath = prefix ? `${prefix}\\${key}` : key

		if (isQueryValueMatcher(value)) {
			// It's a direct matcher
			paths.push({ path: currentPath, matcher: value })
		} else if (typeof value === 'object' && value !== null) {
			// It's a nested query - recurse into it
			paths.push(...extractMatcherPaths(value as QueryExpression<any>, currentPath))
		}
	}

	return paths
}

export function objectMatchesQuery<T extends object>(query: QueryExpression<T>, object: T) {
	for (const [key, matcher] of Object.entries(query)) {
		const value = object[key as keyof T]

		// if you add matching logic here, make sure you also update executeQuery,
		// where initial data is pulled out of the indexes, since that requires different
		// matching logic
		if (isQueryValueMatcher(matcher)) {
			if ('eq' in matcher && value !== matcher.eq) return false
			if ('neq' in matcher && value === matcher.neq) return false
			if ('gt' in matcher && (typeof value !== 'number' || value <= matcher.gt)) return false
			continue
		}

		// It's a nested query
		if (typeof value !== 'object' || value === null) return false
		if (!objectMatchesQuery(matcher as QueryExpression<any>, value as any)) {
			return false
		}
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
 *
 * // Query with nested properties
 * const nestedQueryIds = executeQuery(store, 'book', {
 *   metadata: { sessionId: { eq: 'session:alpha' } }
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
	type S = Extract<R, { typeName: TypeName }>

	// Extract all paths with matchers (flattens nested queries)
	const matcherPaths = extractMatcherPaths(query)

	// Build a set of matching IDs for each path
	const matchIds = Object.fromEntries(matcherPaths.map(({ path }) => [path, new Set<IdOf<S>>()]))

	// For each path, use the index to find matching IDs
	for (const { path, matcher } of matcherPaths) {
		const index = store.index(typeName, path as any)

		if ('eq' in matcher) {
			const ids = index.get().get(matcher.eq)
			if (ids) {
				for (const id of ids) {
					matchIds[path].add(id)
				}
			}
		} else if ('neq' in matcher) {
			for (const [value, ids] of index.get()) {
				if (value !== matcher.neq) {
					for (const id of ids) {
						matchIds[path].add(id)
					}
				}
			}
		} else if ('gt' in matcher) {
			for (const [value, ids] of index.get()) {
				if (typeof value === 'number' && value > matcher.gt) {
					for (const id of ids) {
						matchIds[path].add(id)
					}
				}
			}
		}

		// Short-circuit if this set is empty - intersection will be empty
		if (matchIds[path].size === 0) {
			return new Set()
		}
	}

	// Intersect all the match sets
	return intersectSets(Object.values(matchIds)) as Set<IdOf<S>>
}

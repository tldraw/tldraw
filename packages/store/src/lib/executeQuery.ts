import { objectMapFromEntries, objectMapValues } from '@tldraw/utils'
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

// Whether a sub-expression constrains anything at all. `extractMatcherPaths` only ever yields leaf
// matchers, so a nested object with none (e.g. `{ metadata: { copies: {} } }`) must not make the
// predicate demand that the record's nested object exists, or the two strategies diverge.
function hasAnyMatcher(query: object): boolean {
	for (const value of Object.values(query)) {
		if (isQueryValueMatcher(value)) return true
		if (typeof value === 'object' && value !== null && hasAnyMatcher(value)) return true
	}
	return false
}

// SameValueZero, the key equality of the `Map`s backing the indexes: `NaN` matches `NaN`.
function sameValueZero(a: unknown, b: unknown) {
	return a === b || (a !== a && b !== b)
}

// The one place matcher semantics live. `objectMatchesQuery` (the predicate used for incremental
// updates) and `executeQuery` (the index lookup used from scratch) must agree, and the indexes only
// track defined values, so an undefined value never matches any matcher.
function matchesValue(matcher: QueryValueMatcher<any>, value: unknown): boolean {
	if (value === undefined) return false
	if ('eq' in matcher && !sameValueZero(value, matcher.eq)) return false
	if ('neq' in matcher && sameValueZero(value, matcher.neq)) return false
	if ('gt' in matcher && (typeof value !== 'number' || value <= matcher.gt)) return false
	return true
}

export function objectMatchesQuery<T extends object>(query: QueryExpression<T>, object: T) {
	for (const [key, matcher] of Object.entries(query)) {
		const value = object[key as keyof T]

		if (isQueryValueMatcher(matcher)) {
			if (!matchesValue(matcher, value)) return false
			continue
		}

		// A nested query. Mirror `extractMatcherPaths`, for which only matchers constrain anything:
		// a non-object entry or a sub-expression with no matchers matches every record.
		if (typeof matcher !== 'object' || matcher === null || !hasAnyMatcher(matcher)) continue
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

	// No matchers means no constraints, so every record of the type matches — as it does for
	// `objectMatchesQuery`, for which an empty expression is vacuously true.
	if (matcherPaths.length === 0) {
		return store.getAllIdsForType(typeName)
	}

	// Build a set of matching IDs for each path
	const matchIds = objectMapFromEntries(
		matcherPaths.map(({ path }) => [path, new Set<IdOf<S>>()] as const)
	)

	// For each path, use the index to find matching IDs
	for (const { path, matcher } of matcherPaths) {
		const index = store.index(typeName, path as any)

		if ('eq' in matcher && !('neq' in matcher) && !('gt' in matcher)) {
			// a lone `eq` is a direct index lookup
			const ids = index.get().get(matcher.eq)
			if (ids) {
				for (const id of ids) {
					matchIds[path].add(id)
				}
			}
		} else {
			// anything else scans the index's values, filtered by the same `matchesValue` the
			// predicate path uses
			for (const [value, ids] of index.get()) {
				if (matchesValue(matcher, value)) {
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
	return intersectSets(objectMapValues(matchIds)) as Set<IdOf<S>>
}

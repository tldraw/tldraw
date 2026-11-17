import type { TLLibrary, TLLibraryId } from 'tldraw'
import type { TLLibraryItem } from '../lib/schema'

/** A query as matched: trimmed and lowercased, empty when there is nothing to search for. */
export function normalizeQuery(query: string) {
	return query.trim().toLowerCase()
}

/** Whether a name contains a normalized query, ignoring case. */
export function nameMatches(name: string | undefined, query: string) {
	return name !== undefined && name.toLowerCase().includes(query)
}

/** One library's matches, in the source's item order. */
export interface LibrarySearchResult {
	library: TLLibrary
	items: TLLibraryItem[]
}

/**
 * The items of `libraries` that match `query`, grouped by library in the order given, leaving out
 * libraries with none. An item matches by its own name, or by its library's, so searching for a
 * library's name finds all its items. Empty for an empty query.
 */
export function searchLibraries(
	libraries: TLLibrary[],
	getItems: (library: TLLibrary) => TLLibraryItem[],
	query: string
): LibrarySearchResult[] {
	const normalized = normalizeQuery(query)
	if (normalized === '') return []
	return libraries.flatMap((library) => {
		const items = getItems(library)
		const matches = nameMatches(library.name, normalized)
			? items
			: items.filter((item) => nameMatches(item.name, normalized))
		return matches.length > 0 ? [{ library, items: matches }] : []
	})
}

/**
 * The library a search is scoped to, while the panel still shows it, and the libraries the search
 * covers: just that one, or all of them.
 */
export function getSearchScope(libraries: TLLibrary[], scopeId: TLLibraryId | null) {
	const scope = libraries.find((library) => library.id === scopeId)
	return { scope, searched: scope ? [scope] : libraries }
}

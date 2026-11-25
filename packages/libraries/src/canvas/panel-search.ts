import type { TLLibrary } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibraryItem } from '../lib/schema'

/** A query as matched: trimmed and lowercased, empty when there is nothing to search for. */
export function normalizeQuery(query: string) {
	return query.trim().toLowerCase()
}

/** Whether a name contains a normalized query, ignoring case. */
export function nameMatches(name: string | undefined, query: string) {
	return name !== undefined && name.toLowerCase().includes(query)
}

/**
 * The libraries a search looks in: those whose name matches, and those the source says may have
 * matching items (see {@link LibrarySource.mayHaveItemsMatching}), or every library for a source
 * that doesn't say. Empty for an empty query.
 */
export function getLibrariesToSearch(source: LibrarySource, libraries: TLLibrary[], query: string) {
	const normalized = normalizeQuery(query)
	if (normalized === '') return []
	const mayMatch = source.mayHaveItemsMatching
	if (!mayMatch) return libraries
	return libraries.filter(
		(library) =>
			nameMatches(library.name, normalized) || mayMatch.call(source, library.id, normalized)
	)
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

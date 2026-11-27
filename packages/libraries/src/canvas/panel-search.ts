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
	/** The items that matched by name. Left out when the library's own name matched, so all its items show, even none. */
	items?: TLLibraryItem[]
}

/**
 * The libraries that match `query`, in the order given: by their own name, or through items that
 * match by theirs. Libraries with neither are left out. Empty for an empty query.
 */
export function searchLibraries(
	libraries: TLLibrary[],
	getItems: (library: TLLibrary) => TLLibraryItem[],
	query: string
): LibrarySearchResult[] {
	const normalized = normalizeQuery(query)
	if (normalized === '') return []
	return libraries.flatMap((library): LibrarySearchResult[] => {
		if (nameMatches(library.name, normalized)) return [{ library }]
		const items = getItems(library).filter((item) => nameMatches(item.name, normalized))
		return items.length > 0 ? [{ library, items }] : []
	})
}

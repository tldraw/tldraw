import { useValue, type TLLibraryId } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibraryItem } from '../lib/schema'
import { getItemOrdering, sortItems, type TLLibraryItemOrdering } from './item-order'

/** @public */
export interface LibraryItemsOptions {
	/** Defaults to `'source'`, the source's own order. */
	ordering?: TLLibraryItemOrdering
	reversed?: boolean
}

/**
 * A library's items, in the given order. Updates when the source changes. Items the ordering ties
 * keep the source's order. Pass the result of {@link useLibraryItemOrder} to follow the order
 * chosen in the panel's "Sort by" menu.
 * @public
 */
export function useLibraryItems(
	source: LibrarySource,
	libraryId: TLLibraryId,
	{ ordering = 'source', reversed = false }: LibraryItemsOptions = {}
): TLLibraryItem[] {
	return useValue(
		'library items',
		() => sortItems(source.getItems(libraryId), getItemOrdering(ordering), reversed),
		[source, libraryId, ordering, reversed]
	)
}

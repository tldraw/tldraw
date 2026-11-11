import type { TLLibraryId } from '@tldraw/tlschema'
import type { LibrarySource, TLNewLibraryItem } from './LibrarySource'
import type { TLLibraryItem } from './schema'

/**
 * Adds several items to a library, in the order given, and returns them in the same order once
 * they are listed: through the source's {@link LibrarySource.addItems} where it has one, otherwise
 * one at a time through {@link LibrarySource.addItem}, each waiting for the one before. If an item
 * can't be added one at a time, the ones before it stay added and the error is rethrown.
 * @public
 */
export async function addItemsToLibrary(
	source: LibrarySource,
	libraryId: TLLibraryId,
	items: TLNewLibraryItem[]
): Promise<TLLibraryItem[]> {
	if (source.addItems) return source.addItems(libraryId, items)
	const added: TLLibraryItem[] = []
	for (const item of items) added.push(await source.addItem(libraryId, item))
	return added
}

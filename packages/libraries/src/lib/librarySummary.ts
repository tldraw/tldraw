import type { TLLibraryId } from '@tldraw/tlschema'
import type { LibrarySource } from './LibrarySource'
import type { TLLibraryItem } from './schema'

/**
 * How many items a library has: the source's count, or else its listed items.
 * @public
 */
export function getLibraryItemCount(source: LibrarySource, libraryId: TLLibraryId): number {
	return source.getItemCount ? source.getItemCount(libraryId) : source.getItems(libraryId).length
}

/**
 * A library's first `count` items to preview it: the source's, or else its first listed items.
 * @public
 */
export function getLibraryPreviewItems(
	source: LibrarySource,
	libraryId: TLLibraryId,
	count: number
): TLLibraryItem[] {
	return source.getPreviewItems
		? source.getPreviewItems(libraryId, count)
		: source.getItems(libraryId).slice(0, count)
}

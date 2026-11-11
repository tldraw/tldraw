import type { TLLibraryItemId } from '@tldraw/tlschema'

// Items a source has listed but is still saving, by id. Ids are unique across sources, so a copy
// can wait on items it added through a composite source as well as through the part itself.
const storing = new Map<TLLibraryItemId, Promise<void>>()

/**
 * Notes that a source is still saving items it has listed, e.g. while their thumbnails upload.
 * `stored` rejects if saving failed, by which point the source has removed the items and reported
 * the failure itself.
 * @internal
 */
export function trackItemsStoring(itemIds: TLLibraryItemId[], stored: Promise<void>) {
	for (const itemId of itemIds) storing.set(itemId, stored)
	stored.then(
		() => {
			for (const itemId of itemIds) storing.delete(itemId)
		},
		() => {}
	)
}

/**
 * Resolves once the items are saved, at once for items no source is still saving, and rejects if
 * saving them failed: for a copy or move, which mustn't count as done before then.
 * @internal
 */
export async function whenItemsStored(itemIds: TLLibraryItemId[]) {
	await Promise.all(itemIds.map((itemId) => storing.get(itemId)))
}

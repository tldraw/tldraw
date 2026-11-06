import type { TLCollectionItem } from '@tldraw/collections'

export interface OrderedStoredItem {
	item: TLCollectionItem
	// Counts up with each add. IndexedDB returns items in key order, and item ids are random.
	addIndex?: number
}

/**
 * Saved items in the order they were added, which is the order the in-memory source lists them.
 * Items saved without an add index come first, by save time.
 */
export function sortStoredItems<T extends OrderedStoredItem>(stored: T[]) {
	return [...stored].sort(
		(a, b) =>
			(a.addIndex ?? -1) - (b.addIndex ?? -1) || (a.item.createdAt ?? 0) - (b.item.createdAt ?? 0)
	)
}

/** The add index for the next item saved after these. */
export function nextAddIndex(stored: OrderedStoredItem[]) {
	return stored.reduce((max, { addIndex }) => Math.max(max, addIndex ?? -1), -1) + 1
}

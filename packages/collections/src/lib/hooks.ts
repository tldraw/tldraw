import { useValue } from '@tldraw/state-react'
import type { CollectionSource } from './CollectionSource'
import type { TLCollection, TLCollectionId, TLCollectionItem } from './schema'

// One shared empty array, so a missing source doesn't hand out a new array (and a re-render) on
// every call.
const NONE: never[] = []

/**
 * The collections a source lists, kept up to date. Empty when there is no source, e.g. when the
 * collections flag is off.
 */
export function useCollections(source: CollectionSource | null | undefined): TLCollection[] {
	return useValue('collections', () => source?.getCollections() ?? NONE, [source])
}

/**
 * The items in one collection, kept up to date. Re-renders only when that collection's items
 * change. Empty when there is no source or no collection.
 */
export function useCollectionItems(
	source: CollectionSource | null | undefined,
	collectionId: TLCollectionId | null | undefined
): TLCollectionItem[] {
	return useValue(
		'collection items',
		() => (source && collectionId ? source.getItems(collectionId) : NONE),
		[source, collectionId]
	)
}

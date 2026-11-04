import { useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import {
	type CollectionGroup,
	groupCollectionList,
	type GroupCollections,
} from './collection-groups'
import { sortByRecentlySavedTo } from './recent-collections'

/**
 * How a menu of collections to add to orders them: as the source lists them, or the ones the current
 * user saved to most recently first (remembered in this browser).
 * @public
 */
export type AddToCollectionOrder = 'source' | 'recent'

export interface AddTargets {
	/** The collections the selection can be added to, ordered, in their groups. */
	groups: CollectionGroup[]
	/** Whether the source allows creating a collection to add to. */
	canCreate: boolean
	/** Whether there is anywhere to add to: an existing collection or a new one. */
	hasTargets: boolean
}

/** Where the selection can be added, for the menus that offer adding it. */
export function useAddTargets(
	source: CollectionSource,
	order: AddToCollectionOrder = 'source',
	groupCollections?: GroupCollections
): AddTargets {
	const collections = useValue(
		'writable collections',
		() => {
			const writable = source
				.getCollections()
				.filter((collection) => source.can('addItem', collection.id))
			return order === 'recent' ? sortByRecentlySavedTo(source.id, writable) : writable
		},
		[source, order]
	)
	const canCreate = useValue('can create collection', () => source.can('createCollection'), [
		source,
	])
	return {
		groups: groupCollectionList(collections, groupCollections),
		canCreate,
		hasTargets: collections.length > 0 || canCreate,
	}
}

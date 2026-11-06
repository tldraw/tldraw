import { useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import {
	type CollectionGroup,
	groupCollectionList,
	useCollectionGrouping,
} from './collection-groups'

export interface AddTargets {
	/** The collections the selection can be added to, in the source's order, in their groups. */
	groups: CollectionGroup[]
	/** Whether the source allows creating a collection to add to. */
	canCreate: boolean
	/** Whether there is anywhere to add to: an existing collection or a new one. */
	hasTargets: boolean
}

/** Where the selection can be added, for the menus that offer adding it. */
export function useAddTargets(source: CollectionSource): AddTargets {
	const grouping = useCollectionGrouping(source)
	const collections = useValue(
		'writable collections',
		() => source.getCollections().filter((collection) => source.can('addItem', collection.id)),
		[source]
	)
	const canCreate = useValue('can create collection', () => source.can('createCollection'), [
		source,
	])
	return {
		groups: groupCollectionList(collections, grouping),
		canCreate,
		hasTargets: collections.length > 0 || canCreate,
	}
}

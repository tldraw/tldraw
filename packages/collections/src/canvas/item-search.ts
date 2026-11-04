import type { TLCollectionItem } from '../lib/schema'

/**
 * Where the panel's search looks. `'none'`: no search field. `'collection'`: filters the items
 * showing. `'everywhere'`: lists matching items from every collection, under each one's name.
 * @public
 */
export type ItemSearch = 'none' | 'collection' | 'everywhere'

/** Whether an item's name contains the query, ignoring case. Unnamed items never match. */
export function itemMatches(item: TLCollectionItem, query: string) {
	const needle = query.trim().toLowerCase()
	if (needle === '') return true
	return item.name !== undefined && item.name.toLowerCase().includes(needle)
}

import type { TLCollection } from '../lib/schema'

/**
 * Names the group a collection belongs to, such as its scope ("Personal", a workspace's name).
 * Collections it returns nothing for go in an unnamed group.
 * @public
 */
export type GroupCollections = (collection: TLCollection) => string | undefined

export interface CollectionGroup {
	label?: string
	collections: TLCollection[]
}

/**
 * Collections gathered into their groups, groups in the order they first appear, each keeping the
 * collections' order. Without a grouping, one unnamed group.
 */
export function groupCollectionList(
	collections: TLCollection[],
	groupCollections?: GroupCollections
): CollectionGroup[] {
	if (!groupCollections) return [{ collections }]
	const groups = new Map<string | undefined, TLCollection[]>()
	for (const collection of collections) {
		const label = groupCollections(collection)
		const group = groups.get(label)
		if (group) group.push(collection)
		else groups.set(label, [collection])
	}
	return [...groups].map(([label, members]) => ({ label, collections: members }))
}

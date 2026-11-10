import { useMemo } from 'react'
import { useValue } from 'tldraw'
import type { CollectionSource, TLCollectionOwner } from '../lib/CollectionSource'
import type { TLCollection } from '../lib/schema'

export interface CollectionGroup {
	/** The owner's id. Collections without a known owner go in a group with none. */
	key?: string
	/** The owner's name. */
	label?: string
	collections: TLCollection[]
}

export interface CollectionGrouping {
	keyOf(collection: TLCollection): string | undefined
	labelOf(key: string): string | undefined
	/** Owner ids in the order their groups go. */
	order: string[]
}

/** Groups by the owner each collection names, in the owners' order. Fewer than two owners: none. */
export function getCollectionGrouping(owners: TLCollectionOwner[]): CollectionGrouping | undefined {
	if (owners.length < 2) return undefined
	const names = new Map(owners.map((owner) => [owner.id, owner.name]))
	return {
		keyOf: (collection) =>
			collection.ownerId !== undefined && names.has(collection.ownerId)
				? collection.ownerId
				: undefined,
		labelOf: (key) => names.get(key),
		order: owners.map((owner) => owner.id),
	}
}

export function useCollectionGrouping(source: CollectionSource) {
	const owners = useValue(
		'collection owners',
		() => (source.getCollectionOwners ? source.getCollectionOwners() : []),
		[source]
	)
	return useMemo(() => getCollectionGrouping(owners), [owners])
}

/**
 * Collections gathered into their groups, each keeping the collections' order. Groups go in the
 * grouping's order; collections without a known owner come last. Without a grouping, one unnamed
 * group.
 */
export function groupCollectionList(
	collections: TLCollection[],
	grouping?: CollectionGrouping
): CollectionGroup[] {
	if (!grouping) return [{ collections }]
	const groups = new Map<string | undefined, CollectionGroup>()
	for (const collection of collections) {
		const key = grouping.keyOf(collection)
		const group = groups.get(key)
		if (group) group.collections.push(collection)
		else {
			const label = key === undefined ? undefined : grouping.labelOf(key)
			groups.set(key, { key, label, collections: [collection] })
		}
	}
	const rank = (key?: string) => {
		const index = key === undefined ? -1 : grouping.order.indexOf(key)
		return index === -1 ? grouping.order.length : index
	}
	return [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key))
}

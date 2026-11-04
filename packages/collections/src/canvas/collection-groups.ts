import { useMemo } from 'react'
import { useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollection } from '../lib/schema'

/**
 * Names the group a collection belongs to, such as its scope ("Personal", a workspace's name).
 * Collections it returns nothing for go in an unnamed group.
 * @public
 */
export type GroupCollections = (collection: TLCollection) => string | undefined

/**
 * How collections are grouped under headings. `'owner'`: by the owner each collection names in
 * its `ownerId`, headed by the owner's name, in the order the source lists its owners. A function
 * names each collection's group instead, groups in the order they first appear.
 * @public
 */
export type CollectionGrouping = 'owner' | GroupCollections

export interface CollectionGroup {
	label?: string
	collections: TLCollection[]
}

/** A grouping worked out against a source. */
export interface ResolvedGrouping {
	groupOf: GroupCollections
	/** Group labels in the order their groups go. Groups not listed follow, in order of appearance. */
	order?: string[]
}

/** Resolves a grouping against its source, updating when the source's owners change. */
export function useCollectionGrouping(
	source: CollectionSource,
	grouping?: CollectionGrouping
): ResolvedGrouping | undefined {
	const owners = useValue(
		'collection owners',
		() => (grouping === 'owner' && source.getCollectionOwners ? source.getCollectionOwners() : []),
		[source, grouping]
	)
	return useMemo(() => {
		if (grouping === undefined) return undefined
		if (grouping !== 'owner') return { groupOf: grouping }
		const names = new Map(owners.map((owner) => [owner.id, owner.name]))
		return {
			groupOf: (collection) =>
				collection.ownerId === undefined ? undefined : names.get(collection.ownerId),
			order: owners.map((owner) => owner.name),
		}
	}, [grouping, owners])
}

/**
 * Collections gathered into their groups, each keeping the collections' order. Groups go in the
 * grouping's order, then in the order they first appear. Without a grouping, one unnamed group.
 */
export function groupCollectionList(
	collections: TLCollection[],
	grouping?: ResolvedGrouping
): CollectionGroup[] {
	if (!grouping) return [{ collections }]
	const groups = new Map<string | undefined, TLCollection[]>()
	for (const collection of collections) {
		const label = grouping.groupOf(collection)
		const group = groups.get(label)
		if (group) group.push(collection)
		else groups.set(label, [collection])
	}
	const list = [...groups].map(([label, members]) => ({ label, collections: members }))
	const order = grouping.order
	if (!order) return list
	const rank = (label?: string) => {
		const index = label === undefined ? -1 : order.indexOf(label)
		return index === -1 ? order.length : index
	}
	return list.sort((a, b) => rank(a.label) - rank(b.label))
}

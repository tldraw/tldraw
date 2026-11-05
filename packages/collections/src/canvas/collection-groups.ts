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
 * its `ownerId`, headed by the owner's name, in the order the source lists its owners; with one
 * owner or none, there are no headings. `'none'`: no headings. A function names each collection's
 * group instead, groups in the order they first appear.
 * @public
 */
export type CollectionGrouping = 'owner' | 'none' | GroupCollections

export interface CollectionGroup {
	/** Tells the group apart from the others, e.g. its owner's id. Unnamed groups have none. */
	key?: string
	label?: string
	collections: TLCollection[]
}

/** A grouping worked out against a source. */
export interface ResolvedGrouping {
	groupOf: GroupCollections
	/** Identifies a collection's group. Defaults to the group's name. */
	keyOf?: GroupCollections
	/** Group keys in the order their groups go. Groups not listed follow, in order of appearance. */
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
		if (grouping === undefined || grouping === 'none') return undefined
		if (grouping !== 'owner') return { groupOf: grouping }
		if (owners.length < 2) return undefined
		const names = new Map(owners.map((owner) => [owner.id, owner.name]))
		return {
			groupOf: (collection) =>
				collection.ownerId === undefined ? undefined : names.get(collection.ownerId),
			keyOf: (collection) =>
				collection.ownerId !== undefined && names.has(collection.ownerId)
					? collection.ownerId
					: undefined,
			order: owners.map((owner) => owner.id),
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
	const keyOf = grouping.keyOf ?? grouping.groupOf
	const groups = new Map<string | undefined, CollectionGroup>()
	for (const collection of collections) {
		const key = keyOf(collection)
		const group = groups.get(key)
		if (group) group.collections.push(collection)
		else groups.set(key, { key, label: grouping.groupOf(collection), collections: [collection] })
	}
	const list = [...groups.values()]
	const order = grouping.order
	if (!order) return list
	const rank = (key?: string) => {
		const index = key === undefined ? -1 : order.indexOf(key)
		return index === -1 ? order.length : index
	}
	return list.sort((a, b) => rank(a.key) - rank(b.key))
}

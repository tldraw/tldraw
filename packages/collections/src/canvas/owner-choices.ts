import type { CollectionSource } from '../lib/CollectionSource'

/**
 * The owners a collection can be moved or copied to: those the source allows creating a collection
 * for. Moving also lists the collection's own owner, so the menu can mark it. Each list is empty
 * when there is no other owner to pick.
 */
export function getOwnerChoices(source: CollectionSource, ownerId: string | undefined) {
	const owners = source.getCollectionOwners ? source.getCollectionOwners() : []
	const copy = owners.filter(
		(owner) => owner.id !== ownerId && source.can('createCollection', { ownerId: owner.id })
	)
	const move =
		copy.length === 0 ? [] : owners.filter((owner) => owner.id === ownerId || copy.includes(owner))
	return { move, copy }
}

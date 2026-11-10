import type { CollectionSource } from '../lib/CollectionSource'

function getDefaultOwnerId(source: CollectionSource) {
	return source.getDefaultOwnerId ? source.getDefaultOwnerId() : undefined
}

/** Left without an `ownerId`, the collection goes to the source's default owner. */
export function createNewCollection(source: CollectionSource, name: string, ownerId?: string) {
	const owner = ownerId ?? getDefaultOwnerId(source)
	return source.createCollection(name, owner === undefined ? {} : { ownerId: owner })
}

/** Whether {@link createNewCollection}, left without an `ownerId`, is allowed. */
export function canCreateNewCollection(source: CollectionSource) {
	const ownerId = getDefaultOwnerId(source)
	if (ownerId === undefined) return source.can('createCollection')
	return source.can('createCollection', { ownerId })
}

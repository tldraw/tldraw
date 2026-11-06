import type { CollectionSource } from '../lib/CollectionSource'

/**
 * Creates a collection the way the UI's "New collection" does: under the given owner, or else the
 * source's default owner.
 */
export function createNewCollection(source: CollectionSource, name: string, ownerId?: string) {
	const owner = ownerId ?? (source.getDefaultOwnerId ? source.getDefaultOwnerId() : undefined)
	return source.createCollection(name, owner === undefined ? {} : { ownerId: owner })
}

import type { CollectionSource } from '../lib/CollectionSource'

/** Creates a collection the way the UI's "New collection" does: under the source's default owner. */
export function createNewCollection(source: CollectionSource, name: string) {
	const ownerId = source.getDefaultOwnerId ? source.getDefaultOwnerId() : undefined
	return source.createCollection(name, ownerId === undefined ? {} : { ownerId })
}

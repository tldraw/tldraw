import type { CollectionSource } from '../lib/CollectionSource'

/** Left without an `ownerId`, the collection goes to the source's default owner. */
export function createNewCollection(source: CollectionSource, name: string, ownerId?: string) {
	const owner = ownerId ?? (source.getDefaultOwnerId ? source.getDefaultOwnerId() : undefined)
	return source.createCollection(name, owner === undefined ? {} : { ownerId: owner })
}

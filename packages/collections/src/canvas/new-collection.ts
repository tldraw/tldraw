import type { CollectionSource } from '../lib/CollectionSource'

export function createNewCollection(source: CollectionSource, name: string) {
	const ownerId = source.getDefaultOwnerId ? source.getDefaultOwnerId() : undefined
	return source.createCollection(name, ownerId === undefined ? {} : { ownerId })
}

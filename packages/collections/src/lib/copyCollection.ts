import { CollectionNotFoundError, type CollectionSource } from './CollectionSource'
import type { TLCollection, TLCollectionId, TLCollectionItem } from './schema'

/**
 * Copies a collection and its items to an owner, as a new collection with the same name. The
 * original is left as it is, so this works for read-only collections too. Item thumbnails are
 * fetched from their URLs and copied; one that can't be fetched is left out. If an item can't be
 * copied, the partial copy is deleted and the error rethrown.
 * @public
 */
export async function copyCollection(
	source: CollectionSource,
	collectionId: TLCollectionId,
	ownerId: string
): Promise<TLCollection> {
	const collection = source.getCollections().find((c) => c.id === collectionId)
	if (!collection) throw new CollectionNotFoundError(collectionId)
	const items = source.getItems(collectionId)
	const copy = await source.createCollection(collection.name, { ownerId })
	try {
		for (const item of items) await copyItem(source, item, source, copy.id)
	} catch (error) {
		await source.deleteCollection(copy.id).catch(() => {})
		throw error
	}
	return copy
}

/** Adds a copy of `item`, from `from`, to a collection in `to`, with a new id. */
export async function copyItem(
	from: CollectionSource,
	item: TLCollectionItem,
	to: CollectionSource,
	toCollectionId: TLCollectionId
): Promise<TLCollectionItem> {
	const [content, thumbnail] = await Promise.all([
		from.getItemContent(item.id),
		item.thumbnailUrl === undefined ? undefined : fetchThumbnail(item.thumbnailUrl),
	])
	return to.addItem(toCollectionId, {
		...(item.name === undefined ? {} : { name: item.name }),
		content,
		...(thumbnail === undefined ? {} : { thumbnail }),
	})
}

async function fetchThumbnail(url: string): Promise<Blob | undefined> {
	try {
		const response = await fetch(url)
		return response.ok ? await response.blob() : undefined
	} catch {
		return undefined
	}
}

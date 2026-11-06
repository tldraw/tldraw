import { getIncrementedName } from 'tldraw'
import type { CollectionPack } from './CollectionPack'
import type { CollectionSource, TLNewCollectionOptions } from './CollectionSource'
import { fetchThumbnail } from './copyCollection'
import type { TLCollection } from './schema'

/**
 * Copies a pack into a source as an ordinary collection the owner can change like any other, with
 * the pack's items and their thumbnails. The copy takes the pack's name, numbered if the source
 * already has a collection by that name. Pass `meta` to record on the copy where it came from. If
 * an item can't be added, the partial copy is deleted and the error rethrown.
 * @public
 */
export async function copyPack(
	source: CollectionSource,
	pack: CollectionPack,
	options: TLNewCollectionOptions = {}
): Promise<TLCollection> {
	const name = getIncrementedName(
		pack.name,
		source.getCollections().map((collection) => collection.name)
	)
	const copy = await source.createCollection(name, options)
	try {
		for (const item of pack.items) {
			const thumbnail =
				item.thumbnail === undefined ? undefined : await fetchThumbnail(item.thumbnail)
			await source.addItem(copy.id, {
				...(item.name === undefined ? {} : { name: item.name }),
				content: item.content,
				...(thumbnail === undefined ? {} : { thumbnail }),
			})
		}
	} catch (error) {
		await source.deleteCollection(copy.id).catch(() => {})
		throw error
	}
	return copy
}

import type { CollectionPack } from './CollectionPack'
import type { CollectionSource } from './CollectionSource'
import { fetchThumbnail } from './copyCollection'
import type { TLCollection } from './schema'

/** What a pack's copy records in its `meta`, so the copy can be traced back to its pack. */
export interface PackCopyMeta {
	packId: string
	packVersion: number
}

/** The pack a collection was copied from, if it was copied from one by {@link copyPack}. */
export function getPackCopyMeta(collection: TLCollection): PackCopyMeta | undefined {
	const { packId, packVersion } = collection.meta
	return typeof packId === 'string' && typeof packVersion === 'number'
		? { packId, packVersion }
		: undefined
}

/**
 * Copies a pack into a source as an ordinary collection the owner can change like any other, with
 * the pack's items and their thumbnails. The copy's `meta` names the pack and its version. If an
 * item can't be added, the partial copy is deleted and the error rethrown.
 * @public
 */
export async function copyPack(
	source: CollectionSource,
	pack: CollectionPack,
	options: { name?: string; ownerId?: string } = {}
): Promise<TLCollection> {
	const meta = { packId: pack.id, packVersion: pack.version } satisfies PackCopyMeta
	const copy = await source.createCollection(options.name ?? pack.name, {
		...(options.ownerId === undefined ? {} : { ownerId: options.ownerId }),
		meta,
	})
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

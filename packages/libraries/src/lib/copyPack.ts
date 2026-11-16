import { getIncrementedName } from '@tldraw/editor'
import type { TLLibrary } from '@tldraw/tlschema'
import { addItemsToLibrary } from './addItemsToLibrary'
import { fetchThumbnail } from './copyLibrary'
import type { LibraryPack } from './LibraryPack'
import type { LibrarySource, TLNewLibraryOptions } from './LibrarySource'
import { mapConcurrently } from './mapConcurrently'
import { whenItemsStored } from './whenItemsStored'

const FETCH_CONCURRENCY = 6

/**
 * Copies a pack into a source as an ordinary library the owner can change like any other, with
 * the pack's items and their thumbnails. The copy takes the pack's name, numbered if the source
 * already has a library by that name. The copy's `meta` records the pack's `packId` and
 * `packVersion`, alongside any `meta` passed in. The items' thumbnails are fetched a few at a time,
 * and the items added together (see `addItemsToLibrary`). If an item can't be added, the partial
 * copy is deleted and the error rethrown.
 * @public
 */
export async function copyPack(
	source: LibrarySource,
	pack: LibraryPack,
	options: TLNewLibraryOptions = {}
): Promise<TLLibrary> {
	const name = getIncrementedName(
		pack.name,
		source.getLibraries().map((library) => library.name)
	)
	const copy = await source.createLibrary(name, {
		...options,
		meta: { ...options.meta, packId: pack.id, packVersion: pack.version },
	})
	try {
		const newItems = await mapConcurrently(pack.items, FETCH_CONCURRENCY, async (item) => {
			const thumbnail =
				item.thumbnail === undefined ? undefined : await fetchThumbnail(item.thumbnail)
			return {
				...(item.name === undefined ? {} : { name: item.name }),
				content: item.content,
				...(thumbnail === undefined ? {} : { thumbnail }),
			}
		})
		const added = await addItemsToLibrary(source, copy.id, newItems)
		await whenItemsStored(added.map((item) => item.id))
	} catch (error) {
		await source.deleteLibrary(copy.id).catch(() => {})
		throw error
	}
	return copy
}

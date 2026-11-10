import { getIncrementedName } from '@tldraw/editor'
import type { TLLibrary } from '@tldraw/tlschema'
import { fetchThumbnail } from './copyLibrary'
import type { LibraryPack } from './LibraryPack'
import type { LibrarySource, TLNewLibraryOptions } from './LibrarySource'

/**
 * Copies a pack into a source as an ordinary library the owner can change like any other, with
 * the pack's items and their thumbnails. The copy takes the pack's name, numbered if the source
 * already has a library by that name. The copy's `meta` records the pack's `packId` and
 * `packVersion`, alongside any `meta` passed in. If an item can't be added, the partial copy is
 * deleted and the error rethrown.
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
		await source.deleteLibrary(copy.id).catch(() => {})
		throw error
	}
	return copy
}

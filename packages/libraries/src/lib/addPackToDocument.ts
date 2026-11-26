import type { TLLibrary, TLLibraryId } from '@tldraw/tlschema'
import { copyPack } from './copyPack'
import type { LibraryPack } from './LibraryPack'
import type { LibrarySource, TLNewLibraryOptions } from './LibrarySource'

/**
 * The first of `libraries` copied from the pack with this id, as recorded by {@link copyPack}.
 * @public
 */
export function findPackCopy(libraries: TLLibrary[], packId: string): TLLibrary | undefined {
	return libraries.find((library) => library.meta.packId === packId)
}

/**
 * Shows a pack in the document, resolving to the id of the library that shows it: a copy the
 * document already shows, else one the user already has available to add, which is added, else a
 * new copy (see {@link copyPack}), which a source that adds libraries to documents adds as it
 * creates it. `loadPack` is called only to make a new copy.
 * @public
 */
export async function addPackToDocument(
	source: LibrarySource,
	packId: string,
	loadPack: () => Promise<LibraryPack>,
	options: TLNewLibraryOptions = {}
): Promise<TLLibraryId> {
	const shown = findPackCopy(source.getLibraries(), packId)
	if (shown) return shown.id
	const available = source.getAvailableLibraries ? source.getAvailableLibraries() : []
	const copy = findPackCopy(available, packId)
	if (copy && source.addLibraryToDocument) {
		await source.addLibraryToDocument(copy.id)
		return copy.id
	}
	return (await copyPack(source, await loadPack(), options)).id
}

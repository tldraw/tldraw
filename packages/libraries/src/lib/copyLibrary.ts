import { LibraryNotFoundError, type LibrarySource } from './LibrarySource'
import type { TLLibrary, TLLibraryId, TLLibraryItem, TLLibraryThumbnail } from './schema'

/**
 * Copies a library and its items to an owner, as a new library with the same name. The
 * original is left as it is, so this works for read-only libraries too. Item thumbnails are
 * fetched from their URLs and copied; one that can't be fetched is left out. If an item can't be
 * copied, the partial copy is deleted and the error rethrown.
 * @public
 */
export async function copyLibrary(
	source: LibrarySource,
	libraryId: TLLibraryId,
	ownerId: string
): Promise<TLLibrary> {
	const library = source.getLibraries().find((c) => c.id === libraryId)
	if (!library) throw new LibraryNotFoundError(libraryId)
	const items = source.getItems(libraryId)
	const copy = await source.createLibrary(library.name, { ownerId })
	try {
		for (const item of items) await copyItem(source, item, source, copy.id)
	} catch (error) {
		await source.deleteLibrary(copy.id).catch(() => {})
		throw error
	}
	return copy
}

/** Adds a copy of `item`, from `from`, to a library in `to`, with a new id. */
export async function copyItem(
	from: LibrarySource,
	item: TLLibraryItem,
	to: LibrarySource,
	toLibraryId: TLLibraryId
): Promise<TLLibraryItem> {
	const [content, thumbnail] = await Promise.all([
		from.getItemContent(item.id),
		item.thumbnail === undefined ? undefined : fetchThumbnail(item.thumbnail),
	])
	return to.addItem(toLibraryId, {
		...(item.name === undefined ? {} : { name: item.name }),
		content,
		...(thumbnail === undefined ? {} : { thumbnail }),
	})
}

/**
 * A thumbnail's images, or undefined when they can't be fetched. A pair is fetched only whole: half
 * of one can't be stored.
 */
export async function fetchThumbnail(
	thumbnail: TLLibraryThumbnail
): Promise<TLLibraryThumbnail<Blob> | undefined> {
	if (typeof thumbnail === 'string') return fetchImage(thumbnail)
	const [light, dark] = await Promise.all([fetchImage(thumbnail.light), fetchImage(thumbnail.dark)])
	return light && dark ? { light, dark } : undefined
}

async function fetchImage(url: string): Promise<Blob | undefined> {
	try {
		const response = await fetch(url)
		return response.ok ? await response.blob() : undefined
	} catch {
		return undefined
	}
}

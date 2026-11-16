import type { TLLibrary, TLLibraryId, TLLibraryThumbnail } from '@tldraw/tlschema'
import { addItemsToLibrary, whenItemsStored } from './addItemsToLibrary'
import { LibraryNotFoundError, type LibrarySource, type TLNewLibraryItem } from './LibrarySource'
import { mapConcurrently } from './mapConcurrently'
import type { TLLibraryItem } from './schema'

const LOAD_CONCURRENCY = 6

/**
 * Copies a library and its items to an owner, as a new library with the same name. The
 * original is left as it is, so this works for read-only libraries too. A source that has its
 * own {@link LibrarySource.copyLibrary} makes the copy; otherwise the items' content and
 * thumbnails are loaded a few at a time, thumbnails being fetched from their URLs and one that can't
 * be fetched left out, and the copies are added together (see `addItemsToLibrary`). If an item
 * can't be copied, the partial copy is deleted and the error rethrown.
 * @public
 */
export async function copyLibrary(
	source: LibrarySource,
	libraryId: TLLibraryId,
	ownerId: string
): Promise<TLLibrary> {
	if (source.copyLibrary) return source.copyLibrary(libraryId, ownerId)
	return copyLibraryItems(source, libraryId, ownerId)
}

/** {@link copyLibrary} for a source without its own: the items are loaded and added again. */
export async function copyLibraryItems(
	source: LibrarySource,
	libraryId: TLLibraryId,
	ownerId: string
): Promise<TLLibrary> {
	const library = source.getLibraries().find((c) => c.id === libraryId)
	if (!library) throw new LibraryNotFoundError(libraryId)
	const items = source.getItems(libraryId)
	const copy = await source.createLibrary(library.name, { ownerId })
	try {
		await copyItems(source, items, source, copy.id)
	} catch (error) {
		await source.deleteLibrary(copy.id).catch(() => {})
		throw error
	}
	return copy
}

/**
 * Adds copies of `items`, from `from`, to a library in `to`, with new ids and in the same order.
 * Their content and thumbnails are loaded a few at a time, and the copies added together. Resolves
 * once `to` has stored them.
 */
export async function copyItems(
	from: LibrarySource,
	items: TLLibraryItem[],
	to: LibrarySource,
	toLibraryId: TLLibraryId
): Promise<TLLibraryItem[]> {
	const newItems = await mapConcurrently(items, LOAD_CONCURRENCY, (item) => loadCopy(from, item))
	const added = await addItemsToLibrary(to, toLibraryId, newItems)
	await whenItemsStored(to, added)
	return added
}

/** Adds a copy of `item`, from `from`, to a library in `to`, with a new id, once `to` has stored it. */
export async function copyItem(
	from: LibrarySource,
	item: TLLibraryItem,
	to: LibrarySource,
	toLibraryId: TLLibraryId
): Promise<TLLibraryItem> {
	const added = await to.addItem(toLibraryId, await loadCopy(from, item))
	await whenItemsStored(to, [added])
	return added
}

async function loadCopy(from: LibrarySource, item: TLLibraryItem): Promise<TLNewLibraryItem> {
	const [content, thumbnail] = await Promise.all([
		from.getItemContent(item.id),
		item.thumbnail === undefined ? undefined : fetchThumbnail(item.thumbnail),
	])
	return {
		...(item.name === undefined ? {} : { name: item.name }),
		content,
		...(thumbnail === undefined ? {} : { thumbnail }),
	}
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

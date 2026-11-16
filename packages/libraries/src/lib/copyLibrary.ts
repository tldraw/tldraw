import type { TLLibrary, TLLibraryId, TLLibraryThumbnail } from '@tldraw/tlschema'
import { addItemsToLibrary } from './addItemsToLibrary'
import {
	LibraryNotFoundError,
	type LibrarySource,
	type TLLibraryDestination,
	type TLNewLibraryItem,
} from './LibrarySource'
import { getLibrarySubtree, type TLLibraryTreeNode } from './libraryTree'
import { mapConcurrently } from './mapConcurrently'
import type { TLLibraryItem } from './schema'
import { whenItemsStored } from './whenItemsStored'

const LOAD_CONCURRENCY = 6

/**
 * Copies a library, with its items and the libraries inside it and theirs, to `to`, as a new
 * library with the same name. The original is left as it is, so this works for read-only libraries
 * too. A source that has its
 * own {@link LibrarySource.copyLibrary} makes the copy; otherwise the items' content and
 * thumbnails are loaded a few at a time, thumbnails being fetched from their URLs and one that can't
 * be fetched left out, and the copies are added together (see `addItemsToLibrary`). Resolves once
 * the copy is listed, while the destination may go on saving its items; if an item can't be
 * copied, or saving fails, the partial copy is deleted, and the error rethrown or, once resolved,
 * reported by the destination as it reports any save that fails after listing.
 * @public
 */
export async function copyLibrary(
	source: LibrarySource,
	libraryId: TLLibraryId,
	to: TLLibraryDestination
): Promise<TLLibrary> {
	if (source.copyLibrary) return source.copyLibrary(libraryId, to)
	const { copied } = await copyLibraryItems(source, libraryId, to)
	return copied
}

/**
 * Something copied, once listed, and `stored`, which settles once the destination has saved it and
 * rejects if it couldn't.
 */
export interface ListedCopy<T> {
	copied: T
	stored: Promise<void>
}

/**
 * {@link copyLibrary} for a source without its own: the libraries are created again, each parent
 * before the libraries inside it, and their items loaded and added again. The tree is read before
 * anything is copied, so copying a library into one inside it copies what was there, once. If
 * saving any item fails, the whole copy is deleted before `stored` rejects.
 */
export async function copyLibraryItems(
	source: LibrarySource,
	libraryId: TLLibraryId,
	to: TLLibraryDestination
): Promise<ListedCopy<TLLibrary>> {
	const tree = getLibrarySubtree(source.getLibraries(), libraryId)
	if (!tree) throw new LibraryNotFoundError(libraryId)
	const copy = await source.createLibrary(tree.library.name, to)
	const deleteCopy = () => source.deleteLibrary(copy.id).catch(() => {})
	let itemsStored: Promise<void>
	try {
		itemsStored = (await copyTree(source, tree, copy.id)).stored
	} catch (error) {
		await deleteCopy()
		throw error
	}
	const stored = itemsStored.catch(async (error) => {
		await deleteCopy()
		throw error
	})
	stored.catch(() => {})
	return { copied: copy, stored }
}

// Copies `node`'s items into `copyId`, then each library inside it into a new one inside the copy.
// Resolves once all of it is listed.
async function copyTree(
	source: LibrarySource,
	node: TLLibraryTreeNode,
	copyId: TLLibraryId
): Promise<{ stored: Promise<void> }> {
	const items = source.getItems(node.library.id)
	const stored = [(await copyItems(source, items, source, copyId)).stored]
	for (const child of node.children) {
		const childCopy = await source.createLibrary(child.library.name, { parentId: copyId })
		stored.push((await copyTree(source, child, childCopy.id)).stored)
	}
	const all = Promise.all(stored).then(() => {})
	all.catch(() => {})
	return { stored: all }
}

/**
 * Adds copies of `items`, from `from`, to a library in `to`, with new ids and in the same order.
 * Their content and thumbnails are loaded a few at a time, and the copies added together.
 * Resolves once `to` lists them.
 */
export async function copyItems(
	from: LibrarySource,
	items: TLLibraryItem[],
	to: LibrarySource,
	toLibraryId: TLLibraryId
): Promise<ListedCopy<TLLibraryItem[]>> {
	if (items.length === 0) return { copied: [], stored: Promise.resolve() }
	const newItems = await mapConcurrently(items, LOAD_CONCURRENCY, (item) => loadCopy(from, item))
	const added = await addItemsToLibrary(to, toLibraryId, newItems)
	return { copied: added, stored: whenStored(added) }
}

/** Adds a copy of `item`, from `from`, to a library in `to`, with a new id, once `to` lists it. */
export async function copyItem(
	from: LibrarySource,
	item: TLLibraryItem,
	to: LibrarySource,
	toLibraryId: TLLibraryId
): Promise<ListedCopy<TLLibraryItem>> {
	const added = await to.addItem(toLibraryId, await loadCopy(from, item))
	return { copied: added, stored: whenStored([added]) }
}

// Its rejection is reported by the source that failed to save the items.
function whenStored(items: TLLibraryItem[]) {
	const stored = whenItemsStored(items.map((item) => item.id))
	stored.catch(() => {})
	return stored
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
		meta: item.meta,
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

import {
	LibraryPermissionError,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemId,
} from '@tldraw/libraries'
import { atom } from 'tldraw'

const ADDED_KEY = 'libraries-example-added-packs'

function readAdded(): string[] {
	try {
		const ids = JSON.parse(localStorage.getItem(ADDED_KEY) ?? '[]')
		return Array.isArray(ids) ? ids : []
	} catch {
		return []
	}
}

/**
 * The packs a user added, by id. That list is all a user stores: the packs' items come from the
 * app's own copy, so a pack's new version reaches everyone who added it with the app's next
 * release, and removing it loses nothing.
 */
export const addedPackIds = atom<string[]>('added pack ids', readAdded())

export function setPackAdded(packId: string, added: boolean) {
	const ids = addedPackIds.get().filter((id) => id !== packId)
	if (added) ids.push(packId)
	addedPackIds.set(ids)
	try {
		localStorage.setItem(ADDED_KEY, JSON.stringify(ids))
	} catch {
		// Storage can be unavailable (private mode): the list then lasts until reload.
	}
}

/** Shows the packs a user added, read-only, from a source holding every pack the app ships. */
export class PackReferencesSource implements LibrarySource {
	readonly id = 'libraries-pack-references'

	constructor(private readonly packs: LibrarySource) {}

	getLibraries(): TLLibrary[] {
		const added = addedPackIds.get()
		return this.packs
			.getLibraries()
			.filter((library) => added.includes(library.meta.packId as string))
			.sort(
				(a, b) => added.indexOf(a.meta.packId as string) - added.indexOf(b.meta.packId as string)
			)
	}

	getItems(libraryId: TLLibraryId): TLLibraryItem[] {
		return this.packs.getItems(libraryId)
	}

	getItemContent(itemId: TLLibraryItemId) {
		return this.packs.getItemContent(itemId)
	}

	can() {
		return false
	}

	async createLibrary(): Promise<TLLibrary> {
		throw new LibraryPermissionError('createLibrary')
	}
	async renameLibrary(libraryId: TLLibraryId): Promise<void> {
		throw new LibraryPermissionError('renameLibrary', libraryId)
	}
	async deleteLibrary(libraryId: TLLibraryId): Promise<void> {
		throw new LibraryPermissionError('deleteLibrary', libraryId)
	}
	async addItem(libraryId: TLLibraryId): Promise<TLLibraryItem> {
		throw new LibraryPermissionError('addItem', libraryId)
	}
	async renameItem(): Promise<void> {
		throw new LibraryPermissionError('renameItem')
	}
	async deleteItem(): Promise<void> {
		throw new LibraryPermissionError('deleteItem')
	}
}

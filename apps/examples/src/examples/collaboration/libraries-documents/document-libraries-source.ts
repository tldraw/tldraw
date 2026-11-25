import {
	type InMemoryLibrarySource,
	LibraryPermissionError,
	type LibrarySource,
	type TLLibraryAction,
	type TLLibraryId,
	type TLLibraryItemId,
	type TLLibraryItemPartial,
	type TLLibraryTarget,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from '@tldraw/libraries'
import { atom, type Atom, computed } from 'tldraw'

/**
 * One document's view of libraries kept elsewhere, such as in workspaces: the libraries added to
 * it, and the user's default library, shown in every document. The rest are available to add.
 * Libraries and items are read and changed in the shared source, so every document sees the same
 * ones.
 */
export class DocumentLibrariesSource implements LibrarySource {
	private readonly added: Atom<ReadonlySet<TLLibraryId>>

	private readonly shown = computed('document libraries', () =>
		this.libraries.getLibraries().filter((library) => this.getLibraryPlacement(library.id))
	)

	constructor(
		readonly id: string,
		private readonly libraries: InMemoryLibrarySource,
		private readonly defaultLibraryId: TLLibraryId,
		added: TLLibraryId[] = []
	) {
		this.added = atom(`${id} added libraries`, new Set(added))
	}

	getLibraries() {
		return this.shown.get()
	}

	getLibraryPlacement(libraryId: TLLibraryId) {
		if (libraryId === this.defaultLibraryId) return 'default'
		return this.added.get().has(libraryId) ? 'added' : undefined
	}

	getAvailableLibraries() {
		return this.libraries.getLibraries().filter((library) => !this.getLibraryPlacement(library.id))
	}

	async addLibraryToDocument(libraryId: TLLibraryId) {
		if (this.getLibraryPlacement(libraryId)) return
		this.assertCan('addLibraryToDocument', libraryId)
		this.added.update((added) => new Set(added).add(libraryId))
	}

	async removeLibraryFromDocument(libraryId: TLLibraryId) {
		this.assertCan('removeLibraryFromDocument', libraryId)
		this.added.update((added) => {
			const rest = new Set(added)
			rest.delete(libraryId)
			return rest
		})
	}

	can(action: TLLibraryAction, target?: TLLibraryTarget) {
		const libraryId = typeof target === 'string' ? target : undefined
		switch (action) {
			case 'addLibraryToDocument':
				return this.getAvailableLibraries().some((library) => library.id === libraryId)
			case 'removeLibraryFromDocument':
				return libraryId !== undefined && this.getLibraryPlacement(libraryId) === 'added'
			case 'deleteLibrary':
			case 'renameLibrary':
				return libraryId !== this.defaultLibraryId && this.libraries.can(action, target)
			default:
				return this.libraries.can(action, target)
		}
	}

	async createLibrary(name: string, options?: TLNewLibraryOptions) {
		const library = await this.libraries.createLibrary(name, options)
		this.added.update((added) => new Set(added).add(library.id))
		return library
	}

	getItems(libraryId: TLLibraryId) {
		return this.libraries.getItems(libraryId)
	}

	getItemContent(itemId: TLLibraryItemId) {
		return this.libraries.getItemContent(itemId)
	}

	getLibraryOwners() {
		return this.libraries.getLibraryOwners()
	}

	getDefaultOwnerId() {
		return this.libraries.getDefaultOwnerId()
	}

	async renameLibrary(libraryId: TLLibraryId, name: string) {
		this.assertCan('renameLibrary', libraryId)
		return this.libraries.renameLibrary(libraryId, name)
	}

	deleteLibrary(libraryId: TLLibraryId) {
		this.assertCan('deleteLibrary', libraryId)
		return this.libraries.deleteLibrary(libraryId)
	}

	addItem(libraryId: TLLibraryId, item: TLNewLibraryItem) {
		return this.libraries.addItem(libraryId, item)
	}

	updateItem(itemId: TLLibraryItemId, partial: TLLibraryItemPartial) {
		return this.libraries.updateItem(itemId, partial)
	}

	deleteItem(itemId: TLLibraryItemId) {
		return this.libraries.deleteItem(itemId)
	}

	moveItem(itemId: TLLibraryItemId, toLibraryId: TLLibraryId) {
		return this.libraries.moveItem(itemId, toLibraryId)
	}

	private assertCan(action: TLLibraryAction, libraryId: TLLibraryId) {
		if (!this.can(action, libraryId)) throw new LibraryPermissionError(action, libraryId)
	}
}

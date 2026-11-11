import { computed, type Computed } from '@tldraw/state'
import type { TLLibrary, TLLibraryId, TLLibraryItemId } from '@tldraw/tlschema'
import { addItemsToLibrary } from './addItemsToLibrary'
import { copyLibraryItemByItem, copyItem } from './copyLibrary'
import {
	LibraryNotFoundError,
	LibraryPermissionError,
	type LibrarySource,
	type TLLibraryAction,
	type TLLibraryOwner,
	type TLLibraryTarget,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from './LibrarySource'

/** @public */
export interface CompositeLibrarySourcePart {
	/**
	 * Who everything in this part belongs to, e.g. `{ id: 'tldraw', name: 'tldraw' }` for
	 * libraries shipped with an app. Leave out for a source that lists its own owners with
	 * `getLibraryOwners`; its libraries keep the owners it gives them.
	 */
	owner?: TLLibraryOwner
	source: LibrarySource
}

/** @public */
export interface CompositeLibrarySourceOptions {
	id?: string
	/** Listed in this order, owners and libraries alike. */
	parts: CompositeLibrarySourcePart[]
	/**
	 * Who new libraries belong to unless they name an owner. Defaults to the first part that
	 * accepts new libraries: its owner, or that source's own default.
	 */
	defaultOwnerId?: string
}

interface Part extends CompositeLibrarySourcePart {
	libraries: Computed<TLLibrary[]>
}

/**
 * One source made of several, such as the user's libraries and the ones an app ships. Each
 * read and write goes to the part holding the library or item, and new libraries to the part
 * of the owner they name. Moving a library to another part's owner copies it there, then
 * deletes the original, so it needs the original's part to allow deleting it.
 * @public
 */
export class CompositeLibrarySource implements LibrarySource {
	readonly id: string
	/**
	 * Present when any part can move items. Within a part, the part moves the item; across parts,
	 * the item is copied and the original deleted, so it gets a new id.
	 */
	readonly moveItem?: (itemId: TLLibraryItemId, toLibraryId: TLLibraryId) => Promise<void>
	private readonly parts: Part[]
	private readonly defaultOwnerId: string | undefined

	private readonly libraries$ = computed('composite libraries', () =>
		this.parts.flatMap((part) => part.libraries.get())
	)

	private readonly partByLibrary$ = computed('composite library parts', () => {
		const parts = new Map<TLLibraryId, Part>()
		for (const part of this.parts) {
			for (const library of part.libraries.get()) parts.set(library.id, part)
		}
		return parts
	})

	private readonly owners$ = computed('composite owners', () => this.parts.flatMap(ownersOf))

	constructor(options: CompositeLibrarySourceOptions) {
		this.id = options.id ?? 'composite'
		this.defaultOwnerId = options.defaultOwnerId
		this.parts = options.parts.map((part, i) => {
			if (!part.owner && !part.source.getLibraryOwners) {
				throw new Error(`Part ${part.source.id} needs an owner or its own getLibraryOwners`)
			}
			const { owner } = part
			return {
				...part,
				libraries: computed(`composite part ${i} libraries`, () => {
					const libraries = part.source.getLibraries()
					if (!owner) return libraries
					return libraries.map((c) => (c.ownerId === owner.id ? c : { ...c, ownerId: owner.id }))
				}),
			}
		})
		if (this.parts.some((part) => part.source.moveItem)) {
			this.moveItem = (itemId, toLibraryId) => this.moveItemBetweenParts(itemId, toLibraryId)
		}
	}

	getLibraries() {
		return this.libraries$.get()
	}

	getItems(libraryId: TLLibraryId) {
		return this.partByLibrary$.get().get(libraryId)?.source.getItems(libraryId) ?? []
	}

	getItemContent(itemId: TLLibraryItemId) {
		return this.getItemPart(itemId).part.source.getItemContent(itemId)
	}

	can(action: TLLibraryAction, target?: TLLibraryTarget) {
		if (target === undefined) return this.getDefaultPart()?.source.can(action) ?? false
		if (typeof target === 'string') {
			return this.partByLibrary$.get().get(target)?.source.can(action, target) ?? false
		}
		const part = this.findOwnerPart(target.ownerId)
		if (!part) return false
		if (part.owner) return part.source.can(action)
		return part.source.can(action, target)
	}

	getLibraryOwners() {
		return this.owners$.get()
	}

	getDefaultOwnerId() {
		if (this.defaultOwnerId !== undefined) return this.defaultOwnerId
		const part = this.getDefaultPart()
		if (!part) return undefined
		if (part.owner) return part.owner.id
		return part.source.getDefaultOwnerId?.() ?? ownersOf(part)[0]?.id
	}

	async createLibrary(name: string, options: TLNewLibraryOptions = {}) {
		const ownerId = options.ownerId ?? this.getDefaultOwnerId()
		if (ownerId === undefined) throw new LibraryPermissionError('createLibrary')
		const part = this.getOwnerPart(ownerId)
		if (!part.owner) return part.source.createLibrary(name, { ...options, ownerId })
		const library = await part.source.createLibrary(
			name,
			options.meta === undefined ? {} : { meta: options.meta }
		)
		return { ...library, ownerId: part.owner.id }
	}

	renameLibrary(libraryId: TLLibraryId, name: string) {
		return this.getLibraryPart(libraryId).source.renameLibrary(libraryId, name)
	}

	deleteLibrary(libraryId: TLLibraryId) {
		return this.getLibraryPart(libraryId).source.deleteLibrary(libraryId)
	}

	addItem(libraryId: TLLibraryId, item: TLNewLibraryItem) {
		return this.getLibraryPart(libraryId).source.addItem(libraryId, item)
	}

	/** Added together by a part that can; by a part that can't, one at a time. */
	addItems(libraryId: TLLibraryId, items: TLNewLibraryItem[]) {
		return addItemsToLibrary(this.getLibraryPart(libraryId).source, libraryId, items)
	}

	renameItem(itemId: TLLibraryItemId, name: string) {
		return this.getItemPart(itemId).part.source.renameItem(itemId, name)
	}

	deleteItem(itemId: TLLibraryItemId) {
		return this.getItemPart(itemId).part.source.deleteItem(itemId)
	}

	async moveLibrary(libraryId: TLLibraryId, ownerId: string) {
		const from = this.getLibraryPart(libraryId)
		const to = this.getOwnerPart(ownerId)
		if (from === to) {
			if (from.owner) return
			if (!from.source.moveLibrary) {
				throw new Error(`Source ${from.source.id} can't move libraries`)
			}
			return from.source.moveLibrary(libraryId, ownerId)
		}
		if (!from.source.can('deleteLibrary', libraryId)) {
			throw new LibraryPermissionError('deleteLibrary', libraryId)
		}
		await copyLibraryItemByItem(this, libraryId, ownerId)
		await from.source.deleteLibrary(libraryId)
	}

	/**
	 * Within a part whose source can copy libraries itself, that source makes the copy; anywhere
	 * else, each item is loaded and added to the new library.
	 */
	async copyLibrary(libraryId: TLLibraryId, ownerId: string) {
		const from = this.getLibraryPart(libraryId)
		const to = this.getOwnerPart(ownerId)
		if (from === to && !from.owner && from.source.copyLibrary) {
			return from.source.copyLibrary(libraryId, ownerId)
		}
		return copyLibraryItemByItem(this, libraryId, ownerId)
	}

	private async moveItemBetweenParts(itemId: TLLibraryItemId, toLibraryId: TLLibraryId) {
		const { part: from, item } = this.getItemPart(itemId)
		const to = this.getLibraryPart(toLibraryId)
		if (from === to) {
			if (!from.source.moveItem) throw new Error(`Source ${from.source.id} can't move items`)
			return from.source.moveItem(itemId, toLibraryId)
		}
		if (!from.source.can('deleteItem', item.libraryId)) {
			throw new LibraryPermissionError('deleteItem', item.libraryId)
		}
		await copyItem(from.source, item, to.source, toLibraryId)
		await from.source.deleteItem(itemId)
	}

	private getDefaultPart() {
		if (this.defaultOwnerId !== undefined) return this.findOwnerPart(this.defaultOwnerId)
		return this.parts.find((part) => part.source.can('createLibrary')) ?? this.parts[0]
	}

	private findOwnerPart(ownerId: string) {
		return this.parts.find((part) => ownersOf(part).some((owner) => owner.id === ownerId))
	}

	private getOwnerPart(ownerId: string) {
		const part = this.findOwnerPart(ownerId)
		if (!part) throw new LibraryNotFoundError(ownerId)
		return part
	}

	private getLibraryPart(libraryId: TLLibraryId) {
		const part = this.partByLibrary$.get().get(libraryId)
		if (!part) throw new LibraryNotFoundError(libraryId)
		return part
	}

	// Items are found through their libraries: sources list items per library only.
	private getItemPart(itemId: TLLibraryItemId) {
		for (const part of this.parts) {
			for (const library of part.libraries.get()) {
				const item = part.source.getItems(library.id).find((i) => i.id === itemId)
				if (item) return { part, item }
			}
		}
		throw new LibraryNotFoundError(itemId)
	}
}

function ownersOf(part: CompositeLibrarySourcePart): TLLibraryOwner[] {
	if (part.owner) return [part.owner]
	return part.source.getLibraryOwners ? part.source.getLibraryOwners() : []
}

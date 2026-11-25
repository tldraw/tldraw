import { computed, type Computed } from '@tldraw/state'
import type { TLLibrary, TLLibraryId, TLLibraryItemId } from '@tldraw/tlschema'
import { addItemsToLibrary } from './addItemsToLibrary'
import { copyLibraryItems, copyItem } from './copyLibrary'
import {
	LibraryNotFoundError,
	LibraryPermissionError,
	type LibrarySource,
	type TLCopyLibraryOptions,
	type TLLibraryAction,
	type TLLibraryItemDetails,
	type TLLibraryOwner,
	type TLLibraryPlacement,
	type TLLibraryTarget,
	type TLLibraryItemPartial,
	type TLLibraryThumbnailContext,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from './LibrarySource'
import { getLibraryItemCount, getLibraryPreviewItems } from './librarySummary'
import { resolveLibraryParent } from './libraryTree'
import { getThumbnailForColorMode, type TLLibraryItem } from './schema'

/** @public */
export interface CompositeLibrarySourcePart {
	/**
	 * Who everything in this part belongs to, e.g. `{ id: 'tldraw', name: 'tldraw' }` for
	 * libraries shipped with an app. Leave out for a source that lists its own owners with
	 * `getLibraryOwners`; its libraries keep the owners it gives them.
	 *
	 * Parts can name the same owner, to list their libraries together, such as an app's generated
	 * libraries beside a workspace's own. The owner is listed once, as the first part naming it
	 * gives it, and libraries created for it, or copied to it, go to that first part.
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
	availableLibraries: Computed<TLLibrary[]>
}

/**
 * One source made of several, such as the user's libraries and the ones an app ships. Each
 * read and write goes to the part holding the library or item, and new libraries to the part
 * of the owner they name. Moving a library to another part's owner copies it there, then
 * deletes the original, so it needs the original's part to allow deleting it. Such a move resolves
 * once the copy is listed; the original is deleted once the copy is saved, and stays if saving
 * fails.
 * @public
 */
export class CompositeLibrarySource implements LibrarySource {
	readonly id: string
	/**
	 * Present when any part can move items. Within a part, the part moves the item; across parts,
	 * the item is copied and the original deleted, so it gets a new id.
	 */
	readonly moveItem?: (
		itemId: TLLibraryItemId,
		toLibraryId: TLLibraryId
	) => Promise<TLLibraryItemId>
	/**
	 * Present when any part has it, listing each part's in order. A part with a fixed owner lists
	 * that owner when its source lists any; a part without it lists none.
	 */
	readonly getNewLibraryOwnerIds?: () => string[]
	/** Present when any part has it. A part without it gives its libraries no placement. */
	readonly getLibraryPlacement?: (libraryId: TLLibraryId) => TLLibraryPlacement | undefined
	/**
	 * Present, with {@link CompositeLibrarySource.addLibraryToDocument}, when any part has them.
	 * Each available library is added by its own part.
	 */
	readonly getAvailableLibraries?: () => TLLibrary[]
	readonly addLibraryToDocument?: (libraryId: TLLibraryId) => Promise<void>
	/** Present when any part has it, asking the part that holds the library. */
	readonly loadItems?: (libraryId: TLLibraryId) => void
	/** Present when any part has it. A part without it is never loading. */
	readonly isLoadingItems?: (libraryId: TLLibraryId) => boolean
	/** Present when any part has it. A part without it counts its listed items. */
	readonly getItemCount?: (libraryId: TLLibraryId) => number
	/** Present when any part has it. A part without it previews its listed items. */
	readonly getPreviewItems?: (libraryId: TLLibraryId, count: number) => TLLibraryItem[]
	/** Present when any part has it. A part without it may match any search. */
	readonly mayHaveItemsMatching?: (libraryId: TLLibraryId, query: string) => boolean
	/** Present when any part has it. */
	readonly getItemDetails?: (item: TLLibraryItem) => TLLibraryItemDetails
	/** Present when any part has it. */
	readonly removeLibraryFromDocument?: (libraryId: TLLibraryId) => Promise<void>
	private readonly parts: Part[]
	private readonly defaultOwnerId: string | undefined

	private readonly libraries$ = computed('composite libraries', () =>
		this.parts.flatMap((part) => part.libraries.get())
	)

	private readonly availableLibraries$ = computed('composite available libraries', () =>
		this.parts.flatMap((part) => part.availableLibraries.get())
	)

	// Available libraries too, so they can be browsed and added through the part that has them.
	private readonly partByLibrary$ = computed('composite library parts', () => {
		const parts = new Map<TLLibraryId, Part>()
		for (const part of this.parts) {
			for (const library of part.availableLibraries.get()) parts.set(library.id, part)
			for (const library of part.libraries.get()) parts.set(library.id, part)
		}
		return parts
	})

	private readonly owners$ = computed('composite owners', () => {
		const seen = new Set<string>()
		return this.parts.flatMap(ownersOf).filter((owner) => {
			if (seen.has(owner.id)) return false
			seen.add(owner.id)
			return true
		})
	})

	constructor(options: CompositeLibrarySourceOptions) {
		this.id = options.id ?? 'composite'
		this.defaultOwnerId = options.defaultOwnerId
		this.parts = options.parts.map((part, i) => {
			if (!part.owner && !part.source.getLibraryOwners) {
				throw new Error(`Part ${part.source.id} needs an owner or its own getLibraryOwners`)
			}
			const { owner, source } = part
			const withOwner = (libraries: TLLibrary[]) =>
				owner
					? libraries.map((c) => (c.ownerId === owner.id ? c : { ...c, ownerId: owner.id }))
					: libraries
			return {
				...part,
				libraries: computed(`composite part ${i} libraries`, () =>
					withOwner(source.getLibraries())
				),
				availableLibraries: computed(`composite part ${i} available libraries`, () =>
					withOwner(source.getAvailableLibraries ? source.getAvailableLibraries() : [])
				),
			}
		})
		if (this.parts.some((part) => part.source.moveItem)) {
			this.moveItem = (itemId, toLibraryId) => this.moveItemBetweenParts(itemId, toLibraryId)
		}
		if (this.parts.some((part) => part.source.getNewLibraryOwnerIds)) {
			this.getNewLibraryOwnerIds = () =>
				this.parts.flatMap(({ owner, source }) => {
					const ids = source.getNewLibraryOwnerIds ? source.getNewLibraryOwnerIds() : []
					if (!owner) return ids
					return ids.length > 0 ? [owner.id] : []
				})
		}
		if (this.parts.some((part) => part.source.getLibraryPlacement)) {
			this.getLibraryPlacement = (libraryId) => {
				const source = this.partByLibrary$.get().get(libraryId)?.source
				return source?.getLibraryPlacement ? source.getLibraryPlacement(libraryId) : undefined
			}
		}
		if (this.parts.some((part) => part.source.getAvailableLibraries)) {
			this.getAvailableLibraries = () => this.availableLibraries$.get()
			this.addLibraryToDocument = async (libraryId) => {
				const { source } = this.getLibraryPart(libraryId)
				if (!source.addLibraryToDocument) {
					throw new LibraryPermissionError('addLibraryToDocument', libraryId)
				}
				return source.addLibraryToDocument(libraryId)
			}
		}
		if (this.parts.some((part) => part.source.loadItems)) {
			this.loadItems = (libraryId) => {
				const source = this.partByLibrary$.get().get(libraryId)?.source
				if (source?.loadItems) source.loadItems(libraryId)
			}
		}
		if (this.parts.some((part) => part.source.isLoadingItems)) {
			this.isLoadingItems = (libraryId) => {
				const source = this.partByLibrary$.get().get(libraryId)?.source
				return source?.isLoadingItems ? source.isLoadingItems(libraryId) : false
			}
		}
		if (this.parts.some((part) => part.source.getItemCount)) {
			this.getItemCount = (libraryId) => {
				const source = this.partByLibrary$.get().get(libraryId)?.source
				if (!source) return 0
				return getLibraryItemCount(source, libraryId)
			}
		}
		if (this.parts.some((part) => part.source.getPreviewItems)) {
			this.getPreviewItems = (libraryId, count) => {
				const source = this.partByLibrary$.get().get(libraryId)?.source
				if (!source) return []
				return getLibraryPreviewItems(source, libraryId, count)
			}
		}
		if (this.parts.some((part) => part.source.mayHaveItemsMatching)) {
			this.mayHaveItemsMatching = (libraryId, query) => {
				const source = this.partByLibrary$.get().get(libraryId)?.source
				return source?.mayHaveItemsMatching ? source.mayHaveItemsMatching(libraryId, query) : true
			}
		}
		if (this.parts.some((part) => part.source.getItemDetails)) {
			this.getItemDetails = (item) => {
				const source = this.partByLibrary$.get().get(item.libraryId)?.source
				return source?.getItemDetails ? source.getItemDetails(item) : {}
			}
		}
		if (this.parts.some((part) => part.source.removeLibraryFromDocument)) {
			this.removeLibraryFromDocument = async (libraryId) => {
				const { source } = this.getLibraryPart(libraryId)
				if (!source.removeLibraryFromDocument) {
					throw new LibraryPermissionError('removeLibraryFromDocument', libraryId)
				}
				return source.removeLibraryFromDocument(libraryId)
			}
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

	/**
	 * Asks the item's part, so each part sizes its own thumbnails. A part without
	 * `resolveThumbnail` gets the item's `thumbnail` for the colour mode, as the panel shows it
	 * from a source without one.
	 */
	resolveThumbnail(item: TLLibraryItem, context: TLLibraryThumbnailContext) {
		const source = this.getLibraryPart(item.libraryId).source
		if (source.resolveThumbnail) return source.resolveThumbnail(item, context)
		return item.thumbnail ? getThumbnailForColorMode(item.thumbnail, context.colorMode) : null
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

	/** Inside a library, it is created by that library's part, and takes its owner. */
	async createLibrary(name: string, options: TLNewLibraryOptions = {}) {
		const { parentId, meta } = options
		if (parentId !== undefined) {
			resolveLibraryParent(this.getLibraries(), parentId, options.ownerId)
			const part = this.getLibraryPart(parentId)
			const library = await part.source.createLibrary(name, {
				parentId,
				...(meta === undefined ? {} : { meta }),
			})
			return part.owner ? { ...library, ownerId: part.owner.id } : library
		}
		const ownerId = options.ownerId ?? this.getDefaultOwnerId()
		if (ownerId === undefined) throw new LibraryPermissionError('createLibrary')
		const part = this.getOwnerPart(ownerId)
		if (!part.owner) return part.source.createLibrary(name, { ...options, ownerId })
		const library = await part.source.createLibrary(name, meta === undefined ? {} : { meta })
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

	updateItem(itemId: TLLibraryItemId, partial: TLLibraryItemPartial) {
		return this.getItemPart(itemId).part.source.updateItem(itemId, partial)
	}

	deleteItem(itemId: TLLibraryItemId) {
		return this.getItemPart(itemId).part.source.deleteItem(itemId)
	}

	/**
	 * Within a part whose source can copy libraries itself, that source makes the copy; anywhere
	 * else, each library inside it is created again and each item is loaded and added again.
	 */
	async copyLibrary(
		libraryId: TLLibraryId,
		ownerId: string | undefined,
		options: TLCopyLibraryOptions = {}
	) {
		const from = this.getLibraryPart(libraryId)
		const { part: to, ownerId: toOwnerId } = this.getDestination(ownerId, options.parentId)
		if (from === to && !from.owner && from.source.copyLibrary) {
			return from.source.copyLibrary(libraryId, toOwnerId, options)
		}
		const { copied } = await copyLibraryItems(this, libraryId, toOwnerId, options)
		return copied
	}

	// Where a library copied to `ownerId` or inside `parentId` goes: the parent's part, or the
	// owner's, and whose it then is.
	private getDestination(ownerId: string | undefined, parentId: TLLibraryId | undefined) {
		if (parentId !== undefined) {
			const parent = resolveLibraryParent(this.getLibraries(), parentId, ownerId)
			return { part: this.getLibraryPart(parentId), ownerId: parent.ownerId }
		}
		const toOwnerId = ownerId ?? this.getDefaultOwnerId()
		if (toOwnerId === undefined) throw new LibraryPermissionError('createLibrary')
		return { part: this.getOwnerPart(toOwnerId), ownerId: toOwnerId }
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
		const { copied, stored } = await copyItem(from.source, item, to.source, toLibraryId)
		deleteOnceStored(stored, () => from.source.deleteItem(itemId))
		return copied.id
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
			for (const library of [...part.libraries.get(), ...part.availableLibraries.get()]) {
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

// An item moved across parts resolves once its copy is listed, and the original is deleted only
// once the copy is saved. If saving fails, the destination has reported it and removed the copy,
// and the original stays.
function deleteOnceStored(stored: Promise<void>, deleteOriginal: () => Promise<void>) {
	stored
		.then(deleteOriginal, () => {})
		.catch((error) => {
			console.error("Couldn't delete the original of a moved item", error)
		})
}

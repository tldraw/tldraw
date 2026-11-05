import { computed, type Computed } from '@tldraw/state'
import {
	CollectionNotFoundError,
	CollectionPermissionError,
	type CollectionSource,
	type TLCollectionAction,
	type TLCollectionOwner,
	type TLNewCollectionItem,
	type TLNewCollectionOptions,
} from './CollectionSource'
import { copyCollection, copyItem } from './copyCollection'
import type { TLCollection, TLCollectionId, TLCollectionItemId } from './schema'

/** @public */
export interface CompositeCollectionSourcePart {
	/**
	 * Who everything in this part belongs to, e.g. `{ id: 'tldraw', name: 'tldraw' }` for packs
	 * shipped with an app. Leave out for a source that lists its own owners with
	 * `getCollectionOwners`; its collections keep the owners it gives them.
	 */
	owner?: TLCollectionOwner
	source: CollectionSource
}

/** @public */
export interface CompositeCollectionSourceOptions {
	id?: string
	/** Listed in this order, owners and collections alike. */
	parts: CompositeCollectionSourcePart[]
	/**
	 * Who new collections belong to unless they name an owner. Defaults to the first part that
	 * accepts new collections: its owner, or that source's own default.
	 */
	defaultOwnerId?: string
}

interface Part extends CompositeCollectionSourcePart {
	collections: Computed<TLCollection[]>
}

/**
 * One source made of several, such as the user's collections and the packs an app ships. Each
 * read and write goes to the part holding the collection or item, and new collections to the part
 * of the owner they name. Moving a collection to another part's owner copies it there, then
 * deletes the original if its part allows; a read-only original stays, so the move is a copy.
 * @public
 */
export class CompositeCollectionSource implements CollectionSource {
	readonly id: string
	/**
	 * Present when any part can move items. Within a part, the part moves the item; across parts,
	 * the item is copied and the original deleted, so it gets a new id.
	 */
	readonly moveItem?: (itemId: TLCollectionItemId, toCollectionId: TLCollectionId) => Promise<void>
	private readonly parts: Part[]
	private readonly defaultOwnerId: string | undefined

	private readonly collections$ = computed('composite collections', () =>
		this.parts.flatMap((part) => part.collections.get())
	)

	private readonly partByCollection$ = computed('composite collection parts', () => {
		const parts = new Map<TLCollectionId, Part>()
		for (const part of this.parts) {
			for (const collection of part.collections.get()) parts.set(collection.id, part)
		}
		return parts
	})

	private readonly owners$ = computed('composite owners', () =>
		this.parts.flatMap((part) => {
			const readOnly = !part.source.can('createCollection')
			return ownersOf(part).map((owner) => (readOnly ? { ...owner, readOnly } : owner))
		})
	)

	constructor(options: CompositeCollectionSourceOptions) {
		this.id = options.id ?? 'composite'
		this.defaultOwnerId = options.defaultOwnerId
		this.parts = options.parts.map((part, i) => {
			if (!part.owner && !part.source.getCollectionOwners) {
				throw new Error(`Part ${part.source.id} needs an owner or its own getCollectionOwners`)
			}
			const { owner } = part
			return {
				...part,
				collections: computed(`composite part ${i} collections`, () => {
					const collections = part.source.getCollections()
					if (!owner) return collections
					return collections.map((c) => (c.ownerId === owner.id ? c : { ...c, ownerId: owner.id }))
				}),
			}
		})
		if (this.parts.some((part) => part.source.moveItem)) {
			this.moveItem = (itemId, toCollectionId) => this.moveItemBetweenParts(itemId, toCollectionId)
		}
	}

	getCollections() {
		return this.collections$.get()
	}

	getItems(collectionId: TLCollectionId) {
		return this.partByCollection$.get().get(collectionId)?.source.getItems(collectionId) ?? []
	}

	getItemContent(itemId: TLCollectionItemId) {
		return this.getItemPart(itemId).part.source.getItemContent(itemId)
	}

	can(action: TLCollectionAction, collectionId?: TLCollectionId) {
		if (collectionId === undefined) return this.getDefaultPart()?.source.can(action) ?? false
		return this.partByCollection$.get().get(collectionId)?.source.can(action, collectionId) ?? false
	}

	getCollectionOwners() {
		return this.owners$.get()
	}

	getDefaultOwnerId() {
		if (this.defaultOwnerId !== undefined) return this.defaultOwnerId
		const part = this.getDefaultPart()
		if (!part) return undefined
		if (part.owner) return part.owner.id
		return part.source.getDefaultOwnerId?.() ?? ownersOf(part)[0]?.id
	}

	async createCollection(name: string, options: TLNewCollectionOptions = {}) {
		const ownerId = options.ownerId ?? this.getDefaultOwnerId()
		if (ownerId === undefined) throw new CollectionPermissionError('createCollection')
		const part = this.getOwnerPart(ownerId)
		if (!part.owner) return part.source.createCollection(name, { ownerId })
		const collection = await part.source.createCollection(name)
		return { ...collection, ownerId: part.owner.id }
	}

	renameCollection(collectionId: TLCollectionId, name: string) {
		return this.getCollectionPart(collectionId).source.renameCollection(collectionId, name)
	}

	deleteCollection(collectionId: TLCollectionId) {
		return this.getCollectionPart(collectionId).source.deleteCollection(collectionId)
	}

	addItem(collectionId: TLCollectionId, item: TLNewCollectionItem) {
		return this.getCollectionPart(collectionId).source.addItem(collectionId, item)
	}

	renameItem(itemId: TLCollectionItemId, name: string) {
		return this.getItemPart(itemId).part.source.renameItem(itemId, name)
	}

	deleteItem(itemId: TLCollectionItemId) {
		return this.getItemPart(itemId).part.source.deleteItem(itemId)
	}

	async moveCollection(collectionId: TLCollectionId, ownerId: string) {
		const from = this.getCollectionPart(collectionId)
		const to = this.getOwnerPart(ownerId)
		if (from === to) {
			if (from.owner) return
			if (!from.source.moveCollection) {
				throw new Error(`Source ${from.source.id} can't move collections`)
			}
			return from.source.moveCollection(collectionId, ownerId)
		}
		await copyCollection(this, collectionId, ownerId)
		if (from.source.can('deleteCollection', collectionId)) {
			await from.source.deleteCollection(collectionId)
		}
	}

	private async moveItemBetweenParts(itemId: TLCollectionItemId, toCollectionId: TLCollectionId) {
		const { part: from, item } = this.getItemPart(itemId)
		const to = this.getCollectionPart(toCollectionId)
		if (from === to) {
			if (!from.source.moveItem) throw new Error(`Source ${from.source.id} can't move items`)
			return from.source.moveItem(itemId, toCollectionId)
		}
		if (!from.source.can('deleteItem', item.collectionId)) {
			throw new CollectionPermissionError('deleteItem', item.collectionId)
		}
		await copyItem(from.source, item, to.source, toCollectionId)
		await from.source.deleteItem(itemId)
	}

	private getDefaultPart() {
		if (this.defaultOwnerId !== undefined) return this.findOwnerPart(this.defaultOwnerId)
		return this.parts.find((part) => part.source.can('createCollection')) ?? this.parts[0]
	}

	private findOwnerPart(ownerId: string) {
		return this.parts.find((part) => ownersOf(part).some((owner) => owner.id === ownerId))
	}

	private getOwnerPart(ownerId: string) {
		const part = this.findOwnerPart(ownerId)
		if (!part) throw new CollectionNotFoundError(ownerId)
		return part
	}

	private getCollectionPart(collectionId: TLCollectionId) {
		const part = this.partByCollection$.get().get(collectionId)
		if (!part) throw new CollectionNotFoundError(collectionId)
		return part
	}

	// Items are found through their collections: sources list items per collection only.
	private getItemPart(itemId: TLCollectionItemId) {
		for (const part of this.parts) {
			for (const collection of part.collections.get()) {
				const item = part.source.getItems(collection.id).find((i) => i.id === itemId)
				if (item) return { part, item }
			}
		}
		throw new CollectionNotFoundError(itemId)
	}
}

function ownersOf(part: CompositeCollectionSourcePart): TLCollectionOwner[] {
	if (part.owner) return [part.owner]
	return part.source.getCollectionOwners ? part.source.getCollectionOwners() : []
}

import { atom, computed, transact, type Computed } from '@tldraw/state'
import { structuredClone, uniqueId } from '@tldraw/utils'
import {
	CollectionNotFoundError,
	CollectionPermissionError,
	type CollectionSource,
	type TLCollectionAction,
	type TLNewCollectionItem,
} from './CollectionSource'
import {
	collectionItemValidator,
	collectionValidator,
	parseCollectionItemContent,
	type TLCollection,
	type TLCollectionItem,
	type TLCollectionItemContent,
} from './schema'

export interface InMemoryCollectionSourceOptions {
	id?: string
	/** Starting data, e.g. sample collections while a real backend doesn't exist yet. */
	initial?: {
		collections: TLCollection[]
		items: TLCollectionItem[]
		contents: Record<string, TLCollectionItemContent>
	}
	/** Makes every collection read-only, like a prefab pack. Items can still be used. */
	readOnly?: boolean
}

/**
 * A source that keeps everything in memory. Used for tests, for building UI before a backend
 * exists, and as the reference for how a source should behave.
 */
export class InMemoryCollectionSource implements CollectionSource {
	readonly id: string
	private readonly readOnly: boolean
	private readonly collections = atom<TLCollection[]>('collections', [])
	private readonly items = atom<TLCollectionItem[]>('collection items', [])
	private readonly contents = new Map<string, TLCollectionItemContent>()
	private readonly thumbnailUrls = new Map<string, string>()
	private readonly itemsByCollection = new Map<string, Computed<TLCollectionItem[]>>()

	constructor(options: InMemoryCollectionSourceOptions = {}) {
		this.id = options.id ?? 'in-memory'
		this.readOnly = options.readOnly ?? false
		if (options.initial) {
			const collections = options.initial.collections.map((c) => collectionValidator.validate(c))
			const items = options.initial.items.map((i) => collectionItemValidator.validate(i))
			// Bad starting data would only fail later, in the UI, so it is checked as a whole up front.
			// Content without a listed item is refused too: it could be loaded by id without being
			// listed, which breaks "a collection someone may not use is simply not listed".
			if (new Set(collections.map((c) => c.id)).size !== collections.length) {
				throw new Error('Duplicate collection ids in starting data')
			}
			if (new Set(items.map((i) => i.id)).size !== items.length) {
				throw new Error('Duplicate item ids in starting data')
			}
			for (const item of items) {
				if (!collections.some((c) => c.id === item.collectionId)) {
					throw new Error(`Item ${item.id} belongs to missing collection ${item.collectionId}`)
				}
				if (!(item.id in options.initial.contents)) {
					throw new Error(`Item ${item.id} has no content`)
				}
			}
			for (const itemId of Object.keys(options.initial.contents)) {
				if (!items.some((i) => i.id === itemId)) throw new Error(`Content ${itemId} has no item`)
			}
			this.collections.set(collections)
			this.items.set(items)
			for (const [itemId, content] of Object.entries(options.initial.contents)) {
				this.contents.set(itemId, parseCollectionItemContent(content))
			}
		}
	}

	getCollections() {
		return this.collections.get()
	}

	// Cached per collection, and only a new array when that collection's items change, so a change
	// in one collection doesn't re-render every open listing.
	getItems(collectionId: string) {
		let items = this.itemsByCollection.get(collectionId)
		if (!items) {
			items = computed(
				`collection items ${collectionId}`,
				() => this.items.get().filter((item) => item.collectionId === collectionId),
				{ isEqual: sameItems }
			)
			this.itemsByCollection.set(collectionId, items)
		}
		return items.get()
	}

	// Copied in and out, as a server would: mutating what a caller passed or got back can't
	// change what is stored.
	async getItemContent(itemId: string) {
		const content = this.contents.get(itemId)
		if (!content) throw new CollectionNotFoundError(itemId)
		return structuredClone(content)
	}

	can(action: TLCollectionAction, collectionId?: string) {
		const collection = collectionId === undefined ? undefined : this.findCollection(collectionId)
		if (collectionId !== undefined && !collection) return false
		if (this.readOnly) return false
		return !collection?.readOnly
	}

	async createCollection(name: string) {
		this.assertCan('createCollection')
		const collection = collectionValidator.validate({ id: uniqueId(), name })
		this.collections.update((all) => [...all, collection])
		return collection
	}

	async renameCollection(collectionId: string, name: string) {
		const collection = this.getCollection(collectionId)
		this.assertCan('renameCollection', collectionId)
		const renamed = collectionValidator.validate({ ...collection, name })
		this.collections.update((all) => all.map((c) => (c.id === collectionId ? renamed : c)))
	}

	async deleteCollection(collectionId: string) {
		this.getCollection(collectionId)
		this.assertCan('deleteCollection', collectionId)
		transact(() => {
			for (const item of this.getItems(collectionId)) this.forgetItem(item.id)
			this.items.update((all) => all.filter((i) => i.collectionId !== collectionId))
			this.collections.update((all) => all.filter((c) => c.id !== collectionId))
		})
		this.itemsByCollection.delete(collectionId)
	}

	async addItem(collectionId: string, newItem: TLNewCollectionItem) {
		this.getCollection(collectionId)
		this.assertCan('addItem', collectionId)
		const id = uniqueId()
		const content = parseCollectionItemContent(newItem.content)
		let item = collectionItemValidator.validate({
			id,
			collectionId,
			...(newItem.name === undefined ? {} : { name: newItem.name }),
			version: 1,
		})
		// Created only after validation, so a rejected item can't leak its blob.
		if (newItem.thumbnail) {
			const thumbnailUrl = URL.createObjectURL(newItem.thumbnail)
			this.thumbnailUrls.set(id, thumbnailUrl)
			item = { ...item, thumbnailUrl }
		}
		this.contents.set(id, structuredClone(content))
		this.items.update((all) => [...all, item])
		return item
	}

	async renameItem(itemId: string, name: string) {
		const item = this.getItem(itemId)
		this.assertCan('renameItem', item.collectionId)
		const renamed = collectionItemValidator.validate({ ...item, name })
		this.items.update((all) => all.map((i) => (i.id === itemId ? renamed : i)))
	}

	async deleteItem(itemId: string) {
		const item = this.getItem(itemId)
		this.assertCan('deleteItem', item.collectionId)
		this.forgetItem(itemId)
		this.items.update((all) => all.filter((i) => i.id !== itemId))
	}

	/** Releases every thumbnail URL this source created. Call it when throwing the source away. */
	dispose() {
		for (const url of this.thumbnailUrls.values()) URL.revokeObjectURL(url)
		this.thumbnailUrls.clear()
	}

	private findCollection(collectionId: string) {
		return this.collections.get().find((c) => c.id === collectionId)
	}

	private getCollection(collectionId: string) {
		const collection = this.findCollection(collectionId)
		if (!collection) throw new CollectionNotFoundError(collectionId)
		return collection
	}

	private getItem(itemId: string) {
		const item = this.items.get().find((i) => i.id === itemId)
		if (!item) throw new CollectionNotFoundError(itemId)
		return item
	}

	private assertCan(action: TLCollectionAction, collectionId?: string) {
		if (!this.can(action, collectionId)) throw new CollectionPermissionError(action, collectionId)
	}

	// Object URLs keep their blob alive until revoked, so a deleted item would otherwise leak it.
	private forgetItem(itemId: string) {
		this.contents.delete(itemId)
		const url = this.thumbnailUrls.get(itemId)
		if (url) URL.revokeObjectURL(url)
		this.thumbnailUrls.delete(itemId)
	}
}

function sameItems(a: TLCollectionItem[], b: TLCollectionItem[]) {
	return a.length === b.length && a.every((item, i) => item === b[i])
}

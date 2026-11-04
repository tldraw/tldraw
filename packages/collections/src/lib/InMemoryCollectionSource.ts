import type { Computed } from '@tldraw/state'
import { Store, StoreSchema } from '@tldraw/store'
import { structuredClone } from '@tldraw/utils'
import {
	CollectionNotFoundError,
	CollectionPermissionError,
	type CollectionSource,
	type TLCollectionAction,
	type TLCollectionOwner,
	type TLNewCollectionItem,
} from './CollectionSource'
import {
	CollectionItemRecordType,
	collectionItemMigrations,
	collectionItemValidator,
	collectionMigrations,
	CollectionRecordType,
	mapThumbnail,
	parseCollectionItemContent,
	type TLCollection,
	type TLCollectionId,
	type TLCollectionItem,
	type TLCollectionItemContent,
	type TLCollectionItemId,
	type TLCollectionRecord,
} from './schema'

export interface InMemoryCollectionSourceOptions {
	id?: string
	/** Starting data, e.g. sample collections while a real backend doesn't exist yet. */
	initial?: {
		collections: TLCollection[]
		items: TLCollectionItem[]
		contents: Record<TLCollectionItemId, TLCollectionItemContent>
	}
	/** Makes every collection read-only, like a prefab pack. Items can still be used. */
	readOnly?: boolean
	/**
	 * Who collections can belong to. New collections go to the first. Leave out for a source
	 * without owners, whose collections can't be moved.
	 */
	owners?: TLCollectionOwner[]
}

const schema = StoreSchema.create<TLCollectionRecord>(
	{ collection: CollectionRecordType, 'collection-item': CollectionItemRecordType },
	{ migrations: [collectionMigrations, collectionItemMigrations] }
)

/**
 * A source that keeps everything in memory. Used for tests, for building UI before a backend
 * exists, and as the reference for how a source should behave.
 *
 * Collections and items live in a tldraw `Store`, which validates them and freezes them in
 * development. Item content and thumbnails stay outside it: content can be large, and thumbnails
 * are object URLs that have to be released.
 */
export class InMemoryCollectionSource implements CollectionSource {
	readonly id: string
	private readonly readOnly: boolean
	private readonly owners: TLCollectionOwner[]
	private readonly store = new Store<TLCollectionRecord>({ schema, props: {} })
	private readonly collections = this.store.query.records('collection')
	private readonly itemsByCollection = new Map<TLCollectionId, Computed<TLCollectionItem[]>>()
	private readonly contents = new Map<TLCollectionItemId, TLCollectionItemContent>()
	private readonly thumbnailUrls = new Map<TLCollectionItemId, string[]>()

	constructor(options: InMemoryCollectionSourceOptions = {}) {
		this.id = options.id ?? 'in-memory'
		this.readOnly = options.readOnly ?? false
		this.owners = options.owners ?? []
		if (options.initial) {
			const { collections, items, contents } = options.initial
			// Bad starting data would only fail later, in the UI, so it is checked as a whole up front.
			// Content without a listed item is refused too: it could be loaded by id without being
			// listed, which breaks "a collection someone may not use is simply not listed".
			const ids = [...collections, ...items].map((r) => r.id)
			if (new Set(ids).size !== ids.length) throw new Error('Duplicate ids in starting data')
			for (const collection of collections) {
				if (collection.ownerId !== undefined && !this.hasOwner(collection.ownerId)) {
					throw new Error(
						`Collection ${collection.id} belongs to missing owner ${collection.ownerId}`
					)
				}
			}
			for (const item of items) {
				if (!collections.some((c) => c.id === item.collectionId)) {
					throw new Error(`Item ${item.id} belongs to missing collection ${item.collectionId}`)
				}
				if (!(item.id in contents)) throw new Error(`Item ${item.id} has no content`)
			}
			for (const itemId of Object.keys(contents)) {
				if (!items.some((i) => i.id === itemId)) throw new Error(`Content ${itemId} has no item`)
			}
			this.store.put([...collections, ...items])
			for (const [itemId, content] of Object.entries(contents)) {
				this.contents.set(itemId as TLCollectionItemId, parseCollectionItemContent(content))
			}
		}
	}

	getCollections() {
		return this.collections.get()
	}

	// One query per collection, kept so its result stays the same array until that collection's
	// items change: a change in one collection doesn't re-render every open listing.
	getItems(collectionId: TLCollectionId) {
		let items = this.itemsByCollection.get(collectionId)
		if (!items) {
			items = this.store.query.records('collection-item', () => ({
				collectionId: { eq: collectionId },
			}))
			this.itemsByCollection.set(collectionId, items)
		}
		return items.get()
	}

	// Copied in and out, as a server would: mutating what a caller passed or got back can't
	// change what is stored.
	async getItemContent(itemId: TLCollectionItemId) {
		const content = this.contents.get(itemId)
		if (!content) throw new CollectionNotFoundError(itemId)
		return structuredClone(content)
	}

	can(action: TLCollectionAction, collectionId?: TLCollectionId) {
		const collection = collectionId === undefined ? undefined : this.store.get(collectionId)
		if (collectionId !== undefined && !collection) return false
		if (this.readOnly) return false
		return !collection?.readOnly
	}

	getCollectionOwners() {
		return this.owners
	}

	async createCollection(name: string) {
		this.assertCan('createCollection')
		const ownerId = this.owners[0]?.id
		const collection = CollectionRecordType.create({
			name,
			...(ownerId === undefined ? {} : { ownerId }),
		})
		this.store.put([collection])
		return collection
	}

	async renameCollection(collectionId: TLCollectionId, name: string) {
		const collection = this.getCollection(collectionId)
		this.assertCan('renameCollection', collectionId)
		this.store.put([{ ...collection, name }])
	}

	async deleteCollection(collectionId: TLCollectionId) {
		this.getCollection(collectionId)
		this.assertCan('deleteCollection', collectionId)
		const items = this.getItems(collectionId)
		for (const item of items) this.forgetItem(item.id)
		this.store.remove([collectionId, ...items.map((item) => item.id)])
		this.itemsByCollection.delete(collectionId)
	}

	async addItem(collectionId: TLCollectionId, newItem: TLNewCollectionItem) {
		this.getCollection(collectionId)
		this.assertCan('addItem', collectionId)
		const content = parseCollectionItemContent(newItem.content)
		let item = collectionItemValidator.validate(
			CollectionItemRecordType.create({
				collectionId,
				...(newItem.name === undefined ? {} : { name: newItem.name }),
				createdAt: Date.now(),
			})
		)
		// Created only after validation, so a rejected item can't leak its blobs.
		const urls: string[] = []
		if (newItem.thumbnail) {
			const thumbnail = mapThumbnail(newItem.thumbnail, (blob) => {
				const url = URL.createObjectURL(blob)
				urls.push(url)
				return url
			})
			item = { ...item, thumbnail }
		}
		if (urls.length > 0) this.thumbnailUrls.set(item.id, urls)
		this.contents.set(item.id, structuredClone(content))
		this.store.put([item])
		return item
	}

	async renameItem(itemId: TLCollectionItemId, name: string) {
		const item = this.getItem(itemId)
		this.assertCan('renameItem', item.collectionId)
		this.store.put([{ ...item, name }])
	}

	async deleteItem(itemId: TLCollectionItemId) {
		const item = this.getItem(itemId)
		this.assertCan('deleteItem', item.collectionId)
		this.forgetItem(itemId)
		this.store.remove([itemId])
	}

	async moveItem(itemId: TLCollectionItemId, toCollectionId: TLCollectionId) {
		const item = this.getItem(itemId)
		this.getCollection(toCollectionId)
		this.assertCan('deleteItem', item.collectionId)
		this.assertCan('addItem', toCollectionId)
		if (item.collectionId === toCollectionId) return
		this.store.put([{ ...item, collectionId: toCollectionId }])
	}

	// Items point at their collection, not its owner, so they move with it.
	async moveCollection(collectionId: TLCollectionId, ownerId: string) {
		const collection = this.getCollection(collectionId)
		if (!this.hasOwner(ownerId)) throw new CollectionNotFoundError(ownerId)
		if (collection.ownerId === ownerId) return
		this.store.put([{ ...collection, ownerId }])
	}

	/** Releases every thumbnail URL this source created. Call it when throwing the source away. */
	dispose() {
		for (const urls of this.thumbnailUrls.values()) urls.forEach((url) => URL.revokeObjectURL(url))
		this.thumbnailUrls.clear()
	}

	private getCollection(collectionId: TLCollectionId) {
		const collection = this.store.get(collectionId)
		if (!collection) throw new CollectionNotFoundError(collectionId)
		return collection
	}

	private hasOwner(ownerId: string) {
		return this.owners.some((owner) => owner.id === ownerId)
	}

	private getItem(itemId: TLCollectionItemId) {
		const item = this.store.get(itemId)
		if (!item) throw new CollectionNotFoundError(itemId)
		return item
	}

	private assertCan(action: TLCollectionAction, collectionId?: TLCollectionId) {
		if (!this.can(action, collectionId)) throw new CollectionPermissionError(action, collectionId)
	}

	// Object URLs keep their blob alive until revoked, so a deleted item would otherwise leak it.
	private forgetItem(itemId: TLCollectionItemId) {
		this.contents.delete(itemId)
		this.thumbnailUrls.get(itemId)?.forEach((url) => URL.revokeObjectURL(url))
		this.thumbnailUrls.delete(itemId)
	}
}

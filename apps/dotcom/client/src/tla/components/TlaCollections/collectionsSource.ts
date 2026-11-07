import {
	CollectionRecordType,
	InMemoryCollectionSource,
	type CollectionSource,
	type TLCollection,
	type TLCollectionAction,
	type TLCollectionId,
	type TLCollectionItem,
	type TLCollectionItemContent,
	type TLCollectionItemId,
	type TLNewCollectionItem,
} from '@tldraw/collections'
import { openDB, type IDBPDatabase } from 'idb'
import { atom } from 'tldraw'

const SAMPLE_COLLECTIONS = [
	CollectionRecordType.create({
		id: CollectionRecordType.createId('sample-wireframes'),
		name: 'Wireframes',
	}),
	CollectionRecordType.create({
		id: CollectionRecordType.createId('sample-icons'),
		name: 'Icons',
	}),
]

interface StoredItem {
	item: TLCollectionItem
	content: TLCollectionItemContent
	// Bytes rather than a Blob, which not every IndexedDB stores.
	thumbnail?: { type: string; data: ArrayBuffer }
}

// Until tldraw.com has a real source, collections are kept in this browser, per user: they survive
// a reload but don't follow anyone to another browser or device.
export function createCollectionsSource(userId: string) {
	return new BrowserCollectionSource(userId)
}

/**
 * An in-memory source, saved to IndexedDB after each change and loaded back on start. Until the
 * load finishes it shows the sample collections, and writes wait for it.
 */
class BrowserCollectionSource implements CollectionSource {
	readonly id = 'dotcom-browser'
	private readonly inner = atom(
		'collections source',
		new InMemoryCollectionSource({
			initial: { collections: SAMPLE_COLLECTIONS, items: [], contents: {} },
		})
	)
	private readonly db: Promise<IDBPDatabase>
	private readonly ready: Promise<void>
	// The in-memory source only releases URLs it created, so these are released here.
	private readonly loadedThumbnailUrls: string[] = []

	constructor(userId: string) {
		this.db = openDB(`tldraw-collections-${userId}`, 1, {
			upgrade(db) {
				db.createObjectStore('state')
				db.createObjectStore('items')
			},
		})
		this.ready = this.load().catch((error) => {
			console.error('[collections] failed to load saved collections', error)
		})
	}

	getCollections() {
		return this.inner.get().getCollections()
	}

	getItems(collectionId: TLCollectionId) {
		return this.inner.get().getItems(collectionId)
	}

	async getItemContent(itemId: TLCollectionItemId) {
		await this.ready
		return this.inner.get().getItemContent(itemId)
	}

	can(action: TLCollectionAction, collectionId?: TLCollectionId) {
		return this.inner.get().can(action, collectionId)
	}

	async createCollection(name: string) {
		await this.ready
		const collection = await this.inner.get().createCollection(name)
		await this.save()
		return collection
	}

	async renameCollection(collectionId: TLCollectionId, name: string) {
		await this.ready
		await this.inner.get().renameCollection(collectionId, name)
		await this.save()
	}

	async deleteCollection(collectionId: TLCollectionId) {
		await this.ready
		const itemIds = this.getItems(collectionId).map((item) => item.id)
		await this.inner.get().deleteCollection(collectionId)
		await this.save((db) => Promise.all(itemIds.map((itemId) => db.delete('items', itemId))))
	}

	async addItem(collectionId: TLCollectionId, newItem: TLNewCollectionItem) {
		await this.ready
		const item = await this.inner.get().addItem(collectionId, newItem)
		// The object URL dies with the page, so the thumbnail's bytes are saved instead and turned
		// back into a URL on load.
		const { thumbnailUrl: _, ...itemToStore } = item
		const { thumbnail } = newItem
		const stored: StoredItem = {
			item: itemToStore,
			content: newItem.content,
			thumbnail: thumbnail && { type: thumbnail.type, data: await thumbnail.arrayBuffer() },
		}
		await this.save((db) => db.put('items', stored, item.id))
		return item
	}

	async renameItem(itemId: TLCollectionItemId, name: string) {
		await this.ready
		await this.inner.get().renameItem(itemId, name)
		await this.save(async (db) => {
			const stored: StoredItem | undefined = await db.get('items', itemId)
			if (stored) await db.put('items', { ...stored, item: { ...stored.item, name } }, itemId)
		})
	}

	async deleteItem(itemId: TLCollectionItemId) {
		await this.ready
		await this.inner.get().deleteItem(itemId)
		await this.save((db) => db.delete('items', itemId))
	}

	dispose() {
		this.inner.get().dispose()
		for (const url of this.loadedThumbnailUrls) URL.revokeObjectURL(url)
		this.db.then((db) => db.close()).catch(() => {})
	}

	private async load() {
		const db = await this.db
		const collections: TLCollection[] | undefined = await db.get('state', 'collections')
		// Nothing saved yet: keep the samples.
		if (!collections) return
		const stored: StoredItem[] = await db.getAll('items')
		const items = stored.map(({ item, thumbnail }) => {
			if (!thumbnail) return item
			const thumbnailUrl = URL.createObjectURL(new Blob([thumbnail.data], { type: thumbnail.type }))
			this.loadedThumbnailUrls.push(thumbnailUrl)
			return { ...item, thumbnailUrl }
		})
		const contents = Object.fromEntries(stored.map(({ item, content }) => [item.id, content]))
		const previous = this.inner.get()
		this.inner.set(new InMemoryCollectionSource({ initial: { collections, items, contents } }))
		previous.dispose()
	}

	// The collection list is saved with every change, so an item added to a sample collection
	// before anything else was saved still has its collection on the next load. The change has
	// already happened in memory, so a failed save keeps it for this session instead of reporting
	// an error for something that worked.
	private async save(write?: (db: IDBPDatabase) => Promise<unknown>) {
		try {
			const db = await this.db
			await write?.(db)
			await db.put('state', this.getCollections(), 'collections')
		} catch (error) {
			console.error('[collections] failed to save', error)
		}
	}
}

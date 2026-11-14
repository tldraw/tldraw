import {
	LibraryRecordType,
	InMemoryLibrarySource,
	mapThumbnail,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryAction,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
	type TLLibraryTarget,
	type TLLibraryThumbnail,
	type TLNewLibraryItem,
} from '@tldraw/libraries'
import { openDB, type IDBPDatabase } from 'idb'
import { atom } from 'tldraw'

const SAMPLE_LIBRARIES = [
	LibraryRecordType.create({
		id: LibraryRecordType.createId('sample-wireframes'),
		name: 'Wireframes',
	}),
	LibraryRecordType.create({
		id: LibraryRecordType.createId('sample-icons'),
		name: 'Icons',
	}),
]

// Bytes rather than a Blob, which not every IndexedDB stores.
interface StoredImage {
	type: string
	data: ArrayBuffer
}

interface StoredItem {
	item: TLLibraryItem
	content: TLLibraryItemContent
	thumbnail?: TLLibraryThumbnail<StoredImage>
}

async function toStoredImage(blob: Blob): Promise<StoredImage> {
	return { type: blob.type, data: await blob.arrayBuffer() }
}

// Until tldraw.com has a real source, libraries are kept in this browser, per user: they survive
// a reload but don't follow anyone to another browser or device.
export function createLibrariesSource(userId: string) {
	return new BrowserLibrarySource(userId)
}

/**
 * An in-memory source, saved to IndexedDB after each change and loaded back on start. Until the
 * load finishes it shows the sample libraries, and writes wait for it.
 */
class BrowserLibrarySource implements LibrarySource {
	readonly id = 'dotcom-browser'
	private readonly inner = atom(
		'libraries source',
		new InMemoryLibrarySource({
			initial: { libraries: SAMPLE_LIBRARIES, items: [], contents: {} },
		})
	)
	private readonly db: Promise<IDBPDatabase>
	private readonly ready: Promise<void>
	// The in-memory source only releases URLs it created, so these are released here.
	private readonly loadedThumbnailUrls: string[] = []

	constructor(userId: string) {
		this.db = openDB(`tldraw-libraries-${userId}`, 1, {
			upgrade(db) {
				db.createObjectStore('state')
				db.createObjectStore('items')
			},
		})
		this.ready = this.load().catch((error) => {
			console.error('[libraries] failed to load saved libraries', error)
		})
	}

	getLibraries() {
		return this.inner.get().getLibraries()
	}

	getItems(libraryId: TLLibraryId) {
		return this.inner.get().getItems(libraryId)
	}

	async getItemContent(itemId: TLLibraryItemId) {
		await this.ready
		return this.inner.get().getItemContent(itemId)
	}

	can(action: TLLibraryAction, target?: TLLibraryTarget) {
		return this.inner.get().can(action, target)
	}

	async createLibrary(name: string) {
		await this.ready
		const library = await this.inner.get().createLibrary(name)
		await this.save()
		return library
	}

	async renameLibrary(libraryId: TLLibraryId, name: string) {
		await this.ready
		await this.inner.get().renameLibrary(libraryId, name)
		await this.save()
	}

	async deleteLibrary(libraryId: TLLibraryId) {
		await this.ready
		const itemIds = this.getItems(libraryId).map((item) => item.id)
		await this.inner.get().deleteLibrary(libraryId)
		await this.save((db) => Promise.all(itemIds.map((itemId) => db.delete('items', itemId))))
	}

	async addItem(libraryId: TLLibraryId, newItem: TLNewLibraryItem) {
		await this.ready
		const item = await this.inner.get().addItem(libraryId, newItem)
		// The object URL dies with the page, so the thumbnail's bytes are saved instead and turned
		// back into a URL on load.
		const { thumbnail: _, ...itemToStore } = item
		const { thumbnail } = newItem
		const stored: StoredItem = {
			item: itemToStore,
			content: newItem.content,
			thumbnail:
				thumbnail &&
				(thumbnail instanceof Blob
					? await toStoredImage(thumbnail)
					: {
							light: await toStoredImage(thumbnail.light),
							dark: await toStoredImage(thumbnail.dark),
						}),
		}
		await this.save((db) => db.put('items', stored, item.id))
		return item
	}

	async renameItem(itemId: TLLibraryItemId, name: string) {
		await this.ready
		await this.inner.get().renameItem(itemId, name)
		await this.save(async (db) => {
			const stored: StoredItem | undefined = await db.get('items', itemId)
			if (stored) await db.put('items', { ...stored, item: { ...stored.item, name } }, itemId)
		})
	}

	async deleteItem(itemId: TLLibraryItemId) {
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
		const libraries: TLLibrary[] | undefined = await db.get('state', 'libraries')
		// Nothing saved yet: keep the samples.
		if (!libraries) return
		const stored: StoredItem[] = await db.getAll('items')
		const toUrl = (bytes: StoredImage) => {
			const url = URL.createObjectURL(new Blob([bytes.data], { type: bytes.type }))
			this.loadedThumbnailUrls.push(url)
			return url
		}
		const items = stored.map(({ item, thumbnail }) => ({
			...item,
			...(thumbnail && { thumbnail: mapThumbnail(thumbnail, toUrl) }),
		}))
		const contents = Object.fromEntries(stored.map(({ item, content }) => [item.id, content]))
		const previous = this.inner.get()
		this.inner.set(new InMemoryLibrarySource({ initial: { libraries, items, contents } }))
		previous.dispose()
	}

	// The library list is saved with every change, so an item added to a sample library
	// before anything else was saved still has its library on the next load. The change has
	// already happened in memory, so a failed save keeps it for this session instead of reporting
	// an error for something that worked.
	private async save(write?: (db: IDBPDatabase) => Promise<unknown>) {
		try {
			const db = await this.db
			await write?.(db)
			await db.put('state', this.getLibraries(), 'libraries')
		} catch (error) {
			console.error('[libraries] failed to save', error)
		}
	}
}

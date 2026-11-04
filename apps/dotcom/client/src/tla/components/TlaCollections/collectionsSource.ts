import {
	CollectionRecordType,
	InMemoryCollectionSource,
	mapThumbnail,
	type CollectionSource,
	type InMemoryCollectionSourceOptions,
	type TLCollection,
	type TLCollectionAction,
	type TLCollectionId,
	type TLCollectionItem,
	type TLCollectionItemContent,
	type TLCollectionItemId,
	type TLCollectionThumbnail,
	type TLCollectionOwner,
	type TLNewCollectionItem,
	type TLNewCollectionOptions,
} from '@tldraw/collections'
import { openDB, type IDBPDatabase } from 'idb'
import { atom, computed, defineMessages, type Atom } from 'tldraw'
import type { TldrawApp } from '../../app/TldrawApp'

const messages = defineMessages({
	myWorkspace: { defaultMessage: 'My workspace' },
})

// Bytes rather than a Blob, which not every IndexedDB stores.
interface StoredImage {
	type: string
	data: ArrayBuffer
}

interface StoredItem {
	item: TLCollectionItem
	content: TLCollectionItemContent
	thumbnail?: TLCollectionThumbnail<StoredImage>
}

async function toStoredImage(blob: Blob): Promise<StoredImage> {
	return { type: blob.type, data: await blob.arrayBuffer() }
}

// The in-memory source checks owners against its own list, so it is given this source's.
class OwnedInMemoryCollectionSource extends InMemoryCollectionSource {
	constructor(
		private readonly listOwners: () => TLCollectionOwner[],
		options: InMemoryCollectionSourceOptions
	) {
		super(options)
	}

	override getCollectionOwners() {
		return this.listOwners()
	}
}

/**
 * Until tldraw.com has a real source, collections are kept in this browser, per user: they survive
 * a reload but don't follow anyone to another browser or device. Like files, each belongs to one of
 * the user's workspaces, their home workspace first, and new ones go to the open file's workspace.
 *
 * An in-memory source, saved to IndexedDB after each change and loaded back on start. Each
 * collection is saved with its owner. Until the load finishes it shows the sample collections, and
 * writes wait for it.
 */
export class TldrawAppCollectionsSource implements CollectionSource {
	readonly id = 'dotcom-browser'
	private readonly openFileId = atom<string | undefined>('collections open file', undefined)

	private readonly owners$ = computed('collection owners', (): TLCollectionOwner[] => {
		const homeId = this.app.getHomeWorkspaceId()
		const memberships = this.app.getWorkspaceMemberships()
		const homeName = memberships.find((m) => m.groupId === homeId)?.group?.name
		return [
			{ id: homeId, name: homeName ?? this.app.msg(messages.myWorkspace) },
			...memberships.flatMap((m) =>
				m.groupId !== homeId && m.group ? [{ id: m.groupId, name: m.group.name }] : []
			),
		]
	})

	private readonly inner: Atom<InMemoryCollectionSource>
	private readonly db: Promise<IDBPDatabase>
	private readonly ready: Promise<void>
	// The in-memory source only releases URLs it created, so these are released here.
	private readonly loadedThumbnailUrls: string[] = []

	constructor(private readonly app: TldrawApp) {
		const homeId = app.getHomeWorkspaceId()
		this.inner = atom(
			'collections source',
			this.createInner({
				collections: [
					CollectionRecordType.create({
						id: CollectionRecordType.createId('sample-wireframes'),
						name: 'Wireframes',
						ownerId: homeId,
					}),
					CollectionRecordType.create({
						id: CollectionRecordType.createId('sample-icons'),
						name: 'Icons',
						ownerId: homeId,
					}),
				],
				items: [],
				contents: {},
			})
		)
		this.db = openDB(`tldraw-collections-${app.userId}`, 1, {
			upgrade(db) {
				db.createObjectStore('state')
				db.createObjectStore('items')
			},
		})
		this.ready = this.load().catch((error) => {
			console.error('[collections] failed to load saved collections', error)
		})
	}

	/** Called by the editor's collections UI, so new collections go to the open file's workspace. */
	setOpenFileId(fileId: string | undefined) {
		this.openFileId.set(fileId)
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

	getCollectionOwners() {
		return this.owners$.get()
	}

	// A file in a workspace the user isn't a member of, such as a shared one, falls back to home.
	getDefaultOwnerId() {
		const fileId = this.openFileId.get()
		const workspaceId = fileId === undefined ? undefined : this.app.getFile(fileId)?.owningGroupId
		const isOwner = this.getCollectionOwners().some((owner) => owner.id === workspaceId)
		return workspaceId && isOwner ? workspaceId : this.app.getHomeWorkspaceId()
	}

	async createCollection(name: string, options: TLNewCollectionOptions = {}) {
		await this.ready
		const ownerId = options.ownerId ?? this.getDefaultOwnerId()
		const collection = await this.inner.get().createCollection(name, { ownerId })
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

	async moveCollection(collectionId: TLCollectionId, ownerId: string) {
		await this.ready
		await this.inner.get().moveCollection(collectionId, ownerId)
		await this.save()
	}

	async addItem(collectionId: TLCollectionId, newItem: TLNewCollectionItem) {
		await this.ready
		const item = await this.inner.get().addItem(collectionId, newItem)
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

	private createInner(initial: InMemoryCollectionSourceOptions['initial']) {
		return new OwnedInMemoryCollectionSource(() => this.getCollectionOwners(), { initial })
	}

	private async load() {
		const db = await this.db
		const collections: TLCollection[] | undefined = await db.get('state', 'collections')
		// Nothing saved yet: keep the samples.
		if (!collections) return
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
		this.inner.set(this.createInner({ collections, items, contents }))
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
			await db.put('state', this.inner.get().getCollections(), 'collections')
		} catch (error) {
			console.error('[collections] failed to save', error)
		}
	}
}

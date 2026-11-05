import { computed } from '@tldraw/state'
import { structuredClone } from '@tldraw/utils'
import { type AddedPackIds, getAddedPackIdsKey, localStorageAddedPackIds } from './AddedPackIds'
import type { CollectionPack } from './CollectionPack'
import {
	CollectionNotFoundError,
	CollectionPermissionError,
	type CollectionSource,
	type TLCollectionAction,
} from './CollectionSource'
import type { PackCatalogue } from './PackCatalogue'
import {
	CollectionItemRecordType,
	collectionItemValidator,
	CollectionRecordType,
	collectionValidator,
	parseCollectionItemContent,
	type TLCollection,
	type TLCollectionId,
	type TLCollectionItem,
	type TLCollectionItemContent,
	type TLCollectionItemId,
} from './schema'

/** @public */
export interface PackCollectionSourceOptions {
	id?: string
	packs: CollectionPack[]
	/**
	 * Which packs the user has added, and so which are listed. Defaults to this browser's
	 * localStorage, kept per source id.
	 */
	addedPackIds?: AddedPackIds
}

/**
 * A read-only source that lists each pack the user has added as a collection of the pack's items.
 * No pack is listed until it's added, from the panel's "Browse collections…" or with
 * {@link PackCollectionSource.addPack}. Every change to the collections is refused, so they can
 * only be used, or copied into a source that accepts them.
 * @public
 */
export class PackCollectionSource implements CollectionSource, PackCatalogue {
	readonly id: string
	private readonly packs: CollectionPack[]
	private readonly addedPackIds: AddedPackIds
	private readonly allCollections: TLCollection[]
	private readonly packIds = new Map<TLCollectionId, string>()
	private readonly items = new Map<TLCollectionId, TLCollectionItem[]>()
	private readonly contents = new Map<TLCollectionItemId, TLCollectionItemContent>()

	private readonly collections$ = computed('added pack collections', () => {
		const added = new Set(this.addedPackIds.get())
		return this.allCollections.filter((_, i) => added.has(this.packs[i].id))
	})

	/** The collection id a pack is listed under. */
	static getCollectionId(packId: string): TLCollectionId {
		return CollectionRecordType.createId(`pack:${packId}`)
	}

	/** The id a pack's item is listed under. */
	static getItemId(packId: string, packItemId: string): TLCollectionItemId {
		return CollectionItemRecordType.createId(`pack:${packId}:${packItemId}`)
	}

	constructor(options: PackCollectionSourceOptions) {
		this.id = options.id ?? 'packs'
		this.packs = options.packs
		this.addedPackIds =
			options.addedPackIds ?? localStorageAddedPackIds(getAddedPackIdsKey(this.id))
		const packIds = options.packs.map((pack) => pack.id)
		if (new Set(packIds).size !== packIds.length) throw new Error('Duplicate pack ids')
		this.allCollections = options.packs.map((pack) => {
			const collectionId = PackCollectionSource.getCollectionId(pack.id)
			this.packIds.set(collectionId, pack.id)
			const itemIds = pack.items.map((item) => item.id)
			if (new Set(itemIds).size !== itemIds.length) {
				throw new Error(`Duplicate item ids in pack ${pack.id}`)
			}
			this.items.set(
				collectionId,
				pack.items.map((packItem) => {
					const id = PackCollectionSource.getItemId(pack.id, packItem.id)
					this.contents.set(id, parseCollectionItemContent(packItem.content))
					return collectionItemValidator.validate(
						CollectionItemRecordType.create({
							id,
							collectionId,
							...(packItem.name === undefined ? {} : { name: packItem.name }),
							...(packItem.thumbnailUrl === undefined
								? {}
								: { thumbnailUrl: packItem.thumbnailUrl }),
						})
					)
				})
			)
			return collectionValidator.validate(
				CollectionRecordType.create({
					id: collectionId,
					name: pack.name,
					readOnly: true,
					meta: { packId: pack.id, packVersion: pack.version },
				})
			)
		})
	}

	getCollections() {
		return this.collections$.get()
	}

	getItems(collectionId: TLCollectionId) {
		const packId = this.packIds.get(collectionId)
		if (packId === undefined || !this.isPackAdded(packId)) return []
		return this.items.get(collectionId) ?? []
	}

	async getItemContent(itemId: TLCollectionItemId) {
		const content = this.contents.get(itemId)
		if (!content) throw new CollectionNotFoundError(itemId)
		return structuredClone(content)
	}

	getPacks() {
		return this.packs
	}

	isPackAdded(packId: string) {
		return this.addedPackIds.get().includes(packId)
	}

	addPack(packId: string) {
		if (this.isPackAdded(packId) || !this.packs.some((pack) => pack.id === packId)) return
		this.addedPackIds.set([...this.addedPackIds.get(), packId])
	}

	removePack(packId: string) {
		if (!this.isPackAdded(packId)) return
		this.addedPackIds.set(this.addedPackIds.get().filter((id) => id !== packId))
	}

	getPackId(collectionId: TLCollectionId) {
		return this.packIds.get(collectionId)
	}

	can(_action: TLCollectionAction, _collectionId?: TLCollectionId) {
		return false
	}

	async createCollection(): Promise<TLCollection> {
		throw new CollectionPermissionError('createCollection')
	}

	async renameCollection(collectionId: TLCollectionId): Promise<void> {
		throw new CollectionPermissionError('renameCollection', collectionId)
	}

	async deleteCollection(collectionId: TLCollectionId): Promise<void> {
		throw new CollectionPermissionError('deleteCollection', collectionId)
	}

	async addItem(collectionId: TLCollectionId): Promise<TLCollectionItem> {
		throw new CollectionPermissionError('addItem', collectionId)
	}

	async renameItem(itemId: TLCollectionItemId): Promise<void> {
		throw new CollectionPermissionError('renameItem', this.collectionOf(itemId))
	}

	async deleteItem(itemId: TLCollectionItemId): Promise<void> {
		throw new CollectionPermissionError('deleteItem', this.collectionOf(itemId))
	}

	private collectionOf(itemId: TLCollectionItemId) {
		for (const [collectionId, items] of this.items) {
			if (items.some((item) => item.id === itemId)) return collectionId
		}
		return undefined
	}
}

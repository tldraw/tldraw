import { structuredClone } from '@tldraw/utils'
import type { CollectionPack } from './CollectionPack'
import {
	CollectionNotFoundError,
	CollectionPermissionError,
	type CollectionSource,
	type TLCollectionAction,
} from './CollectionSource'
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
}

/**
 * A read-only source that lists each pack as a collection of the pack's items. Every change is
 * refused, so its collections can only be used, or copied into a source that accepts them.
 *
 * Packs are data that never changes, so the getters return the same arrays every time and have
 * nothing to subscribe to.
 * @public
 */
export class PackCollectionSource implements CollectionSource {
	readonly id: string
	private readonly collections: TLCollection[]
	private readonly items = new Map<TLCollectionId, TLCollectionItem[]>()
	private readonly contents = new Map<TLCollectionItemId, TLCollectionItemContent>()

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
		const packIds = options.packs.map((pack) => pack.id)
		if (new Set(packIds).size !== packIds.length) throw new Error('Duplicate pack ids')
		this.collections = options.packs.map((pack) => {
			const collectionId = PackCollectionSource.getCollectionId(pack.id)
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
		return this.collections
	}

	getItems(collectionId: TLCollectionId) {
		return this.items.get(collectionId) ?? []
	}

	async getItemContent(itemId: TLCollectionItemId) {
		const content = this.contents.get(itemId)
		if (!content) throw new CollectionNotFoundError(itemId)
		return structuredClone(content)
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

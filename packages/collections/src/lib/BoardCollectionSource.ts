import type { Editor } from '@tldraw/editor'
import type { Computed } from '@tldraw/state'
import type { TLAsset, TLRecord } from '@tldraw/tlschema'
import { FileHelpers, structuredClone } from '@tldraw/utils'
import {
	CollectionNotFoundError,
	CollectionPermissionError,
	type CollectionSource,
	type TLCollectionAction,
	type TLNewCollectionItem,
} from './CollectionSource'
import {
	CollectionItemContentRecordType,
	CollectionItemRecordType,
	CollectionRecordType,
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	getCollectionItemContentId,
	parseCollectionItemContent,
	type TLCollection,
	type TLCollectionId,
	type TLCollectionItem,
	type TLCollectionItemContent,
	type TLCollectionItemContentRecord,
	type TLCollectionItemId,
	type TLCollectionRecord,
	type TLCollectionThumbnail,
} from './schema'

/** @public */
export interface BoardCollectionSourceOptions {
	id?: string
}

/**
 * A source that keeps collections in the editor's own document, as records next to its shapes, so
 * they are saved, synced and copied wherever the document is. The store must register
 * `collectionSchemaRecords`.
 *
 * An item's content is a record of its own, and its assets are the document's ordinary asset
 * records, which the content names by id: an item saved from this board shares the assets its
 * shapes already use, and an item added from elsewhere brings its assets into the document.
 * Thumbnails are data URLs on the item, so they need nothing outside the document either.
 *
 * Changes don't go on the undo stack, as with comments: saving to a collection isn't an edit to the
 * canvas. Nothing can be changed while the editor is read-only.
 * @public
 */
export class BoardCollectionSource implements CollectionSource {
	readonly id: string
	private readonly collections: Computed<TLCollection[]>
	private readonly itemsByCollection = new Map<TLCollectionId, Computed<TLCollectionItem[]>>()

	constructor(
		private readonly editor: Editor,
		options: BoardCollectionSourceOptions = {}
	) {
		this.id = options.id ?? 'board'
		for (const typeName of ['collection', 'collection-item', 'collection-item-content']) {
			if (!editor.store.schema.types[typeName as TLRecord['typeName']]) {
				throw new Error(
					`The editor's store has no ${typeName} records: register collectionSchemaRecords in its schema`
				)
			}
		}
		this.collections = this.query('collection')
	}

	getCollections() {
		return this.collections.get()
	}

	// One query per collection, kept so its result stays the same array until that collection's
	// items change. Counting a collection's items reads only this listing, never their content.
	getItems(collectionId: TLCollectionId) {
		let items = this.itemsByCollection.get(collectionId)
		if (!items) {
			items = this.query('collection-item', () => ({ collectionId: { eq: collectionId } }))
			this.itemsByCollection.set(collectionId, items)
		}
		return items.get()
	}

	/**
	 * The content as it would be copied from the canvas: its assets looked up in the document, and
	 * its shapes migrated to the document's current schema, since assets are always current and
	 * the two have to share one.
	 */
	async getItemContent(itemId: TLCollectionItemId): Promise<TLCollectionItemContent> {
		this.getItem(itemId)
		const record = this.get<TLCollectionItemContentRecord>(getCollectionItemContentId(itemId))
		if (!record) throw new CollectionNotFoundError(itemId)
		const { shapes, bindings = [], users = [], rootShapeIds, schema } = record.content
		const stored = Object.fromEntries(
			[...shapes, ...bindings, ...users].map((r) => [r.id, structuredClone(r)])
		)
		const migrated = this.editor.store.schema.migrateStoreSnapshot({ store: stored, schema })
		if (migrated.type === 'error') {
			throw new Error(`Couldn't migrate the content of ${itemId}: ${migrated.reason}`)
		}
		const records = Object.values(migrated.value)
		const assets = record.assetIds.flatMap((id) => {
			const asset = this.editor.store.get(id)
			return asset ? [structuredClone(asset)] : []
		})
		return parseCollectionItemContent({
			formatVersion: CURRENT_ITEM_CONTENT_FORMAT_VERSION,
			content: {
				shapes: records.filter((r) => r.typeName === 'shape'),
				bindings: records.filter((r) => r.typeName === 'binding'),
				users: records.filter((r) => r.typeName === 'user'),
				rootShapeIds,
				assets,
				schema: this.editor.store.schema.serialize(),
			},
		})
	}

	can(action: TLCollectionAction, collectionId?: TLCollectionId) {
		if (this.editor.getIsReadonly()) return false
		if (collectionId === undefined) return true
		const collection = this.get<TLCollection>(collectionId)
		return !!collection && !collection.readOnly
	}

	async createCollection(name: string) {
		this.assertCan('createCollection')
		const collection = CollectionRecordType.create({ name })
		this.write([collection])
		return collection
	}

	async renameCollection(collectionId: TLCollectionId, name: string) {
		const collection = this.getCollection(collectionId)
		this.assertCan('renameCollection', collectionId)
		this.write([{ ...collection, name }])
	}

	// The assets stay: they belong to the document, and its shapes may use them.
	async deleteCollection(collectionId: TLCollectionId) {
		this.getCollection(collectionId)
		this.assertCan('deleteCollection', collectionId)
		const itemIds = this.getItems(collectionId).map((item) => item.id)
		this.write(
			[],
			[collectionId, ...itemIds, ...itemIds.map((itemId) => getCollectionItemContentId(itemId))]
		)
		this.itemsByCollection.delete(collectionId)
	}

	/**
	 * Assets the document doesn't have yet are added to it as they are: content saved from this
	 * board names assets already here, while content from another source carries its own.
	 */
	async addItem(collectionId: TLCollectionId, newItem: TLNewCollectionItem) {
		this.getCollection(collectionId)
		this.assertCan('addItem', collectionId)
		const { content } = parseCollectionItemContent(newItem.content)
		const { assets, ...rest } = content
		const newAssets = this.migrateAssets(
			assets.filter((asset) => !this.editor.store.has(asset.id)),
			content.schema
		)
		const thumbnail = newItem.thumbnail && (await toDataUrls(newItem.thumbnail))
		// Checked again after reading the thumbnail, which the collection may not have outlived.
		this.getCollection(collectionId)
		this.assertCan('addItem', collectionId)
		const item = CollectionItemRecordType.create({
			collectionId,
			...(newItem.name === undefined ? {} : { name: newItem.name }),
			...(thumbnail ? { thumbnail } : {}),
			createdAt: Date.now(),
		})
		const contentRecord = CollectionItemContentRecordType.create({
			id: getCollectionItemContentId(item.id),
			itemId: item.id,
			content: structuredClone(rest),
			assetIds: [...new Set(assets.map((asset) => asset.id))],
		})
		this.write([...newAssets, item, contentRecord])
		return item
	}

	async renameItem(itemId: TLCollectionItemId, name: string) {
		const item = this.getItem(itemId)
		this.assertCan('renameItem', item.collectionId)
		this.write([{ ...item, name }])
	}

	async deleteItem(itemId: TLCollectionItemId) {
		const item = this.getItem(itemId)
		this.assertCan('deleteItem', item.collectionId)
		this.write([], [itemId, getCollectionItemContentId(itemId)])
	}

	async moveItem(itemId: TLCollectionItemId, toCollectionId: TLCollectionId) {
		const item = this.getItem(itemId)
		this.getCollection(toCollectionId)
		this.assertCan('deleteItem', item.collectionId)
		this.assertCan('addItem', toCollectionId)
		if (item.collectionId === toCollectionId) return
		this.write([{ ...item, collectionId: toCollectionId }])
	}

	// Assets join the document at its current schema, as pasting brings them in.
	private migrateAssets(assets: TLAsset[], schema: TLCollectionItemContent['content']['schema']) {
		if (assets.length === 0) return []
		const migrated = this.editor.store.schema.migrateStoreSnapshot({
			store: Object.fromEntries(assets.map((asset) => [asset.id, structuredClone(asset)])),
			schema,
		})
		if (migrated.type === 'error') {
			throw new Error(`Couldn't migrate the item's assets: ${migrated.reason}`)
		}
		return Object.values(migrated.value) as TLAsset[]
	}

	private write(put: (TLCollectionRecord | TLAsset)[], remove: string[] = []) {
		this.editor.run(
			() => {
				if (put.length) this.editor.store.put(put as unknown as TLRecord[])
				if (remove.length) this.editor.store.remove(remove as TLRecord['id'][])
			},
			{ history: 'ignore' }
		)
	}

	// The editor's store is typed for tldraw's own records, so collection records are read through
	// these two.
	private get<R extends TLCollectionRecord>(id: R['id']) {
		return this.editor.store.get(id as unknown as TLRecord['id']) as unknown as R | undefined
	}

	private query<T extends TLCollectionRecord['typeName']>(
		typeName: T,
		filter?: () => Record<string, { eq: unknown }>
	) {
		return this.editor.store.query.records(
			typeName as unknown as TLRecord['typeName'],
			filter as any
		) as unknown as Computed<Extract<TLCollectionRecord, { typeName: T }>[]>
	}

	private getCollection(collectionId: TLCollectionId) {
		const collection = this.get<TLCollection>(collectionId)
		if (!collection) throw new CollectionNotFoundError(collectionId)
		return collection
	}

	private getItem(itemId: TLCollectionItemId) {
		const item = this.get<TLCollectionItem>(itemId)
		if (!item) throw new CollectionNotFoundError(itemId)
		return item
	}

	private assertCan(action: TLCollectionAction, collectionId?: TLCollectionId) {
		if (!this.can(action, collectionId)) throw new CollectionPermissionError(action, collectionId)
	}
}

async function toDataUrls(thumbnail: TLCollectionThumbnail<Blob>): Promise<TLCollectionThumbnail> {
	if (thumbnail instanceof Blob) return FileHelpers.blobToDataUrl(thumbnail)
	const [light, dark] = await Promise.all([
		FileHelpers.blobToDataUrl(thumbnail.light),
		FileHelpers.blobToDataUrl(thumbnail.dark),
	])
	return { light, dark }
}

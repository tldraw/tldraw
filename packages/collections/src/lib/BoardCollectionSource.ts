import type { Editor } from '@tldraw/editor'
import { atom, computed, unsafe__withoutCapture, type Atom, type Computed } from '@tldraw/state'
import { AssetRecordType, type TLAsset, type TLAssetId, type TLRecord } from '@tldraw/tlschema'
import { structuredClone } from '@tldraw/utils'
import {
	CollectionNotFoundError,
	CollectionPermissionError,
	type CollectionSource,
	type TLCollectionAction,
	type TLNewCollectionItem,
	type TLNewCollectionOptions,
} from './CollectionSource'
import {
	CollectionItemContentRecordType,
	CollectionItemRecordType,
	CollectionRecordType,
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	getCollectionItemContentId,
	getThumbnailForColorMode,
	mapThumbnail,
	parseCollectionItemContent,
	type TLCollection,
	type TLCollectionId,
	type TLCollectionItem,
	type TLCollectionItemContent,
	type TLCollectionItemContentRecord,
	type TLCollectionItemId,
	type TLCollectionItemRecord,
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
 * Thumbnails are image assets too, uploaded through the editor as a pasted image is, and the item
 * names them by id. Listing an item resolves them to URLs through the editor's asset store.
 *
 * Changes don't go on the undo stack, as with comments: saving to a collection isn't an edit to the
 * canvas. Nothing can be changed while the editor is read-only.
 * @public
 */
export class BoardCollectionSource implements CollectionSource {
	readonly id: string
	private readonly collections: Computed<TLCollection[]>
	private readonly itemsByCollection = new Map<TLCollectionId, Computed<TLCollectionItem[]>>()
	private readonly thumbnailUrls = new Map<TLAssetId, ResolvedUrl>()

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
	// items or their thumbnails change. Counting a collection's items reads only this listing, never
	// their content.
	getItems(collectionId: TLCollectionId) {
		let items = this.itemsByCollection.get(collectionId)
		if (!items) {
			const records = this.query('collection-item', () => ({ collectionId: { eq: collectionId } }))
			items = computed(`board collection items ${collectionId}`, () =>
				records.get().map((record) => this.toListedItem(record))
			)
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

	async createCollection(name: string, options: TLNewCollectionOptions = {}) {
		this.assertCan('createCollection')
		const collection = CollectionRecordType.create({
			name,
			...(options.meta === undefined ? {} : { meta: options.meta }),
		})
		this.write([collection])
		return collection
	}

	async renameCollection(collectionId: TLCollectionId, name: string) {
		const collection = this.getCollection(collectionId)
		this.assertCan('renameCollection', collectionId)
		this.write([{ ...collection, name }])
	}

	// The content's assets stay: they belong to the document, and its shapes may use them. The
	// thumbnails belong to the items alone and go with them.
	async deleteCollection(collectionId: TLCollectionId) {
		this.getCollection(collectionId)
		this.assertCan('deleteCollection', collectionId)
		const records = this.query('collection-item', () => ({
			collectionId: { eq: collectionId },
		})).get()
		const itemIds = records.map((item) => item.id)
		this.write(
			[],
			[collectionId, ...itemIds, ...itemIds.map((itemId) => getCollectionItemContentId(itemId))],
			records.flatMap(getThumbnailAssetIds)
		)
		this.itemsByCollection.delete(collectionId)
	}

	/**
	 * Assets the document doesn't have yet are added to it as they are: content saved from this
	 * board names assets already here, while content from another source carries its own.
	 *
	 * The thumbnail is uploaded first, and the item appears once it has been: it never names an
	 * image that isn't stored yet. If the upload fails, nothing is added.
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
		const thumbnailAssets = newItem.thumbnail
			? await this.uploadThumbnail(newItem.thumbnail, newItem.name)
			: undefined
		const thumbnailAssetList = thumbnailAssets ? listThumbnail(thumbnailAssets) : []
		// Checked again after the upload, which the collection may not have outlived.
		try {
			this.getCollection(collectionId)
			this.assertCan('addItem', collectionId)
		} catch (error) {
			this.editor.deleteAssets(thumbnailAssetList)
			throw error
		}
		const item: TLCollectionItemRecord = {
			id: CollectionItemRecordType.createId(),
			typeName: 'collection-item',
			collectionId,
			...(newItem.name === undefined ? {} : { name: newItem.name }),
			...(thumbnailAssets ? { thumbnail: mapThumbnail(thumbnailAssets, (asset) => asset.id) } : {}),
			createdAt: Date.now(),
			version: 1,
			meta: {},
		}
		const contentRecord = CollectionItemContentRecordType.create({
			id: getCollectionItemContentId(item.id),
			itemId: item.id,
			content: structuredClone(rest),
			assetIds: [...new Set(assets.map((asset) => asset.id))],
		})
		this.write([...newAssets, ...thumbnailAssetList, item, contentRecord])
		await Promise.all(getThumbnailAssetIds(item).map((id) => this.getResolvedUrl(id)?.ready))
		return this.toListedItem(item)
	}

	async renameItem(itemId: TLCollectionItemId, name: string) {
		const item = this.getItem(itemId)
		this.assertCan('renameItem', item.collectionId)
		this.write([{ ...item, name }])
	}

	async deleteItem(itemId: TLCollectionItemId) {
		const item = this.getItem(itemId)
		this.assertCan('deleteItem', item.collectionId)
		this.write([], [itemId, getCollectionItemContentId(itemId)], getThumbnailAssetIds(item))
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

	/**
	 * Each image goes through the editor's handler for files, as a pasted image does: it is checked
	 * and uploaded to the editor's asset store, and comes back as an image asset to add to the
	 * document. Every item gets its own assets, so deleting it can delete them.
	 */
	private async uploadThumbnail(
		thumbnail: TLCollectionThumbnail<Blob>,
		name = 'thumbnail'
	): Promise<TLCollectionThumbnail<TLAsset>> {
		const upload = async (blob: Blob, suffix: string) => {
			const file = new File([blob], `${name}${suffix}.${blob.type.split('/')[1] ?? 'png'}`, {
				type: blob.type,
			})
			const asset = await this.editor.getAssetForExternalContent({
				type: 'file',
				file,
				assetId: AssetRecordType.createId(),
			})
			if (!asset) throw new Error("The editor can't store images: it has no handler for files")
			return asset
		}
		if (thumbnail instanceof Blob) return upload(thumbnail, '')
		const [light, dark] = await Promise.allSettled([
			upload(thumbnail.light, '-light'),
			upload(thumbnail.dark, '-dark'),
		])
		if (light.status === 'fulfilled' && dark.status === 'fulfilled') {
			return { light: light.value, dark: dark.value }
		}
		// Half a pair is no use: whichever uploaded is removed from the asset store again.
		const uploaded = [light, dark].flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
		this.editor.deleteAssets(uploaded)
		throw [light, dark].find((r) => r.status === 'rejected')!.reason
	}

	private toListedItem(record: TLCollectionItemRecord): TLCollectionItem {
		const { thumbnail, ...rest } = record
		if (!thumbnail) return rest
		const urls = mapThumbnail(thumbnail, (id) => this.getResolvedUrl(id)?.url.get())
		const resolved = listThumbnail(urls).every((url) => url !== undefined)
		return resolved ? { ...rest, thumbnail: urls as TLCollectionThumbnail } : rest
	}

	/**
	 * A thumbnail asset's URL from the editor's asset store, which resolves asynchronously: it is
	 * undefined until then, and an item lists no thumbnail until all of its images have one. Kept
	 * per asset, and resolved again when its src changes.
	 */
	private getResolvedUrl(assetId: TLAssetId): ResolvedUrl | undefined {
		const asset = this.editor.getAsset(assetId)
		if (!asset?.props.src) return undefined
		const src = asset.props.src
		const existing = this.thumbnailUrls.get(assetId)
		if (existing?.src === src) return existing
		const url = atom<string | undefined>(`thumbnail url ${assetId}`, undefined)
		// Resolving reads editor state, such as the device pixel ratio, that a listing shouldn't
		// recompute for.
		const ready = unsafe__withoutCapture(() =>
			this.editor.resolveAssetUrl(assetId, { shouldResolveToOriginal: true })
		).then(
			(resolved) => {
				url.set(resolved ?? undefined)
			},
			(error) => console.error(`Couldn't resolve the thumbnail ${assetId}`, error)
		)
		const entry = { src, url, ready }
		this.thumbnailUrls.set(assetId, entry)
		return entry
	}

	private write(
		put: (TLCollectionRecord | TLAsset)[],
		remove: string[] = [],
		removeAssets: TLAssetId[] = []
	) {
		this.editor.run(
			() => {
				if (put.length) this.editor.store.put(put as unknown as TLRecord[])
				if (remove.length) this.editor.store.remove(remove as TLRecord['id'][])
				if (removeAssets.length) this.editor.deleteAssets(removeAssets)
			},
			{ history: 'ignore' }
		)
		for (const id of removeAssets) this.thumbnailUrls.delete(id)
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
		const item = this.get<TLCollectionItemRecord>(itemId)
		if (!item) throw new CollectionNotFoundError(itemId)
		return item
	}

	private assertCan(action: TLCollectionAction, collectionId?: TLCollectionId) {
		if (!this.can(action, collectionId)) throw new CollectionPermissionError(action, collectionId)
	}
}

interface ResolvedUrl {
	src: string
	url: Atom<string | undefined>
	ready: Promise<void>
}

function listThumbnail<Src>(thumbnail: TLCollectionThumbnail<Src>): Src[] {
	const light = getThumbnailForColorMode(thumbnail, 'light')
	const dark = getThumbnailForColorMode(thumbnail, 'dark')
	return light === dark ? [light] : [light, dark]
}

function getThumbnailAssetIds(item: TLCollectionItemRecord): TLAssetId[] {
	return item.thumbnail ? listThumbnail(item.thumbnail) : []
}

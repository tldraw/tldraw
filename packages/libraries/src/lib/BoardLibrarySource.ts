import type { Editor } from '@tldraw/editor'
import { atom, computed, unsafe__withoutCapture, type Atom, type Computed } from '@tldraw/state'
import {
	AssetRecordType,
	LibraryItemContentRecordType,
	LibraryRecordType,
	createLibraryItemContentId,
	type TLAsset,
	type TLAssetId,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryItemContentRecord,
	type TLLibraryItemId,
	type TLLibraryItemRecord,
	type TLLibraryRecord,
	type TLLibraryThumbnail,
	type TLRecord,
} from '@tldraw/tlschema'
import { structuredClone } from '@tldraw/utils'
import { getAssetInfo } from 'tldraw'
import {
	LibraryNotFoundError,
	LibraryPermissionError,
	type LibrarySource,
	type TLLibraryAction,
	type TLLibraryThumbnailContext,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from './LibrarySource'
import { mapConcurrently } from './mapConcurrently'
import {
	LibraryItemRecordType,
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	getThumbnailForColorMode,
	mapThumbnail,
	parseLibraryItemContent,
	type TLLibraryItem,
	type TLLibraryItemContent,
} from './schema'

const UPLOAD_CONCURRENCY = 4

export interface BoardLibrarySourceOptions {
	id?: string
}

/**
 * A source that keeps libraries in the editor's own document, as records next to its shapes, so
 * they are saved, synced and copied wherever the document is. The store must register
 * `librarySchemaRecords`.
 *
 * An item's content is a record of its own, and its assets are the document's ordinary asset
 * records, which the content names by id: an item saved from this board shares the assets its
 * shapes already use, and an item added from elsewhere brings its assets into the document.
 * Thumbnails are image assets too, uploaded through the editor as a pasted image is, and the item
 * names them by id. An item appears before its thumbnail has uploaded, shown from the image itself
 * meanwhile. Tiles get a URL sized for them from `resolveThumbnail`; a listed item carries
 * URLs to the original images, for copying it to another source.
 *
 * Changes don't go on the undo stack, as with comments: saving to a library isn't an edit to the
 * canvas. Nothing can be changed while the editor is read-only. The board doesn't track owners.
 */
export class BoardLibrarySource implements LibrarySource {
	readonly id: string
	private readonly libraries: Computed<TLLibrary[]>
	private readonly itemsByLibrary = new Map<TLLibraryId, Computed<TLLibraryItem[]>>()
	private readonly thumbnailUrls = new Map<TLAssetId, ResolvedUrl>()
	private readonly storing = new Map<TLLibraryItemId, Promise<void>>()

	constructor(
		private readonly editor: Editor,
		options: BoardLibrarySourceOptions = {}
	) {
		this.id = options.id ?? 'board'
		for (const typeName of ['library', 'library-item', 'library-item-content']) {
			if (!editor.store.schema.types[typeName as TLRecord['typeName']]) {
				throw new Error(
					`The editor's store has no ${typeName} records: register librarySchemaRecords in its schema`
				)
			}
		}
		this.libraries = this.query('library')
	}

	getLibraries() {
		return this.libraries.get()
	}

	// One query per library, kept so its result stays the same array until that library's
	// items or their thumbnails change. Counting a library's items reads only this listing, never
	// their content.
	getItems(libraryId: TLLibraryId) {
		let items = this.itemsByLibrary.get(libraryId)
		if (!items) {
			const records = this.query('library-item', () => ({ libraryId: { eq: libraryId } }))
			items = computed(`board library items ${libraryId}`, () =>
				records.get().map((record) => this.toListedItem(record))
			)
			this.itemsByLibrary.set(libraryId, items)
		}
		return items.get()
	}

	/**
	 * The content as it would be copied from the canvas: its assets looked up in the document, and
	 * its shapes migrated to the document's current schema, since assets are always current and
	 * the two have to share one.
	 */
	async getItemContent(itemId: TLLibraryItemId): Promise<TLLibraryItemContent> {
		this.getItem(itemId)
		const record = this.get<TLLibraryItemContentRecord>(createLibraryItemContentId(itemId))
		if (!record) throw new LibraryNotFoundError(itemId)
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
		return parseLibraryItemContent({
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

	/**
	 * The thumbnail asset for the colour mode, resolved through the editor's asset store at the
	 * scale the tile shows it, as an image on the canvas is resolved at the scale it is drawn. While
	 * it uploads, it is the image's temporary preview, as for an image on the canvas.
	 */
	async resolveThumbnail(item: TLLibraryItem, context: TLLibraryThumbnailContext) {
		const record = this.get<TLLibraryItemRecord>(item.id)
		if (!record?.thumbnail) return null
		const assetId = getThumbnailForColorMode(record.thumbnail, context.colorMode)
		const asset = this.editor.getAsset(assetId)
		if (!asset || asset.type === 'bookmark' || !asset.props.w) return null
		if (!asset.props.src) return this.editor.getTemporaryAssetPreview(assetId) ?? null
		return this.editor.resolveAssetUrl(assetId, {
			screenScale: context.width / asset.props.w,
			dpr: context.dpr,
		})
	}

	can(_action: TLLibraryAction, libraryId?: TLLibraryId) {
		if (this.editor.getIsReadonly()) return false
		return libraryId === undefined || !!this.get<TLLibrary>(libraryId)
	}

	// The board doesn't track owners, so a library can't be given one.
	async createLibrary(name: string, options: TLNewLibraryOptions = {}) {
		this.assertCan('createLibrary')
		if (options.ownerId !== undefined) throw new LibraryNotFoundError(options.ownerId)
		const library = LibraryRecordType.create({
			name,
			...(options.meta === undefined ? {} : { meta: options.meta }),
		})
		this.write([library])
		return library
	}

	async renameLibrary(libraryId: TLLibraryId, name: string) {
		const library = this.getLibrary(libraryId)
		this.assertCan('renameLibrary', libraryId)
		this.write([{ ...library, name }])
	}

	// The content's assets stay: they belong to the document, and its shapes may use them. The
	// thumbnails belong to the items alone and go with them.
	async deleteLibrary(libraryId: TLLibraryId) {
		this.getLibrary(libraryId)
		this.assertCan('deleteLibrary', libraryId)
		const records = this.query('library-item', () => ({
			libraryId: { eq: libraryId },
		})).get()
		const itemIds = records.map((item) => item.id)
		this.write(
			[],
			[libraryId, ...itemIds, ...itemIds.map((itemId) => createLibraryItemContentId(itemId))],
			records.flatMap(getThumbnailAssetIds)
		)
		this.itemsByLibrary.delete(libraryId)
	}

	/**
	 * Assets the document doesn't have yet are added to it as they are: content saved from this
	 * board names assets already here, while content from another source carries its own.
	 *
	 * The item is listed at once, its thumbnail shown from the image itself, and it resolves then,
	 * while the thumbnail goes on uploading, as a pasted image does. If the upload fails, the item is
	 * removed again: {@link BoardLibrarySource.whenStored} tells when it is stored, or rejects.
	 */
	async addItem(libraryId: TLLibraryId, newItem: TLNewLibraryItem) {
		const [item] = await this.addItems(libraryId, [newItem])
		return item
	}

	/**
	 * As {@link BoardLibrarySource.addItem}, for several items at once: they are listed together,
	 * and their thumbnails are uploaded a few at a time. If any upload fails, all of them are removed
	 * again, with the images that did upload.
	 */
	async addItems(libraryId: TLLibraryId, newItems: TLNewLibraryItem[]) {
		this.getLibrary(libraryId)
		this.assertCan('addItem', libraryId)
		const now = Date.now()
		const prepared = await Promise.all(
			newItems.map(async (newItem) => {
				const { content } = parseLibraryItemContent(newItem.content)
				const { assets, ...rest } = content
				const newAssets = this.migrateAssets(
					assets.filter((asset) => !this.editor.store.has(asset.id)),
					content.schema
				)
				const thumbnail =
					newItem.thumbnail && (await this.prepareThumbnail(newItem.thumbnail, newItem.name))
				return { newItem, assets, rest, newAssets, thumbnail }
			})
		)
		// Checked again after reading the images, which the library may not have outlived.
		this.getLibrary(libraryId)
		this.assertCan('addItem', libraryId)
		const records = prepared.map(({ newItem, assets, rest, newAssets, thumbnail }, index) => {
			const item: TLLibraryItemRecord = {
				id: LibraryItemRecordType.createId(),
				typeName: 'library-item',
				libraryId,
				...(newItem.name === undefined ? {} : { name: newItem.name }),
				...(thumbnail ? { thumbnail: mapThumbnail(thumbnail, ({ asset }) => asset.id) } : {}),
				createdAt: now + index,
				version: 1,
				meta: {},
			}
			const contentRecord = LibraryItemContentRecordType.create({
				id: createLibraryItemContentId(item.id),
				itemId: item.id,
				content: structuredClone(rest),
				assetIds: [...new Set(assets.map((asset) => asset.id))],
			})
			return { item, contentRecord, newAssets, images: thumbnail ? listThumbnail(thumbnail) : [] }
		})
		const images = records.flatMap((r) => r.images)
		for (const { asset, file } of images) this.editor.createTemporaryAssetPreview(asset.id, file)
		this.write([
			...records.flatMap((r) => r.newAssets),
			...images.map(({ asset }) => asset),
			...records.flatMap((r) => [r.item, r.contentRecord]),
		])
		const itemIds = records.map(({ item }) => item.id)
		const stored = this.uploadImages(images, itemIds)
		for (const itemId of itemIds) this.storing.set(itemId, stored)
		stored.then(
			() => {
				for (const itemId of itemIds) this.storing.delete(itemId)
			},
			(error) => console.error("Couldn't upload a library item's thumbnail", error)
		)
		return records.map(({ item }) => this.toListedItem(item))
	}

	/**
	 * Resolves once the items' thumbnails have uploaded, or rejects with the error if one failed,
	 * and they were removed again.
	 */
	async whenStored(itemIds: TLLibraryItemId[]) {
		await Promise.all(itemIds.map((itemId) => this.storing.get(itemId)))
	}

	async renameItem(itemId: TLLibraryItemId, name: string) {
		const item = this.getItem(itemId)
		this.assertCan('renameItem', item.libraryId)
		this.write([{ ...item, name }])
	}

	async deleteItem(itemId: TLLibraryItemId) {
		const item = this.getItem(itemId)
		this.assertCan('deleteItem', item.libraryId)
		this.write([], [itemId, createLibraryItemContentId(itemId)], getThumbnailAssetIds(item))
	}

	async moveItem(itemId: TLLibraryItemId, toLibraryId: TLLibraryId) {
		const item = this.getItem(itemId)
		this.getLibrary(toLibraryId)
		this.assertCan('deleteItem', item.libraryId)
		this.assertCan('addItem', toLibraryId)
		if (item.libraryId === toLibraryId) return
		this.write([{ ...item, libraryId: toLibraryId }])
	}

	// Assets join the document at its current schema, as pasting brings them in.
	private migrateAssets(assets: TLAsset[], schema: TLLibraryItemContent['content']['schema']) {
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
	 * Each image becomes an image asset with no src yet, sized and named from the file, as a pasted
	 * image is before its upload. Every item gets its own assets, so deleting it can delete them.
	 */
	private async prepareThumbnail(
		thumbnail: TLLibraryThumbnail<Blob>,
		name = 'thumbnail'
	): Promise<TLLibraryThumbnail<PendingImage>> {
		const prepare = async (blob: Blob, suffix: string) => {
			const file = new File([blob], `${name}${suffix}.${blob.type.split('/')[1] ?? 'png'}`, {
				type: blob.type,
			})
			const asset = await getAssetInfo(this.editor, file, AssetRecordType.createId())
			if (!asset) throw new Error(`The editor can't store images: it has no util for ${file.type}`)
			return { asset, file }
		}
		if (thumbnail instanceof Blob) return prepare(thumbnail, '')
		const [light, dark] = await Promise.all([
			prepare(thumbnail.light, '-light'),
			prepare(thumbnail.dark, '-dark'),
		])
		return { light, dark }
	}

	// Removes the items again, with all of their images, if any image fails to upload.
	private async uploadImages(images: PendingImage[], itemIds: TLLibraryItemId[]) {
		try {
			await mapConcurrently(images, UPLOAD_CONCURRENCY, (image) => this.uploadImage(image))
		} catch (error) {
			this.write(
				[],
				[...itemIds, ...itemIds.map((itemId) => createLibraryItemContentId(itemId))],
				images.map(({ asset }) => asset.id)
			)
			throw error
		}
	}

	/**
	 * The image goes through the editor's handler for files, as a pasted image does: it is checked
	 * and uploaded to the editor's asset store, and its asset gets the stored src. An asset deleted
	 * while it uploaded, with its item or library, isn't put back, and the upload is removed.
	 */
	private async uploadImage({ asset, file }: PendingImage) {
		const uploaded = await this.editor.getAssetForExternalContent({
			type: 'file',
			file,
			assetId: asset.id,
		})
		if (!uploaded) throw new Error("The editor can't store images: it has no handler for files")
		if (!this.editor.getAsset(asset.id)) {
			this.editor.deleteAssets([asset.id])
			return
		}
		this.write([{ ...uploaded, id: asset.id }])
	}

	private toListedItem(record: TLLibraryItemRecord): TLLibraryItem {
		const { thumbnail, ...rest } = record
		if (!thumbnail) return rest
		const urls = mapThumbnail(thumbnail, (id) => this.getThumbnailUrl(id))
		const resolved = listThumbnail(urls).every((url) => url !== undefined)
		return resolved ? { ...rest, thumbnail: urls as TLLibraryThumbnail } : rest
	}

	/**
	 * A thumbnail asset's URL to the original image, as for copying or exporting it: copying an item
	 * to another source fetches its thumbnail from these. While the image uploads, and until its
	 * stored src resolves, it is the image's temporary preview. Without either it is undefined, and
	 * an item lists no thumbnail until all of its images have one.
	 */
	private getThumbnailUrl(assetId: TLAssetId): string | undefined {
		const asset = this.editor.getAsset(assetId)
		if (!asset) return undefined
		const resolved = asset.props.src
			? this.getResolvedUrl(assetId, asset.props.src).url.get()
			: undefined
		return resolved ?? this.editor.getTemporaryAssetPreview(assetId)
	}

	// Resolved asynchronously, kept per asset, and resolved again when its src changes.
	private getResolvedUrl(assetId: TLAssetId, src: string): ResolvedUrl {
		const existing = this.thumbnailUrls.get(assetId)
		if (existing?.src === src) return existing
		const url = atom<string | undefined>(`thumbnail url ${assetId}`, undefined)
		// Resolving reads editor state, such as the device pixel ratio, that a listing shouldn't
		// recompute for.
		unsafe__withoutCapture(() =>
			this.editor.resolveAssetUrl(assetId, { shouldResolveToOriginal: true })
		).then(
			(resolved) => {
				url.set(resolved ?? undefined)
			},
			(error) => console.error(`Couldn't resolve the thumbnail ${assetId}`, error)
		)
		const entry = { src, url }
		this.thumbnailUrls.set(assetId, entry)
		return entry
	}

	private write(
		put: (TLLibraryRecord | TLAsset)[],
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

	// The editor's store is typed for tldraw's own records, so library records are read through
	// these two.
	private get<R extends TLLibraryRecord>(id: R['id']) {
		return this.editor.store.get(id as unknown as TLRecord['id']) as unknown as R | undefined
	}

	private query<T extends TLLibraryRecord['typeName']>(
		typeName: T,
		filter?: () => Record<string, { eq: unknown }>
	) {
		return this.editor.store.query.records(
			typeName as unknown as TLRecord['typeName'],
			filter as any
		) as unknown as Computed<Extract<TLLibraryRecord, { typeName: T }>[]>
	}

	private getLibrary(libraryId: TLLibraryId) {
		const library = this.get<TLLibrary>(libraryId)
		if (!library) throw new LibraryNotFoundError(libraryId)
		return library
	}

	private getItem(itemId: TLLibraryItemId) {
		const item = this.get<TLLibraryItemRecord>(itemId)
		if (!item) throw new LibraryNotFoundError(itemId)
		return item
	}

	private assertCan(action: TLLibraryAction, libraryId?: TLLibraryId) {
		if (!this.can(action, libraryId)) throw new LibraryPermissionError(action, libraryId)
	}
}

interface PendingImage {
	asset: TLAsset
	file: File
}

interface ResolvedUrl {
	src: string
	url: Atom<string | undefined>
}

function listThumbnail<Src>(thumbnail: TLLibraryThumbnail<Src>): Src[] {
	const light = getThumbnailForColorMode(thumbnail, 'light')
	const dark = getThumbnailForColorMode(thumbnail, 'dark')
	return light === dark ? [light] : [light, dark]
}

function getThumbnailAssetIds(item: TLLibraryItemRecord): TLAssetId[] {
	return item.thumbnail ? listThumbnail(item.thumbnail) : []
}

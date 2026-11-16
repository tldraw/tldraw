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
 * names them by id. Tiles get a URL sized for them from `resolveThumbnail`; a listed item carries
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
	 * scale the tile shows it, as an image on the canvas is resolved at the scale it is drawn.
	 */
	async resolveThumbnail(item: TLLibraryItem, context: TLLibraryThumbnailContext) {
		const record = this.get<TLLibraryItemRecord>(item.id)
		if (!record?.thumbnail) return null
		const assetId = getThumbnailForColorMode(record.thumbnail, context.colorMode)
		const asset = this.editor.getAsset(assetId)
		if (!asset || asset.type === 'bookmark' || !asset.props.w) return null
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
	 * The thumbnail is uploaded first, and the item appears once it has been: it never names an
	 * image that isn't stored yet. If the upload fails, nothing is added.
	 */
	async addItem(libraryId: TLLibraryId, newItem: TLNewLibraryItem) {
		const [item] = await this.addItems(libraryId, [newItem])
		return item
	}

	/**
	 * As {@link BoardLibrarySource.addItem}, for several items at once: their thumbnails are
	 * uploaded a few at a time, and the items appear together once all have been. If any upload
	 * fails, nothing is added and the images that did upload are removed again.
	 */
	async addItems(libraryId: TLLibraryId, newItems: TLNewLibraryItem[]) {
		this.getLibrary(libraryId)
		this.assertCan('addItem', libraryId)
		const now = Date.now()
		const prepared = newItems.map((newItem) => {
			const { content } = parseLibraryItemContent(newItem.content)
			const { assets, ...rest } = content
			const newAssets = this.migrateAssets(
				assets.filter((asset) => !this.editor.store.has(asset.id)),
				content.schema
			)
			return { newItem, assets, rest, newAssets }
		})
		const uploaded: TLAsset[] = []
		const removeUploaded = () => this.editor.deleteAssets(uploaded)
		let thumbnails: (TLLibraryThumbnail<TLAsset> | undefined)[]
		try {
			thumbnails = await mapConcurrently(newItems, UPLOAD_CONCURRENCY, async (newItem) => {
				if (!newItem.thumbnail) return undefined
				const thumbnail = await this.uploadThumbnail(newItem.thumbnail, newItem.name)
				uploaded.push(...listThumbnail(thumbnail))
				return thumbnail
			})
			// Checked again after the uploads, which the library may not have outlived.
			this.getLibrary(libraryId)
			this.assertCan('addItem', libraryId)
		} catch (error) {
			removeUploaded()
			throw error
		}
		const records = prepared.map(({ newItem, assets, rest, newAssets }, index) => {
			const thumbnailAssets = thumbnails[index]
			const item: TLLibraryItemRecord = {
				id: LibraryItemRecordType.createId(),
				typeName: 'library-item',
				libraryId,
				...(newItem.name === undefined ? {} : { name: newItem.name }),
				...(thumbnailAssets
					? { thumbnail: mapThumbnail(thumbnailAssets, (asset) => asset.id) }
					: {}),
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
			return { item, contentRecord, newAssets }
		})
		this.write([
			...records.flatMap((r) => r.newAssets),
			...uploaded,
			...records.flatMap((r) => [r.item, r.contentRecord]),
		])
		await Promise.all(
			records.flatMap(({ item }) =>
				getThumbnailAssetIds(item).map((id) => this.getResolvedUrl(id)?.ready)
			)
		)
		return records.map(({ item }) => this.toListedItem(item))
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
	 * Each image goes through the editor's handler for files, as a pasted image does: it is checked
	 * and uploaded to the editor's asset store, and comes back as an image asset to add to the
	 * document. Every item gets its own assets, so deleting it can delete them.
	 */
	private async uploadThumbnail(
		thumbnail: TLLibraryThumbnail<Blob>,
		name = 'thumbnail'
	): Promise<TLLibraryThumbnail<TLAsset>> {
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

	private toListedItem(record: TLLibraryItemRecord): TLLibraryItem {
		const { thumbnail, ...rest } = record
		if (!thumbnail) return rest
		const urls = mapThumbnail(thumbnail, (id) => this.getResolvedUrl(id)?.url.get())
		const resolved = listThumbnail(urls).every((url) => url !== undefined)
		return resolved ? { ...rest, thumbnail: urls as TLLibraryThumbnail } : rest
	}

	/**
	 * A thumbnail asset's URL from the editor's asset store, to the original image, as for copying
	 * or exporting it: copying an item to another source fetches its thumbnail from these. It
	 * resolves asynchronously, so it is undefined until then, and an item lists no thumbnail until
	 * all of its images have one. Kept per asset, and resolved again when its src changes.
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

interface ResolvedUrl {
	src: string
	url: Atom<string | undefined>
	ready: Promise<void>
}

function listThumbnail<Src>(thumbnail: TLLibraryThumbnail<Src>): Src[] {
	const light = getThumbnailForColorMode(thumbnail, 'light')
	const dark = getThumbnailForColorMode(thumbnail, 'dark')
	return light === dark ? [light] : [light, dark]
}

function getThumbnailAssetIds(item: TLLibraryItemRecord): TLAssetId[] {
	return item.thumbnail ? listThumbnail(item.thumbnail) : []
}

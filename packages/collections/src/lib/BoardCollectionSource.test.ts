import {
	AssetRecordType,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	type TLAssetStore,
	type TLImageAsset,
	type TLRecord,
} from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BoardCollectionSource } from './BoardCollectionSource'
import { CollectionNotFoundError, CollectionPermissionError } from './CollectionSource'
import { CompositeCollectionSource } from './CompositeCollectionSource'
import { copyItem } from './copyCollection'
import { InMemoryCollectionSource } from './InMemoryCollectionSource'
import {
	collectionSchemaRecords,
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	getCollectionItemContentId,
	type TLCollectionItemContent,
	type TLCollectionItemContentRecord,
	type TLCollectionItemRecord,
} from './schema'

let editors: Editor[] = []

afterEach(() => {
	for (const editor of editors) editor.dispose()
	editors = []
	vi.unstubAllGlobals()
})

// An asset store that keeps uploads in memory, at URLs it resolves with a marker so tests can tell
// a resolved URL from a stored src.
function makeAssetStore() {
	const uploads = new Map<string, Blob>()
	const store: TLAssetStore = {
		upload: async (asset, file) => {
			const src = `https://uploads.example/${asset.id}`
			uploads.set(src, file)
			return { src }
		},
		resolve: async (asset) => (asset.props.src ? `${asset.props.src}?resolved` : null),
		remove: async (ids) => {
			for (const id of ids) uploads.delete(`https://uploads.example/${id}`)
		},
	}
	return { store, uploads }
}

function makeEditor(
	records: typeof collectionSchemaRecords | undefined = collectionSchemaRecords,
	assets = makeAssetStore()
) {
	const editor = new Editor({
		store: createTLStore({ schema: createTLSchema({ records }), assets: assets.store }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		getContainer: () => document.body,
	})
	// What tldraw's handler for a pasted file does, without decoding the image.
	editor.registerExternalAssetHandler('file', async ({ file, assetId }) => {
		const asset = AssetRecordType.create({
			id: assetId,
			type: 'image',
			props: {
				name: file.name,
				src: null,
				w: 512,
				h: 256,
				mimeType: file.type,
				isAnimated: false,
			},
		})
		const { src } = await editor.uploadAsset(asset, file)
		return { ...asset, props: { ...asset.props, src } } as TLImageAsset
	})
	editors.push(editor)
	return editor
}

const png = (text = 'png') => new Blob([text], { type: 'image/png' })

const assetId = AssetRecordType.createId('photo')

function photoAsset(): TLImageAsset {
	return AssetRecordType.create({
		id: assetId,
		type: 'image',
		props: {
			name: 'photo.png',
			src: 'https://example.com/photo.png',
			w: 100,
			h: 80,
			mimeType: 'image/png',
			isAnimated: false,
		},
		meta: { fileId: 'file-a' },
	}) as TLImageAsset
}

// An image shape on the page, and its asset in the document.
function addImage(editor: Editor) {
	const id = createShapeId()
	editor.createAssets([photoAsset()])
	editor.createShape({ id, type: 'image', x: 10, y: 20, props: { assetId, w: 100, h: 80 } })
	return id
}

function contentOf(
	editor: Editor,
	ids: ReturnType<typeof createShapeId>[]
): TLCollectionItemContent {
	return {
		formatVersion: CURRENT_ITEM_CONTENT_FORMAT_VERSION,
		content: editor.getContentFromCurrentPage(ids)!,
	}
}

const allOfType = (editor: Editor, typeName: string) =>
	editor.store.allRecords().filter((r) => r.typeName === (typeName as TLRecord['typeName']))

describe('BoardCollectionSource', () => {
	it("refuses a store that doesn't register the collection records", () => {
		expect(() => new BoardCollectionSource(makeEditor({} as any))).toThrow(
			/register collectionSchemaRecords/
		)
	})

	it('keeps collections as records in the document', async () => {
		const editor = makeEditor()
		const source = new BoardCollectionSource(editor)
		const collection = await source.createCollection('Kit')
		await source.renameCollection(collection.id, 'Board kit')
		expect(source.getCollections()).toEqual([{ ...collection, name: 'Board kit' }])
		const stored: Record<string, unknown> = editor.getSnapshot().document.store
		expect(stored[collection.id]).toMatchObject({ name: 'Board kit' })
	})

	it('stores content apart from the item, naming the assets the board already has', async () => {
		const editor = makeEditor()
		const source = new BoardCollectionSource(editor)
		const imageId = addImage(editor)
		const collection = await source.createCollection('Photos')
		const item = await source.addItem(collection.id, {
			name: 'Photo',
			content: contentOf(editor, [imageId]),
		})

		expect(source.getItems(collection.id)).toEqual([item])
		const stored = editor.store.get(
			getCollectionItemContentId(item.id) as any
		) as unknown as TLCollectionItemContentRecord
		expect(stored.itemId).toBe(item.id)
		expect(stored.assetIds).toEqual([assetId])
		expect(stored.content).not.toHaveProperty('assets')
		expect(allOfType(editor, 'asset')).toHaveLength(1)
	})

	it('adds assets the board lacks as top-level asset records', async () => {
		const from = makeEditor()
		const content = contentOf(from, [addImage(from)])

		const editor = makeEditor()
		const source = new BoardCollectionSource(editor)
		const collection = await source.createCollection('Photos')
		await source.addItem(collection.id, { content })

		expect(allOfType(editor, 'asset')).toEqual([photoAsset()])
	})

	it('loads content with its assets from the document, and placing it reuses them', async () => {
		const editor = makeEditor()
		const source = new BoardCollectionSource(editor)
		const imageId = addImage(editor)
		const collection = await source.createCollection('Photos')
		const item = await source.addItem(collection.id, { content: contentOf(editor, [imageId]) })
		editor.deleteShape(imageId)

		const { content } = await source.getItemContent(item.id)
		expect(content.assets).toEqual([photoAsset()])
		expect(content.schema).toEqual(editor.store.schema.serialize())

		editor.putContentOntoCurrentPage(content, { select: true })
		const [placed] = editor.getCurrentPageShapes()
		expect(placed).toMatchObject({ type: 'image', props: { assetId } })
		expect(allOfType(editor, 'asset')).toEqual([photoAsset()])
	})

	it('migrates content saved at an older schema when loading it', async () => {
		const editor = makeEditor()
		const source = new BoardCollectionSource(editor)
		const imageId = addImage(editor)
		const collection = await source.createCollection('Photos')
		const item = await source.addItem(collection.id, { content: contentOf(editor, [imageId]) })
		const contentId = getCollectionItemContentId(item.id)
		const stored = editor.store.get(contentId as any) as unknown as TLCollectionItemContentRecord
		// The image shape's earliest version, before url, altText and flip props existed.
		const {
			url: _u,
			altText: _a,
			flipX: _x,
			flipY: _y,
			...oldProps
		} = stored.content.shapes[0].props as any
		const schema = structuredClone(stored.content.schema) as any
		schema.sequences['com.tldraw.shape.image'] = 0
		editor.store.put([
			{
				...stored,
				content: {
					...stored.content,
					schema,
					shapes: [{ ...stored.content.shapes[0], props: oldProps }],
				},
			} as any,
		])

		const { content } = await source.getItemContent(item.id)
		expect(content.shapes[0].props).toMatchObject({ url: '', altText: '', flipX: false })
	})

	it('deletes items and collections with their content, leaving the assets', async () => {
		const editor = makeEditor()
		const source = new BoardCollectionSource(editor)
		const imageId = addImage(editor)
		const collection = await source.createCollection('Photos')
		const first = await source.addItem(collection.id, { content: contentOf(editor, [imageId]) })
		await source.addItem(collection.id, { content: contentOf(editor, [imageId]) })

		await source.deleteItem(first.id)
		expect(source.getItems(collection.id)).toHaveLength(1)
		expect(editor.store.has(getCollectionItemContentId(first.id) as any)).toBe(false)

		await source.deleteCollection(collection.id)
		expect(source.getCollections()).toEqual([])
		expect(allOfType(editor, 'collection-item')).toEqual([])
		expect(allOfType(editor, 'collection-item-content')).toEqual([])
		expect(allOfType(editor, 'asset')).toHaveLength(1)
		await expect(source.getItemContent(first.id)).rejects.toThrow(CollectionNotFoundError)
	})

	describe('thumbnails', () => {
		async function addWithThumbnail(editor: Editor, source = new BoardCollectionSource(editor)) {
			const collection = await source.createCollection('Photos')
			const item = await source.addItem(collection.id, {
				name: 'Photo',
				content: contentOf(editor, [addImage(editor)]),
				thumbnail: { light: png('light'), dark: png('dark') },
			})
			const stored = editor.store.get(item.id as any) as unknown as TLCollectionItemRecord
			return { source, collection, item, stored }
		}

		const isLight = (asset: TLImageAsset) => Number(asset.props.name.includes('-light'))
		// The light image first, then the dark one.
		const thumbnailAssets = (editor: Editor) =>
			(allOfType(editor, 'asset') as TLImageAsset[])
				.filter((asset) => asset.id !== assetId)
				.sort((a, b) => isLight(b) - isLight(a))

		it('uploads the images and keeps them as image assets the item names', async () => {
			const assets = makeAssetStore()
			const editor = makeEditor(collectionSchemaRecords, assets)
			const { stored } = await addWithThumbnail(editor)

			const [light, dark] = thumbnailAssets(editor)
			expect(stored.thumbnail).toEqual({ light: light.id, dark: dark.id })
			expect(light).toMatchObject({
				type: 'image',
				props: {
					name: 'Photo-light.png',
					src: `https://uploads.example/${light.id}`,
					mimeType: 'image/png',
					w: 512,
					h: 256,
				},
			})
			expect(dark.props.name).toBe('Photo-dark.png')
			expect(await assets.uploads.get(light.props.src!)!.text()).toBe('light')
			expect(await assets.uploads.get(dark.props.src!)!.text()).toBe('dark')
		})

		it('lists the item with the asset store’s URLs', async () => {
			const editor = makeEditor()
			const { source, collection, item } = await addWithThumbnail(editor)
			const [light, dark] = thumbnailAssets(editor)

			const urls = {
				light: `https://uploads.example/${light.id}?resolved`,
				dark: `https://uploads.example/${dark.id}?resolved`,
			}
			expect(item.thumbnail).toEqual(urls)
			expect(source.getItems(collection.id)).toEqual([item])
		})

		it('lists an item stored by another session once its URLs resolve', async () => {
			const editor = makeEditor()
			const { collection, stored } = await addWithThumbnail(editor)

			const { light, dark } = stored.thumbnail as { light: string; dark: string }
			const fresh = new BoardCollectionSource(editor)
			expect(fresh.getItems(collection.id)[0]).not.toHaveProperty('thumbnail')
			await vi.waitFor(() =>
				expect(fresh.getItems(collection.id)[0].thumbnail).toEqual({
					light: `https://uploads.example/${light}?resolved`,
					dark: `https://uploads.example/${dark}?resolved`,
				})
			)
		})

		it('deletes the images with the item, from the document and the asset store', async () => {
			const assets = makeAssetStore()
			const editor = makeEditor(collectionSchemaRecords, assets)
			const { source, item } = await addWithThumbnail(editor)

			await source.deleteItem(item.id)
			expect(thumbnailAssets(editor)).toEqual([])
			await vi.waitFor(() => expect(assets.uploads.size).toBe(0))
			expect(allOfType(editor, 'asset')).toHaveLength(1)
		})

		it('deletes the images with the collection', async () => {
			const editor = makeEditor()
			const { source, collection } = await addWithThumbnail(editor)

			await source.deleteCollection(collection.id)
			expect(thumbnailAssets(editor)).toEqual([])
		})

		it('adds nothing when an image fails to upload, and removes the one that did', async () => {
			const assets = makeAssetStore()
			const upload = assets.store.upload
			assets.store.upload = async (asset, file, signal) => {
				if (file.name.includes('dark')) throw new Error('upload failed')
				return upload(asset, file, signal)
			}
			const editor = makeEditor(collectionSchemaRecords, assets)
			const source = new BoardCollectionSource(editor)
			const collection = await source.createCollection('Photos')

			await expect(
				source.addItem(collection.id, {
					content: contentOf(editor, [addImage(editor)]),
					thumbnail: { light: png(), dark: png() },
				})
			).rejects.toThrow('upload failed')
			expect(source.getItems(collection.id)).toEqual([])
			expect(thumbnailAssets(editor)).toEqual([])
			await vi.waitFor(() => expect(assets.uploads.size).toBe(0))
		})

		it('copies the images out of the board, not the asset ids', async () => {
			const assets = makeAssetStore()
			const editor = makeEditor(collectionSchemaRecords, assets)
			const { source, item } = await addWithThumbnail(editor)
			vi.stubGlobal('fetch', async (url: string) => {
				const blob = assets.uploads.get(url.replace('?resolved', ''))
				return blob ? new Response(await blob.text()) : new Response(null, { status: 404 })
			})
			const workspace = new InMemoryCollectionSource()
			const addItem = vi.spyOn(workspace, 'addItem')
			const to = await workspace.createCollection('Photos')

			await copyItem(source, item, workspace, to.id)

			const { thumbnail } = addItem.mock.calls[0][1] as { thumbnail: { light: Blob; dark: Blob } }
			expect(await thumbnail.light.text()).toBe('light')
			expect(await thumbnail.dark.text()).toBe('dark')
		})
	})

	it('moves items between its collections', async () => {
		const editor = makeEditor()
		const source = new BoardCollectionSource(editor)
		const a = await source.createCollection('A')
		const b = await source.createCollection('B')
		const item = await source.addItem(a.id, { content: contentOf(editor, [addImage(editor)]) })
		await source.moveItem(item.id, b.id)
		expect(source.getItems(a.id)).toEqual([])
		expect(source.getItems(b.id)).toEqual([{ ...item, collectionId: b.id }])
	})

	it('keeps its changes off the undo stack, as comments do', async () => {
		const editor = makeEditor()
		const source = new BoardCollectionSource(editor)
		const imageId = addImage(editor)
		editor.markHistoryStoppingPoint()
		const collection = await source.createCollection('Photos')
		await source.addItem(collection.id, { content: contentOf(editor, [imageId]) })
		editor.undo()
		expect(source.getCollections()).toHaveLength(1)
		expect(source.getItems(collection.id)).toHaveLength(1)
	})

	it('allows no changes while the editor is read-only', async () => {
		const editor = makeEditor()
		const source = new BoardCollectionSource(editor)
		const collection = await source.createCollection('Photos')
		editor.updateInstanceState({ isReadonly: true })
		expect(source.can('createCollection')).toBe(false)
		expect(source.can('addItem', collection.id)).toBe(false)
		await expect(source.renameCollection(collection.id, 'No')).rejects.toThrow(
			CollectionPermissionError
		)
	})

	describe('moving collections through a composite', () => {
		function setUp() {
			const editor = makeEditor()
			const board = new BoardCollectionSource(editor)
			const workspace = new InMemoryCollectionSource({
				owners: [{ id: 'workspace', name: 'Workspace' }],
			})
			const composite = new CompositeCollectionSource({
				parts: [
					{ owner: { id: 'board', name: 'This board' }, source: board },
					{ source: workspace },
				],
			})
			return { editor, board, workspace, composite }
		}

		it('carries the assets into the workspace item, embedded', async () => {
			const { editor, board, workspace, composite } = setUp()
			const collection = await board.createCollection('Photos')
			await board.addItem(collection.id, { content: contentOf(editor, [addImage(editor)]) })

			await composite.moveCollection(collection.id, 'workspace')

			expect(board.getCollections()).toEqual([])
			const [moved] = workspace.getCollections()
			const [item] = workspace.getItems(moved.id)
			const { content } = await workspace.getItemContent(item.id)
			expect(content.assets).toEqual([photoAsset()])
		})

		it('brings the assets into the document as top-level records', async () => {
			const { editor, board, workspace, composite } = setUp()
			const from = makeEditor()
			const collection = await workspace.createCollection('Photos', { ownerId: 'workspace' })
			await workspace.addItem(collection.id, { content: contentOf(from, [addImage(from)]) })

			await composite.moveCollection(collection.id, 'board')

			const [moved] = board.getCollections()
			const [item] = board.getItems(moved.id)
			expect(allOfType(editor, 'asset')).toEqual([photoAsset()])
			const { content } = await board.getItemContent(item.id)
			expect(content.assets).toEqual([photoAsset()])
		})
	})
})

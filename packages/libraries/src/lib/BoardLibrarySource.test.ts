import {
	AssetRecordType,
	librarySchemaRecords,
	createLibraryItemContentId,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	type TLAssetStore,
	type TLLibraryItemContentRecord,
	type TLLibraryItemRecord,
	type TLImageAsset,
	type TLRecord,
} from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BoardLibrarySource } from './BoardLibrarySource'
import { LibraryNotFoundError, LibraryPermissionError } from './LibrarySource'
import { CURRENT_ITEM_CONTENT_FORMAT_VERSION, type TLLibraryItemContent } from './schema'

let editors: Editor[] = []

afterEach(() => {
	for (const editor of editors) editor.dispose()
	editors = []
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
	records: typeof librarySchemaRecords | undefined = librarySchemaRecords,
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

function contentOf(editor: Editor, ids: ReturnType<typeof createShapeId>[]): TLLibraryItemContent {
	return {
		formatVersion: CURRENT_ITEM_CONTENT_FORMAT_VERSION,
		content: editor.getContentFromCurrentPage(ids)!,
	}
}

const allOfType = (editor: Editor, typeName: string) =>
	editor.store.allRecords().filter((r) => r.typeName === (typeName as TLRecord['typeName']))

describe('BoardLibrarySource', () => {
	it("refuses a store that doesn't register the library records", () => {
		expect(() => new BoardLibrarySource(makeEditor({} as any))).toThrow(
			/register librarySchemaRecords/
		)
	})

	it('keeps libraries as records in the document', async () => {
		const editor = makeEditor()
		const source = new BoardLibrarySource(editor)
		const library = await source.createLibrary('Kit')
		await source.renameLibrary(library.id, 'Board kit')
		expect(source.getLibraries()).toEqual([{ ...library, name: 'Board kit' }])
		const stored: Record<string, unknown> = editor.getSnapshot().document.store
		expect(stored[library.id]).toMatchObject({ name: 'Board kit' })
	})

	it('stores the meta a new library is given', async () => {
		const source = new BoardLibrarySource(makeEditor())
		const library = await source.createLibrary('Kit', { meta: { packId: 'shapes' } })
		expect(library.meta).toEqual({ packId: 'shapes' })
		expect(source.getLibraries()).toEqual([library])
	})

	it("refuses an owner, since the board doesn't track them", async () => {
		const source = new BoardLibrarySource(makeEditor())
		await expect(source.createLibrary('Kit', { ownerId: 'acme' })).rejects.toThrow(
			LibraryNotFoundError
		)
		expect(source.getLibraries()).toEqual([])
	})

	it('allows changes only to libraries it has', async () => {
		const source = new BoardLibrarySource(makeEditor())
		const library = await source.createLibrary('Kit')
		expect(source.can('addItem', library.id)).toBe(true)
		expect(source.can('addItem', 'library:missing' as typeof library.id)).toBe(false)
	})

	it('stores content apart from the item, naming the assets the board already has', async () => {
		const editor = makeEditor()
		const source = new BoardLibrarySource(editor)
		const imageId = addImage(editor)
		const library = await source.createLibrary('Photos')
		const item = await source.addItem(library.id, {
			name: 'Photo',
			content: contentOf(editor, [imageId]),
		})

		expect(source.getItems(library.id)).toEqual([item])
		const stored = editor.store.get(
			createLibraryItemContentId(item.id) as any
		) as unknown as TLLibraryItemContentRecord
		expect(stored.itemId).toBe(item.id)
		expect(stored.assetIds).toEqual([assetId])
		expect(stored.content).not.toHaveProperty('assets')
		expect(allOfType(editor, 'asset')).toHaveLength(1)
	})

	it('adds assets the board lacks as top-level asset records', async () => {
		const from = makeEditor()
		const content = contentOf(from, [addImage(from)])

		const editor = makeEditor()
		const source = new BoardLibrarySource(editor)
		const library = await source.createLibrary('Photos')
		await source.addItem(library.id, { content })

		expect(allOfType(editor, 'asset')).toEqual([photoAsset()])
	})

	it('loads content with its assets from the document, and placing it reuses them', async () => {
		const editor = makeEditor()
		const source = new BoardLibrarySource(editor)
		const imageId = addImage(editor)
		const library = await source.createLibrary('Photos')
		const item = await source.addItem(library.id, { content: contentOf(editor, [imageId]) })
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
		const source = new BoardLibrarySource(editor)
		const imageId = addImage(editor)
		const library = await source.createLibrary('Photos')
		const item = await source.addItem(library.id, { content: contentOf(editor, [imageId]) })
		const contentId = createLibraryItemContentId(item.id)
		const stored = editor.store.get(contentId as any) as unknown as TLLibraryItemContentRecord
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

	it('deletes items and libraries with their content, leaving the assets', async () => {
		const editor = makeEditor()
		const source = new BoardLibrarySource(editor)
		const imageId = addImage(editor)
		const library = await source.createLibrary('Photos')
		const first = await source.addItem(library.id, { content: contentOf(editor, [imageId]) })
		await source.addItem(library.id, { content: contentOf(editor, [imageId]) })

		await source.deleteItem(first.id)
		expect(source.getItems(library.id)).toHaveLength(1)
		expect(editor.store.has(createLibraryItemContentId(first.id) as any)).toBe(false)

		await source.deleteLibrary(library.id)
		expect(source.getLibraries()).toEqual([])
		expect(allOfType(editor, 'library-item')).toEqual([])
		expect(allOfType(editor, 'library-item-content')).toEqual([])
		expect(allOfType(editor, 'asset')).toHaveLength(1)
		await expect(source.getItemContent(first.id)).rejects.toThrow(LibraryNotFoundError)
	})

	describe('thumbnails', () => {
		async function addWithThumbnail(editor: Editor, source = new BoardLibrarySource(editor)) {
			const library = await source.createLibrary('Photos')
			const item = await source.addItem(library.id, {
				name: 'Photo',
				content: contentOf(editor, [addImage(editor)]),
				thumbnail: { light: png('light'), dark: png('dark') },
			})
			const stored = editor.store.get(item.id as any) as unknown as TLLibraryItemRecord
			return { source, library, item, stored }
		}

		const isLight = (asset: TLImageAsset) => Number(asset.props.name.includes('-light'))
		// The light image first, then the dark one.
		const thumbnailAssets = (editor: Editor) =>
			(allOfType(editor, 'asset') as TLImageAsset[])
				.filter((asset) => asset.id !== assetId)
				.sort((a, b) => isLight(b) - isLight(a))

		it('uploads the images and keeps them as image assets the item names', async () => {
			const assets = makeAssetStore()
			const editor = makeEditor(librarySchemaRecords, assets)
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
			const { source, library, item } = await addWithThumbnail(editor)
			const [light, dark] = thumbnailAssets(editor)

			const urls = {
				light: `https://uploads.example/${light.id}?resolved`,
				dark: `https://uploads.example/${dark.id}?resolved`,
			}
			expect(item.thumbnail).toEqual(urls)
			expect(source.getItems(library.id)).toEqual([item])
		})

		it('lists an item stored by another session once its URLs resolve', async () => {
			const editor = makeEditor()
			const { library, stored } = await addWithThumbnail(editor)

			const { light, dark } = stored.thumbnail as { light: string; dark: string }
			const fresh = new BoardLibrarySource(editor)
			expect(fresh.getItems(library.id)[0]).not.toHaveProperty('thumbnail')
			await vi.waitFor(() =>
				expect(fresh.getItems(library.id)[0].thumbnail).toEqual({
					light: `https://uploads.example/${light}?resolved`,
					dark: `https://uploads.example/${dark}?resolved`,
				})
			)
		})

		describe('resolveThumbnail', () => {
			const context = {
				colorMode: 'light',
				width: 256,
				dpr: 2,
				networkEffectiveType: null,
			} as const

			function makeSizingAssetStore() {
				const assets = makeAssetStore()
				assets.store.resolve = vi.fn(async (asset, { screenScale, dpr }) =>
					asset.props.src ? `${asset.props.src}?scale=${screenScale}&dpr=${dpr}` : null
				)
				return assets
			}

			it('resolves the image for the colour mode', async () => {
				const editor = makeEditor(librarySchemaRecords, makeSizingAssetStore())
				const { source, item } = await addWithThumbnail(editor)
				const [light, dark] = thumbnailAssets(editor)

				expect(await source.resolveThumbnail(item, context)).toMatch(
					`https://uploads.example/${light.id}?`
				)
				expect(await source.resolveThumbnail(item, { ...context, colorMode: 'dark' })).toMatch(
					`https://uploads.example/${dark.id}?`
				)
			})

			it('resolves it at the scale the tile shows it, with the tile’s pixel ratio', async () => {
				const assets = makeSizingAssetStore()
				const editor = makeEditor(librarySchemaRecords, assets)
				const { source, item } = await addWithThumbnail(editor)
				const [light] = thumbnailAssets(editor)

				// The uploaded image is 512 wide and the tile 256.
				expect(await source.resolveThumbnail(item, context)).toBe(
					`https://uploads.example/${light.id}?scale=0.5&dpr=2`
				)
				expect(assets.store.resolve).toHaveBeenLastCalledWith(
					expect.objectContaining({ id: light.id }),
					expect.objectContaining({
						screenScale: 0.5,
						steppedScreenScale: 0.5,
						dpr: 2,
						shouldResolveToOriginal: false,
					})
				)
			})

			it('resolves to null when the item has no thumbnail or its image is gone', async () => {
				const editor = makeEditor()
				const { source, library, item } = await addWithThumbnail(editor)
				const plain = await source.addItem(library.id, {
					content: contentOf(editor, [addImage(editor)]),
				})
				expect(await source.resolveThumbnail(plain, context)).toBeNull()

				const [light] = thumbnailAssets(editor)
				editor.run(() => editor.store.remove([light.id]), { history: 'ignore' })
				expect(await source.resolveThumbnail(item, context)).toBeNull()
			})

			it('resolves to null for an item it no longer has', async () => {
				const editor = makeEditor()
				const { source, item } = await addWithThumbnail(editor)
				await source.deleteItem(item.id)
				expect(await source.resolveThumbnail(item, context)).toBeNull()
			})
		})

		it('deletes the images with the item, from the document and the asset store', async () => {
			const assets = makeAssetStore()
			const editor = makeEditor(librarySchemaRecords, assets)
			const { source, item } = await addWithThumbnail(editor)

			await source.deleteItem(item.id)
			expect(thumbnailAssets(editor)).toEqual([])
			await vi.waitFor(() => expect(assets.uploads.size).toBe(0))
			expect(allOfType(editor, 'asset')).toHaveLength(1)
		})

		it('deletes the images with the library', async () => {
			const editor = makeEditor()
			const { source, library } = await addWithThumbnail(editor)

			await source.deleteLibrary(library.id)
			expect(thumbnailAssets(editor)).toEqual([])
		})

		it('adds nothing when an image fails to upload, and removes the one that did', async () => {
			const assets = makeAssetStore()
			const upload = assets.store.upload
			assets.store.upload = async (asset, file, signal) => {
				if (file.name.includes('dark')) throw new Error('upload failed')
				return upload(asset, file, signal)
			}
			const editor = makeEditor(librarySchemaRecords, assets)
			const source = new BoardLibrarySource(editor)
			const library = await source.createLibrary('Photos')

			await expect(
				source.addItem(library.id, {
					content: contentOf(editor, [addImage(editor)]),
					thumbnail: { light: png(), dark: png() },
				})
			).rejects.toThrow('upload failed')
			expect(source.getItems(library.id)).toEqual([])
			expect(thumbnailAssets(editor)).toEqual([])
			await vi.waitFor(() => expect(assets.uploads.size).toBe(0))
		})
	})

	it('moves items between its libraries', async () => {
		const editor = makeEditor()
		const source = new BoardLibrarySource(editor)
		const a = await source.createLibrary('A')
		const b = await source.createLibrary('B')
		const item = await source.addItem(a.id, { content: contentOf(editor, [addImage(editor)]) })
		await source.moveItem(item.id, b.id)
		expect(source.getItems(a.id)).toEqual([])
		expect(source.getItems(b.id)).toEqual([{ ...item, libraryId: b.id }])
	})

	it('keeps its changes off the undo stack, as comments do', async () => {
		const editor = makeEditor()
		const source = new BoardLibrarySource(editor)
		const imageId = addImage(editor)
		editor.markHistoryStoppingPoint()
		const library = await source.createLibrary('Photos')
		await source.addItem(library.id, { content: contentOf(editor, [imageId]) })
		editor.undo()
		expect(source.getLibraries()).toHaveLength(1)
		expect(source.getItems(library.id)).toHaveLength(1)
	})

	it('allows no changes while the editor is read-only', async () => {
		const editor = makeEditor()
		const source = new BoardLibrarySource(editor)
		const library = await source.createLibrary('Photos')
		editor.updateInstanceState({ isReadonly: true })
		expect(source.can('createLibrary')).toBe(false)
		expect(source.can('addItem', library.id)).toBe(false)
		await expect(source.renameLibrary(library.id, 'No')).rejects.toThrow(LibraryPermissionError)
	})
})

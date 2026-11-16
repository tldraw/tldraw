import {
	copyLibrary,
	placeLibraryItem,
	whenItemsStored,
	type TLLibraryItem,
} from '@tldraw/libraries'
import {
	AssetRecordType,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	MediaHelpers,
	type TLRecord,
} from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import { getEditorLibraries } from './editorLibraries'
import { createFakeLibrariesBackend } from './fakeLibrariesBackend'
import { TldrawAppLibrariesSource } from './librariesSource'
import { addStarterPack, isStarterPackAdded } from './starterPacks'
import { TldrawAppUploadsSource } from './uploadsSource'

// An add, once its items are stored as well as listed.
async function added<T extends TLLibraryItem | TLLibraryItem[]>(adding: Promise<T>) {
	const result = await adding
	await whenItemsStored((Array.isArray(result) ? result : [result]).map((item) => item.id))
	return result
}

let editors: Editor[] = []

afterEach(() => {
	for (const editor of editors) editor.dispose()
	editors = []
	vi.unstubAllGlobals()
})

const UPLOAD = { objectName: 'V1StGXR8_Z5jdHi6B-myT-photo-png', fileId: 'file-b', uploadedAt: 1 }

function setUp({ withUploads = false } = {}) {
	const backend = createFakeLibrariesBackend({ userId: 'home', userUploads: [UPLOAD] })
	vi.stubGlobal('fetch', backend.fetch)
	const uploads = withUploads ? new TldrawAppUploadsSource(backend.app, backend.getToken) : null
	const app = Object.assign(backend.app, { uploads })
	const libraries = new TldrawAppLibrariesSource(app, backend.getToken)
	const editor = new Editor({
		store: createTLStore({ schema: createTLSchema({ records: fileSchemaRecords }) }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		getContainer: () => document.body,
	})
	editors.push(editor)
	return { editor, backend, uploads, source: getEditorLibraries(app, libraries, editor, 'file-a') }
}

const ofType = (editor: Editor, typeName: string) =>
	editor.store.allRecords().filter((r) => r.typeName === (typeName as TLRecord['typeName']))

function addImage(editor: Editor) {
	const assetId = AssetRecordType.createId('photo')
	editor.createAssets([
		AssetRecordType.create({
			id: assetId,
			type: 'image',
			props: {
				name: 'photo.png',
				src: 'https://tldrawusercontent.com/abc123-png',
				w: 10,
				h: 10,
				mimeType: 'image/png',
				isAnimated: false,
			},
			meta: { fileId: 'file-a' },
		}),
	])
	const id = createShapeId()
	editor.createShape({ id, type: 'image', props: { assetId, w: 10, h: 10 } })
	return { id, assetId }
}

describe('getEditorLibraries', () => {
	it("lists the board last and keeps libraries made there in the file's document", async () => {
		const { editor, source } = setUp()
		expect(source.getLibraryOwners?.()?.map(({ id, name }) => ({ id, name }))).toEqual([
			{ id: 'home', name: 'Private' },
			{ id: 'acme', name: 'Acme' },
			{ id: 'file-a', name: 'This board' },
		])
		const library = await source.createLibrary('Board kit', { ownerId: 'file-a' })
		expect(library.ownerId).toBe('file-a')
		expect(ofType(editor, 'library')).toMatchObject([{ id: library.id, name: 'Board kit' }])
	})

	it('creates new libraries in the home workspace by default', async () => {
		const { editor, source } = setUp()
		expect(source.getDefaultOwnerId?.()).toBe('home')
		const library = await source.createLibrary('Team kit')
		expect(library.ownerId).toBe('home')
		expect(ofType(editor, 'library')).toEqual([])
	})

	it("creates a library in another of the user's workspaces when asked", async () => {
		const { editor, source } = setUp()
		const library = await source.createLibrary('Acme kit', { ownerId: 'acme' })
		expect(library.ownerId).toBe('acme')
		expect(ofType(editor, 'library')).toEqual([])
	})

	it('creates new libraries in the home workspace while the board is read-only', async () => {
		const { editor, source } = setUp()
		editor.updateInstanceState({ isReadonly: true })
		const library = await source.createLibrary('Team kit')
		expect(library.ownerId).toBe('home')
		expect(ofType(editor, 'library')).toEqual([])
	})

	it('moves a board library to a workspace and back, with its image', async () => {
		const { editor, source } = setUp()
		const { id, assetId } = addImage(editor)
		const library = await source.createLibrary('Photos', { ownerId: 'file-a' })
		await added(
			source.addItem(library.id, {
				content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! },
			})
		)

		await source.moveLibrary!(library.id, 'home')
		await vi.waitFor(() => expect(ofType(editor, 'library')).toEqual([]))
		const [inHome] = source.getLibraries()
		expect(inHome.ownerId).toBe('home')
		const [homeItem] = source.getItems(inHome.id)
		expect((await source.getItemContent(homeItem.id)).content.assets.map((a) => a.id)).toEqual([
			assetId,
		])

		editor.store.remove([assetId])
		await source.moveLibrary!(inHome.id, 'file-a')
		await vi.waitFor(() => expect(source.getLibraries()).toHaveLength(1))
		const [onBoard] = source.getLibraries()
		expect(onBoard.ownerId).toBe('file-a')
		expect(ofType(editor, 'asset').map((a) => a.id)).toEqual([assetId])
	})

	it("copies a board library's items to a workspace in one request, in their order", async () => {
		const { editor, backend, source } = setUp()
		const library = await source.createLibrary('Shapes', { ownerId: 'file-a' })
		const names = ['One', 'Two', 'Three', 'Four', 'Five']
		for (const name of names) {
			const id = createShapeId()
			editor.createShape({ id, type: 'geo' })
			await added(
				source.addItem(library.id, {
					name,
					content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! },
				})
			)
		}
		const boardOrder = source.getItems(library.id).map((item) => item.name)

		const copy = await copyLibrary(source, library.id, 'home')

		const itemRequests = backend.fetch.mock.calls.filter(([url]) => String(url).endsWith('/items'))
		expect(itemRequests).toHaveLength(1)
		expect(source.getItems(copy.id).map((item) => item.name)).toEqual(boardOrder)
		expect(boardOrder).toHaveLength(names.length)
	})

	it('adds a starter pack to the home workspace, not the board, and counts it added there', async () => {
		const { editor, source } = setUp()
		const pack = { id: 'doodles', name: 'Doodles', version: 2, items: [] }
		expect(isStarterPackAdded(source, 'doodles')).toBe(false)
		const copy = await addStarterPack(source, pack)
		expect(copy).toMatchObject({ ownerId: 'home', meta: { packId: 'doodles', packVersion: 2 } })
		expect(ofType(editor, 'library')).toEqual([])
		expect(isStarterPackAdded(source, 'doodles')).toBe(true)
		await source.moveLibrary!(copy.id, 'acme')
		expect(isStarterPackAdded(source, 'doodles')).toBe(false)
	})

	it("lists the user's uploads under their own owner, where nothing can be changed", async () => {
		const { source } = setUp({ withUploads: true })
		expect(source.getLibraryOwners?.().at(-1)).toMatchObject({
			id: 'uploads',
			name: 'Uploads',
		})
		const uploads = source.getLibraries().find((library) => library.ownerId === 'uploads')!
		expect(uploads.name).toBe('Images')
		expect(source.can('createLibrary', { ownerId: 'uploads' })).toBe(false)
		expect(source.can('addItem', uploads.id)).toBe(false)
		expect(source.can('deleteItem', uploads.id)).toBe(false)
		await expect(source.deleteLibrary(uploads.id)).rejects.toThrow()
	})

	it('places an upload on the board as an image over the upload, from its file', async () => {
		const { editor, source, uploads: uploadsSource } = setUp({ withUploads: true })
		await uploadsSource!.refresh()
		vi.spyOn(MediaHelpers, 'getImageSize').mockResolvedValue({ w: 40, h: 30, pixelRatio: 1 })
		vi.spyOn(MediaHelpers, 'isAnimated').mockResolvedValue(false)
		const uploads = source.getLibraries().find((library) => library.ownerId === 'uploads')!
		const [item] = source.getItems(uploads.id)

		await placeLibraryItem(editor, source, item.id)

		expect(ofType(editor, 'asset')).toMatchObject([
			{
				props: { src: `https://tldrawusercontent.com/${UPLOAD.objectName}`, w: 40, h: 30 },
				meta: { fileId: 'file-b' },
			},
		])
		expect(editor.getCurrentPageShapes()).toMatchObject([
			{ type: 'image', props: { w: 40, h: 30 } },
		])
	})

	it('copies the uploads to a workspace, with their content and thumbnails', async () => {
		const { backend, source, uploads: uploadsSource } = setUp({ withUploads: true })
		await uploadsSource!.refresh()
		vi.spyOn(MediaHelpers, 'getImageSize').mockResolvedValue({ w: 40, h: 30, pixelRatio: 1 })
		vi.spyOn(MediaHelpers, 'isAnimated').mockResolvedValue(false)
		const uploads = source.getLibraries().find((library) => library.ownerId === 'uploads')!

		const copy = await copyLibrary(source, uploads.id, 'home')
		await whenItemsStored(source.getItems(copy.id).map((item) => item.id))

		expect(copy).toMatchObject({ name: 'Images', ownerId: 'home' })
		const [item] = source.getItems(copy.id)
		expect(item).toMatchObject({ name: 'photo.png', thumbnail: expect.any(String) })
		const { content } = JSON.parse(backend.contents.get(item.id.slice('library-item:'.length))!)
		expect(content.assets).toMatchObject([{ meta: { fileId: 'file-b' } }])
		expect(source.getItems(uploads.id)).toHaveLength(1)
	})
})

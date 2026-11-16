import { BoardLibrarySource, copyLibrary } from '@tldraw/libraries'
import {
	AssetRecordType,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	type TLRecord,
} from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import { getEditorLibraries } from './editorLibraries'
import { createFakeLibrariesBackend } from './fakeLibrariesBackend'
import { TldrawAppLibrariesSource } from './librariesSource'

let editors: Editor[] = []

afterEach(() => {
	for (const editor of editors) editor.dispose()
	editors = []
	vi.unstubAllGlobals()
})

function setUp() {
	const backend = createFakeLibrariesBackend({ userId: 'home' })
	vi.stubGlobal('fetch', backend.fetch)
	const { app } = backend
	const libraries = new TldrawAppLibrariesSource(app, backend.getToken)
	const editor = new Editor({
		store: createTLStore({ schema: createTLSchema({ records: fileSchemaRecords }) }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		getContainer: () => document.body,
	})
	editors.push(editor)
	return { editor, backend, source: getEditorLibraries(app, libraries, editor, 'file-a') }
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
	it('lists the board first, with "This board" as its own library, kept in the document once saved to', async () => {
		const { editor, source } = setUp()
		expect(source.getLibraryOwners?.()).toEqual([
			{ id: 'file-a', name: 'This board' },
			{ id: 'home', name: 'Home' },
			{ id: 'acme', name: 'Acme' },
		])
		const own = source.getLibraries().find((c) => c.ownerId === 'file-a')!
		expect(own.name).toBe('This board')
		expect(source.can('createLibrary', { ownerId: 'file-a' })).toBe(false)
		const { id } = addImage(editor)
		await source.addItem(own.id, {
			content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! },
		})
		expect(ofType(editor, 'library')).toMatchObject([{ id: own.id, name: 'This board' }])
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

	it('copies a board library to a workspace, and its item back into "This board", with its image', async () => {
		const { editor, source } = setUp()
		const { id, assetId } = addImage(editor)
		const library = await new BoardLibrarySource(editor).createLibrary('Photos')
		await source.addItem(library.id, {
			content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! },
		})

		const inHome = await copyLibrary(source, library.id, 'home')
		await source.deleteLibrary(library.id)
		expect(ofType(editor, 'library')).toEqual([])
		expect(inHome.ownerId).toBe('home')
		const [homeItem] = source.getItems(inHome.id)
		expect((await source.getItemContent(homeItem.id)).content.assets.map((a) => a.id)).toEqual([
			assetId,
		])

		editor.store.remove([assetId])
		const own = source.getLibraries().find((c) => c.ownerId === 'file-a')!
		await source.moveItem!(homeItem.id, own.id)
		expect(source.getItems(own.id)).toHaveLength(1)
		expect(ofType(editor, 'asset').map((a) => a.id)).toEqual([assetId])
	})

	it("copies a board library's items to a workspace in one request, in their order", async () => {
		const { editor, backend, source } = setUp()
		const library = await new BoardLibrarySource(editor).createLibrary('Shapes')
		const names = ['One', 'Two', 'Three', 'Four', 'Five']
		for (const name of names) {
			const id = createShapeId()
			editor.createShape({ id, type: 'geo' })
			await source.addItem(library.id, {
				name,
				content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! },
			})
		}
		const boardOrder = source.getItems(library.id).map((item) => item.name)

		const copy = await copyLibrary(source, library.id, 'home')

		const itemRequests = backend.fetch.mock.calls.filter(([url]) => String(url).endsWith('/items'))
		expect(itemRequests).toHaveLength(1)
		expect(source.getItems(copy.id).map((item) => item.name)).toEqual(boardOrder)
		expect(boardOrder).toHaveLength(names.length)
	})
})

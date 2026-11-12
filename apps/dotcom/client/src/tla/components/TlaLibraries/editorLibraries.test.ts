import { copyLibrary } from '@tldraw/libraries'
import {
	AssetRecordType,
	clearLocalStorage,
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
import { getStarterPackLibraryId, StarterPacksSource } from './starterPacks'

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
	const doodles = { id: 'doodles', name: 'Doodles', version: 2, items: [] }
	const packs = new StarterPacksSource('test-added-packs', {
		getEntries: async () => [{ id: 'doodles', name: 'Doodles', version: 2 }],
		getPack: async () => doodles,
	})
	return { editor, packs, source: getEditorLibraries(app, libraries, packs, editor, 'file-a') }
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
	it("lists the board first and keeps libraries made there in the file's document", async () => {
		const { editor, source } = setUp()
		expect(source.getLibraryOwners?.()).toEqual([
			{ id: 'file-a', name: 'This board' },
			{ id: 'home', name: 'Private to you' },
			{ id: 'acme', name: 'Acme' },
			{ id: 'tldraw', name: 'Packs' },
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
		await source.addItem(library.id, {
			content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! },
		})

		await source.moveLibrary!(library.id, 'home')
		expect(ofType(editor, 'library')).toEqual([])
		const [inHome] = source.getLibraries()
		expect(inHome.ownerId).toBe('home')
		const [homeItem] = source.getItems(inHome.id)
		expect((await source.getItemContent(homeItem.id)).content.assets.map((a) => a.id)).toEqual([
			assetId,
		])

		editor.store.remove([assetId])
		await source.moveLibrary!(inHome.id, 'file-a')
		const [onBoard] = source.getLibraries()
		expect(onBoard.ownerId).toBe('file-a')
		expect(ofType(editor, 'asset').map((a) => a.id)).toEqual([assetId])
	})

	it('lists added starter packs under Packs, read-only, and copies one to a workspace', async () => {
		const { editor, packs, source } = setUp()
		await packs.refresh()
		packs.setAdded('doodles', true)
		const libraryId = getStarterPackLibraryId('doodles')
		const pack = source.getLibraries().find((library) => library.id === libraryId)
		expect(pack).toMatchObject({ name: 'Doodles', ownerId: 'tldraw' })
		expect(source.can('renameLibrary', libraryId)).toBe(false)
		expect(ofType(editor, 'library')).toEqual([])
		const copy = await copyLibrary(source, libraryId, 'home')
		expect(copy).toMatchObject({ name: 'Doodles', ownerId: 'home' })
		expect(packs.isAdded('doodles')).toBe(true)
		clearLocalStorage()
	})
})

import {
	addPackToDocument,
	BoardLibrarySource,
	copyLibrary,
	whenItemsStored,
	type LibraryPack,
	type TLLibraryItem,
	type TLLibraryItemContent,
} from '@tldraw/libraries'
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
import { getStarterPackBrowseGroup, getStarterPackOwnerId } from './starterPacks'

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
	it('lists the board last, with "This file", which is kept in the document from its first save', async () => {
		const { editor, source } = setUp()
		expect(source.getLibraryOwners?.()?.map(({ id, name }) => ({ id, name }))).toEqual([
			{ id: 'home', name: 'Home' },
			{ id: 'acme', name: 'Acme' },
			{ id: 'file-a', name: 'This file' },
		])
		const [own] = source.getLibraries()
		expect(own).toMatchObject({ name: 'This file', ownerId: 'file-a' })
		expect(source.can('addItem', own.id)).toBe(true)
		expect(ofType(editor, 'library')).toEqual([])
		const { id } = addImage(editor)
		await added(
			source.addItem(own.id, {
				content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! },
			})
		)
		expect(ofType(editor, 'library')).toMatchObject([{ id: own.id, name: 'This file' }])
		expect(source.getItems(own.id)).toHaveLength(1)
	})

	it('creates no other libraries on the board, and lists ones it already houses', async () => {
		const { editor, source } = setUp()
		expect(source.can('createLibrary', { ownerId: 'file-a' })).toBe(false)
		await expect(source.createLibrary('Board kit', { ownerId: 'file-a' })).rejects.toThrow()
		const kit = await new BoardLibrarySource(editor).createLibrary('Board kit')
		expect(source.getLibraries().map(({ name, ownerId }) => ({ name, ownerId }))).toEqual([
			{ name: 'This file', ownerId: 'file-a' },
			{ name: 'Board kit', ownerId: 'file-a' },
		])
		expect(source.can('deleteLibrary', kit.id)).toBe(true)
	})

	it('creates new libraries in the home workspace by default, and adds them to the file', async () => {
		const { editor, backend, source } = setUp()
		expect(source.getDefaultOwnerId?.()).toBe('home')
		const library = await source.createLibrary('Team kit')
		expect(library.ownerId).toBe('home')
		expect(ofType(editor, 'library')).toEqual([])
		expect(backend.fileLibraries.get()).toMatchObject([{ fileId: 'file-a' }])
	})

	it("places the board's own library as the document's, others it houses as housed, and workspace ones as added", async () => {
		const { editor, source } = setUp()
		const [own] = source.getLibraries()
		const onBoard = await new BoardLibrarySource(editor).createLibrary('Board kit')
		const inHome = await source.createLibrary('Team kit')
		expect(source.getLibraryPlacement!(own.id)).toBe('document')
		expect(source.getLibraryPlacement!(onBoard.id)).toBe('housed')
		expect(source.getLibraryPlacement!(inHome.id)).toBe('added')
	})

	it('lists "This file" read-only once saved to, and not before, for a viewer', async () => {
		const { editor, source } = setUp()
		editor.updateInstanceState({ isReadonly: true })
		expect(source.getLibraries()).toEqual([])
		editor.updateInstanceState({ isReadonly: false })
		const [own] = source.getLibraries()
		const { id } = addImage(editor)
		await added(
			source.addItem(own.id, {
				content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! },
			})
		)
		editor.updateInstanceState({ isReadonly: true })
		expect(source.getLibraries().map((library) => library.id)).toEqual([own.id])
		expect(source.can('addItem', own.id)).toBe(false)
	})

	it("stops the file's libraries query when the editor is disposed", () => {
		const { editor, backend } = setUp()
		const stops = backend.watchFileLibraries.mock.results.map((result) => result.value.stop)
		editors = editors.filter((e) => e !== editor)
		editor.dispose()
		expect(stops).toHaveLength(1)
		expect(stops[0]).toHaveBeenCalled()
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

	it('copies a board library to a workspace, and its item back into "This file", with its image', async () => {
		const { editor, source } = setUp()
		const { id, assetId } = addImage(editor)
		const library = await new BoardLibrarySource(editor).createLibrary('Photos')
		await added(
			source.addItem(library.id, {
				content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! },
			})
		)

		const inHome = await copyLibrary(source, library.id, 'home')
		await source.deleteLibrary(library.id)
		await vi.waitFor(() => expect(ofType(editor, 'library')).toEqual([]))
		const [homeItem] = source.getItems(inHome.id)
		expect((await source.getItemContent(homeItem.id)).content.assets.map((a) => a.id)).toEqual([
			assetId,
		])

		editor.store.remove([assetId])
		const own = source.getLibraries().find((l) => l.ownerId === 'file-a')!
		await source.moveItem!(homeItem.id, own.id)
		await vi.waitFor(() => expect(source.getItems(own.id)).toHaveLength(1))
		expect(ofType(editor, 'asset').map((a) => a.id)).toContain(assetId)
	})

	it('copies the items of "This file" to a workspace in one request, in their order', async () => {
		const { editor, backend, source } = setUp()
		const [library] = source.getLibraries()
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

	describe('a starter pack', () => {
		function setUpPack() {
			const setup = setUp()
			const { editor, source } = setup
			const shapeId = createShapeId()
			editor.createShape({ id: shapeId, type: 'geo' })
			const content: TLLibraryItemContent = {
				formatVersion: 1,
				content: editor.getContentFromCurrentPage([shapeId])!,
			}
			editor.deleteShape(shapeId)
			const pack: LibraryPack = {
				id: 'doodles',
				name: 'Doodles',
				version: 2,
				items: [{ id: 'a', content }],
			}
			const summary = {
				id: 'doodles',
				name: 'Doodles',
				version: 2,
				itemCount: 1,
				itemNames: [],
				previews: [],
			}
			const entry = () =>
				getStarterPackBrowseGroup(source, [summary], 'Public', () => {}).entries[0]
			const add = () =>
				addPackToDocument(source, 'doodles', async () => pack, {
					ownerId: getStarterPackOwnerId(source),
				})
			return { ...setup, content, entry, add }
		}

		it("is copied to the file's workspace, not the board, and keeps its packId while filled", async () => {
			const { editor, source, entry, add } = setUpPack()
			expect(entry().added).toBe(false)
			expect(getStarterPackOwnerId(source)).toBe('acme')
			const id = await add()
			await vi.waitFor(() => expect(source.getItems(id)).toHaveLength(1))
			const copy = source.getLibraries().find((library) => library.id === id)
			expect(copy).toMatchObject({ ownerId: 'acme', meta: { packId: 'doodles', packVersion: 2 } })
			expect(ofType(editor, 'library')).toEqual([])
			expect(source.getLibraryPlacement!(id)).toBe('added')
			expect(entry().added).toBe(true)
		})

		it('deletes an unchanged copy when it leaves its last file, and adds a fresh copy again', async () => {
			const { source, entry, add } = setUpPack()
			const id = await add()
			await vi.waitFor(() => expect(source.getItems(id)).toHaveLength(1))
			await source.removeLibraryFromDocument!(id)
			expect(entry().added).toBe(false)
			expect(source.getAvailableLibraries!().map((library) => library.id)).not.toContain(id)
			const again = await add()
			expect(again).not.toBe(id)
			expect(entry().added).toBe(true)
		})

		it('keeps a changed copy as an ordinary library, and copies the pack afresh', async () => {
			const { source, content, entry, add } = setUpPack()
			const id = await add()
			await vi.waitFor(() => expect(source.getItems(id)).toHaveLength(1))
			await added(source.addItem(id, { content }))
			const copy = () => source.getLibraries().find((library) => library.id === id)
			expect(copy()!.meta).toEqual({ packVersion: 2 })
			expect(entry().added).toBe(false)
			await source.removeLibraryFromDocument!(id)
			expect(source.getAvailableLibraries!().map((library) => library.id)).toContain(id)
			const again = await add()
			expect(again).not.toBe(id)
		})
	})
})

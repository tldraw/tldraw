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
	defaultAssetUtils,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	MediaHelpers,
	registerDefaultExternalContentHandlers,
	renderPlaintextFromRichText,
	type TLImageShape,
	type TLTextShape,
	tipTapDefaultExtensions,
	type TLRecord,
} from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import { getEditorLibraries } from './editorLibraries'
import { AVATAR_HOST, createFakeLibrariesBackend } from './fakeLibrariesBackend'
import { TldrawAppLibrariesSource } from './librariesSource'
import { TldrawAppMembersSource } from './membersSource'
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
const ADA = { userId: 'ada', userName: 'Ada', userAvatar: `${AVATAR_HOST}/ada` }

function setUp({ withUploads = false, withMembers = false } = {}) {
	const backend = createFakeLibrariesBackend({
		userId: 'home',
		workspaces: [{ id: 'acme', name: 'Acme', members: [ADA] }],
		userUploads: [UPLOAD],
	})
	vi.stubGlobal('fetch', backend.fetch)
	const uploads = withUploads ? new TldrawAppUploadsSource(backend.app, backend.getToken) : null
	const members = withMembers ? new TldrawAppMembersSource(backend.app) : null
	const app = Object.assign(backend.app, { uploads, members })
	const libraries = new TldrawAppLibrariesSource(app, backend.getToken)
	const editor = new Editor({
		store: createTLStore({ schema: createTLSchema({ records: fileSchemaRecords }) }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		assetUtils: defaultAssetUtils,
		tools: [],
		getContainer: () => document.body,
		options: {
			text: {
				addFontsFromNode: defaultAddFontsFromNode,
				tipTapConfig: { extensions: tipTapDefaultExtensions },
			},
		},
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

	it("lists a workspace's members in its own group, beside its libraries, where they can't be changed", async () => {
		const { source } = setUp({ withMembers: true })
		expect(source.getLibraryOwners?.().map(({ id, name }) => ({ id, name }))).toEqual([
			{ id: 'home', name: 'Private' },
			{ id: 'acme', name: 'Acme' },
			{ id: 'file-a', name: 'This board' },
		])
		const members = source.getLibraries().find((library) => library.id === 'library:members-acme')!
		expect(members).toMatchObject({ name: 'Members', ownerId: 'acme' })
		expect(source.getLibraries().map((library) => library.ownerId)).toEqual(['acme'])
		expect(source.getItems(members.id).map((item) => item.name)).toEqual(['Ada'])
		expect(source.can('createLibrary', { ownerId: 'acme' })).toBe(true)
		const kit = await source.createLibrary('Kit', { ownerId: 'acme' })
		expect(source.getLibraries().map((library) => library.name)).toEqual(['Kit', 'Members'])
		expect(source.getItems(kit.id)).toEqual([])
		expect(source.can('addItem', members.id)).toBe(false)
		expect(source.can('deleteItem', members.id)).toBe(false)
		await expect(source.deleteLibrary(members.id)).rejects.toThrow()
	})

	it('places a member on the board as their avatar, uploaded to the board, over their name', async () => {
		const { editor, backend, source } = setUp({ withMembers: true })
		vi.spyOn(MediaHelpers, 'getImageSize').mockResolvedValue({ w: 64, h: 64, pixelRatio: 1 })
		vi.spyOn(MediaHelpers, 'isAnimated').mockResolvedValue(false)
		const upload = vi.fn(async () => ({ src: 'https://tldrawusercontent.com/uploaded-ada-png' }))
		editor.store.props.assets.upload = upload
		registerDefaultExternalContentHandlers(editor, { toasts: backend.app.toasts!, msg: (id) => id })
		const members = source.getLibraries().find((library) => library.id === 'library:members-acme')!
		const [item] = source.getItems(members.id)

		await placeLibraryItem(editor, source, item.id)
		backend.setMembers('acme', [{ ...ADA, userName: 'Ada Lovelace' }])

		const [groupId] = editor.getSortedChildIdsForParent(editor.getCurrentPageId())
		const group = editor.getShape(groupId)!
		expect(group.type).toBe('group')
		const [image, name] = editor
			.getSortedChildIdsForParent(group.id)
			.map((id) => editor.getShape(id)!) as [TLImageShape, TLTextShape]
		expect(image).toMatchObject({
			type: 'image',
			props: { w: 96, h: 96, crop: { isCircle: true } },
		})
		expect(renderPlaintextFromRichText(editor, name.props.richText)).toBe('Ada')
		expect(editor.getShapePageBounds(name)!.minY).toBeGreaterThan(
			editor.getShapePageBounds(image)!.maxY
		)
		expect(editor.getShapePageBounds(name)!.center.x).toBeCloseTo(
			editor.getShapePageBounds(image)!.center.x
		)
		await vi.waitFor(() =>
			expect(editor.getAsset(image.props.assetId!)!.props.src).toBe(
				'https://tldrawusercontent.com/uploaded-ada-png'
			)
		)
		expect(editor.getSelectedShapeIds()).toEqual([group.id])

		await placeLibraryItem(editor, source, item.id)
		expect(editor.getSortedChildIdsForParent(editor.getCurrentPageId())).toHaveLength(2)
		expect(upload).toHaveBeenCalledTimes(1)
	})

	it("copies a workspace's members to a workspace library, with their content and thumbnails", async () => {
		const { backend, source } = setUp({ withMembers: true })
		vi.spyOn(MediaHelpers, 'getImageSize').mockResolvedValue({ w: 64, h: 64, pixelRatio: 1 })
		const members = source.getLibraries().find((library) => library.id === 'library:members-acme')!

		const copy = await copyLibrary(source, members.id, 'home')
		await whenItemsStored(source.getItems(copy.id).map((item) => item.id))

		expect(copy).toMatchObject({ name: 'Members', ownerId: 'home' })
		const [item] = source.getItems(copy.id)
		expect(item).toMatchObject({ name: 'Ada', thumbnail: expect.any(String) })
		const { content } = JSON.parse(backend.contents.get(item.id.slice('library-item:'.length))!)
		expect(content.shapes.map((shape: TLRecord & { type: string }) => shape.type)).toEqual([
			'group',
			'image',
			'text',
		])
		expect(source.getItems(members.id)).toHaveLength(1)
	})
})

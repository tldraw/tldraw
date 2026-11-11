import 'fake-indexeddb/auto'
import type { LibrarySource } from '@tldraw/libraries'
import {
	AssetRecordType,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	type TLRecord,
} from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import type { TldrawApp } from '../../app/TldrawApp'
import { getEditorLibraries } from './editorLibraries'
import { TldrawAppLibrariesSource } from './librariesSource'

let lastUserId = 0
const cleanups: (() => void)[] = []

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup()
})

function createEditor() {
	const editor = new Editor({
		store: createTLStore({
			records: fileSchemaRecords,
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
		}),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		getContainer: () => document.body,
	})
	cleanups.push(() => editor.dispose())
	return editor
}

// The home workspace's id is the user's id, as on tldraw.com.
function createApp(userId: string) {
	const names: Record<string, string> = { [userId]: 'Home', acme: 'Acme' }
	return {
		userId,
		getHomeWorkspaceId: () => userId,
		getWorkspaceMemberships: () =>
			[userId, 'acme'].map((groupId) => ({ groupId, group: { name: names[groupId] } })),
		msg: (message: { defaultMessage: string }) => message.defaultMessage,
	} as unknown as TldrawApp
}

function createUserLibraries(app: TldrawApp) {
	const userLibraries = new TldrawAppLibrariesSource(app)
	cleanups.push(() => userLibraries.dispose())
	return userLibraries
}

function setUp() {
	const userId = `editor-libraries-user-${++lastUserId}`
	const app = createApp(userId)
	const userLibraries = createUserLibraries(app)
	const editor = createEditor()
	const source = getEditorLibraries(app, userLibraries, editor, 'file-a')
	return { app, userId, userLibraries, editor, source }
}

const ofType = (editor: Editor, typeName: string) =>
	editor.store.allRecords().filter((r) => r.typeName === (typeName as TLRecord['typeName']))

const namesOf = (source: LibrarySource, ownerId: string) =>
	source
		.getLibraries()
		.filter((c) => c.ownerId === ownerId)
		.map((c) => c.name)

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
	it("lists the board first, then the user's workspaces", () => {
		const { userId, source } = setUp()
		expect(source.getLibraryOwners?.()).toEqual([
			{ id: 'file-a', name: 'This board' },
			{ id: userId, name: 'Private to you' },
			{ id: 'acme', name: 'Acme' },
		])
		expect(namesOf(source, userId)).toEqual(['Wireframes', 'Icons'])
	})

	it('is made once per editor and file', () => {
		const { app, userLibraries, editor, source } = setUp()
		expect(getEditorLibraries(app, userLibraries, editor, 'file-a')).toBe(source)
		expect(getEditorLibraries(app, userLibraries, editor, 'file-b')).not.toBe(source)
	})

	it("creates new libraries in the user's home workspace", async () => {
		const { userId, editor, source } = setUp()
		expect(source.getDefaultOwnerId?.()).toBe(userId)
		const library = await source.createLibrary('Team kit')
		expect(library.ownerId).toBe(userId)
		expect(ofType(editor, 'library')).toEqual([])
	})

	it("creates a library in another of the user's workspaces when asked", async () => {
		const { editor, source } = setUp()
		const library = await source.createLibrary('Acme kit', { ownerId: 'acme' })
		expect(library.ownerId).toBe('acme')
		expect(ofType(editor, 'library')).toEqual([])
	})

	it("keeps a library created for the board in the file's document", async () => {
		const { editor, source } = setUp()
		const library = await source.createLibrary('Board kit', { ownerId: 'file-a' })
		expect(library.ownerId).toBe('file-a')
		expect(ofType(editor, 'library')).toMatchObject([{ id: library.id, name: 'Board kit' }])
	})

	it("moves a board library to the user's own and back, with its image", async () => {
		const { userId, editor, source } = setUp()
		const { id, assetId } = addImage(editor)
		const library = await source.createLibrary('Photos', { ownerId: 'file-a' })
		await source.addItem(library.id, {
			content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! },
		})

		await source.moveLibrary!(library.id, userId)
		expect(ofType(editor, 'library')).toEqual([])
		const moved = source.getLibraries().find((c) => c.name === 'Photos')!
		expect(moved.ownerId).toBe(userId)
		const [userItem] = source.getItems(moved.id)
		const userContent = await source.getItemContent(userItem.id)
		expect(userContent.content.assets.map((a) => a.id)).toEqual([assetId])

		editor.store.remove([assetId])
		await source.moveLibrary!(moved.id, 'file-a')
		expect(namesOf(source, 'file-a')).toEqual(['Photos'])
		expect(ofType(editor, 'asset').map((a) => a.id)).toEqual([assetId])
	})

	it("keeps a board library out of the user's own libraries across a reload", async () => {
		const { app, source } = setUp()
		await source.createLibrary('Board kit', { ownerId: 'file-a' })
		await source.createLibrary('Team kit')

		const reloaded = createUserLibraries(app)
		await vi.waitFor(() =>
			expect(reloaded.getLibraries().map((c) => c.name)).toEqual([
				'Wireframes',
				'Icons',
				'Team kit',
			])
		)
	})
})

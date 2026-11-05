import 'fake-indexeddb/auto'
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
import { afterEach, describe, expect, it } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import type { TldrawApp } from '../../app/TldrawApp'
import { TldrawAppCollectionsSource } from './collectionsSource'
import { TldrawAppCollectionsWithPacks } from './collectionsWithPacks'
import { getEditorCollections } from './editorCollections'

let lastUserId = 0
let editors: Editor[] = []

afterEach(() => {
	for (const editor of editors) editor.dispose()
	editors = []
})

function setUp() {
	const userId = `editor-collections-user-${++lastUserId}`
	const app = {
		userId,
		getHomeWorkspaceId: () => 'home',
		getWorkspaceMemberships: () => [{ groupId: 'home', group: { name: 'Home' } }],
		msg: (message: { defaultMessage: string }) => message.defaultMessage,
	} as unknown as TldrawApp
	const collections = new TldrawAppCollectionsWithPacks(new TldrawAppCollectionsSource(app), userId)
	const editor = new Editor({
		store: createTLStore({ schema: createTLSchema({ records: fileSchemaRecords }) }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		getContainer: () => document.body,
	})
	editors.push(editor)
	return { editor, source: getEditorCollections(app, collections, editor, 'file-a') }
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

describe('getEditorCollections', () => {
	it("lists the board first and keeps collections made there in the file's document", async () => {
		const { editor, source } = setUp()
		expect(source.getCollectionOwners?.()).toEqual([
			{ id: 'file-a', name: 'This board' },
			{ id: 'home', name: 'Home' },
			{ id: 'tldraw', name: 'tldraw', readOnly: true },
		])
		const collection = await source.createCollection('Board kit', { ownerId: 'file-a' })
		expect(collection.ownerId).toBe('file-a')
		expect(ofType(editor, 'collection')).toMatchObject([{ id: collection.id, name: 'Board kit' }])
	})

	it('creates new collections in the home workspace by default', async () => {
		const { editor, source } = setUp()
		expect(source.getDefaultOwnerId?.()).toBe('home')
		const collection = await source.createCollection('Team kit')
		expect(collection.ownerId).toBe('home')
		expect(ofType(editor, 'collection')).toEqual([])
	})

	it('creates new collections in the home workspace while the board is read-only', async () => {
		const { editor, source } = setUp()
		editor.updateInstanceState({ isReadonly: true })
		const collection = await source.createCollection('Team kit')
		expect(collection.ownerId).toBe('home')
		expect(ofType(editor, 'collection')).toEqual([])
	})

	it('moves a board collection to a workspace and back, with its image', async () => {
		const { editor, source } = setUp()
		const { id, assetId } = addImage(editor)
		const collection = await source.createCollection('Photos', { ownerId: 'file-a' })
		await source.addItem(collection.id, {
			content: { formatVersion: 1, content: editor.getContentFromCurrentPage([id])! },
		})

		await source.moveCollection!(collection.id, 'home')
		expect(ofType(editor, 'collection')).toEqual([])
		const [inHome] = source.getCollections()
		expect(inHome.ownerId).toBe('home')
		const [homeItem] = source.getItems(inHome.id)
		expect((await source.getItemContent(homeItem.id)).content.assets.map((a) => a.id)).toEqual([
			assetId,
		])

		editor.store.remove([assetId])
		await source.moveCollection!(inHome.id, 'file-a')
		const [onBoard] = source.getCollections()
		expect(onBoard.ownerId).toBe('file-a')
		expect(ofType(editor, 'asset').map((a) => a.id)).toEqual([assetId])
	})
})

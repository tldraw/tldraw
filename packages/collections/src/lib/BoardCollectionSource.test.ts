import {
	AssetRecordType,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	type TLImageAsset,
	type TLRecord,
} from 'tldraw'
import { afterEach, describe, expect, it } from 'vitest'
import { BoardCollectionSource } from './BoardCollectionSource'
import { CollectionNotFoundError, CollectionPermissionError } from './CollectionSource'
import { CompositeCollectionSource } from './CompositeCollectionSource'
import { InMemoryCollectionSource } from './InMemoryCollectionSource'
import {
	collectionSchemaRecords,
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	getCollectionItemContentId,
	type TLCollectionItemContent,
	type TLCollectionItemContentRecord,
} from './schema'

let editors: Editor[] = []

afterEach(() => {
	for (const editor of editors) editor.dispose()
	editors = []
})

function makeEditor(records: typeof collectionSchemaRecords | undefined = collectionSchemaRecords) {
	const editor = new Editor({
		store: createTLStore({ schema: createTLSchema({ records }) }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		getContainer: () => document.body,
	})
	editors.push(editor)
	return editor
}

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
			thumbnail: new Blob(['png'], { type: 'image/png' }),
		})

		expect(source.getItems(collection.id)).toEqual([item])
		expect(item.thumbnailUrl).toMatch(/^data:image\/png;base64,/)
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

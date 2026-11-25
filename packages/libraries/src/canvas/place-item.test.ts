import {
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	LibraryRecordType,
	type TLLibraryItemId,
	type TLShapeId,
} from 'tldraw'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { LibraryNotFoundError } from '../lib/LibrarySource'
import { defaultPlaceLibraryItem, placeLibraryItem } from './place-item'

const library = LibraryRecordType.create({ name: 'Shapes' })
let editor: Editor
let source: InMemoryLibrarySource
let itemId: TLLibraryItemId

beforeEach(async () => {
	editor = new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		getContainer: () => document.body,
	})
	// A frame holding a box, saved from the canvas and then cleared away.
	const frameId = createShapeId()
	editor.createShapes([
		{ id: frameId, type: 'frame', x: 0, y: 0, props: { w: 200, h: 100 } },
		{ type: 'geo', parentId: frameId, x: 20, y: 20, props: { w: 50, h: 50 } },
	])
	const content = editor.getContentFromCurrentPage([frameId])!
	editor.deleteShapes([...editor.getCurrentPageShapeIds()])
	source = new InMemoryLibrarySource({
		initial: { libraries: [library], items: [], contents: {} },
	})
	const item = await source.addItem(library.id, {
		name: 'Card',
		content: { formatVersion: 1, content },
	})
	itemId = item.id
})

afterEach(() => editor.dispose())

const rootShapes = () =>
	editor.getCurrentPageShapes().filter((s) => s.parentId === editor.getCurrentPageId())

describe('placeLibraryItem', () => {
	it('resolves with the root shapes it placed, selected, in the middle of the viewport', async () => {
		const ids = await placeLibraryItem(editor, source, itemId)
		expect(editor.getCurrentPageShapes()).toHaveLength(2)
		expect(ids).toEqual(rootShapes().map((s) => s.id))
		expect(editor.getSelectedShapeIds()).toEqual(ids)
		const center = editor.getViewportPageBounds().center
		expect(editor.getShapePageBounds(ids[0])!.center).toMatchObject({ x: center.x, y: center.y })
	})

	it('centres on a point and leaves the selection alone when asked', async () => {
		const ids = await placeLibraryItem(editor, source, itemId, {
			point: { x: 1000, y: 500 },
			select: false,
		})
		expect(editor.getShapePageBounds(ids[0])!.center).toMatchObject({ x: 1000, y: 500 })
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('returns a shape placed inside an existing frame as a root', async () => {
		const frameId = createShapeId('target')
		editor.createShapes([{ id: frameId, type: 'frame', x: 0, y: 0, props: { w: 2000, h: 2000 } }])
		const ids = await placeLibraryItem(editor, source, itemId, { point: { x: 1000, y: 1000 } })
		expect(ids).toHaveLength(1)
		expect(editor.getShape(ids[0])!.parentId).toBe(frameId)
	})

	it('rejects for an item the source does not list', async () => {
		await expect(
			placeLibraryItem(editor, source, 'library-item:missing' as TLLibraryItemId)
		).rejects.toBeInstanceOf(LibraryNotFoundError)
	})

	it('can be undone in one step', async () => {
		await placeLibraryItem(editor, source, itemId)
		editor.undo()
		expect(editor.getCurrentPageShapes()).toEqual([])
	})
})

describe('defaultPlaceLibraryItem', () => {
	it('places the content it is given', async () => {
		const { content } = await source.getItemContent(itemId)
		const item = source.getItems(library.id)[0]
		const ids: TLShapeId[] = defaultPlaceLibraryItem(editor, {
			item,
			content,
			point: { x: 0, y: 0 },
			select: false,
			via: 'click',
		})
		expect(ids).toEqual(rootShapes().map((s) => s.id))
	})
})

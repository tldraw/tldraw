import { Driver } from '@tldraw/driver'
import {
	Box,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	Editor,
	GeoShapeGeoStyle,
	LibraryRecordType,
	type TLContent,
	type TLGeoShape,
	type TLLibraryItemId,
	type TLShape,
} from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { LibraryItemRecordType } from '../lib/schema'
import { armLibraryItem, isLibraryItemArmed, LIBRARY_STAMP_TOOL_ID } from './arm-item'
import { getContentBounds } from './stamp-item'
import { LibraryStampTool } from './stamp-tool'

let editor: Editor
let driver: Driver

beforeEach(() => {
	editor = new Editor({
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [...defaultTools, ...defaultShapeTools, LibraryStampTool],
		getContainer: () => document.body,
	})
	editor.updateViewportScreenBounds(new Box(0, 0, 2000, 2000))
	driver = new Driver(editor)
})

afterEach(() => editor.dispose())

function geo(x: number, y: number, w: number, h: number, parentId: string): TLGeoShape {
	return editor.store.schema.types.shape.create({
		id: createShapeId(),
		type: 'geo',
		x,
		y,
		parentId,
		props: { ...editor.getShapeUtil('geo').getDefaultProps(), w, h },
	} as TLGeoShape) as TLGeoShape
}

function contentOf(shapes: TLShape[]): TLContent {
	const ids = new Set(shapes.map((shape) => shape.id))
	return {
		shapes,
		bindings: [],
		rootShapeIds: shapes.filter((shape) => !ids.has(shape.parentId as any)).map((s) => s.id),
		assets: [],
		schema: editor.store.schema.serialize(),
	}
}

// A 200 × 100 box, saved somewhere off the origin.
const box = () => contentOf([geo(500, 300, 200, 100, editor.getCurrentPageId())])

// A group of two 100 × 100 boxes side by side, 200 × 100 in all.
function pair() {
	const groupId = createShapeId('group')
	const group = editor.store.schema.types.shape.create({
		id: groupId,
		type: 'group',
		x: 500,
		y: 300,
		parentId: editor.getCurrentPageId(),
		props: {},
	} as any) as TLShape
	return contentOf([group, geo(0, 0, 100, 100, groupId), geo(100, 0, 100, 100, groupId)])
}

const BOX_ID = LibraryItemRecordType.createId('box')
const PAIR_ID = LibraryItemRecordType.createId('pair')
const RECTANGLE_ID = LibraryItemRecordType.createId('rectangle')

function makeSource() {
	const library = LibraryRecordType.create({ name: 'Kit' })
	const item = (id: TLLibraryItemId, name: string) =>
		LibraryItemRecordType.create({ id, libraryId: library.id, name })
	const source = new InMemoryLibrarySource({
		initial: {
			libraries: [library],
			items: [item(BOX_ID, 'Box'), item(PAIR_ID, 'Pair'), item(RECTANGLE_ID, 'Rectangle')],
			contents: {
				[BOX_ID]: { formatVersion: 1, content: box() },
				[PAIR_ID]: { formatVersion: 1, content: pair() },
				[RECTANGLE_ID]: { formatVersion: 1, content: box() },
			},
		},
	})
	return Object.assign(source, {
		getItemTool: (itemId: TLLibraryItemId) =>
			itemId === RECTANGLE_ID
				? { toolId: 'geo', styles: { [GeoShapeGeoStyle.id]: 'rectangle' } }
				: undefined,
	})
}

const pageBounds = (shape: TLShape) => {
	const { x, y, w, h } = editor.getShapePageBounds(shape)!
	return { x, y, w, h }
}
const roots = () =>
	editor.getCurrentPageShapes().filter((s) => s.parentId === editor.getCurrentPageId())

describe('getContentBounds', () => {
	it('measures content before it is on the page, groups by their children', () => {
		const { x, y, w, h } = getContentBounds(editor, pair())!
		expect({ x, y, w, h }).toEqual({ x: 500, y: 300, w: 200, h: 100 })
	})
})

describe('armLibraryItem', () => {
	it('arms the tool an item stands for, with its styles', async () => {
		const source = makeSource()
		await armLibraryItem(editor, source, RECTANGLE_ID)
		expect(editor.getCurrentToolId()).toBe('geo')
		expect(editor.getStyleForNextShape(GeoShapeGeoStyle)).toBe('rectangle')
		expect(isLibraryItemArmed(editor, source, RECTANGLE_ID)).toBe(true)
		expect(isLibraryItemArmed(editor, source, BOX_ID)).toBe(false)
		editor.setStyleForNextShapes(GeoShapeGeoStyle, 'ellipse')
		expect(isLibraryItemArmed(editor, source, RECTANGLE_ID)).toBe(false)
	})

	it('arms the stamp tool with any other item', async () => {
		const source = makeSource()
		await armLibraryItem(editor, source, BOX_ID)
		expect(editor.getCurrentToolId()).toBe(LIBRARY_STAMP_TOOL_ID)
		expect(isLibraryItemArmed(editor, source, BOX_ID)).toBe(true)
		expect(isLibraryItemArmed(editor, source, PAIR_ID)).toBe(false)
	})

	it('arms the item picked last, even when an earlier one loads after it', async () => {
		const source = makeSource()
		const first = armLibraryItem(editor, source, BOX_ID)
		await armLibraryItem(editor, source, RECTANGLE_ID)
		await first
		expect(editor.getCurrentToolId()).toBe('geo')
	})
})

describe('LibraryStampTool', () => {
	it('places a copy at its own size, centred on a click, and hands back to select', async () => {
		await armLibraryItem(editor, makeSource(), BOX_ID)
		driver.click(1000, 1000)
		const [copy] = roots()
		expect(pageBounds(copy)).toEqual({ x: 900, y: 950, w: 200, h: 100 })
		expect(editor.getSelectedShapeIds()).toEqual([copy.id])
		expect(editor.getCurrentToolId()).toBe('select')
	})

	it('scales a dragged copy to fit the box, keeping its proportions and scaling its strokes', async () => {
		await armLibraryItem(editor, makeSource(), BOX_ID)
		driver.pointerDown(100, 100).pointerMove(300, 300).pointerMove(500, 500).pointerUp(500, 500)
		const [copy] = roots() as TLGeoShape[]
		expect(pageBounds(copy)).toEqual({ x: 100, y: 200, w: 400, h: 200 })
		expect(copy.props.scale).toBeCloseTo(2)
	})

	it('scales a group and its children together', async () => {
		await armLibraryItem(editor, makeSource(), PAIR_ID)
		driver.pointerDown(0, 0).pointerMove(200, 100).pointerMove(100, 50).pointerUp(100, 50)
		const [group] = roots()
		expect(pageBounds(group)).toEqual({ x: 0, y: 0, w: 100, h: 50 })
		const children = editor.getSortedChildIdsForParent(group.id).map((id) => editor.getShape(id)!)
		expect(children.map(pageBounds)).toEqual([
			{ x: 0, y: 0, w: 50, h: 50 },
			{ x: 50, y: 0, w: 50, h: 50 },
		])
		expect(children.map((child) => (child as TLGeoShape).props.scale)).toEqual([0.5, 0.5])
	})

	it('counts a tiny drag as a click', async () => {
		await armLibraryItem(editor, makeSource(), BOX_ID)
		driver.pointerDown(1000, 1000).pointerMove(1004, 1004).pointerUp(1004, 1004)
		const [copy] = roots()
		expect(pageBounds(copy)).toEqual({ x: 900, y: 950, w: 200, h: 100 })
	})

	it('makes each copy one undo step', async () => {
		await armLibraryItem(editor, makeSource(), BOX_ID)
		editor.updateInstanceState({ isToolLocked: true })
		driver.click(1000, 1000)
		driver.pointerDown(100, 100).pointerMove(300, 300).pointerMove(500, 500).pointerUp(500, 500)
		expect(roots()).toHaveLength(2)
		editor.undo()
		expect(roots()).toHaveLength(1)
		editor.undo()
		expect(roots()).toHaveLength(0)
	})

	it('stays armed while the tool is locked', async () => {
		const source = makeSource()
		await armLibraryItem(editor, source, BOX_ID)
		editor.updateInstanceState({ isToolLocked: true })
		driver.click(1000, 1000)
		expect(isLibraryItemArmed(editor, source, BOX_ID)).toBe(true)
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('returns to the select tool on escape', async () => {
		await armLibraryItem(editor, makeSource(), BOX_ID)
		editor.cancel()
		expect(editor.getCurrentToolId()).toBe('select')
	})
})

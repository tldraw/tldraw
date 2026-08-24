import {
	Geometry2d,
	PageRecordType,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLShape,
	TLShapeId,
	TLUserPreferences,
	atom,
	createShapeId,
	createTLCurrentUser,
	createTLStore,
} from '../..'
import { Editor } from './Editor'

const MY_CUSTOM_SHAPE_TYPE = 'my-custom-shape'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[MY_CUSTOM_SHAPE_TYPE]: { w: number; h: number; text: string | undefined; isFilled: boolean }
	}
}

type TestBox = TLShape<typeof MY_CUSTOM_SHAPE_TYPE>

class TestBoxUtil extends ShapeUtil<TestBox> {
	static override type = MY_CUSTOM_SHAPE_TYPE
	static override props: RecordProps<TestBox> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
		isFilled: T.boolean,
	}
	getDefaultProps(): TestBox['props'] {
		return { w: 100, h: 100, text: '', isFilled: false }
	}
	getGeometry(shape: TestBox): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

function createIsolatedUser() {
	const userPreferences = atom<TLUserPreferences>('prefs', { id: 'me', animationSpeed: 0 })
	return createTLCurrentUser({
		userPreferences,
		setUserPreferences: (prefs) => userPreferences.set(prefs),
	})
}

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	c: createShapeId('c'),
	group: createShapeId('group'),
	page2: PageRecordType.createId('page2'),
	page3: PageRecordType.createId('page3'),
}

let editor: Editor
let page1Id: ReturnType<Editor['getCurrentPageId']>

beforeEach(() => {
	editor = new Editor({
		shapeUtils: [TestBoxUtil],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [TestBoxUtil], bindingUtils: [] }),
		getContainer: () => document.body,
		user: createIsolatedUser(),
	})
	page1Id = editor.getCurrentPageId()
	editor.createShapes([
		{ id: ids.group, type: 'group', x: 0, y: 0 },
		{ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 0, y: 0, parentId: ids.group },
		{ id: ids.b, type: MY_CUSTOM_SHAPE_TYPE, x: 200, y: 0, parentId: ids.group },
		{ id: ids.c, type: MY_CUSTOM_SHAPE_TYPE, x: 400, y: 0 },
	])
	editor.createPage({ id: ids.page2, name: 'Page 2' })
	editor.clearHistory()
})

afterEach(() => {
	editor.dispose()
})

function pageNames() {
	return editor.getPages().map((p) => p.name)
}

describe('page shape ids', () => {
	it('getPageShapeIds includes descendants of top-level shapes', () => {
		expect(editor.getPageShapeIds(page1Id)).toEqual(
			new Set<TLShapeId>([ids.group, ids.a, ids.b, ids.c])
		)
		expect(editor.getPageShapeIds(editor.getPage(ids.page2)!)).toEqual(new Set())
	})

	it('getCurrentPageShapeIdsSorted returns a sorted array', () => {
		expect(editor.getCurrentPageShapeIdsSorted()).toEqual([ids.a, ids.b, ids.c, ids.group])
		editor.setCurrentPage(ids.page2)
		expect(editor.getCurrentPageShapeIdsSorted()).toEqual([])
	})
})

describe('updatePage and renamePage', () => {
	it('updatePage merges the partial into the page', () => {
		expect(editor.updatePage({ id: ids.page2, name: 'Renamed', meta: { k: 1 } })).toBe(editor)
		expect(editor.getPage(ids.page2)).toMatchObject({ name: 'Renamed', meta: { k: 1 } })
	})

	it('updatePage is undoable', () => {
		editor.markHistoryStoppingPoint()
		editor.updatePage({ id: ids.page2, name: 'Renamed' })
		editor.undo()
		expect(editor.getPage(ids.page2)?.name).toBe('Page 2')
		editor.redo()
		expect(editor.getPage(ids.page2)?.name).toBe('Renamed')
	})

	it('updatePage ignores missing pages and readonly mode', () => {
		editor.updatePage({ id: ids.page3, name: 'Ghost' })
		expect(editor.getPage(ids.page3)).toBeUndefined()

		editor.updateInstanceState({ isReadonly: true })
		editor.updatePage({ id: ids.page2, name: 'Renamed' })
		expect(editor.getPage(ids.page2)?.name).toBe('Page 2')
	})

	it('renamePage accepts an id or a page and respects readonly', () => {
		expect(editor.renamePage(ids.page2, 'Two')).toBe(editor)
		expect(editor.getPage(ids.page2)?.name).toBe('Two')

		editor.renamePage(editor.getPage(ids.page2)!, 'Deux')
		expect(editor.getPage(ids.page2)?.name).toBe('Deux')

		editor.updateInstanceState({ isReadonly: true })
		editor.renamePage(ids.page2, 'Nope')
		expect(editor.getPage(ids.page2)?.name).toBe('Deux')
	})
})

describe('deletePage', () => {
	it('deletes the page and all of its shapes, including locked ones', () => {
		editor.updateShape({ id: ids.c, type: MY_CUSTOM_SHAPE_TYPE, isLocked: true })
		expect(editor.deletePage(page1Id)).toBe(editor)
		expect(editor.getPage(page1Id)).toBeUndefined()
		expect(pageNames()).toEqual(['Page 2'])
		for (const id of [ids.group, ids.a, ids.b, ids.c]) {
			expect(editor.getShape(id)).toBeUndefined()
		}
	})

	it('moves to the previous page when deleting the current page', () => {
		editor.createPage({ id: ids.page3, name: 'Page 3' })
		editor.setCurrentPage(ids.page2)
		editor.deletePage(editor.getPage(ids.page2)!)
		expect(editor.getCurrentPageId()).toBe(page1Id)
		expect(pageNames()).toEqual(['Page 1', 'Page 3'])
	})

	it('moves to the next page when deleting the first page', () => {
		editor.deletePage(page1Id)
		expect(editor.getCurrentPageId()).toBe(ids.page2)
	})

	it('keeps the current page when deleting another page', () => {
		editor.deletePage(ids.page2)
		expect(editor.getCurrentPageId()).toBe(page1Id)
		expect(pageNames()).toEqual(['Page 1'])
	})

	it('refuses to delete the last page', () => {
		editor.deletePage(ids.page2)
		editor.deletePage(page1Id)
		expect(pageNames()).toEqual(['Page 1'])
		expect(editor.getShape(ids.c)).toBeDefined()
	})

	it('ignores missing pages and readonly mode', () => {
		editor.deletePage(ids.page3)
		expect(pageNames()).toEqual(['Page 1', 'Page 2'])

		editor.updateInstanceState({ isReadonly: true })
		editor.deletePage(ids.page2)
		expect(pageNames()).toEqual(['Page 1', 'Page 2'])
	})

	it('is undoable', () => {
		editor.markHistoryStoppingPoint()
		editor.deletePage(page1Id)
		editor.undo()
		expect(editor.getPage(page1Id)).toBeDefined()
		expect(editor.getShape(ids.a)).toBeDefined()
		expect(editor.getCurrentPageId()).toBe(page1Id)
	})
})

describe('duplicatePage', () => {
	it('creates a copy right after the original and switches to it', () => {
		expect(editor.duplicatePage(page1Id, ids.page3)).toBe(editor)
		expect(pageNames()).toEqual(['Page 1', 'Page 1 Copy', 'Page 2'])
		expect(editor.getCurrentPageId()).toBe(ids.page3)
	})

	it('copies the shapes with new ids and preserves structure', () => {
		editor.duplicatePage(page1Id, ids.page3)
		const copied = editor.getCurrentPageShapes()
		expect(copied).toHaveLength(4)
		expect(copied.every((s) => !Object.values(ids).includes(s.id))).toBe(true)

		const copiedGroup = copied.find((s) => s.type === 'group')!
		const children = editor.getSortedChildIdsForParent(copiedGroup.id)
		expect(children).toHaveLength(2)
		expect(editor.getShapePageBounds(children[1])).toMatchObject({ x: 200, y: 0, w: 100, h: 100 })

		// the originals are untouched
		expect(editor.getPageShapeIds(page1Id)).toEqual(
			new Set<TLShapeId>([ids.group, ids.a, ids.b, ids.c])
		)
	})

	it('copies an empty page', () => {
		editor.duplicatePage(editor.getPage(ids.page2)!, ids.page3)
		expect(pageNames()).toEqual(['Page 1', 'Page 2', 'Page 2 Copy'])
		expect(editor.getCurrentPageShapes()).toEqual([])
	})

	it('keeps the camera of the duplicated page', () => {
		editor.setCamera({ x: 123, y: 456, z: 2 })
		editor.duplicatePage(page1Id, ids.page3)
		expect(editor.getCamera()).toMatchObject({ x: 123, y: 456, z: 2 })
	})

	it('ignores missing pages and the page limit', () => {
		editor.duplicatePage(ids.page3)
		expect(pageNames()).toEqual(['Page 1', 'Page 2'])

		editor.dispose()
		editor = new Editor({
			shapeUtils: [TestBoxUtil],
			bindingUtils: [],
			tools: [],
			store: createTLStore({ shapeUtils: [TestBoxUtil], bindingUtils: [] }),
			getContainer: () => document.body,
			user: createIsolatedUser(),
			options: { maxPages: 1 },
		})
		editor.duplicatePage(editor.getCurrentPageId())
		expect(pageNames()).toEqual(['Page 1'])
	})

	it('is undoable as a single step', () => {
		editor.markHistoryStoppingPoint()
		editor.duplicatePage(page1Id, ids.page3)
		editor.undo()
		expect(pageNames()).toEqual(['Page 1', 'Page 2'])
		expect(editor.getCurrentPageId()).toBe(page1Id)
	})
})

import {
	Box,
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLGroupShape,
	TLShape,
	TLShapeId,
	TLUserPreferences,
	atom,
	createShapeId,
	createTLCurrentUser,
	createTLStore,
} from '../../..'
import { Editor } from '../Editor'

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
	override canTabTo(shape: TestBox) {
		return shape.meta.tabbable !== false
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

// Two rows of boxes:  a b c  /  d e
const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	c: createShapeId('c'),
	d: createShapeId('d'),
	e: createShapeId('e'),
	g1: createShapeId('g1'),
	g2: createShapeId('g2'),
}

let editor: Editor

beforeEach(() => {
	editor = new Editor({
		shapeUtils: [TestBoxUtil],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [TestBoxUtil], bindingUtils: [] }),
		getContainer: () => document.body,
		user: createIsolatedUser(),
	})
	editor.createShapes([
		{ id: ids.a, type: MY_CUSTOM_SHAPE_TYPE, x: 0, y: 0 },
		{ id: ids.b, type: MY_CUSTOM_SHAPE_TYPE, x: 200, y: 0 },
		{ id: ids.c, type: MY_CUSTOM_SHAPE_TYPE, x: 400, y: 0 },
		{ id: ids.d, type: MY_CUSTOM_SHAPE_TYPE, x: 0, y: 300 },
		{ id: ids.e, type: MY_CUSTOM_SHAPE_TYPE, x: 200, y: 300 },
	])
})

afterEach(() => {
	editor.dispose()
})

function selected() {
	return editor.getSelectedShapeIds()
}

// groupShapes() needs the select tool, so build groups by hand
function group(groupId: TLShapeId, childIds: TLShapeId[]) {
	const bounds = editor.getShapesPageBounds(childIds)!
	editor.createShape({ id: groupId, type: 'group', x: bounds.x, y: bounds.y })
	editor.reparentShapes(childIds, groupId)
}

describe('isAncestorSelected', () => {
	it('is true only when an ancestor (not the shape itself) is selected', () => {
		group(ids.g1, [ids.a, ids.b])
		editor.select(ids.g1)
		expect(editor.isAncestorSelected(ids.a)).toBe(true)
		expect(editor.isAncestorSelected(editor.getShape(ids.b)!)).toBe(true)
		expect(editor.isAncestorSelected(ids.g1)).toBe(false)
		expect(editor.isAncestorSelected(ids.c)).toBe(false)
	})

	it('walks up through nested groups', () => {
		group(ids.g1, [ids.a, ids.b])
		group(ids.g2, [ids.g1, ids.c])
		editor.select(ids.g2)
		expect(editor.isAncestorSelected(ids.a)).toBe(true)
		expect(editor.isAncestorSelected(ids.g1)).toBe(true)
	})

	it('is false for missing shapes', () => {
		editor.selectAll()
		expect(editor.isAncestorSelected(createShapeId('missing'))).toBe(false)
	})
})

describe('deselect', () => {
	it('removes ids from the selection', () => {
		editor.select(ids.a, ids.b, ids.c)
		expect(editor.deselect(ids.b)).toBe(editor)
		expect(selected()).toEqual([ids.a, ids.c])
	})

	it('accepts shapes', () => {
		editor.select(ids.a, ids.b)
		editor.deselect(editor.getShape(ids.a)!, editor.getShape(ids.b)!)
		expect(selected()).toEqual([])
	})

	it('leaves the selection alone when the ids are not selected', () => {
		editor.select(ids.a)
		const before = editor.getCurrentPageState()
		editor.deselect(ids.b)
		expect(editor.getCurrentPageState()).toBe(before)
	})

	it('is a no-op when nothing is selected', () => {
		const before = editor.getCurrentPageState()
		editor.deselect(ids.a)
		expect(editor.getCurrentPageState()).toBe(before)
	})
})

describe('getCurrentPageShapesInReadingOrder', () => {
	it('orders rows top to bottom and shapes left to right', () => {
		expect(editor.getCurrentPageShapesInReadingOrder().map((s) => s.id)).toEqual([
			ids.a,
			ids.b,
			ids.c,
			ids.d,
			ids.e,
		])
	})

	it('keeps shapes in the same row when their centers are within the row threshold', () => {
		// d sits a little lower than e but still in the same row, so x order wins
		editor.updateShape({ id: ids.d, type: MY_CUSTOM_SHAPE_TYPE, y: 380 })
		expect(editor.getCurrentPageShapesInReadingOrder().map((s) => s.id)).toEqual([
			ids.a,
			ids.b,
			ids.c,
			ids.d,
			ids.e,
		])

		// far enough down and d becomes its own row after e
		editor.updateShape({ id: ids.d, type: MY_CUSTOM_SHAPE_TYPE, y: 500 })
		expect(editor.getCurrentPageShapesInReadingOrder().map((s) => s.id)).toEqual([
			ids.a,
			ids.b,
			ids.c,
			ids.e,
			ids.d,
		])
	})

	it('skips shapes that cannot be tabbed to', () => {
		editor.updateShape({ id: ids.b, type: MY_CUSTOM_SHAPE_TYPE, meta: { tabbable: false } })
		expect(editor.getCurrentPageShapesInReadingOrder().map((s) => s.id)).toEqual([
			ids.a,
			ids.c,
			ids.d,
			ids.e,
		])
	})

	it('only includes top-level shapes', () => {
		group(ids.g1, [ids.a, ids.b])
		expect(editor.getCurrentPageShapesInReadingOrder().map((s) => s.id)).toEqual([
			ids.g1,
			ids.c,
			ids.d,
			ids.e,
		])
	})
})

describe('selectAdjacentShape', () => {
	it('selects the next and previous shapes in reading order, wrapping around', () => {
		editor.select(ids.a)
		editor.selectAdjacentShape('next')
		expect(selected()).toEqual([ids.b])
		editor.selectAdjacentShape('prev')
		expect(selected()).toEqual([ids.a])
		editor.selectAdjacentShape('prev')
		expect(selected()).toEqual([ids.e])
		editor.selectAdjacentShape('next')
		expect(selected()).toEqual([ids.a])
	})

	it('selects the first shape for next when nothing is selected', () => {
		editor.selectAdjacentShape('next')
		expect(selected()).toEqual([ids.a])
	})

	it('selects the last shape for prev when nothing is selected', () => {
		editor.selectAdjacentShape('prev')
		expect(selected()).toEqual([ids.e])
	})

	it('uses the first selected shape in reading order when several are selected', () => {
		editor.select(ids.e, ids.c)
		editor.selectAdjacentShape('next')
		expect(selected()).toEqual([ids.d])
	})

	it('moves in cardinal directions', () => {
		editor.select(ids.a)
		editor.selectAdjacentShape('right')
		expect(selected()).toEqual([ids.b])
		editor.selectAdjacentShape('down')
		expect(selected()).toEqual([ids.e])
		editor.selectAdjacentShape('left')
		expect(selected()).toEqual([ids.d])
		editor.selectAdjacentShape('up')
		expect(selected()).toEqual([ids.a])
	})

	it('keeps the selection when there is no shape in that direction', () => {
		editor.select(ids.a)
		editor.selectAdjacentShape('left')
		expect(selected()).toEqual([ids.a])
		editor.selectAdjacentShape('up')
		expect(selected()).toEqual([ids.a])
	})

	it('does nothing for a cardinal direction with no selection', () => {
		editor.selectAdjacentShape('right')
		expect(selected()).toEqual([])
	})

	it('stays within the container when the selection is inside a group', () => {
		group(ids.g1, [ids.a, ids.b])
		editor.select(ids.a)
		editor.selectAdjacentShape('next')
		expect(selected()).toEqual([ids.b])
		editor.selectAdjacentShape('next')
		expect(selected()).toEqual([ids.a])
		editor.selectAdjacentShape('right')
		expect(selected()).toEqual([ids.b])
		editor.selectAdjacentShape('right')
		expect(selected()).toEqual([ids.b])
	})

	it('brings an offscreen shape into view', () => {
		const far = createShapeId('far')
		editor.createShape({ id: far, type: MY_CUSTOM_SHAPE_TYPE, x: 5000, y: 0 })
		editor.select(ids.c)
		expect(editor.getViewportPageBounds().contains(editor.getShapePageBounds(far)!)).toBe(false)

		editor.selectAdjacentShape('next')
		expect(selected()).toEqual([far])
		expect(editor.getViewportPageBounds().contains(editor.getShapePageBounds(far)!)).toBe(true)
	})
})

describe('selectParentShape and selectFirstChildShape', () => {
	beforeEach(() => {
		group(ids.g1, [ids.a, ids.b])
		group(ids.g2, [ids.g1, ids.c])
	})

	it('selectParentShape selects the parent group', () => {
		editor.select(ids.a)
		editor.selectParentShape()
		expect(selected()).toEqual([ids.g1])
		editor.selectParentShape()
		expect(selected()).toEqual([ids.g2])
	})

	it('selectParentShape does nothing for top-level or multiple selections', () => {
		editor.select(ids.g2)
		editor.selectParentShape()
		expect(selected()).toEqual([ids.g2])

		editor.select(ids.a, ids.b)
		editor.selectParentShape()
		expect(selected()).toEqual([ids.a, ids.b])

		editor.selectNone()
		editor.selectParentShape()
		expect(selected()).toEqual([])
	})

	it('selectFirstChildShape selects the first child in reading order', () => {
		editor.select(ids.g2)
		editor.selectFirstChildShape()
		expect(selected()).toEqual([ids.g1])
		editor.selectFirstChildShape()
		expect(selected()).toEqual([ids.a])
	})

	it('selectFirstChildShape does nothing for shapes without children', () => {
		editor.select(ids.a)
		editor.selectFirstChildShape()
		expect(selected()).toEqual([ids.a])

		editor.selectNone()
		editor.selectFirstChildShape()
		expect(selected()).toEqual([])
	})
})

describe('getSelectionScreenBounds', () => {
	it('is undefined with no selection', () => {
		expect(editor.getSelectionScreenBounds()).toBeUndefined()
	})

	it('maps the selection page bounds through the camera and screen offset', () => {
		editor.updateInstanceState({ screenBounds: { x: 10, y: 20, w: 1080, h: 720 } })
		editor.setCamera({ x: 100, y: 50, z: 2 })
		editor.select(ids.a, ids.b)
		expect(editor.getSelectionPageBounds()).toEqual(new Box(0, 0, 300, 100))
		expect(editor.getSelectionScreenBounds()).toEqual(new Box(210, 120, 600, 200))
	})
})

describe('focused group', () => {
	beforeEach(() => {
		group(ids.g1, [ids.a, ids.b])
		group(ids.g2, [ids.g1, ids.c])
	})

	it('defaults to the current page', () => {
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
		expect(editor.getFocusedGroup()).toBeUndefined()
	})

	it('setFocusedGroup accepts an id or a group shape and null to clear', () => {
		expect(editor.setFocusedGroup(ids.g1)).toBe(editor)
		expect(editor.getFocusedGroupId()).toBe(ids.g1)
		expect(editor.getFocusedGroup()?.id).toBe(ids.g1)

		editor.setFocusedGroup(editor.getShape<TLGroupShape>(ids.g2)!)
		expect(editor.getFocusedGroupId()).toBe(ids.g2)

		editor.setFocusedGroup(null)
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
	})

	it('setFocusedGroup throws for missing shapes and non-groups', () => {
		expect(() => editor.setFocusedGroup(createShapeId('missing'))).toThrow(/does not exist/)
		expect(() => editor.setFocusedGroup(ids.a)).toThrow(/Cannot set focused group/)
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
	})

	it('setFocusedGroup does not touch the store when already focused', () => {
		editor.setFocusedGroup(ids.g1)
		const before = editor.getCurrentPageState()
		editor.setFocusedGroup(ids.g1)
		expect(editor.getCurrentPageState()).toBe(before)
	})

	it('popFocusedGroupId moves up to the parent group and selects the group it left', () => {
		editor.setFocusedGroup(ids.g1)
		editor.select(ids.a)

		expect(editor.popFocusedGroupId()).toBe(editor)
		expect(editor.getFocusedGroupId()).toBe(ids.g2)
		expect(selected()).toEqual([ids.g1])

		editor.popFocusedGroupId()
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
		expect(selected()).toEqual([ids.g2])
	})

	it('popFocusedGroupId clears the selection when no group is focused', () => {
		editor.select(ids.d)
		editor.popFocusedGroupId()
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
		expect(selected()).toEqual([])
	})

	it('is ephemeral page state, so undo leaves it alone', () => {
		editor.markHistoryStoppingPoint()
		editor.setFocusedGroup(ids.g1)
		editor.undo()
		expect(editor.getFocusedGroupId()).toBe(ids.g1)
	})
})

describe('selectAll', () => {
	it('selects within the shared parent of the selected shapes', () => {
		group(ids.g1, [ids.a, ids.b])
		editor.select(ids.a)
		editor.selectAll()
		expect(selected()).toEqual([ids.a, ids.b])
	})

	it('selects every unlocked top-level shape when nothing is selected', () => {
		editor.updateShape({ id: ids.c, type: MY_CUSTOM_SHAPE_TYPE, isLocked: true })
		editor.selectAll()
		expect(new Set(selected())).toEqual(new Set<TLShapeId>([ids.a, ids.b, ids.d, ids.e]))
	})
})

import { PageRecordType, TLParentId, TLShapeId } from '@tldraw/tlschema'
import { IndexKey } from '@tldraw/utils'
import { vi } from 'vitest'
import {
	Box,
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLResizeInfo,
	TLShape,
	TLStateNodeConstructor,
	createShapeId,
	resizeBox,
} from '../../..'
import { TestEditor } from '../../test/TestEditor'
import { TEST_BOX_TYPE as BOX_TYPE, TEST_FRAME_TYPE as FIXED_TYPE } from '../../test/testShapeTypes'
import { StateNode } from '../tools/StateNode'

type IBoxShape = TLShape<typeof BOX_TYPE>
type IFixedShape = TLShape<typeof FIXED_TYPE>

const translateEvents: string[] = []

class BoxShapeUtil extends ShapeUtil<IBoxShape> {
	static override type = BOX_TYPE
	static override props: RecordProps<IBoxShape> = {
		w: T.number,
		h: T.number,
	}
	getDefaultProps(): IBoxShape['props'] {
		return { w: 100, h: 100 }
	}
	getGeometry(shape: IBoxShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	override isAspectRatioLocked(shape: IBoxShape) {
		return shape.meta.lockAspect === true
	}
	override onResize(shape: IBoxShape, info: TLResizeInfo<IBoxShape>) {
		return resizeBox(shape, info)
	}
	override onTranslateStart() {
		translateEvents.push('start')
	}
	override onTranslate() {
		translateEvents.push('translate')
	}
	override onTranslateEnd() {
		translateEvents.push('end')
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

// A shape that cannot be resized by its util and refuses to take part in layout operations
class FixedShapeUtil extends ShapeUtil<IFixedShape> {
	static override type = FIXED_TYPE
	static override props: RecordProps<IFixedShape> = { w: T.number, h: T.number }
	getDefaultProps(): IFixedShape['props'] {
		return { w: 100, h: 100 }
	}
	getGeometry(shape: IFixedShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	override canBeLaidOut() {
		return false
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

class SelectIdle extends StateNode {
	static override id = 'idle'
}

class SelectTool extends StateNode {
	static override id = 'select'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [SelectIdle]
	}
}

class OtherTool extends StateNode {
	static override id = 'other'
}

let editor: TestEditor

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	c: createShapeId('c'),
	d: createShapeId('d'),
	box: createShapeId('box'),
	group: createShapeId('group'),
	inner: createShapeId('inner'),
}

function rect(id: TLShapeId) {
	const shape = editor.getShape(id) as IBoxShape
	return { x: shape.x, y: shape.y, w: shape.props.w, h: shape.props.h }
}

function pageRect(id: TLShapeId) {
	const { x, y, w, h } = editor.getShapePageBounds(id)!
	return { x, y, w, h }
}

function order(parentId: TLParentId = editor.getCurrentPageId()) {
	return editor.getSortedChildIdsForParent(parentId)
}

function setReadonly(isReadonly: boolean) {
	editor.updateInstanceState({ isReadonly })
}

beforeEach(() => {
	translateEvents.length = 0
	editor = new TestEditor({
		shapeUtils: [BoxShapeUtil, FixedShapeUtil],
		tools: [SelectTool, OtherTool],
		initialState: 'select',
	})
	editor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
})

afterEach(() => {
	editor.dispose()
})

describe('reparentShapes', () => {
	it('keeps the page position when moving into a translated parent', () => {
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE, x: 100, y: 100, props: { w: 500, h: 500 } },
			{ id: ids.a, type: BOX_TYPE, x: 150, y: 175 },
		])
		editor.reparentShapes([ids.a], ids.box)
		expect(editor.getShape(ids.a)).toMatchObject({ parentId: ids.box, x: 50, y: 75 })
		expect(pageRect(ids.a)).toEqual({ x: 150, y: 175, w: 100, h: 100 })
	})

	it('keeps the page rotation when moving into a rotated parent', () => {
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE, x: 100, y: 0, rotation: Math.PI / 2 },
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0 },
		])
		editor.reparentShapes([editor.getShape(ids.a)!], ids.box)
		const shape = editor.getShape(ids.a)!
		expect(shape.parentId).toBe(ids.box)
		expect(shape.rotation).toBeCloseTo(-Math.PI / 2)
		const pageTransform = editor.getShapePageTransform(ids.a)
		expect(pageTransform.point().x).toBeCloseTo(0)
		expect(pageTransform.point().y).toBeCloseTo(0)
		expect(pageTransform.rotation()).toBeCloseTo(0)
	})

	it('converts local positions back to page positions when reparenting to the page', () => {
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE, x: 100, y: 100 },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.box, x: 10, y: 20 },
		])
		editor.reparentShapes([ids.a], editor.getCurrentPageId())
		expect(editor.getShape(ids.a)).toMatchObject({
			parentId: editor.getCurrentPageId(),
			x: 110,
			y: 120,
		})
	})

	it('puts reparented shapes on top of the existing children by default', () => {
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.box },
			{ id: ids.b, type: BOX_TYPE, parentId: ids.box },
			{ id: ids.c, type: BOX_TYPE },
			{ id: ids.d, type: BOX_TYPE },
		])
		editor.reparentShapes([ids.d, ids.c], ids.box)
		expect(order(ids.box)).toEqual([ids.a, ids.b, ids.c, ids.d])
	})

	it('inserts at the given index, above a sibling that already has that index', () => {
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.box },
			{ id: ids.b, type: BOX_TYPE, parentId: ids.box },
			{ id: ids.c, type: BOX_TYPE },
		])
		editor.reparentShapes([ids.c], ids.box, editor.getShape(ids.a)!.index)
		expect(order(ids.box)).toEqual([ids.a, ids.c, ids.b])
	})

	it('inserts at a free index between siblings', () => {
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.box, index: 'a1' as IndexKey },
			{ id: ids.b, type: BOX_TYPE, parentId: ids.box, index: 'a3' as IndexKey },
			{ id: ids.c, type: BOX_TYPE },
		])
		editor.reparentShapes([ids.c], ids.box, 'a2' as IndexKey)
		expect(order(ids.box)).toEqual([ids.a, ids.c, ids.b])
	})

	it('reparents locked shapes', () => {
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE },
			{ id: ids.a, type: BOX_TYPE, isLocked: true },
		])
		editor.reparentShapes([ids.a], ids.box)
		expect(editor.getShape(ids.a)!.parentId).toBe(ids.box)
	})

	it('throws when a shape is reparented to itself', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE })
		expect(() => editor.reparentShapes([ids.a], ids.a)).toThrow()
	})

	it('does nothing for an empty list', () => {
		editor.createShape({ id: ids.box, type: BOX_TYPE })
		expect(editor.reparentShapes([], ids.box)).toBe(editor)
		expect(order(ids.box)).toEqual([])
	})
})

describe('nudgeShapes', () => {
	it('moves shapes by the offset', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0 },
			{ id: ids.b, type: BOX_TYPE, x: 100, y: 100 },
		])
		editor.nudgeShapes([ids.a, ids.b], { x: 10, y: -5 })
		expect(editor.getShape(ids.a)).toMatchObject({ x: 10, y: -5 })
		expect(editor.getShape(ids.b)).toMatchObject({ x: 110, y: 95 })
	})

	it('accepts shape objects', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 0, y: 0 })
		editor.nudgeShapes([editor.getShape(ids.a)!], { x: 1, y: 2 })
		expect(editor.getShape(ids.a)).toMatchObject({ x: 1, y: 2 })
	})

	it('applies the offset in page space for shapes inside a rotated parent', () => {
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE, x: 100, y: 0, rotation: Math.PI / 2 },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.box, x: 0, y: 0 },
		])
		editor.nudgeShapes([ids.a], { x: 10, y: 0 })
		const shape = editor.getShape(ids.a)!
		expect(shape.x).toBeCloseTo(0)
		expect(shape.y).toBeCloseTo(-10)
		const pagePoint = editor.getShapePageTransform(ids.a).point()
		expect(pagePoint.x).toBeCloseTo(110)
		expect(pagePoint.y).toBeCloseTo(0)
	})

	it('runs the translate lifecycle callbacks of the shape util', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE })
		editor.nudgeShapes([ids.a], { x: 1, y: 1 })
		expect(translateEvents).toEqual(['start', 'translate', 'end'])
	})

	it('does nothing for an empty list', () => {
		expect(editor.nudgeShapes([], { x: 1, y: 1 })).toBe(editor)
	})
})

describe('duplicateShapes', () => {
	it('creates offset copies with new ids and selects them', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 100, y: 0, props: { w: 50, h: 50 } },
		])
		editor.duplicateShapes([ids.a, ids.b], { x: 10, y: 20 })

		const selected = editor.getSelectedShapes()
		expect(selected).toHaveLength(2)
		expect(selected.map((s) => s.id)).not.toContain(ids.a)
		expect(selected.map((s) => s.id)).not.toContain(ids.b)
		expect(selected.map((s) => ({ x: s.x, y: s.y, props: s.props }))).toEqual([
			{ x: 10, y: 20, props: { w: 50, h: 50 } },
			{ x: 110, y: 20, props: { w: 50, h: 50 } },
		])
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 50, h: 50 })
		expect(editor.getCurrentPageShapes()).toHaveLength(4)
	})

	it('places each duplicate directly above its original', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE },
			{ id: ids.b, type: BOX_TYPE },
		])
		editor.duplicateShapes([ids.a])
		const [dupId] = editor.getSelectedShapeIds()
		expect(order()).toEqual([ids.a, dupId, ids.b])
	})

	it('duplicates descendants along with their parent', () => {
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE, x: 100, y: 100 },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.box, x: 10, y: 10 },
		])
		editor.duplicateShapes([ids.box], { x: 5, y: 5 })
		const [newBoxId] = editor.getSelectedShapeIds()
		const newChildren = editor.getSortedChildIdsForParent(newBoxId)
		expect(newChildren).toHaveLength(1)
		expect(editor.getShape(newBoxId)).toMatchObject({ x: 105, y: 105 })
		// the child keeps its local position and follows the duplicated parent
		expect(editor.getShape(newChildren[0])).toMatchObject({ x: 10, y: 10, parentId: newBoxId })
		expect(editor.getShape(ids.a)!.parentId).toBe(ids.box)
	})

	it('does not offset a descendant twice when it is passed in alongside its parent', () => {
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE, x: 100, y: 100 },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.box, x: 10, y: 10 },
		])
		editor.duplicateShapes([ids.box, ids.a], { x: 5, y: 5 })
		const newBox = editor.getSelectedShapes().find((s) => s.parentId === editor.getCurrentPageId())!
		const [newChildId] = editor.getSortedChildIdsForParent(newBox.id)
		expect(editor.getShape(newChildId)).toMatchObject({ x: 10, y: 10 })
		expect(pageRect(newChildId)).toMatchObject({ x: 115, y: 115 })
	})

	it('skips locked shapes', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, isLocked: true },
			{ id: ids.b, type: BOX_TYPE },
		])
		editor.duplicateShapes([ids.a, ids.b])
		expect(editor.getCurrentPageShapes()).toHaveLength(3)
		expect(editor.getSelectedShapes()[0].type).toBe(BOX_TYPE)
		expect(editor.getSelectedShapes()[0].isLocked).toBe(false)

		editor.selectNone()
		editor.duplicateShapes([ids.a])
		expect(editor.getCurrentPageShapes()).toHaveLength(3)
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('creates nothing and alerts when the page shape limit would be exceeded', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE },
			{ id: ids.b, type: BOX_TYPE },
		])
		// @ts-expect-error - options are readonly
		editor.options.maxShapesPerPage = 3
		const onMaxShapes = vi.fn()
		editor.on('max-shapes', onMaxShapes)

		editor.duplicateShapes([ids.a, ids.b])
		expect(editor.getCurrentPageShapes()).toHaveLength(2)
		expect(onMaxShapes).toHaveBeenCalledWith({
			name: editor.getCurrentPage().name,
			pageId: editor.getCurrentPageId(),
			count: 3,
		})

		editor.duplicateShapes([ids.a])
		expect(editor.getCurrentPageShapes()).toHaveLength(3)
	})
})

describe('moveShapesToPage', () => {
	const page2 = PageRecordType.createId('page2')

	beforeEach(() => {
		editor.createPage({ id: page2, name: 'page 2' })
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE, x: 100, y: 100 },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.box, x: 10, y: 10 },
			{ id: ids.b, type: BOX_TYPE, x: 300, y: 300 },
		])
	})

	it('moves shapes and their children to the page, switching to it and selecting them', () => {
		const page1 = editor.getCurrentPageId()
		editor.moveShapesToPage([ids.box], page2)

		expect(editor.getCurrentPageId()).toBe(page2)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box])
		expect(editor.getShape(ids.box)).toMatchObject({ parentId: page2, x: 100, y: 100 })
		expect(editor.getShape(ids.a)).toMatchObject({ parentId: ids.box, x: 10, y: 10 })
		expect([...editor.getPageShapeIds(page1)]).toEqual([ids.b])
	})

	it('keeps the zoom level of the page it left', () => {
		editor.setCamera({ x: 0, y: 0, z: 2 })
		editor.moveShapesToPage([ids.b], page2)
		expect(editor.getCamera().z).toBe(2)
	})

	it('does nothing when moving to the current page, an unknown page, or in readonly mode', () => {
		const page1 = editor.getCurrentPageId()

		editor.moveShapesToPage([ids.b], page1)
		expect(editor.getShape(ids.b)!.parentId).toBe(page1)

		editor.moveShapesToPage([ids.b], PageRecordType.createId('missing'))
		expect(editor.getShape(ids.b)!.parentId).toBe(page1)
		expect(editor.getCurrentPageId()).toBe(page1)

		setReadonly(true)
		editor.moveShapesToPage([ids.b], page2)
		expect(editor.getShape(ids.b)!.parentId).toBe(page1)
		expect(editor.getCurrentPageId()).toBe(page1)
	})

	it('does nothing and alerts when the target page would exceed the shape limit', () => {
		// @ts-expect-error - options are readonly
		editor.options.maxShapesPerPage = 1
		const onMaxShapes = vi.fn()
		editor.on('max-shapes', onMaxShapes)
		const page1 = editor.getCurrentPageId()

		editor.moveShapesToPage([ids.box], page2)
		expect(editor.getCurrentPageId()).toBe(page1)
		expect(editor.getShape(ids.box)!.parentId).toBe(page1)
		expect(onMaxShapes).toHaveBeenCalledWith({ name: 'page 2', pageId: page2, count: 1 })
	})
})

describe('toggleLock', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE },
			{ id: ids.b, type: BOX_TYPE },
		])
	})

	it('locks unlocked shapes and clears the selection', () => {
		editor.select(ids.a, ids.b)
		editor.toggleLock([ids.a, ids.b])
		expect(editor.getShape(ids.a)!.isLocked).toBe(true)
		expect(editor.getShape(ids.b)!.isLocked).toBe(true)
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('locks everything when the shapes are a mix of locked and unlocked', () => {
		editor.updateShape({ id: ids.a, type: BOX_TYPE, isLocked: true })
		editor.toggleLock([editor.getShape(ids.a)!, editor.getShape(ids.b)!])
		expect(editor.getShape(ids.a)!.isLocked).toBe(true)
		expect(editor.getShape(ids.b)!.isLocked).toBe(true)
	})

	it('unlocks shapes when all of them are locked', () => {
		editor.updateShapes([
			{ id: ids.a, type: BOX_TYPE, isLocked: true },
			{ id: ids.b, type: BOX_TYPE, isLocked: true },
		])
		editor.toggleLock([ids.a, ids.b])
		expect(editor.getShape(ids.a)!.isLocked).toBe(false)
		expect(editor.getShape(ids.b)!.isLocked).toBe(false)
	})

	it('does nothing in readonly mode or with no shapes', () => {
		editor.toggleLock([])
		expect(editor.getShape(ids.a)!.isLocked).toBe(false)
		setReadonly(true)
		editor.toggleLock([ids.a])
		expect(editor.getShape(ids.a)!.isLocked).toBe(false)
	})
})

describe('sendBackward and bringForward', () => {
	beforeEach(() => {
		// a and c overlap; b is off on its own
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0 },
			{ id: ids.b, type: BOX_TYPE, x: 500, y: 500 },
			{ id: ids.c, type: BOX_TYPE, x: 50, y: 50 },
		])
	})

	it('sends a shape behind the next overlapping shape below it', () => {
		editor.sendBackward([ids.c])
		expect(order()).toEqual([ids.c, ids.a, ids.b])
	})

	it('sends a shape one step back when considering all shapes', () => {
		editor.sendBackward([editor.getShape(ids.c)!], { considerAllShapes: true })
		expect(order()).toEqual([ids.a, ids.c, ids.b])
	})

	it('brings a shape in front of the next overlapping shape above it', () => {
		editor.bringForward([ids.a])
		expect(order()).toEqual([ids.b, ids.c, ids.a])
	})

	it('brings a shape one step forward when considering all shapes', () => {
		editor.bringForward([editor.getShape(ids.a)!], { considerAllShapes: true })
		expect(order()).toEqual([ids.b, ids.a, ids.c])
	})

	it('does nothing when there is nothing to move past', () => {
		editor.sendBackward([ids.a], { considerAllShapes: true })
		editor.bringForward([ids.c], { considerAllShapes: true })
		editor.sendBackward([])
		expect(order()).toEqual([ids.a, ids.b, ids.c])
	})
})

describe('flipShapes', () => {
	it('flips shapes horizontally around their common center', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 200, y: 100, props: { w: 50, h: 50 } },
		])
		editor.flipShapes([ids.a, ids.b], 'horizontal')
		expect(rect(ids.a)).toEqual({ x: 200, y: 0, w: 50, h: 50 })
		expect(rect(ids.b)).toEqual({ x: 0, y: 100, w: 50, h: 50 })
	})

	it('flips shapes vertically around their common center', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 100, y: 200, props: { w: 50, h: 50 } },
		])
		editor.flipShapes([editor.getShape(ids.a)!, editor.getShape(ids.b)!], 'vertical')
		expect(rect(ids.a)).toEqual({ x: 0, y: 200, w: 50, h: 50 })
		expect(rect(ids.b)).toEqual({ x: 100, y: 0, w: 50, h: 50 })
	})

	it('leaves a single shape in place', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 10, y: 20, props: { w: 50, h: 30 } })
		editor.flipShapes([ids.a], 'horizontal')
		expect(rect(ids.a)).toEqual({ x: 10, y: 20, w: 50, h: 30 })
	})

	it('flips the children of groups', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 200, y: 0, props: { w: 50, h: 50 } },
		])
		editor.groupShapes([ids.a, ids.b], { groupId: ids.group })
		editor.flipShapes([ids.group], 'horizontal')
		expect(pageRect(ids.a)).toEqual({ x: 200, y: 0, w: 50, h: 50 })
		expect(pageRect(ids.b)).toEqual({ x: 0, y: 0, w: 50, h: 50 })
	})

	it('ignores shapes that cannot be laid out', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: FIXED_TYPE, x: 200, y: 0, props: { w: 50, h: 50 } },
		])
		editor.flipShapes([ids.a, ids.b], 'horizontal')
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 50, h: 50 })
		expect(editor.getShape(ids.b)).toMatchObject({ x: 200, y: 0 })
	})

	it('does nothing in readonly mode', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 200, y: 0, props: { w: 50, h: 50 } },
		])
		setReadonly(true)
		editor.flipShapes([ids.a, ids.b], 'horizontal')
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 50, h: 50 })
	})
})

describe('packShapes', () => {
	it('packs shapes into rows, tallest first, keeping the common center', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.b, type: BOX_TYPE, x: 200, y: 0, props: { w: 100, h: 60 } },
			{ id: ids.c, type: BOX_TYPE, x: 400, y: 0, props: { w: 120, h: 80 } },
			{ id: ids.d, type: BOX_TYPE, x: 600, y: 0, props: { w: 100, h: 120 } },
		])
		editor.packShapes([ids.a, ids.b, ids.c, ids.d], 20)
		expect(rect(ids.d)).toEqual({ x: 110, y: 0, w: 100, h: 120 })
		expect(rect(ids.a)).toEqual({ x: 230, y: 0, w: 100, h: 100 })
		expect(rect(ids.c)).toEqual({ x: 350, y: 0, w: 120, h: 80 })
		expect(rect(ids.b)).toEqual({ x: 490, y: 0, w: 100, h: 60 })
	})

	it('uses the adjacent shape margin option as the default gap', () => {
		// @ts-expect-error - options are readonly
		editor.options.adjacentShapeMargin = 10
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 100, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.c, type: BOX_TYPE, x: 200, y: 0, props: { w: 50, h: 50 } },
		])
		editor.packShapes([editor.getShape(ids.a)!, editor.getShape(ids.b)!, editor.getShape(ids.c)!])
		expect(rect(ids.a)).toEqual({ x: 40, y: 0, w: 50, h: 50 })
		expect(rect(ids.b)).toEqual({ x: 100, y: 0, w: 50, h: 50 })
		expect(rect(ids.c)).toEqual({ x: 160, y: 0, w: 50, h: 50 })
	})

	it('does nothing with fewer than two shapes or in readonly mode', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 300, y: 0, props: { w: 50, h: 50 } },
		])
		editor.packShapes([ids.a], 0)
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 50, h: 50 })
		setReadonly(true)
		editor.packShapes([ids.a, ids.b], 0)
		expect(rect(ids.b)).toEqual({ x: 300, y: 0, w: 50, h: 50 })
	})
})

describe('distributeShapes', () => {
	it('spaces the middle shapes evenly between the first and last horizontally', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 60, y: 10, props: { w: 50, h: 50 } },
			{ id: ids.c, type: BOX_TYPE, x: 200, y: 20, props: { w: 50, h: 50 } },
		])
		editor.distributeShapes([ids.a, ids.b, ids.c], 'horizontal')
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 50, h: 50 })
		expect(rect(ids.b)).toEqual({ x: 100, y: 10, w: 50, h: 50 })
		expect(rect(ids.c)).toEqual({ x: 200, y: 20, w: 50, h: 50 })
	})

	it('spaces the middle shapes evenly between the first and last vertically', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 10, y: 60, props: { w: 50, h: 50 } },
			{ id: ids.c, type: BOX_TYPE, x: 20, y: 200, props: { w: 50, h: 50 } },
		])
		editor.distributeShapes(
			[editor.getShape(ids.a)!, editor.getShape(ids.b)!, editor.getShape(ids.c)!],
			'vertical'
		)
		expect(rect(ids.b)).toEqual({ x: 10, y: 100, w: 50, h: 50 })
	})

	it('distributes shapes with different sizes', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 60, y: 0, props: { w: 100, h: 50 } },
			{ id: ids.c, type: BOX_TYPE, x: 70, y: 0, props: { w: 20, h: 50 } },
			{ id: ids.d, type: BOX_TYPE, x: 300, y: 0, props: { w: 50, h: 50 } },
		])
		// 250 of space between a and d, 120 of it taken by b and c: 3 gaps of 130 / 3
		editor.distributeShapes([ids.a, ids.b, ids.c, ids.d], 'horizontal')
		expect(rect(ids.b).x).toBeCloseTo(50 + 130 / 3)
		expect(rect(ids.c).x).toBeCloseTo(50 + 130 / 3 + 100 + 130 / 3)
	})

	it('moves shapes inside a translated parent in page space', () => {
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE, x: 1000, y: 0, props: { w: 500, h: 500 } },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.box, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, parentId: ids.box, x: 60, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.c, type: BOX_TYPE, parentId: ids.box, x: 200, y: 0, props: { w: 50, h: 50 } },
		])
		editor.distributeShapes([ids.a, ids.b, ids.c], 'horizontal')
		expect(rect(ids.b)).toEqual({ x: 100, y: 0, w: 50, h: 50 })
		expect(pageRect(ids.b)).toEqual({ x: 1100, y: 0, w: 50, h: 50 })
	})

	it('does nothing with fewer than three shapes or in readonly mode', () => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 60, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.c, type: BOX_TYPE, x: 200, y: 0, props: { w: 50, h: 50 } },
		])
		editor.distributeShapes([ids.a, ids.b], 'horizontal')
		expect(rect(ids.b).x).toBe(60)
		setReadonly(true)
		editor.distributeShapes([ids.a, ids.b, ids.c], 'horizontal')
		expect(rect(ids.b).x).toBe(60)
	})
})

describe('stretchShapes', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 100, y: 100, props: { w: 50, h: 100 } },
		])
	})

	it('stretches shapes horizontally to fill the common bounds', () => {
		editor.stretchShapes([ids.a, ids.b], 'horizontal')
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 150, h: 50 })
		expect(rect(ids.b)).toEqual({ x: 0, y: 100, w: 150, h: 100 })
	})

	it('stretches shapes vertically to fill the common bounds', () => {
		editor.stretchShapes([editor.getShape(ids.a)!, editor.getShape(ids.b)!], 'vertical')
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 50, h: 200 })
		expect(rect(ids.b)).toEqual({ x: 100, y: 0, w: 50, h: 200 })
	})

	it('ignores shapes that are not axis aligned', () => {
		editor.createShape({
			id: ids.c,
			type: BOX_TYPE,
			x: 500,
			y: 500,
			rotation: Math.PI / 4,
			props: { w: 50, h: 50 },
		})
		editor.stretchShapes([ids.a, ids.b, ids.c], 'horizontal')
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 150, h: 50 })
		expect(rect(ids.c)).toEqual({ x: 500, y: 500, w: 50, h: 50 })
	})

	it('does nothing with fewer than two shapes or in readonly mode', () => {
		editor.stretchShapes([ids.a], 'horizontal')
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 50, h: 50 })
		setReadonly(true)
		editor.stretchShapes([ids.a, ids.b], 'horizontal')
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 50, h: 50 })
	})
})

describe('resizeToBounds', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 100, y: 100, props: { w: 50, h: 50 } },
		])
	})

	it('scales and moves shapes so their common bounds match the target', () => {
		editor.resizeToBounds([ids.a, ids.b], { x: 200, y: 200, w: 300, h: 300 })
		expect(rect(ids.a)).toEqual({ x: 200, y: 200, w: 100, h: 100 })
		expect(rect(ids.b)).toEqual({ x: 400, y: 400, w: 100, h: 100 })
		expect(editor.getSelectionPageBounds()).toBeNull()
		expect(
			Box.Common([editor.getShapePageBounds(ids.a)!, editor.getShapePageBounds(ids.b)!])
		).toEqual(new Box(200, 200, 300, 300))
	})

	it('supports non-uniform scaling', () => {
		editor.resizeToBounds(
			[editor.getShape(ids.a)!, editor.getShape(ids.b)!],
			new Box(0, 0, 300, 150)
		)
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 100, h: 50 })
		expect(rect(ids.b)).toEqual({ x: 200, y: 100, w: 100, h: 50 })
	})

	it('does nothing with no shapes, zero-sized bounds, or in readonly mode', () => {
		editor.resizeToBounds([], new Box(0, 0, 10, 10))
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 50, h: 50 })

		editor.createShape({ id: ids.c, type: BOX_TYPE, x: 0, y: 0, props: { w: 0, h: 50 } })
		editor.resizeToBounds([ids.c], new Box(0, 0, 10, 10))
		expect(rect(ids.c)).toEqual({ x: 0, y: 0, w: 0, h: 50 })

		setReadonly(true)
		editor.resizeToBounds([ids.a, ids.b], new Box(0, 0, 10, 10))
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 50, h: 50 })
	})
})

describe('resizeShape', () => {
	it('scales around the shape center by default', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 0, y: 0 })
		editor.resizeShape(ids.a, { x: 2, y: 2 })
		expect(rect(ids.a)).toEqual({ x: -50, y: -50, w: 200, h: 200 })
	})

	it('scales around a given origin', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 0, y: 0 })
		editor.resizeShape(editor.getShape(ids.a)!, { x: 2, y: 3 }, { scaleOrigin: { x: 0, y: 0 } })
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 200, h: 300 })
	})

	it('treats a non-finite scale factor as 1', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 0, y: 0 })
		editor.resizeShape(ids.a, { x: Infinity, y: 2 }, { scaleOrigin: { x: 0, y: 0 } })
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 100, h: 200 })
	})

	it('uses the larger factor on both axes when the aspect ratio is locked', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 0, y: 0, meta: { lockAspect: true } })
		editor.resizeShape(ids.a, { x: 2, y: 1 }, { scaleOrigin: { x: 0, y: 0 } })
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 200, h: 200 })
	})

	it('keeps the bounds of a box that is flipped in place', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 0, y: 0 })
		editor.resizeShape(ids.a, { x: -1, y: 1 })
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 100, h: 100 })
	})

	it('only repositions shapes whose util does not resize', () => {
		editor.createShape({ id: ids.a, type: FIXED_TYPE, x: 0, y: 0 })
		editor.resizeShape(ids.a, { x: 2, y: 2 }, { scaleOrigin: { x: 0, y: 0 } })
		expect(editor.getShape(ids.a)).toMatchObject({ x: 50, y: 50, props: { w: 100, h: 100 } })
	})

	it('resizes a shape inside a translated parent using page coordinates', () => {
		editor.createShapes([
			{ id: ids.box, type: BOX_TYPE, x: 100, y: 100, props: { w: 500, h: 500 } },
			{ id: ids.a, type: BOX_TYPE, parentId: ids.box, x: 0, y: 0, props: { w: 50, h: 50 } },
		])
		editor.resizeShape(ids.a, { x: 2, y: 2 }, { scaleOrigin: { x: 100, y: 100 } })
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 100, h: 100 })
		expect(pageRect(ids.a)).toEqual({ x: 100, y: 100, w: 100, h: 100 })
	})

	it('scales a rotated shape uniformly when it is not aligned with the scale axis', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 0, y: 0, rotation: Math.PI / 4 })
		const centerBefore = editor.getShapePageBounds(ids.a)!.center
		editor.resizeShape(ids.a, { x: 2, y: 2 }, { scaleOrigin: centerBefore, scaleAxisRotation: 0 })
		const shape = editor.getShape(ids.a) as IBoxShape
		expect(shape.props).toMatchObject({ w: 200, h: 200 })
		expect(shape.rotation).toBeCloseTo(Math.PI / 4)
		const centerAfter = editor.getShapePageBounds(ids.a)!.center
		expect(centerAfter.x).toBeCloseTo(centerBefore.x)
		expect(centerAfter.y).toBeCloseTo(centerBefore.y)
	})

	it('does nothing for unknown shapes or in readonly mode', () => {
		editor.createShape({ id: ids.a, type: BOX_TYPE, x: 0, y: 0 })
		expect(editor.resizeShape(createShapeId('missing'), { x: 2, y: 2 })).toBe(editor)
		setReadonly(true)
		editor.resizeShape(ids.a, { x: 2, y: 2 })
		expect(rect(ids.a)).toEqual({ x: 0, y: 0, w: 100, h: 100 })
	})
})

describe('canCreateShape', () => {
	it('is true while the page is below the shape limit and false once it is full', () => {
		// @ts-expect-error - options are readonly
		editor.options.maxShapesPerPage = 2
		expect(editor.canCreateShape({ type: BOX_TYPE })).toBe(true)
		editor.createShape({ id: ids.a, type: BOX_TYPE })
		expect(editor.canCreateShape(ids.b)).toBe(true)
		expect(editor.canCreateShapes([ids.b, ids.c])).toBe(false)
		editor.createShape({ id: ids.b, type: BOX_TYPE })
		expect(editor.canCreateShape({ type: BOX_TYPE })).toBe(false)
	})
})

describe('ungroupShapes', () => {
	beforeEach(() => {
		editor.createShapes([
			{ id: ids.a, type: BOX_TYPE, x: 100, y: 100, props: { w: 50, h: 50 } },
			{ id: ids.b, type: BOX_TYPE, x: 200, y: 200, props: { w: 50, h: 50 } },
			{ id: ids.c, type: BOX_TYPE, x: 500, y: 500, props: { w: 50, h: 50 } },
		])
		editor.groupShapes([ids.a, ids.b], { groupId: ids.group })
		expect(order()).toEqual([ids.group, ids.c])
		expect(editor.getShape(ids.a)).toMatchObject({ parentId: ids.group, x: 0, y: 0 })
	})

	it('moves the children back to the parent at their page positions, deletes the group, and selects the children', () => {
		editor.ungroupShapes([ids.group])
		expect(editor.getShape(ids.group)).toBeUndefined()
		expect(editor.getShape(ids.a)).toMatchObject({
			parentId: editor.getCurrentPageId(),
			x: 100,
			y: 100,
		})
		expect(editor.getShape(ids.b)).toMatchObject({
			parentId: editor.getCurrentPageId(),
			x: 200,
			y: 200,
		})
		expect(new Set(editor.getSelectedShapeIds())).toEqual(new Set([ids.a, ids.b]))
	})

	it('keeps the children at the z position of the group', () => {
		editor.ungroupShapes([editor.getShape(ids.group)!])
		expect(order()).toEqual([ids.a, ids.b, ids.c])
	})

	it('keeps the children at the z position of a group that is on top', () => {
		editor.bringToFront([ids.group])
		expect(order()).toEqual([ids.c, ids.group])
		editor.ungroupShapes([ids.group])
		expect(order()).toEqual([ids.c, ids.a, ids.b])
	})

	it('keeps non-group shapes in the selection when select is left on', () => {
		editor.ungroupShapes([ids.group, ids.c])
		expect(new Set(editor.getSelectedShapeIds())).toEqual(new Set([ids.a, ids.b, ids.c]))
	})

	it('leaves the selection alone when select is false', () => {
		editor.select(ids.c)
		editor.ungroupShapes([ids.group], { select: false })
		expect(editor.getShape(ids.group)).toBeUndefined()
		expect(editor.getSelectedShapeIds()).toEqual([ids.c])
	})

	it('ungroups nested groups one level at a time', () => {
		editor.groupShapes([ids.group, ids.c], { groupId: ids.inner })
		editor.ungroupShapes([ids.inner])
		expect(editor.getShape(ids.inner)).toBeUndefined()
		expect(editor.getShape(ids.group)!.parentId).toBe(editor.getCurrentPageId())
		expect(editor.getShape(ids.a)!.parentId).toBe(ids.group)
		expect(pageRect(ids.a)).toEqual({ x: 100, y: 100, w: 50, h: 50 })
	})

	it('does nothing when the select tool is not active', () => {
		editor.setCurrentTool('other')
		editor.ungroupShapes([ids.group])
		expect(editor.getShape(ids.group)).toBeDefined()
		expect(editor.getShape(ids.a)!.parentId).toBe(ids.group)
	})

	it('does nothing in readonly mode, for locked groups, or when no groups are given', () => {
		editor.ungroupShapes([ids.c])
		expect(editor.getShape(ids.group)).toBeDefined()

		editor.updateShape({ id: ids.group, type: 'group', isLocked: true })
		editor.ungroupShapes([ids.group])
		expect(editor.getShape(ids.group)).toBeDefined()
		editor.updateShape({ id: ids.group, type: 'group', isLocked: false })

		setReadonly(true)
		editor.ungroupShapes([ids.group])
		expect(editor.getShape(ids.group)).toBeDefined()
	})
})

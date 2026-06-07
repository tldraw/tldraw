import {
	createShapeId,
	Geometry2d,
	kickoutOccludedShapes,
	Rectangle2d,
	ShapeUtil,
	TLBaseShape,
	TLDragShapesOutInfo,
	TLDropShapesOverInfo,
	TLShape,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

vi.useFakeTimers()

const GRID_TYPE = 'my-grid-shape'
const COUNTER_TYPE = 'my-counter-shape'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[GRID_TYPE]: { w: number; h: number }
		[COUNTER_TYPE]: Record<string, never>
	}
}

type MyGridShape = TLBaseShape<typeof GRID_TYPE, { w: number; h: number }>
type MyCounterShape = TLBaseShape<typeof COUNTER_TYPE, Record<string, never>>

class CounterShapeUtil extends ShapeUtil<MyCounterShape> {
	static override type = COUNTER_TYPE
	override getDefaultProps(): MyCounterShape['props'] {
		return {} as MyCounterShape['props']
	}
	override getGeometry(_: MyCounterShape): Geometry2d {
		return new Rectangle2d({ width: 50, height: 50, isFilled: true })
	}
	override component() {
		return null as any
	}
	override getIndicatorPath() {
		return undefined
	}
}

const onDropSpy =
	vi.fn<(shape: MyGridShape, shapes: TLShape[], info: TLDropShapesOverInfo) => void>()

class GridShapeUtil extends ShapeUtil<MyGridShape> {
	static override type = GRID_TYPE
	override getDefaultProps(): MyGridShape['props'] {
		return { w: 500, h: 200 }
	}
	override getGeometry(shape: MyGridShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	override component() {
		return null as any
	}
	override getIndicatorPath() {
		return undefined
	}

	override canReceiveNewChildrenOfType(_shape: MyGridShape, type: TLShape['type']) {
		return type === COUNTER_TYPE
	}
	override canRemoveChildrenOfType(_shape: MyGridShape, type: TLShape['type']) {
		// Pin counter shapes; everything else can leave.
		return type !== COUNTER_TYPE
	}
	override onDragShapesIn(shape: MyGridShape, draggingShapes: TLShape[]): void {
		const reparenting = draggingShapes.filter((s) => s.parentId !== shape.id)
		if (reparenting.length === 0) return
		this.editor.reparentShapes(reparenting, shape.id)
	}
	override onDragShapesOut(
		shape: MyGridShape,
		draggingShapes: TLShape[],
		info: TLDragShapesOutInfo
	): void {
		if (info.nextDraggingOverShapeId) return
		const reparenting = draggingShapes.filter((s) => s.parentId === shape.id)
		this.editor.reparentShapes(reparenting, this.editor.getCurrentPageId())
	}
	override onDropShapesOver(
		shape: MyGridShape,
		shapes: TLShape[],
		info: TLDropShapesOverInfo
	): void {
		onDropSpy(shape, shapes, info)
	}
}

let editor: TestEditor

const ids = {
	grid: createShapeId('grid'),
	counter: createShapeId('counter'),
}

beforeEach(() => {
	onDropSpy.mockReset()
	editor = new TestEditor({ shapeUtils: [GridShapeUtil, CounterShapeUtil] })
})
afterEach(() => {
	editor?.dispose()
})

describe('canRemoveChildrenOfType for non-frame containers', () => {
	it('pins children whose type the parent refuses to remove', () => {
		// Grid at (100, 100) covers (100, 100) to (600, 300)
		editor.createShape({ id: ids.grid, type: GRID_TYPE, x: 100, y: 100 })

		// Counter starts on the page outside the grid
		editor.createShape({ id: ids.counter, type: COUNTER_TYPE, x: 700, y: 100 })
		expect(editor.getShape(ids.counter)!.parentId).toBe(editor.getCurrentPageId())

		// Drag the counter onto the grid; it should reparent to the grid
		editor.setCurrentTool('select')
		editor.pointerDown(725, 125, ids.counter).pointerMove(300, 200)
		vi.advanceTimersByTime(300)
		editor.pointerUp(300, 200)
		expect(editor.getShape(ids.counter)!.parentId).toBe(ids.grid)

		// Now drag the counter back off the grid
		editor.pointerDown(300, 200, ids.counter).pointerMove(800, 800)
		vi.advanceTimersByTime(300)
		editor.pointerUp(800, 800)

		// Counter should still be parented to the grid because the grid pins counter shapes
		expect(editor.getShape(ids.counter)!.parentId).toBe(ids.grid)
	})

	it('still allows children whose type the parent does allow to be removed', () => {
		editor.createShape({ id: ids.grid, type: GRID_TYPE, x: 100, y: 100 })

		// Programmatically place a non-counter (geo) shape inside the grid; canRemove allows
		// non-counter types to be removed via drag/kickout.
		const geoId = createShapeId('geo')
		editor.createShape({
			id: geoId,
			type: 'geo',
			parentId: ids.grid,
			x: 50,
			y: 50,
			props: { w: 50, h: 50 },
		})
		expect(editor.getShape(geoId)!.parentId).toBe(ids.grid)

		// Drag the geo entirely out of the grid
		editor.setCurrentTool('select')
		editor.pointerDown(175, 175, geoId).pointerMove(800, 800)
		vi.advanceTimersByTime(300)
		editor.pointerUp(800, 800)

		// Geo should be reparented to the page (canRemove returns true for non-counter types)
		expect(editor.getShape(geoId)!.parentId).toBe(editor.getCurrentPageId())
	})
})

describe('kickoutOccludedShapes respects canRemoveChildrenOfType', () => {
	it('keeps a pinned child parented when it no longer overlaps its parent', () => {
		// Grid covers (100, 100) to (600, 300)
		editor.createShape({ id: ids.grid, type: GRID_TYPE, x: 100, y: 100 })

		// Counter created inside the grid
		editor.createShape({
			id: ids.counter,
			type: COUNTER_TYPE,
			parentId: ids.grid,
			x: 50,
			y: 50,
		})
		expect(editor.getShape(ids.counter)!.parentId).toBe(ids.grid)

		// Move the counter (in parent-local space) so it sits outside the grid's geometry
		editor.updateShape({
			id: ids.counter,
			type: COUNTER_TYPE,
			x: 1000,
			y: 1000,
		})

		// Trigger kickout directly (no drag involved)
		kickoutOccludedShapes(editor, [ids.counter])

		// Counter should still be parented to the grid because the grid pins counter shapes
		expect(editor.getShape(ids.counter)!.parentId).toBe(ids.grid)
	})

	it('kicks out a non-pinned child that no longer overlaps its parent', () => {
		editor.createShape({ id: ids.grid, type: GRID_TYPE, x: 100, y: 100 })

		const geoId = createShapeId('geo')
		editor.createShape({
			id: geoId,
			type: 'geo',
			parentId: ids.grid,
			x: 50,
			y: 50,
			props: { w: 50, h: 50 },
		})
		expect(editor.getShape(geoId)!.parentId).toBe(ids.grid)

		// Move the geo (in parent-local space) so it sits outside the grid's geometry
		editor.updateShape({
			id: geoId,
			type: 'geo',
			x: 1000,
			y: 1000,
		})

		kickoutOccludedShapes(editor, [geoId])

		// Geo should be reparented to the page since the grid does not pin non-counter children
		expect(editor.getShape(geoId)!.parentId).toBe(editor.getCurrentPageId())
	})

	it('still kicks out a pinned child when its parent is being filtered out (e.g. removed)', () => {
		editor.createShape({ id: ids.grid, type: GRID_TYPE, x: 100, y: 100 })

		editor.createShape({
			id: ids.counter,
			type: COUNTER_TYPE,
			parentId: ids.grid,
			x: 50,
			y: 50,
		})
		expect(editor.getShape(ids.counter)!.parentId).toBe(ids.grid)

		// Simulate the parent being removed by passing a filter that rejects the grid. In this
		// branch kickout intentionally bypasses canRemoveChildrenOfType; otherwise children of a
		// pinned parent could not survive their parent being deleted.
		kickoutOccludedShapes(editor, [ids.counter], {
			filter: (parent) => parent.id !== ids.grid,
		})

		expect(editor.getShape(ids.counter)!.parentId).toBe(editor.getCurrentPageId())
	})
})

describe('onDropShapesOver gating by canReceiveNewChildrenOfType', () => {
	it('fires with only the shapes whose type passes the gate', () => {
		editor.createShape({ id: ids.grid, type: GRID_TYPE, x: 100, y: 100 })
		editor.createShape({ id: ids.counter, type: COUNTER_TYPE, x: 700, y: 100 })

		// Drag the counter onto the grid and drop it
		editor.setCurrentTool('select')
		editor.pointerDown(725, 125, ids.counter).pointerMove(300, 200)
		vi.advanceTimersByTime(300)
		editor.pointerUp(300, 200)

		expect(onDropSpy).toHaveBeenCalledTimes(1)
		const [, droppedShapes] = onDropSpy.mock.calls[0]
		expect(droppedShapes.map((s) => s.id)).toEqual([ids.counter])
	})

	it('does not fire when no dragged shape passes the gate', () => {
		editor.createShape({ id: ids.grid, type: GRID_TYPE, x: 100, y: 100 })

		// A geo shape is rejected by the grid's canReceiveNewChildrenOfType
		const geoId = createShapeId('geo')
		editor.createShape({
			id: geoId,
			type: 'geo',
			x: 700,
			y: 100,
			props: { w: 50, h: 50 },
		})

		editor.setCurrentTool('select')
		editor.pointerDown(725, 125, geoId).pointerMove(300, 200)
		vi.advanceTimersByTime(300)
		editor.pointerUp(300, 200)

		expect(onDropSpy).not.toHaveBeenCalled()
	})
})

const REJECT_TYPE = 'my-reject-shape'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[REJECT_TYPE]: { w: number; h: number }
	}
}

type MyRejectShape = TLBaseShape<typeof REJECT_TYPE, { w: number; h: number }>

// A container that's a valid drag target (it has drag callbacks) but rejects every dragged
// type via canReceiveNewChildrenOfType.
class RejectAllShapeUtil extends ShapeUtil<MyRejectShape> {
	static override type = REJECT_TYPE
	override getDefaultProps(): MyRejectShape['props'] {
		return { w: 500, h: 200 }
	}
	override getGeometry(shape: MyRejectShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	override component() {
		return null as any
	}
	override getIndicatorPath() {
		return undefined
	}
	override canReceiveNewChildrenOfType(_shape: MyRejectShape, _type: TLShape['type']) {
		return false
	}
	override onDropShapesOver(_shape: MyRejectShape) {
		// Present so getDraggingOverShape considers this a valid drag target.
	}
}

describe('drag-over hinting respects canReceiveNewChildrenOfType', () => {
	it('clears the hint when moving from an accepting target to a rejecting one', () => {
		editor.dispose()
		editor = new TestEditor({
			shapeUtils: [GridShapeUtil, CounterShapeUtil, RejectAllShapeUtil],
		})

		const gridId = createShapeId('grid')
		const rejectId = createShapeId('reject')
		editor.createShape({ id: gridId, type: GRID_TYPE, x: 0, y: 0 })
		editor.createShape({ id: rejectId, type: REJECT_TYPE, x: 700, y: 0 })
		editor.createShape({ id: ids.counter, type: COUNTER_TYPE, x: 1500, y: 100 })

		editor.setCurrentTool('select')

		// Drag the counter over the grid (accepts) — hint should be set on the grid.
		editor.pointerDown(1525, 125, ids.counter).pointerMove(250, 100)
		vi.advanceTimersByTime(300)
		expect(editor.getHintingShapeIds()).toEqual([gridId])

		// Move the counter over the rejecting container — hint should clear, not linger on grid.
		editor.pointerMove(950, 100)
		vi.advanceTimersByTime(300)
		expect(editor.getHintingShapeIds()).toEqual([])

		editor.pointerUp(950, 100)
	})
})

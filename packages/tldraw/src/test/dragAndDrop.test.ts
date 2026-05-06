import {
	createShapeId,
	Geometry2d,
	Rectangle2d,
	ShapeUtil,
	TLBaseShape,
	TLDragShapesOutInfo,
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
}

let editor: TestEditor

const ids = {
	grid: createShapeId('grid'),
	counter: createShapeId('counter'),
}

beforeEach(() => {
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

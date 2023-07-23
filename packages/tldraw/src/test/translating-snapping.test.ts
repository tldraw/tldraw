import { Geometry2d, Rectangle2d, ShapeUtil, SnapLine, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

const ids = {
	frame1: createShapeId('frame1'),
	frame2: createShapeId('frame2'),
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	line1: createShapeId('line1'),
	boxD: createShapeId('boxD'),
	boxE: createShapeId('boxE'),
	boxF: createShapeId('boxF'),
	boxG: createShapeId('boxG'),
	boxH: createShapeId('boxH'),
	boxX: createShapeId('boxX'),

	boxT: createShapeId('boxT'),

	lineA: createShapeId('lineA'),
}

const getNumSnapPoints = (snap: SnapLine): number => {
	return snap.type === 'points' ? snap.points.length : (null as any as number)
}

const getSnapPoints = (snap: SnapLine) => {
	return snap.type === 'points' ? snap.points : null
}

type __TopLeftSnapOnlyShape = any

class __TopLeftSnapOnlyShapeUtil extends ShapeUtil<__TopLeftSnapOnlyShape> {
	static override type = '__test_top_left_snap_only' as const

	getDefaultProps(): __TopLeftSnapOnlyShape['props'] {
		return { width: 10, height: 10 }
	}
	component() {
		throw new Error('Method not implemented.')
	}
	indicator() {
		throw new Error('Method not implemented.')
	}
	getGeometry(shape: __TopLeftSnapOnlyShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.width,
			height: shape.props.height,
			isFilled: true,
		})
	}
}

const __TopLeftSnapOnlyShape = __TopLeftSnapOnlyShapeUtil

describe.skip('custom snapping points', () => {
	const shapeUtils = Object.freeze([__TopLeftSnapOnlyShape])
	beforeEach(() => {
		editor?.dispose()
		editor = new TestEditor({
			shapeUtils,
			// x───────┐
			// │ T     │
			// │       │
			// │       │
			// └───────┘
			//
			//             x───────x
			//             │ A     │
			//             │   x   │
			//             │       │
			//             x───────x
			//
			//                          x───────x
			//                          │ B     │
			//                          │   x   │
			//                          │       │
			//                          x───────x
		})
		editor.createShapes([
			{
				type: '__test_top_left_snap_only',
				id: ids.boxT,
				x: 0,
				y: 0,
				props: { width: 100, height: 100 },
			},
			{
				type: 'geo',
				id: ids.box1,
				x: 200,
				y: 200,
				props: { w: 100, h: 100 },
			},
			{
				type: 'geo',
				id: ids.box2,
				x: 400,
				y: 400,
				props: { w: 100, h: 100 },
			},
		])
	})

	it('allows other shapes to snap to custom snap points', () => {
		// should snap to 0 on y axis
		// x────────────x───────x
		// x───────┐    x───────x
		// │ T     │    │ A     │
		// │       │    │   x   │
		// │       │    │ drag  │
		// └───────┘    x───────x
		editor.pointerDown(250, 250, ids.box1).pointerMove(250, 51, { ctrlKey: true })
		expect(editor.getShape(ids.box1)).toMatchObject({ x: 200, y: 0 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(3)

		// should not snap to 100 on y axis
		// x───────┐
		// │ T     │
		// │       │
		// │       │
		// └───────┘    x───────x
		//              │ A     │
		//              │   x   │
		//              │ drag  │
		//              x───────x
		editor.pointerMove(250, 151, { ctrlKey: true })
		expect(editor.getShape(ids.box1)).toMatchObject({ x: 200, y: 101 })
		expect(editor.snaps.lines?.length).toBe(0)

		// should not snap to 50 on y axis
		// x───────┐
		// │ T     │
		// │       │    x───────x
		// │       │    │ A     │
		// └───────┘    │   x   │
		//              │ drag  │
		//              x───────x
		editor.pointerMove(250, 101, { ctrlKey: true })
		expect(editor.getShape(ids.box1)).toMatchObject({ x: 200, y: 51 })
		expect(editor.snaps.lines?.length).toBe(0)

		// should snap to 0 on x axis
		// x x───────┐
		// │ │ T     │
		// │ │       │
		// │ │       │
		// │ └───────┘
		// │
		// x x───────x
		// │ │ A     │
		// │ │   x   │
		// │ │ drag  │
		// x x───────x
		editor.pointerMove(51, 250, { ctrlKey: true })
		expect(editor.getShape(ids.box1)).toMatchObject({ x: 0, y: 200 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(3)

		// should not snap to 100 on x axis
		// x───────┐
		// │ T     │
		// │       │
		// │       │
		// └───────┘
		//
		//         x───────x
		//         │ A     │
		//         │   x   │
		//         │ drag  │
		//         x───────x
		editor.pointerMove(151, 250, { ctrlKey: true })
		expect(editor.getShape(ids.box1)).toMatchObject({ x: 101, y: 200 })
		expect(editor.snaps.lines?.length).toBe(0)

		// should not snap to 50 on x axis
		// x───────┐
		// │ T     │
		// │       │
		// │       │
		// └───────┘
		//
		//     x───────x
		//     │ A     │
		//     │   x   │
		//     │ drag  │
		//     x───────x
		editor.pointerMove(101, 250, { ctrlKey: true })
		expect(editor.getShape(ids.box1)).toMatchObject({ x: 51, y: 200 })
		expect(editor.snaps.lines?.length).toBe(0)
	})

	it('allows shapes with custom points to snap to other shapes', () => {
		// should snap to 200 on y axis
		// x────────────x───────x
		// x───────┐    x───────x
		// │ T     │    │ A     │
		// │       │    │   x   │
		// │ drag  │    │       │
		// └───────┘    x───────x
		editor.pointerDown(50, 50, ids.boxT).pointerMove(50, 251, { ctrlKey: true })
		expect(editor.getShape(ids.boxT)).toMatchObject({ x: 0, y: 200 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(3)

		// should snap to 250 on y axis
		// x─────────────────x
		//               x───────x
		//               │ A     │
		// x───────┐     │   x   │
		// │ T     │     │       │
		// │       │     x───────x
		// │ drag  │
		// └───────┘
		editor.pointerMove(50, 301, { ctrlKey: true })
		expect(editor.getShape(ids.boxT)).toMatchObject({ x: 0, y: 250 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(2)

		// should snap to 300 on y axis
		// x─────────────x───────x
		//               x───────x
		//               │ A     │
		//               │   x   │
		//               │       │
		// x───────┐     x───────x
		// │ T     │
		// │       │
		// │ drag  │
		// └───────┘
		editor.pointerMove(50, 351, { ctrlKey: true })
		expect(editor.getShape(ids.boxT)).toMatchObject({ x: 0, y: 300 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(3)

		// should snap to 200 on x axis
		// x x───────┐
		// │ │ T     │
		// │ │       │
		// │ │ drag  │
		// │ └───────┘
		// │
		// x x───────x
		// │ │ A     │
		// │ │   x   │
		// │ │       │
		// x x───────x
		editor.pointerMove(251, 50, { ctrlKey: true })
		expect(editor.getShape(ids.boxT)).toMatchObject({ x: 200, y: 0 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(3)

		// should snap to 250 on x axis
		// x     x───────┐
		// │     │ T     │
		// │     │       │
		// │     │ drag  │
		// │     └───────┘
		// │
		// │ x───────x
		// │ │ A     │
		// x │   x   │
		//   │       │
		//   x───────x
		editor.pointerMove(301, 50, { ctrlKey: true })
		expect(editor.getShape(ids.boxT)).toMatchObject({ x: 250, y: 0 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(2)

		// should snap to 300 on x axis
		// x         x───────┐
		// │         │ T     │
		// │         │       │
		// │         │ drag  │
		// │         └───────┘
		// │
		// x x───────x
		// │ │ A     │
		// │ │   x   │
		// │ │       │
		// x x───────x
		editor.pointerMove(351, 50, { ctrlKey: true })
		expect(editor.getShape(ids.boxT)).toMatchObject({ x: 300, y: 0 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(3)
	})

	it('becomes part of the selection bounding box if there is more than one shape in the selection', () => {
		// ┌────────────────────────┐
		// │                        │
		// │ x───────┐              │
		// │ │ T     │              │
		// │ │       │              │
		// │ │       │              │
		// │ └───────┘ x            │
		// │           │ x───────x  │
		// │           │ │ A     │  │
		// │           │ │   x   │  │
		// │           │ │       │  │
		// │           │ x───────x  │
		// │           │            │
		// └───────────┼────────────┘
		//             │
		//             │ 450
		//         x───┼───x
		//         │ B │   │
		//         │   x   │
		//         │       │
		//         x───────x
		editor.select(ids.boxT, ids.box1)
		editor.pointerDown(50, 50, ids.boxT).pointerMove(351, 50, { ctrlKey: true })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(2)
		expect(getSnapPoints(editor.snaps.lines![0])?.map(({ x }) => x)).toEqual([450, 450])
	})
})

describe.skip('custom snapping points', () => {
	beforeEach(() => {
		editor?.dispose()
		editor = new TestEditor({
			shapeUtils: [__TopLeftSnapOnlyShape],
			// x───────┐
			// │ T     │
			// │       │
			// │       │
			// └───────┘
			//
			//             x───────x
			//             │ A     │
			//             │   x   │
			//             │       │
			//             x───────x
			//
			//                          x───────x
			//                          │ B     │
			//                          │   x   │
			//                          │       │
			//                          x───────x
		})
		editor.createShapes([
			{
				type: '__test_top_left_snap_only',
				id: ids.boxT,
				x: 0,
				y: 0,
				props: { width: 100, height: 100 },
			},
			{
				type: 'geo',
				id: ids.box1,
				x: 200,
				y: 200,
				props: { w: 100, h: 100 },
			},
			{
				type: 'geo',
				id: ids.box2,
				x: 400,
				y: 400,
				props: { w: 100, h: 100 },
			},
		])
	})

	it('allows other shapes to snap to custom snap points', () => {
		// should snap to 0 on y axis
		// x────────────x───────x
		// x───────┐    x───────x
		// │ T     │    │ A     │
		// │       │    │   x   │
		// │       │    │ drag  │
		// └───────┘    x───────x
		editor.pointerDown(250, 250, ids.box1).pointerMove(250, 51, { ctrlKey: true })
		expect(editor.getShape(ids.box1)).toMatchObject({ x: 200, y: 0 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(3)

		// should not snap to 100 on y axis
		// x───────┐
		// │ T     │
		// │       │
		// │       │
		// └───────┘    x───────x
		//              │ A     │
		//              │   x   │
		//              │ drag  │
		//              x───────x
		editor.pointerMove(250, 151, { ctrlKey: true })
		expect(editor.getShape(ids.box1)).toMatchObject({ x: 200, y: 101 })
		expect(editor.snaps.lines?.length).toBe(0)

		// should not snap to 50 on y axis
		// x───────┐
		// │ T     │
		// │       │    x───────x
		// │       │    │ A     │
		// └───────┘    │   x   │
		//              │ drag  │
		//              x───────x
		editor.pointerMove(250, 101, { ctrlKey: true })
		expect(editor.getShape(ids.box1)).toMatchObject({ x: 200, y: 51 })
		expect(editor.snaps.lines?.length).toBe(0)

		// should snap to 0 on x axis
		// x x───────┐
		// │ │ T     │
		// │ │       │
		// │ │       │
		// │ └───────┘
		// │
		// x x───────x
		// │ │ A     │
		// │ │   x   │
		// │ │ drag  │
		// x x───────x
		editor.pointerMove(51, 250, { ctrlKey: true })
		expect(editor.getShape(ids.box1)).toMatchObject({ x: 0, y: 200 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(3)

		// should not snap to 100 on x axis
		// x───────┐
		// │ T     │
		// │       │
		// │       │
		// └───────┘
		//
		//         x───────x
		//         │ A     │
		//         │   x   │
		//         │ drag  │
		//         x───────x
		editor.pointerMove(151, 250, { ctrlKey: true })
		expect(editor.getShape(ids.box1)).toMatchObject({ x: 101, y: 200 })
		expect(editor.snaps.lines?.length).toBe(0)

		// should not snap to 50 on x axis
		// x───────┐
		// │ T     │
		// │       │
		// │       │
		// └───────┘
		//
		//     x───────x
		//     │ A     │
		//     │   x   │
		//     │ drag  │
		//     x───────x
		editor.pointerMove(101, 250, { ctrlKey: true })
		expect(editor.getShape(ids.box1)).toMatchObject({ x: 51, y: 200 })
		expect(editor.snaps.lines?.length).toBe(0)
	})

	it('allows shapes with custom points to snap to other shapes', () => {
		// should snap to 200 on y axis
		// x────────────x───────x
		// x───────┐    x───────x
		// │ T     │    │ A     │
		// │       │    │   x   │
		// │ drag  │    │       │
		// └───────┘    x───────x
		editor.pointerDown(50, 50, ids.boxT).pointerMove(50, 251, { ctrlKey: true })
		expect(editor.getShape(ids.boxT)).toMatchObject({ x: 0, y: 200 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(3)

		// should snap to 250 on y axis
		// x─────────────────x
		//               x───────x
		//               │ A     │
		// x───────┐     │   x   │
		// │ T     │     │       │
		// │       │     x───────x
		// │ drag  │
		// └───────┘
		editor.pointerMove(50, 301, { ctrlKey: true })
		expect(editor.getShape(ids.boxT)).toMatchObject({ x: 0, y: 250 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(2)

		// should snap to 300 on y axis
		// x─────────────x───────x
		//               x───────x
		//               │ A     │
		//               │   x   │
		//               │       │
		// x───────┐     x───────x
		// │ T     │
		// │       │
		// │ drag  │
		// └───────┘
		editor.pointerMove(50, 351, { ctrlKey: true })
		expect(editor.getShape(ids.boxT)).toMatchObject({ x: 0, y: 300 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(3)

		// should snap to 200 on x axis
		// x x───────┐
		// │ │ T     │
		// │ │       │
		// │ │ drag  │
		// │ └───────┘
		// │
		// x x───────x
		// │ │ A     │
		// │ │   x   │
		// │ │       │
		// x x───────x
		editor.pointerMove(251, 50, { ctrlKey: true })
		expect(editor.getShape(ids.boxT)).toMatchObject({ x: 200, y: 0 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(3)

		// should snap to 250 on x axis
		// x     x───────┐
		// │     │ T     │
		// │     │       │
		// │     │ drag  │
		// │     └───────┘
		// │
		// │ x───────x
		// │ │ A     │
		// x │   x   │
		//   │       │
		//   x───────x
		editor.pointerMove(301, 50, { ctrlKey: true })
		expect(editor.getShape(ids.boxT)).toMatchObject({ x: 250, y: 0 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(2)

		// should snap to 300 on x axis
		// x         x───────┐
		// │         │ T     │
		// │         │       │
		// │         │ drag  │
		// │         └───────┘
		// │
		// x x───────x
		// │ │ A     │
		// │ │   x   │
		// │ │       │
		// x x───────x
		editor.pointerMove(351, 50, { ctrlKey: true })
		expect(editor.getShape(ids.boxT)).toMatchObject({ x: 300, y: 0 })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(3)
	})

	it('becomes part of the selection bounding box if there is more than one shape in the selection', () => {
		// ┌────────────────────────┐
		// │                        │
		// │ x───────┐              │
		// │ │ T     │              │
		// │ │       │              │
		// │ │       │              │
		// │ └───────┘ x            │
		// │           │ x───────x  │
		// │           │ │ A     │  │
		// │           │ │   x   │  │
		// │           │ │       │  │
		// │           │ x───────x  │
		// │           │            │
		// └───────────┼────────────┘
		//             │
		//             │ 450
		//         x───┼───x
		//         │ B │   │
		//         │   x   │
		//         │       │
		//         x───────x
		editor.select(ids.boxT, ids.box1)
		editor.pointerDown(50, 50, ids.boxT).pointerMove(351, 50, { ctrlKey: true })
		expect(editor.snaps.lines?.length).toBe(1)
		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(2)
		expect(getSnapPoints(editor.snaps.lines![0])?.map(({ x }) => x)).toEqual([450, 450])
	})
})

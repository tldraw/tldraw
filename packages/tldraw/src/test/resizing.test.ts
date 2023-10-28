import {
	EPSILON,
	GapsSnapLine,
	PI,
	PI2,
	PointsSnapLine,
	RotateCorner,
	TLSelectionHandle,
	TLShapeId,
	TLShapePartial,
	Vec2d,
	canonicalizeRotation,
	createShapeId,
	rotateSelectionHandle,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'
import { getSnapLines } from './getSnapLines'
import { roundedBox } from './roundedBox'

jest.useFakeTimers()

const ORDERED_ROTATE_CORNERS: TLSelectionHandle[] = [
	'top_left_rotate',
	'top_right_rotate',
	'bottom_right_rotate',
	'bottom_left_rotate',
]

export function rotateRotateCorner(corner: RotateCorner, rotation: number): TLSelectionHandle {
	// first find out how many 90deg we need to rotate by
	rotation = rotation % PI2
	const numSteps = Math.round(rotation / (PI / 2))

	const currentIndex = ORDERED_ROTATE_CORNERS.indexOf(corner)
	return ORDERED_ROTATE_CORNERS[(currentIndex + numSteps) % ORDERED_ROTATE_CORNERS.length]
}

const box = (id: TLShapeId, x: number, y: number, w = 10, h = 10): TLShapePartial => ({
	type: 'geo',
	id,
	x,
	y,
	props: {
		w,
		h,
	},
})

const roundedPageBounds = (shapeId: TLShapeId, accuracy = 0.01) => {
	return roundedBox(editor.getShapePageBounds(shapeId)!, accuracy)
}

// function getGapAndPointLines(snaps: SnapLine[]) {
//   const gapLines = snaps.filter((snap) => snap.type === 'gaps') as GapsSnapLine[]
//   const pointLines = snaps.filter((snap) => snap.type === 'points') as PointsSnapLine[]
//   return { gapLines, pointLines }
// }

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

const ids = {
	boxA: createShapeId('boxA'),
	boxB: createShapeId('boxB'),
	boxC: createShapeId('boxC'),
	boxD: createShapeId('boxD'),

	boxX: createShapeId('boxX'),

	lineA: createShapeId('lineA'),

	iconA: createShapeId('iconA'),
}

beforeEach(() => {
	editor = new TestEditor()

	editor.createShapes([
		{
			id: ids.boxA,
			type: 'geo',
			x: 10,
			y: 10,
			props: {
				w: 100,
				h: 100,
			},
		},
		{
			id: ids.boxB,
			type: 'geo',
			parentId: ids.boxA,
			x: 100,
			y: 100,
			props: {
				w: 100,
				h: 100,
			},
		},
		{
			id: ids.boxC,
			type: 'geo',
			parentId: ids.boxA,
			x: 200,
			y: 200,
			props: {
				w: 100,
				h: 100,
			},
		},
	])
})

describe('When pointing a resizer handle...', () => {
	it('enters and exits the pointing_resize_handle state', () => {
		editor
			.select(ids.boxA)
			.pointerDown(60, 60, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.expectToBeIn('select.pointing_resize_handle')
			.pointerUp()
			.expectToBeIn('select.idle')
	})

	it('exits the pointing_resize_handle state when cancelled', () => {
		editor
			.select(ids.boxA)
			.pointerDown(60, 60, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.expectToBeIn('select.pointing_resize_handle')
			.cancel()
			.expectToBeIn('select.idle')
	})
})

describe('When dragging a resize handle...', () => {
	it('enters and exits the resizing state', () => {
		editor
			.select(ids.boxA)
			.pointerDown(60, 60, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.pointerMove(10, 10)
			.expectToBeIn('select.resizing')
	})

	it('exits the resizing state on pointer up', () => {
		editor
			.select(ids.boxA)
			.pointerDown(60, 60, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.pointerMove(10, 10)
			.pointerUp()
			.expectToBeIn('select.idle')
	})

	it('exits the resizing state when cancelled', () => {
		editor
			.select(ids.boxA)
			.pointerDown(60, 60, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.pointerMove(10, 10)
			.cancel()
			.expectToBeIn('select.idle')
	})
})

describe('When resizing...', () => {
	it('Resizes a single shape from the top left', () => {
		editor
			.select(ids.boxA)
			.pointerDown(10, 10, {
				type: 'pointer',
				target: 'selection',
				handle: 'top_left',
			})
			.expectShapeToMatch({ id: ids.boxA, x: 10, y: 10, props: { w: 100, h: 100 } })
			.pointerMove(0, 0)
			.expectShapeToMatch({ id: ids.boxA, x: 0, y: 0, props: { w: 110, h: 110 } })
	})

	it('Resizes a single shape from the top right', () => {
		editor
			.select(ids.boxA)
			.pointerDown(60, 10, {
				target: 'selection',
				handle: 'top_right',
			})
			.expectShapeToMatch({ id: ids.boxA, x: 10, y: 10, props: { w: 100, h: 100 } })
			.pointerMove(70, 0)
			.expectShapeToMatch({ id: ids.boxA, x: 10, y: 0, props: { w: 110, h: 110 } })
	})

	it('Resizes a single shape from the bottom right', () => {
		editor
			.select(ids.boxA)
			.pointerDown(60, 60, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.expectShapeToMatch({ id: ids.boxA, x: 10, y: 10, props: { w: 100, h: 100 } })
			.pointerMove(70, 70)
			.expectShapeToMatch({ id: ids.boxA, x: 10, y: 10, props: { w: 110, h: 110 } })
	})

	it('Resizes a single shape from the bottom left', () => {
		editor
			.select(ids.boxA)
			.pointerDown(10, 60, {
				target: 'selection',
				handle: 'bottom_left',
			})
			.expectShapeToMatch({ id: ids.boxA, x: 10, y: 10, props: { w: 100, h: 100 } })
			.pointerMove(0, 70)
			.expectShapeToMatch({ id: ids.boxA, x: 0, y: 10, props: { w: 110, h: 110 } })
	})
})

describe('When resizing a rotated shape...', () => {
	it.each([
		0,
		Math.PI / 2,
		// Math.PI / 4, Math.PI
	])('Resizes a shape rotated %i from the top left', (rotation) => {
		const offset = new Vec2d(10, 10)

		// Rotate the shape by $rotation from its top left corner

		editor.select(ids.boxA)

		const initialPagePoint = editor.getShapePageTransform(ids.boxA)!.point()

		const pt0 = Vec2d.From(initialPagePoint)
		const pt1 = Vec2d.RotWith(initialPagePoint, editor.selectionPageBounds!.center, rotation)
		const pt2 = Vec2d.Sub(initialPagePoint, offset).rotWith(
			editor.selectionPageBounds!.center!,
			rotation
		)

		editor
			.pointerDown(pt0.x, pt0.y, {
				target: 'selection',
				handle: 'top_left_rotate',
			})
			.pointerMove(pt1.x, pt1.y)
			.pointerUp()

		// The shape's point should now be at pt1 (it rotates from the top left corner)

		expect(editor.getShapePageTransform(ids.boxA)!.rotation()).toBeCloseTo(rotation)
		expect(editor.getShapePageTransform(ids.boxA)!.point()).toCloselyMatchObject(pt1)

		// Resize by moving the top left resize handle to pt2. Should be a delta of [10, 10].

		expect(Vec2d.Dist(editor.getShapePageTransform(ids.boxA)!.point(), pt2)).toBeCloseTo(
			offset.len()
		)

		editor
			.pointerDown(pt1.x, pt1.y, {
				target: 'selection',
				handle: 'top_left',
			})
			.pointerMove(pt2.x, pt2.y)
			.pointerUp()

		// The shape should have moved its point to pt2 and be delta bigger.

		expect(editor.getShapePageTransform(ids.boxA)!.point()).toCloselyMatchObject(pt2)
		editor.expectShapeToMatch({ id: ids.boxA, props: { w: 110, h: 110 } })
	})
})

describe('When resizing mulitple shapes...', () => {
	it.each([
		[0, 0, 0, 0],
		[10, 10, 0, 0],
		[0, 0, Math.PI, 0],
		[10, 10, 0, Math.PI / 4],
	])(
		'Resizes B and C when: \n\tA = { x: %s, y: %s, rotation: %s }\n\tB = { rotation: %s }',
		(x, y, rotation, rotationB) => {
			const shapeA = editor.getShape(ids.boxA)!
			const shapeB = editor.getShape(ids.boxB)!
			const shapeC = editor.getShape(ids.boxC)!

			editor.updateShapes([
				{
					id: ids.boxA,
					type: 'geo',
					x,
					y,
					rotation,
				},
				{
					id: ids.boxB,
					parentId: ids.boxA,
					type: 'geo',
					x: 100,
					y: 100,
					rotation: rotationB,
				},
				{
					id: ids.boxC,
					parentId: ids.boxA,
					type: 'geo',
					x: 200,
					y: 200,
					rotation: rotationB,
				},
			])

			// Rotate the shape by $rotation from its top left corner

			const rotateStart = editor.getShapePageTransform(ids.boxA)!.point()
			const rotateCenter = editor.getPageCenter(shapeA)!
			const rotateEnd = Vec2d.RotWith(rotateStart, rotateCenter, rotation)

			editor
				.select(ids.boxA)
				.pointerDown(rotateStart.x, rotateStart.y, {
					target: 'selection',
					handle: rotateRotateCorner('top_left_rotate', -editor.selectionRotation),
				})
				.pointerMove(rotateEnd.x, rotateEnd.y)
				.pointerUp()

			expect(canonicalizeRotation(shapeA.rotation) % Math.PI).toBeCloseTo(
				canonicalizeRotation(rotation) % Math.PI
			)
			expect(editor.getPageRotation(shapeB)).toBeCloseTo(rotation + rotationB)
			expect(editor.getPageRotation(shapeC)).toBeCloseTo(rotation + rotationB)

			editor.select(ids.boxB, ids.boxC)

			// Now drag to resize the selection bounds

			const initialBounds = editor.selectionPageBounds!

			// oddly rotated shapes maintain aspect ratio when being resized (for now)
			const aspectRatio = initialBounds.width / initialBounds.height
			const offsetX = initialBounds.width + 200
			const offset = new Vec2d(offsetX, offsetX / aspectRatio)
			const resizeStart = initialBounds.point
			const resizeEnd = Vec2d.Sub(resizeStart, offset)

			expect(Vec2d.Dist(resizeStart, resizeEnd)).toBeCloseTo(offset.len())
			expect(
				Vec2d.Min(
					editor.getShapePageBounds(shapeB)!.point,
					editor.getShapePageBounds(shapeC)!.point
				)
			).toCloselyMatchObject(resizeStart)

			editor
				.pointerDown(resizeStart.x, resizeStart.y, {
					target: 'selection',
					handle: rotateSelectionHandle('top_left', -editor.selectionRotation),
				})
				.pointerMove(resizeStart.x - 10, resizeStart.y - 10)
				.pointerMove(resizeEnd.x, resizeEnd.y)
				.pointerUp()

			expect(editor.selectionPageBounds!.point).toCloselyMatchObject(resizeEnd)
			expect(new Vec2d(initialBounds.maxX, initialBounds.maxY)).toCloselyMatchObject(
				new Vec2d(editor.selectionPageBounds!.maxX, editor.selectionPageBounds!.maxY)
			)
		}
	)
})

describe('Reisizing a selection of multiple shapes', () => {
	beforeEach(() => {
		//    0          10        20         30
		//
		//     ┌──────────┐
		//     │          │
		//     │          │
		//     │    A     │
		//     │          │
		//     │          │
		// 10  └──────────┘
		//
		//
		//
		//
		// 20                       ┌──────────┐
		//                          │          │
		//                          │          │
		//                          │    B     │
		//                          │          │
		//                          │          │
		// 30                       └──────────┘
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 20)])
	})
	it('works correctly when the shapes are not rotated', () => {
		editor.select(ids.boxA, ids.boxB)
		// shrink

		// 0                 15
		// ┌──────────────────┐
		// │  ┌───┐           │
		// │  │ A │           │
		// │  └───┘           │
		// │                  │
		// │           ┌───┐  │
		// │           │ B │  │
		// │           └───┘  │
		// └──────────────────O

		editor.pointerDown(30, 30, { target: 'selection', handle: 'bottom_right' })
		editor.pointerMove(15, 15)

		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({ w: 15, h: 15 })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 0, y: 0, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 10, y: 10, w: 5, h: 5 })

		// strech horizontally

		//  0                       20               40                     60
		//
		//  ┌──────────────────────────────────────────────────────────────────┐
		//  │ ┌───────────────────────┐                                        │
		//  │ │                       │                                        │
		//  │ │           A           │                                        │
		//  │ │                       │                                        │
		//  │ └───────────────────────┘                                        │
		//  │                                                                  │
		//  │                                                                  │
		//  │                                        ┌───────────────────────┐ │
		//  │                                        │                       │ │
		//  │                                        │           B           │ │
		//  │                                        │                       │ │
		//  │                                        └───────────────────────┘ │
		//  └──────────────────────────────────────────────────────────────────O

		editor.pointerMove(60, 30)
		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({ w: 60, h: 30 })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 0, y: 0, w: 20, h: 10 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 40, y: 20, w: 20, h: 10 })
		// stretch vertically
		//        0          10        20         30
		//       ┌─────────────────────────────────┐
		//       │ ┌──────────┐                    │
		//       │ │          │                    │
		//       │ │          │                    │
		//       │ │          │                    │
		//       │ │          │                    │
		//       │ │    A     │                    │
		//       │ │          │                    │
		//       │ │          │                    │
		//       │ │          │                    │
		// 20    │ └──────────┘                    │
		//       │                                 │
		//       │                                 │
		//       │                                 │
		//       │                                 │
		//       │                                 │
		//       │                                 │
		//       │                                 │
		// 40    │                    ┌──────────┐ │
		//       │                    │          │ │
		//       │                    │          │ │
		//       │                    │          │ │
		//       │                    │     B    │ │
		//       │                    │          │ │
		//       │                    │          │ │
		//       │                    │          │ │
		//       │                    │          │ │
		// 60    │                    └──────────┘ │
		//       └─────────────────────────────────O
		editor.pointerMove(30, 60)
		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({ w: 30, h: 60 })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 0, y: 0, w: 10, h: 20 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 20, y: 40, w: 10, h: 20 })

		// invert + shrink

		// -15               0
		//   O───────────────┐
		//   │ ┌───┐         │
		//   │ │ B │         │
		//   │ └───┘         │
		//   │               │
		//   │         ┌───┐ │
		//   │         │ A │ │
		//   │         └───┘ │
		//   └───────────────┘
		editor.pointerMove(-15, -15)
		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({ w: 15, h: 15 })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: -5, y: -5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: -15, y: -15, w: 5, h: 5 })

		// resize from center

		//       -15        5    15  25         45
		//     ┌───────────────────────────────────┐
		//     │ ┌──────────┐                      │
		//     │ │          │                      │
		//     │ │    A     │                      │
		//     │ │          │                      │
		//     │ └──────────┘                      │
		//     │                                   │
		//     │                 x                 │
		//     │                                   │
		//     │                      ┌──────────┐ │
		//     │                      │          │ │
		//     │                      │    B     │ │
		//     │                      │          │ │
		//     │                      └──────────┘ │
		//     └───────────────────────────────────O
		editor.pointerMove(45, 45, { altKey: true })

		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({
			w: 60,
			h: 60,
			x: -15,
			y: -15,
		})
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: -15, y: -15, w: 20, h: 20 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 25, y: 25, w: 20, h: 20 })

		// resize with aspect ratio locked

		// 0                 15
		// ┌──────────────────┐
		// │  ┌───┐           │
		// │  │ A │           │
		// │  └───┘           │
		// │                  │ <- mouse is here
		// │           ┌───┐  │
		// │           │ B │  │
		// │           └───┘  │
		// └──────────────────O

		editor.pointerMove(15, 8, { altKey: false, shiftKey: true })
		jest.advanceTimersByTime(200)

		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({ w: 15, h: 15 })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 0, y: 0, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 10, y: 10, w: 5, h: 5 })

		// resize from center with aspect ratio locked

		//       -15        5    15  25         45
		//     ┌───────────────────────────────────┐
		//     │ ┌──────────┐                      │
		//     │ │          │                      │
		//     │ │    A     │                      │
		//     │ │          │                      │
		//     │ └──────────┘                      │
		//     │                                   │
		//     │                 x                 │ <- mouse is here
		//     │                                   │
		//     │                      ┌──────────┐ │
		//     │                      │          │ │
		//     │                      │    B     │ │
		//     │                      │          │ │
		//     │                      └──────────┘ │
		//     └───────────────────────────────────O
		editor.pointerMove(45, 16, { altKey: true, shiftKey: true })
		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({
			w: 60,
			h: 60,
			x: -15,
			y: -15,
		})
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: -15, y: -15, w: 20, h: 20 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 25, y: 25, w: 20, h: 20 })
	})

	it('works the same when shapes are rotated by a multiple of 90 degrees', () => {
		// rotate A by 90 degrees
		editor.select(ids.boxA)
		editor.pointerDown(0, 0, { target: 'selection', handle: 'top_left_rotate' })
		editor.pointerMove(10, 0, { shiftKey: true })
		editor.pointerUp(10, 0, { shiftKey: false })

		expect(editor.getShape(ids.boxA)!.rotation).toBeCloseTo(PI / 2)

		// rotate B by -90 degrees
		editor.select(ids.boxB)
		editor.pointerDown(30, 20, { target: 'selection', handle: 'top_left_rotate' })
		editor.pointerMove(20, 20, { shiftKey: true })
		editor.pointerUp(20, 20, { shiftKey: false })
		jest.advanceTimersByTime(200)

		expect(editor.getShape(ids.boxB)!.rotation).toBeCloseTo(canonicalizeRotation(-PI / 2))

		editor.select(ids.boxA, ids.boxB)
		// shrink

		// 0                 15
		// ┌──────────────────┐
		// │  ┌───┐           │
		// │  │ A │           │
		// │  └───┘           │
		// │                  │
		// │           ┌───┐  │
		// │           │ B │  │
		// │           └───┘  │
		// └──────────────────O

		editor.pointerDown(30, 30, {
			target: 'selection',
			handle: rotateSelectionHandle('bottom_right', -editor.selectionRotation),
		})
		editor.pointerMove(15, 15)

		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 0, y: 0, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 10, y: 10, w: 5, h: 5 })

		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({ w: 15, h: 15 })

		// strech horizontally

		//  0                       20               40                     60
		//
		//  ┌──────────────────────────────────────────────────────────────────┐
		//  │ ┌───────────────────────┐                                        │
		//  │ │                       │                                        │
		//  │ │           A           │                                        │
		//  │ │                       │                                        │
		//  │ └───────────────────────┘                                        │
		//  │                                                                  │
		//  │                                                                  │
		//  │                                        ┌───────────────────────┐ │
		//  │                                        │                       │ │
		//  │                                        │           B           │ │
		//  │                                        │                       │ │
		//  │                                        └───────────────────────┘ │
		//  └──────────────────────────────────────────────────────────────────O

		editor.pointerMove(60, 30)
		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({ w: 60, h: 30 })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 0, y: 0, w: 20, h: 10 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 40, y: 20, w: 20, h: 10 })
		// stretch vertically
		//        0          10        20         30
		//       ┌─────────────────────────────────┐
		//       │ ┌──────────┐                    │
		//       │ │          │                    │
		//       │ │          │                    │
		//       │ │          │                    │
		//       │ │          │                    │
		//       │ │    A     │                    │
		//       │ │          │                    │
		//       │ │          │                    │
		//       │ │          │                    │
		// 20    │ └──────────┘                    │
		//       │                                 │
		//       │                                 │
		//       │                                 │
		//       │                                 │
		//       │                                 │
		//       │                                 │
		//       │                                 │
		// 40    │                    ┌──────────┐ │
		//       │                    │          │ │
		//       │                    │          │ │
		//       │                    │          │ │
		//       │                    │     B    │ │
		//       │                    │          │ │
		//       │                    │          │ │
		//       │                    │          │ │
		//       │                    │          │ │
		// 60    │                    └──────────┘ │
		//       └─────────────────────────────────O
		editor.pointerMove(30, 60)
		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({ w: 30, h: 60 })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 0, y: 0, w: 10, h: 20 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 20, y: 40, w: 10, h: 20 })

		// invert + shrink

		// -15               0
		//   O───────────────┐
		//   │ ┌───┐         │
		//   │ │ B │         │
		//   │ └───┘         │
		//   │               │
		//   │         ┌───┐ │
		//   │         │ A │ │
		//   │         └───┘ │
		//   └───────────────┘
		editor.pointerMove(-15, -15)
		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({ w: 15, h: 15 })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: -5, y: -5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: -15, y: -15, w: 5, h: 5 })

		// resize from center

		//       -15        5    15  25         45
		//     ┌───────────────────────────────────┐
		//     │ ┌──────────┐                      │
		//     │ │          │                      │
		//     │ │    A     │                      │
		//     │ │          │                      │
		//     │ └──────────┘                      │
		//     │                                   │
		//     │                 x                 │
		//     │                                   │
		//     │                      ┌──────────┐ │
		//     │                      │          │ │
		//     │                      │    B     │ │
		//     │                      │          │ │
		//     │                      └──────────┘ │
		//     └───────────────────────────────────O
		editor.pointerMove(45, 45, { altKey: true })
		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({
			w: 60,
			h: 60,
			x: -15,
			y: -15,
		})
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: -15, y: -15, w: 20, h: 20 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 25, y: 25, w: 20, h: 20 })

		// resize with aspect ratio locked

		// 0                 15
		// ┌──────────────────┐
		// │  ┌───┐           │
		// │  │ A │           │
		// │  └───┘           │
		// │                  │ <- mouse is here
		// │           ┌───┐  │
		// │           │ B │  │
		// │           └───┘  │
		// └──────────────────O

		editor.pointerMove(15, 8, { altKey: false, shiftKey: true })
		jest.advanceTimersByTime(200)

		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({ w: 15, h: 15 })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 0, y: 0, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 10, y: 10, w: 5, h: 5 })

		// resize from center with aspect ratio locked

		//       -15        5    15  25         45
		//     ┌───────────────────────────────────┐
		//     │ ┌──────────┐                      │
		//     │ │          │                      │
		//     │ │    A     │                      │
		//     │ │          │                      │
		//     │ └──────────┘                      │
		//     │                                   │
		//     │                 x                 │ <- mouse is here
		//     │                                   │
		//     │                      ┌──────────┐ │
		//     │                      │          │ │
		//     │                      │    B     │ │
		//     │                      │          │ │
		//     │                      └──────────┘ │
		//     └───────────────────────────────────O
		editor.pointerMove(45, 16, { altKey: true, shiftKey: true })
		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({
			w: 60,
			h: 60,
			x: -15,
			y: -15,
		})
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: -15, y: -15, w: 20, h: 20 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 25, y: 25, w: 20, h: 20 })
	})
	it('will not change the apsect ratio on shapes that have been rotated by some number that is not a multiple of 90 degrees', () => {
		// rotate B a tiny bit
		editor.select(ids.boxB)
		editor.pointerDown(30, 20, { target: 'selection', handle: 'top_left_rotate' })
		editor.pointerMove(30, 21)
		editor.pointerUp(30, 21)
		// strech horizontally

		//  0                       20               40                     60
		//  ┌──────────────────────────────────────────────────────────────────┐
		//  │ ┌───────────────────────┐                                        │
		//  │ │                       │                                        │
		//  │ │           A           │                                        │
		//  │ │                       │                                        │
		//  │ └───────────────────────┘                                        │
		//  │                                                                  │
		//  │                                                                  │
		//  │                                                   ┌────────────┐ │
		//  │                                                   │            │ │
		//  │                                                   │     B      │ │
		//  │                                                   │            │ │
		//  │                                                   └────────────┘ │
		//  └──────────────────────────────────────────────────────────────────O

		editor.select(ids.boxA, ids.boxB)
		editor.pointerDown(30, 30, { target: 'selection', handle: 'bottom_right' })
		editor.pointerMove(60, 30)
		expect(roundedBox(editor.selectionPageBounds!)).toMatchObject({ w: 60, h: 30 })
		// A should stretch
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 0, y: 0, w: 20, h: 10 })
		// B should not
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ w: 20, h: 10 })
	})
})

describe('When resizing a shape with children', () => {
	it("Offsets children when the shape's top left corner changes", () => {
		editor
			.updateShapes([
				{
					id: ids.boxC,
					type: 'geo',
					parentId: ids.boxB,
				},
			])
			.select(ids.boxA)
			.pointerDown(10, 10, {
				target: 'selection',
				handle: 'top_left',
			})
			.pointerMove(0, 0)
			// A's model should have changed by the offset
			.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			// B's model should have changed by the offset
			.expectShapeToMatch({
				id: ids.boxB,
				x: 110,
				y: 110,
			})
			// C's model should also have changed
			.expectShapeToMatch({
				id: ids.boxC,
				x: 220,
				y: 220,
			})
	})

	it('Offsets children when the shape is rotated', () => {
		editor
			.updateShapes([
				{
					id: ids.boxA,
					type: 'geo',
					rotation: Math.PI,
				},
			])
			.select(ids.boxA)
			.pointerDown(10, 10, {
				target: 'selection',
				handle: 'top_left',
			})
			.pointerMove(0, 0)
			.expectPathToBe('root.select.resizing')
			// A's model should have changed by the offset
			.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			// B's model should have changed by the offset
			.expectShapeToMatch({
				id: ids.boxB,
				x: 90,
				y: 90,
			})
	})

	it('Resizes a rotated draw shape', () => {
		editor
			.updateShapes([
				{
					id: ids.boxA,
					type: 'geo',
					rotation: 0,
					x: 10,
					y: 10,
				},
				{
					id: ids.boxB,
					type: 'geo',
					parentId: ids.boxA,
					rotation: 0,
					x: 0,
					y: 0,
				},
			])
			.createShapes([
				{
					id: ids.lineA,
					parentId: ids.boxA,
					rotation: Math.PI,
					type: 'draw',
					x: 100,
					y: 100,
					props: {
						segments: [
							{
								type: 'free',
								points: [
									{ x: 0, y: 0, z: 0.5 },
									{ x: 100, y: 100, z: 0.5 },
								],
							},
						],
					},
				},
			])
			.select(ids.boxB, ids.lineA)

		editor
			.pointerDown(10, 10, {
				target: 'selection',
				handle: 'top_left',
			})
			.pointerMove(0, 0)
			// .pointerMove(10, 10)
			.expectPathToBe('root.select.resizing')
			// A's model should have changed by the offset
			.expectShapeToMatch({
				id: ids.boxB,
				x: -10,
				y: -10,
			})
		// B's model should have changed by the offset

		expect(editor.getShape(ids.lineA)).toMatchSnapshot('draw shape after rotating')
	})
})

function getGapAndPointLines() {
	const gapLines = editor.snaps.lines.filter((snap) => snap.type === 'gaps') as GapsSnapLine[]
	const pointLines = editor.snaps.lines.filter((snap) => snap.type === 'points') as PointsSnapLine[]
	return { gapLines, pointLines }
}

describe('snapping while resizing', () => {
	beforeEach(() => {
		//     0 40 60          160 180
		//
		//   0       ┌────────────┐
		//           │      A     │
		//  40       └────────────┘
		//
		//  60 ┌──┐    80     140    ┌──┐
		//     │D │  80 ┌──────┐     │B │
		//     │  │     │      │     │  │
		//     │  │     │  X   │     │  │
		//     │  │     │      │     │  │
		//     │  │ 140 └──────┘     │  │
		// 160 └──┘                  └──┘
		//
		// 180       ┌────────────┐
		//           │ C          │
		//           └────────────┘

		editor.createShapes([
			box(ids.boxA, 60, 0, 100, 40),
			box(ids.boxB, 180, 60, 40, 100),
			box(ids.boxC, 60, 180, 100, 40),
			box(ids.boxD, 0, 60, 40, 100),
			box(ids.boxX, 80, 80, 60, 60),
		])
	})

	it('works for dragging the top edge', () => {
		// snap to top edges of D and B
		editor
			.select(ids.boxX)
			.pointerDown(115, 80, {
				target: 'selection',
				handle: 'top',
			})
			.pointerMove(115, 59, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 80, y: 60, props: { w: 60, h: 80 } })
		expect(editor.snaps.lines.length).toBe(1)

		// moving the mouse horizontally should not change things
		editor.pointerMove(15, 65, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 80, y: 60, props: { w: 60, h: 80 } })
		expect(editor.snaps.lines.length).toBe(1)

		expect(getGapAndPointLines().pointLines[0].points).toHaveLength(6)

		// snap to bottom edge of A
		editor.pointerMove(15, 43, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 80, y: 40, props: { w: 60, h: 100 } })
		expect(editor.snaps.lines.length).toBe(1)

		expect(getGapAndPointLines().pointLines[0].points).toHaveLength(4)
	})

	it('works for dragging the right edge', () => {
		// Snap to right edges of A and C

		editor
			.select(ids.boxX)
			.pointerDown(140, 115, {
				target: 'selection',
				handle: 'right',
			})
			.pointerMove(156, 115, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 80, y: 80, props: { w: 80, h: 60 } })
		expect(editor.snaps.lines.length).toBe(1)

		expect(getGapAndPointLines().pointLines[0].points).toHaveLength(6)

		// moving the mouse vertically should not change things
		editor.pointerMove(156, 180, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 80, y: 80, props: { w: 80, h: 60 } })

		// snap to left edge of B
		editor.pointerMove(173, 280, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 80, y: 80, props: { w: 100, h: 60 } })
		expect(editor.snaps.lines.length).toBe(1)
		expect(getGapAndPointLines().pointLines[0].points).toHaveLength(4)
	})

	it('works for dragging the bottom edge', () => {
		// snap to bottom edges of B and D
		editor
			.select(ids.boxX)
			.pointerDown(115, 140, {
				target: 'selection',
				handle: 'bottom',
			})
			.pointerMove(115, 159, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 80, y: 80, props: { w: 60, h: 80 } })
		expect(editor.snaps.lines.length).toBe(1)

		expect(getGapAndPointLines().pointLines[0].points).toHaveLength(6)

		// changing horzontal mouse position should not change things
		editor.pointerMove(315, 163, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 80, y: 80, props: { w: 60, h: 80 } })
		expect(editor.snaps.lines.length).toBe(1)

		// snap to top edge of C
		editor.pointerMove(115, 183, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 80, y: 80, props: { w: 60, h: 100 } })
		expect(editor.snaps.lines.length).toBe(1)

		expect(getGapAndPointLines().pointLines[0].points).toHaveLength(4)
	})

	it('works for dragging the left edge', () => {
		// snap to left edges of A and C
		editor
			.select(ids.boxX)
			.pointerDown(80, 115, {
				target: 'selection',
				handle: 'left',
			})
			.pointerMove(59, 115, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 60, y: 80, props: { w: 80, h: 60 } })

		expect(editor.snaps.lines.length).toBe(1)
		expect(getGapAndPointLines().pointLines[0].points).toHaveLength(6)

		// moving the mouse vertically should not change things
		editor.pointerMove(63, 180, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 60, y: 80, props: { w: 80, h: 60 } })

		// snap to right edge of D
		editor.pointerMove(39, 280, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 40, y: 80, props: { w: 100, h: 60 } })

		expect(editor.snaps.lines.length).toBe(1)
		expect(getGapAndPointLines().pointLines[0].points).toHaveLength(4)
	})
	it('works for dragging the top left corner', () => {
		// snap to left edges of A and C
		//           x ┌───────────────────────────┐
		//           │ │     A                     │
		//           │ │                           │
		//           x └───────────────────────────┘
		//           │
		//           │
		// ┌─────┐   │
		// │     │   │
		// │     │   x O────────────────┐
		// │  D  │   │ │                │
		// │     │   │ │                │
		// │     │   │ │      X         │
		// │     │   │ │                │
		// │     │   │ │                │
		// │     │   x └────────────────┘
		// │     │   │
		// └─────┘   │
		//           │
		//           │
		//           x ┌───────────────────────────┐
		//           │ │     c                     │
		//           │ │                           │
		//           x └───────────────────────────┘

		editor.select(ids.boxX).pointerDown(80, 80, {
			target: 'selection',
			handle: 'top_left',
		})

		editor.pointerMove(62, 81, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 60, y: 81, props: { w: 80, h: 59 } })

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "60,0 60,40 60,81 60,140 60,180 60,220",
      ]
    `)

		// snap to top edges of B and D
		//
		//             ┌────────────────────┐
		//             │                    │
		//             │     A              │
		//             │                    │
		//             └────────────────────┘
		//
		// x─────x────────x─────────────x─────────x─────x
		// ┌─────┐        O─────────────┐         ┌─────┐
		// │     │        │             │         │     │
		// │     │        │             │         │     │
		// │  D  │        │             │         │  B  │
		// │     │        │     X       │         │     │
		// │     │        │             │         │     │
		// │     │        │             │         │     │
		// │     │        │             │         │     │
		// │     │        └─────────────┘         │     │
		// │     │                                │     │
		// │     │                                │     │
		// └─────┘                                └─────┘
		//
		//             ┌────────────────────┐
		//             │                    │
		//             │     C              │
		//             │                    │
		//             └────────────────────┘
		editor.pointerMove(81, 58, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 81, y: 60, props: { w: 59, h: 80 } })

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "0,60 40,60 81,60 140,60 180,60 220,60",
      ]
    `)

		// sanp to both at the same time
		//           x ┌────────────────────┐
		//           │ │                    │
		//           │ │     A              │
		//           │ │                    │
		//           x └────────────────────┘
		//           │
		// x─────x───x──────────────────x─────────x─────x
		// ┌─────┐   │ O────────────────┐         ┌─────┐
		// │     │   │ │                │         │     │
		// │     │   │ │                │         │     │
		// │  D  │   │ │                │         │  B  │
		// │     │   │ │        X       │         │     │
		// │     │   │ │                │         │     │
		// │     │   │ │                │         │     │
		// │     │   │ │                │         │     │
		// │     │   x └────────────────┘         │     │
		// │     │   │                            │     │
		// │     │   │                            │     │
		// └─────┘   │                            └─────┘
		//           │
		//           x ┌────────────────────┐
		//           │ │                    │
		//           │ │     C              │
		//           │ │                    │
		//           x └────────────────────┘
		editor.pointerMove(59, 62, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 60, y: 60, props: { w: 80, h: 80 } })

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "0,60 40,60 60,60 140,60 180,60 220,60",
        "60,0 60,40 60,60 60,140 60,180 60,220",
      ]
    `)
	})
	it('works for dragging the top right corner', () => {
		//             ┌────────────────────┐ x
		//             │                    │ │
		//             │     A              │ │
		//             │                    │ │
		//             └────────────────────┘ x
		//                                    │
		// x─────x──────────x─────────────────x───x─────x
		// ┌─────┐          ┌───────────────O │   ┌─────┐
		// │     │          │               │ │   │     │
		// │     │          │               │ │   │     │
		// │  D  │          │               │ │   │  B  │
		// │     │          │   X           │ │   │     │
		// │     │          │               │ │   │     │
		// │     │          │               │ │   │     │
		// │     │          │               │ │   │     │
		// │     │          └───────────────┘ x   │     │
		// │     │                            │   │     │
		// │     │                            │   │     │
		// └─────┘                            │   └─────┘
		//                                    │
		//             ┌────────────────────┐ x
		//             │                    │ │
		//             │     C              │ │
		//             │                    │ │
		//             └────────────────────┘ x

		editor
			.select(ids.boxX)
			.pointerDown(140, 80, {
				target: 'selection',
				handle: 'top_right',
			})
			.pointerMove(161, 59, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 80, y: 60, props: { w: 80, h: 80 } })
	})
	it('works for dragging the bottom right corner', () => {
		//             ┌────────────────────┐ x
		//             │                    │ │
		//             │     A              │ │
		//             │                    │ │
		//             └────────────────────┘ x
		//                                    │
		//                                    │
		//                                    │
		// ┌─────┐                            │   ┌─────┐
		// │     │                            │   │     │
		// │     │          ┌───────────────┐ x   │     │
		// │  D  │          │               │ │   │  B  │
		// │     │          │   X           │ │   │     │
		// │     │          │               │ │   │     │
		// │     │          │               │ │   │     │
		// │     │          │               │ │   │     │
		// │     │          │               │ │   │     │
		// │     │          │               │ │   │     │
		// │     │          │               │ │   │     │
		// └─────┘          └───────────────O │   └─────┘
		// x─────x──────────x─────────────────x───x─────x
		//             ┌────────────────────┐ x
		//             │                    │ │
		//             │     C              │ │
		//             │                    │ │
		//             └────────────────────┘ x

		editor
			.select(ids.boxX)
			.pointerDown(140, 140, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.pointerMove(161, 159, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 80, y: 80, props: { w: 80, h: 80 } })
	})
	it('works for dragging the bottom left corner', () => {
		//           x ┌────────────────────┐
		//           │ │                    │
		//           │ │     A              │
		//           │ │                    │
		//           x └────────────────────┘
		//           │
		//           │
		//           │
		// ┌─────┐   │                            ┌─────┐
		// │     │   │                            │     │
		// │     │   x ┌────────────────┐         │     │
		// │  D  │   │ │                │         │  B  │
		// │     │   │ │        X       │         │     │
		// │     │   │ │                │         │     │
		// │     │   │ │                │         │     │
		// │     │   │ │                │         │     │
		// │     │   │ │                │         │     │
		// │     │   │ │                │         │     │
		// │     │   │ │                │         │     │
		// └─────┘   │ O────────────────┘         └─────┘
		// x─────x───x──────────────────x─────────x─────x
		//           │
		//           x ┌────────────────────┐
		//           │ │                    │
		//           │ │     C              │
		//           │ │                    │
		//           x └────────────────────┘

		editor
			.select(ids.boxX)
			.pointerDown(80, 140, {
				target: 'selection',
				handle: 'bottom_left',
			})
			.pointerMove(59, 159, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 60, y: 80, props: { w: 80, h: 80 } })
	})
})

describe('snapping while resizing from center', () => {
	beforeEach(() => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40           ┌─────────────┐
		//               │             │
		//  60  ┌───┐    │             │    ┌───┐
		//      │ D │    │      X      │    │ B │
		//  80  └───┘    │             │    └───┘
		//               │             │
		// 100           └─────────────┘
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘

		editor.createShapes([
			box(ids.boxA, 60, 0, 20, 20),
			box(ids.boxB, 120, 60, 20, 20),
			box(ids.boxC, 60, 120, 20, 20),
			box(ids.boxD, 0, 60, 20, 20),
			box(ids.boxX, 40, 40, 60, 60),
		])
	})
	it('should work from the top', () => {
		editor
			.select(ids.boxX)
			.pointerDown(70, 40, {
				target: 'selection',
				handle: 'top',
			})
			.pointerMove(70, 21, { ctrlKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 40,
			y: 20,
			props: { w: 60, h: 100 },
		})
		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "40,120 60,120 80,120 100,120",
        "40,20 60,20 80,20 100,20",
      ]
    `)
	})
	it('should work from the right', () => {
		editor
			.select(ids.boxX)
			.pointerDown(100, 70, {
				target: 'selection',
				handle: 'right',
			})
			.pointerMove(121, 70, { ctrlKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 40,
			props: { w: 100, h: 60 },
		})
	})
	it('should work from the bottom', () => {
		editor
			.select(ids.boxX)
			.pointerDown(70, 100, {
				target: 'selection',
				handle: 'bottom',
			})
			.pointerMove(70, 121, { ctrlKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 40,
			y: 20,
			props: { w: 60, h: 100 },
		})
	})
	it('should work from the left', () => {
		editor
			.select(ids.boxX)
			.pointerDown(40, 70, {
				target: 'selection',
				handle: 'left',
			})
			.pointerMove(21, 70, { ctrlKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 40,
			props: { w: 100, h: 60 },
		})
	})

	it('should work from the top right', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40      x───────────────────────O
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      x───────────────────────x
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(100, 40, {
				target: 'selection',
				handle: 'top_right',
			})
			.pointerMove(123, 40, { ctrlKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 40,
			props: { w: 100, h: 60 },
		})
		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,40 120,60 120,80 120,100",
        "20,40 20,60 20,80 20,100",
      ]
    `)
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      x─────────x───x─────────O
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      x─────────x───x─────────x
		//                    │ C │
		// 140                └───┘
		editor.pointerMove(123, 18, { ctrlKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 20,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,20 120,60 120,80 120,120",
        "20,120 60,120 80,120 120,120",
        "20,20 20,60 20,80 20,120",
        "20,20 60,20 80,20 120,20",
      ]
    `)
	})
	it('should work from the bottom right', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40      x───────────────────────x
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      x───────────────────────O
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(100, 100, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.pointerMove(123, 100, { ctrlKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 40,
			props: { w: 100, h: 60 },
		})

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,40 120,60 120,80 120,100",
        "20,40 20,60 20,80 20,100",
      ]
    `)

		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      x─────────x───x─────────x
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      x─────────x───x─────────O
		//                    │ C │
		// 140                └───┘
		editor.pointerMove(123, 118, { ctrlKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 20,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,20 120,60 120,80 120,120",
        "20,120 60,120 80,120 120,120",
        "20,20 20,60 20,80 20,120",
        "20,20 60,20 80,20 120,20",
      ]
    `)
	})
	it('should work from the bottom left', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40      x───────────────────────x
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      O───────────────────────x
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(40, 100, {
				target: 'selection',
				handle: 'bottom_left',
			})
			.pointerMove(23, 100, { ctrlKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 40,
			props: { w: 100, h: 60 },
		})

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,40 120,60 120,80 120,100",
        "20,40 20,60 20,80 20,100",
      ]
    `)

		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      x─────────x───x─────────x
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      O─────────x───x─────────x
		//                    │ C │
		// 140                └───┘

		editor.pointerMove(23, 118, { ctrlKey: true, altKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 20,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,20 120,60 120,80 120,120",
        "20,120 60,120 80,120 120,120",
        "20,20 20,60 20,80 20,120",
        "20,20 60,20 80,20 120,20",
      ]
    `)
	})
	it('should work from the top left', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40      O───────────────────────x
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      x───────────────────────x
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(40, 40, {
				target: 'selection',
				handle: 'top_left',
			})
			.pointerMove(23, 40, { ctrlKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 40,
			props: { w: 100, h: 60 },
		})

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,40 120,60 120,80 120,100",
        "20,40 20,60 20,80 20,100",
      ]
    `)

		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      O─────────x───x─────────x
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      x─────────x───x─────────x
		//                    │ C │
		// 140                └───┘

		editor.pointerMove(23, 19, { ctrlKey: true, altKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 20,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,20 120,60 120,80 120,120",
        "20,120 60,120 80,120 120,120",
        "20,20 20,60 20,80 20,120",
        "20,20 60,20 80,20 120,20",
      ]
    `)
	})
})

describe('snapping while resizing with aspect ratio locked', () => {
	beforeEach(() => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40           ┌─────────────┐
		//               │             │
		//  60  ┌───┐    │             │    ┌───┐
		//      │ D │    │      X      │    │ B │
		//  80  └───┘    │             │    └───┘
		//               │             │
		// 100           └─────────────┘
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘

		editor.createShapes([
			box(ids.boxA, 60, 0, 20, 20),
			box(ids.boxB, 120, 60, 20, 20),
			box(ids.boxC, 60, 120, 20, 20),
			box(ids.boxD, 0, 60, 20, 20),
			box(ids.boxX, 40, 40, 60, 60),
		])
	})
	it('should work from the top', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20         x──────x─O─x──────x
		//             │                 │
		//  40         │                 │
		//             │                 │
		//  60  ┌───┐  │                 │  ┌───┐
		//      │ D │  │        X        │  │ B │
		//  80  └───┘  │                 │  └───┘
		//             │                 │
		// 100         └─────────────────┘
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(70, 40, {
				target: 'selection',
				handle: 'top',
			})
			.pointerMove(70, 18, { ctrlKey: true, shiftKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 30, y: 20, props: { w: 80, h: 80 } })
		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "30,20 60,20 80,20 110,20",
      ]
    `)
	})

	it('should work from the right', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//               ┌──────────────────x
		//  40           │                  │
		//               │                  │
		//  60  ┌───┐    │                  x───┐
		//      │ D │    │      X           O B │
		//  80  └───┘    │                  x───┘
		//               │                  │
		// 100           │                  │
		//               └──────────────────x
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(100, 70, {
				target: 'selection',
				handle: 'right',
			})
			.pointerMove(123, 79, { ctrlKey: true, shiftKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 40, y: 30, props: { w: 80, h: 80 } })

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,30 120,60 120,80 120,110",
      ]
    `)
	})

	it('should work from the bottom', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40         ┌─────────────────┐
		//             │                 │
		//  60  ┌───┐  │                 │  ┌───┐
		//      │ D │  │        X        │  │ B │
		//  80  └───┘  │                 │  └───┘
		//             │                 │
		// 100         │                 │
		//             │                 │
		// 120         x──────x─O─x──────x
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(70, 100, {
				target: 'selection',
				handle: 'bottom',
			})
			.pointerMove(70, 123, { ctrlKey: true, shiftKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 30, y: 40, props: { w: 80, h: 80 } })

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "30,120 60,120 80,120 110,120",
      ]
    `)
	})
	it('should work from the left', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//          x──────────────────┐
		//  40      │                  │
		//          │                  │
		//  60  ┌───x                  │    ┌───┐
		//      │ D O           X      │    │ B │
		//  80  └───x                  │    └───┘
		//          │                  │
		// 100      │                  │
		//          x──────────────────┘
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘

		editor
			.select(ids.boxX)
			.pointerDown(40, 70, {
				target: 'selection',
				handle: 'left',
			})
			.pointerMove(18, 70, { ctrlKey: true, shiftKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 20, y: 30, props: { w: 80, h: 80 } })

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "20,30 20,60 20,80 20,110",
      ]
    `)
	})
	it('should work from the top right', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20           ┌────x───x────▲────x
		//               │                  │
		//  40           │                  │
		//               │                  │
		//  60  ┌───┐    │                  x───┐
		//      │ D │    │      X           │ B │
		//  80  └───┘    │                  x───┘
		//               │                  │
		// 100           └──────────────────┘
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(100, 40, {
				target: 'selection',
				handle: 'top_right',
			})
			.pointerMove(100, 18, { ctrlKey: true, shiftKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 40, y: 20, props: { w: 80, h: 80 } })

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,20 120,60 120,80 120,100",
        "40,20 60,20 80,20 120,20",
      ]
    `)
	})
	it('should work from the bottom right', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40           ┌──────────────────┐
		//               │                  │
		//  60  ┌───┐    │                  x───┐
		//      │ D │    │      X           │ B │
		//  80  └───┘    │                  x───┘
		//               │                  │
		// 100           │                 ─┤►
		//               │                  │
		// 120           └────x───x─────────x
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(100, 100, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.pointerMove(118, 100, { ctrlKey: true, shiftKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 40, y: 40, props: { w: 80, h: 80 } })

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,40 120,60 120,80 120,120",
        "40,120 60,120 80,120 120,120",
      ]
    `)
	})
	it('should work from the bottom left', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40      x──────────────────┐
		//          │                  │
		//  60  ┌───x                  │    ┌───┐
		//      │ D │           X      │    │ B │
		//  80  └───x                  │    └───┘
		//          │                  │
		// 100     ◄├─                 │
		//          │                  │
		// 120      x─────────x───x────x
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(40, 100, {
				target: 'selection',
				handle: 'bottom_left',
			})
			.pointerMove(18, 100, { ctrlKey: true, shiftKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 20, y: 40, props: { w: 80, h: 80 } })

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "20,120 60,120 80,120 100,120",
        "20,40 20,60 20,80 20,120",
      ]
    `)
	})
	it('should work from the top left', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//               ▲    │ A │
		//  20      x────┬────x───x────x
		//          │                  │
		//  40      │                  │
		//          │                  │
		//  60  ┌───x                  │    ┌───┐
		//      │ D │           X      │    │ B │
		//  80  └───x                  │    └───┘
		//          │                  │
		// 100      x──────────────────┘
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(40, 40, {
				target: 'selection',
				handle: 'top_left',
			})
			.pointerMove(40, 18, { ctrlKey: true, shiftKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 20, y: 20, props: { w: 80, h: 80 } })

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "20,20 20,60 20,80 20,100",
        "20,20 60,20 80,20 100,20",
      ]
    `)
	})
})

describe('snapping while resizing from center with aspect ratio locked', () => {
	beforeEach(() => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40           ┌─────────────┐
		//               │             │
		//  60  ┌───┐    │             │    ┌───┐
		//      │ D │    │      X      │    │ B │
		//  80  └───┘    │             │    └───┘
		//               │             │
		// 100           └─────────────┘
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘

		editor.createShapes([
			box(ids.boxA, 60, 0, 20, 20),
			box(ids.boxB, 120, 60, 20, 20),
			box(ids.boxC, 60, 120, 20, 20),
			box(ids.boxD, 0, 60, 20, 20),
			box(ids.boxX, 40, 40, 60, 60),
		])
	})
	const expectedSnapLines = [
		'120,20 120,60 120,80 120,120',
		'20,120 60,120 80,120 120,120',
		'20,20 20,60 20,80 20,120',
		'20,20 60,20 80,20 120,20',
	] as const
	it('should work from the top', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      x─────────x─O─x─────────x
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      x─────────x───x─────────x
		//                    │ C │
		// 140                └───┘

		editor
			.select(ids.boxX)
			.pointerDown(70, 40, {
				target: 'selection',
				handle: 'top',
			})
			.pointerMove(70, 18, { ctrlKey: true, shiftKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 20,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toEqual(expectedSnapLines)
	})
	it('should work from the right', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      x─────────x───x─────────x
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           O B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      x─────────x───x─────────x
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(100, 70, {
				target: 'selection',
				handle: 'right',
			})
			.pointerMove(123, 40, { ctrlKey: true, shiftKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 20,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toEqual(expectedSnapLines)
	})
	it('should work from the bottom', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      x─────────x───x─────────x
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      x─────────x─O─x─────────x
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(70, 100, {
				target: 'selection',
				handle: 'bottom',
			})
			.pointerMove(70, 121, { ctrlKey: true, shiftKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 20,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toEqual(expectedSnapLines)
	})
	it('should work from the left', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      x─────────x───x─────────x
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D O           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      x─────────x───x─────────x
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(40, 70, {
				target: 'selection',
				handle: 'left',
			})
			.pointerMove(18, 87, { ctrlKey: true, shiftKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 20,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toEqual(expectedSnapLines)
	})

	it('should work from the top right', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      x─────────x───x─────────O
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      x─────────x───x─────────x
		//                    │ C │
		// 140                └───┘

		editor
			.select(ids.boxX)
			.pointerDown(100, 40, {
				target: 'selection',
				handle: 'top_right',
			})
			.pointerMove(100, 18, { ctrlKey: true, shiftKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 20,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toEqual(expectedSnapLines)
	})
	it('should work from the bottom right', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      x─────────x───x─────────x
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      x─────────x───x─────────O
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(100, 100, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.pointerMove(123, 118, { ctrlKey: true, shiftKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 20,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toEqual(expectedSnapLines)
	})
	it('should work from the bottom left', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      x─────────x───x─────────x
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      O─────────x───x─────────x
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(40, 100, {
				target: 'selection',
				handle: 'bottom_left',
			})
			.pointerMove(18, 125, { ctrlKey: true, shiftKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 20,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toEqual(expectedSnapLines)
	})
	it('should work from the top left', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      O─────────x───x─────────x
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      x─────────x───x─────────x
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(40, 40, {
				target: 'selection',
				handle: 'top_left',
			})
			.pointerMove(23, 18, { ctrlKey: true, shiftKey: true, altKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({
			x: 20,
			y: 20,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toEqual(expectedSnapLines)
	})
})

describe('snapping while resizing a shape that has been rotated by multiples of 90 deg', () => {
	beforeEach(() => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40           ┌─────────────┐
		//               │             │
		//  60  ┌───┐    │             │    ┌───┐
		//      │ D │    │      X      │    │ B │
		//  80  └───┘    │             │    └───┘
		//               │             │
		// 100           └─────────────┘
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘

		editor.createShapes([
			box(ids.boxA, 60, 0, 20, 20),
			box(ids.boxB, 120, 60, 20, 20),
			box(ids.boxC, 60, 120, 20, 20),
			box(ids.boxD, 0, 60, 20, 20),
			box(ids.boxX, 40, 40, 60, 60),
		])
	})

	function rotateX(times: number) {
		editor.select(ids.boxX)
		for (let i = 0; i < times; i++) {
			editor
				.pointerDown(40, 40, { target: 'selection', handle: 'top_left_rotate' })
				.pointerMove(100, 40, { shiftKey: true })
				.pointerUp(100, 40, { shiftKey: true })
		}

		expect(editor.getShapePageBounds(ids.boxX)!.x).toBeCloseTo(40)
		expect(editor.getShapePageBounds(ids.boxX)!.y).toBeCloseTo(40)
		expect(editor.getShapePageBounds(ids.boxX)!.w).toBeCloseTo(60)
		expect(editor.getShapePageBounds(ids.boxX)!.h).toBeCloseTo(60)
		expect(editor.getShape(ids.boxX)!.rotation).toEqual(
			canonicalizeRotation(((PI / 2) * times) % (PI * 2))
		)
	}

	it('should work for 90deg', () => {
		rotateX(1)
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40           ┌──────────────────x
		//               │                  │
		//  60  ┌───┐    │                  x───┐
		//      │ D │    │      X           O B │
		//  80  └───┘    │                  x───┘
		//               │                  │
		// 100           └──────────────────x
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(100, 70, { target: 'selection', handle: 'top' })
			.pointerMove(121, 70, { ctrlKey: true, shiftKey: false })
		jest.advanceTimersByTime(200)

		expect(editor.getShapePageBounds(ids.boxX)!).toMatchObject({
			x: 40,
			y: 40,
			w: 80,
			h: 60,
		})
		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,40 120,60 120,80 120,100",
      ]
    `)

		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40      x───────────────────────x
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           O B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      x───────────────────────x
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor.keyDown('Alt', { altKey: true, ctrlKey: true })

		expect(editor.getShapePageBounds(ids.boxX)!).toMatchObject({
			x: 20,
			y: 40,
			w: 100,
			h: 60,
		})
		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,40 120,60 120,80 120,100",
        "20,40 20,60 20,80 20,100",
      ]
    `)
	})
	it('should work for 180', () => {
		rotateX(2)

		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20           x────x─O─x────x
		//               │             │
		//  40           │             │
		//               │             │
		//  60  ┌───┐    │             │    ┌───┐
		//      │ D │    │      X      │    │ B │
		//  80  └───┘    │             │    └───┘
		//               │             │
		// 100           └─────────────┘
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(70, 40, { target: 'selection', handle: 'bottom' })
			.pointerMove(70, 18, { ctrlKey: true, shiftKey: false })
		jest.advanceTimersByTime(200)

		expect(editor.getShapePageBounds(ids.boxX)!.x).toBeCloseTo(40)
		expect(editor.getShapePageBounds(ids.boxX)!.y).toBeCloseTo(20)
		expect(editor.getShapePageBounds(ids.boxX)!.w).toBeCloseTo(60)
		expect(editor.getShapePageBounds(ids.boxX)!.h).toBeCloseTo(80)

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "40,20 60,20 80,20 100,20",
      ]
    `)

		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20         x──────x─O─x──────x
		//             │                 │
		//  40         │                 │
		//             │                 │
		//  60  ┌───┐  │                 │  ┌───┐
		//      │ D │  │        X        │  │ B │
		//  80  └───┘  │                 │  └───┘
		//             │                 │
		// 100         └─────────────────┘
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor.keyDown('Shift', { ctrlKey: true })
		expect(editor.getShapePageBounds(ids.boxX)!.x).toBeCloseTo(30)
		expect(editor.getShapePageBounds(ids.boxX)!.y).toBeCloseTo(20)
		expect(editor.getShapePageBounds(ids.boxX)!.w).toBeCloseTo(80)
		expect(editor.getShapePageBounds(ids.boxX)!.h).toBeCloseTo(80)

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "30,20 60,20 80,20 110,20",
      ]
    `)
	})
	it('should work for 270deg', () => {
		rotateX(3)
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40      x──────────────────┐
		//          │                  │
		//  60  ┌───x                  │    ┌───┐
		//      │ D │           X      │    │ B │
		//  80  └───x                  │    └───┘
		//          │                  │
		// 100      │                  │
		//          │                  │
		// 120      O─────────x───x────x
		//                    │ C │
		// 140                └───┘

		editor
			.select(ids.boxX)
			.pointerDown(40, 100, { target: 'selection', handle: 'top_left' })
			.pointerMove(18, 118, { ctrlKey: true, shiftKey: false })

		expect(editor.getShapePageBounds(ids.boxX)!.x).toBeCloseTo(20)
		expect(editor.getShapePageBounds(ids.boxX)!.y).toBeCloseTo(40)
		expect(editor.getShapePageBounds(ids.boxX)!.w).toBeCloseTo(80)
		expect(editor.getShapePageBounds(ids.boxX)!.h).toBeCloseTo(80)

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "20,120 60,120 80,120 100,120",
        "20,40 20,60 20,80 20,120",
      ]
    `)

		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      x─────────x───x─────────x
		//          │                       │
		//  40      │                       │
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           │ B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      │                       │
		//          │                       │
		// 120      O─────────x───x─────────x
		//                    │ C │
		// 140                └───┘

		editor.keyDown('Alt', { ctrlKey: true })

		expect(editor.getShapePageBounds(ids.boxX)!.x).toBeCloseTo(20)
		expect(editor.getShapePageBounds(ids.boxX)!.y).toBeCloseTo(20)
		expect(editor.getShapePageBounds(ids.boxX)!.w).toBeCloseTo(100)
		expect(editor.getShapePageBounds(ids.boxX)!.h).toBeCloseTo(100)

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,20 120,60 120,80 120,120",
        "20,120 60,120 80,120 120,120",
        "20,20 20,60 20,80 20,120",
        "20,20 60,20 80,20 120,20",
      ]
    `)
	})
	it('should work for 360deg', () => {
		rotateX(4)
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40           ┌──────────────────x
		//               │                  │
		//  60  ┌───┐    │                  x───┐
		//      │ D │    │      X           O B │
		//  80  └───┘    │                  x───┘
		//               │                  │
		// 100           └──────────────────x
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(100, 70, { target: 'selection', handle: 'right' })
			.pointerMove(121, 70, { ctrlKey: true, shiftKey: false })
		jest.advanceTimersByTime(200)

		expect(editor.getShapePageBounds(ids.boxX)!.x).toBeCloseTo(40)
		expect(editor.getShapePageBounds(ids.boxX)!.y).toBeCloseTo(40)
		expect(editor.getShapePageBounds(ids.boxX)!.w).toBeCloseTo(80)
		expect(editor.getShapePageBounds(ids.boxX)!.h).toBeCloseTo(60)

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,40 120,60 120,80 120,100",
      ]
    `)

		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40      x───────────────────────x
		//          │                       │
		//  60  ┌───x                       x───┐
		//      │ D │           X           O B │
		//  80  └───x                       x───┘
		//          │                       │
		// 100      x───────────────────────x
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor.keyDown('Alt', { ctrlKey: true })

		expect(editor.getShapePageBounds(ids.boxX)!.x).toBeCloseTo(20)
		expect(editor.getShapePageBounds(ids.boxX)!.y).toBeCloseTo(40)
		expect(editor.getShapePageBounds(ids.boxX)!.w).toBeCloseTo(100)
		expect(editor.getShapePageBounds(ids.boxX)!.h).toBeCloseTo(60)

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,40 120,60 120,80 120,100",
        "20,40 20,60 20,80 20,100",
      ]
    `)
	})
})

describe('snapping while resizing an inverted shape', () => {
	beforeEach(() => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40           ┌─────────────┐
		//               │             │
		//  60  ┌───┐    │             │    ┌───┐
		//      │ D │    │      X      │    │ B │
		//  80  └───┘    │             │    └───┘
		//               │             │
		// 100           └─────────────┘
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘

		editor.createShapes([
			box(ids.boxA, 60, 0, 20, 20),
			box(ids.boxB, 120, 60, 20, 20),
			box(ids.boxC, 60, 120, 20, 20),
			box(ids.boxD, 0, 60, 20, 20),
			box(ids.boxX, 40, 40, 60, 60),
		])
	})
	it('should work for the top edge', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40
		//
		//  60  ┌───┐                       ┌───┐
		//      │ D │           X           │ B │
		//  80  └───┘                       └───┘
		//
		// 100           ┌─────────────┐
		//               │             │
		// 120           x────x─O─x────x
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(70, 40, {
				target: 'selection',
				handle: 'top',
			})
			.pointerMove(70, 123, { ctrlKey: true })

		expect(editor.getShapePageBounds(ids.boxX)!).toMatchObject({
			x: 40,
			y: 100,
			w: 60,
			h: 20,
		})

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "40,120 60,120 80,120 100,120",
      ]
    `)
	})

	it('should work for the right edge', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40      x────┐
		//          │    │
		//  60  ┌───x    │                  ┌───┐
		//      │ D O    │      X           │ B │
		//  80  └───x    │                  └───┘
		//          │    │
		// 100      x────┘
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(100, 70, {
				target: 'selection',
				handle: 'right',
			})
			.pointerMove(18, 70, { ctrlKey: true })

		expect(editor.getShapePageBounds(ids.boxX)!).toMatchObject({
			x: 20,
			y: 40,
			w: 20,
			h: 60,
		})

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "20,40 20,60 20,80 20,100",
      ]
    `)
	})

	it('should work for the bottom edge', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20           x────x─O─x────x
		//               │             │
		//  40           └─────────────┘
		//
		//  60  ┌───┐                       ┌───┐
		//      │ D │           X           │ B │
		//  80  └───┘                       └───┘
		//
		// 100
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(70, 100, {
				target: 'selection',
				handle: 'bottom',
			})
			.pointerMove(70, 23, { ctrlKey: true })

		expect(editor.getShapePageBounds(ids.boxX)!).toMatchObject({
			x: 40,
			y: 20,
			w: 60,
			h: 20,
		})

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "40,20 60,20 80,20 100,20",
      ]
    `)
	})

	it('should work for the left edge', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40                         ┌────x
		//                             │    │
		//  60  ┌───┐                  │    x───┐
		//      │ D │           X      │    O B │
		//  80  └───┘                  │    x───┘
		//                             │    │
		// 100                         └────x
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(40, 70, {
				target: 'selection',
				handle: 'left',
			})
			.pointerMove(122, 70, { ctrlKey: true })

		expect(editor.getShapePageBounds(ids.boxX)!).toMatchObject({
			x: 100,
			y: 40,
			w: 20,
			h: 60,
		})
		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,40 120,60 120,80 120,100",
      ]
    `)
	})

	it('should work for the top right corner', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40
		//
		//  60  ┌───x                       ┌───┐
		//      │ D │           X           │ B │
		//  80  └───x                       └───┘
		//
		// 100      x────┐
		//          │    │
		// 120      O────x    x───x
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(100, 40, {
				target: 'selection',
				handle: 'top_right',
			})
			.pointerMove(19, 121, { ctrlKey: true })

		expect(editor.getShapePageBounds(ids.boxX)!).toMatchObject({
			x: 20,
			y: 100,
			w: 20,
			h: 20,
		})
		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "20,120 40,120 60,120 80,120",
        "20,60 20,80 20,100 20,120",
      ]
    `)
	})

	it('should work for the bottom right corner', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20      O────x    x───x
		//          │    │
		//  40      x────┘
		//
		//  60  ┌───x                       ┌───┐
		//      │ D │           X           │ B │
		//  80  └───x                       └───┘
		//
		// 100
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘

		editor
			.select(ids.boxX)
			.pointerDown(100, 100, {
				target: 'selection',
				handle: 'bottom_right',
			})
			.pointerMove(19, 21, { ctrlKey: true })

		expect(editor.getShapePageBounds(ids.boxX)!).toMatchObject({
			x: 20,
			y: 20,
			w: 20,
			h: 20,
		})
		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "20,20 20,40 20,60 20,80",
        "20,20 40,20 60,20 80,20",
      ]
    `)
	})
	it('should work for the bototm left corner', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                x───x    x────O
		//                             │    │
		//  40                         └────x
		//
		//  60  ┌───┐                       x───┐
		//      │ D │                       │ B │
		//  80  └───┘                       x───┘
		//
		// 100
		//
		// 120                ┌───┐
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(40, 100, {
				target: 'selection',
				handle: 'bottom_left',
			})
			.pointerMove(123, 21, { ctrlKey: true })

		expect(editor.getShapePageBounds(ids.boxX)!).toMatchObject({
			x: 100,
			y: 20,
			w: 20,
			h: 20,
		})
		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,20 120,40 120,60 120,80",
        "60,20 80,20 100,20 120,20",
      ]
    `)
	})
	it('should work for the top left corner', () => {
		//      0  20    40  60   80  100  120  140
		//   0                ┌───┐
		//                    │ A │
		//  20                └───┘
		//
		//  40
		//
		//  60  ┌───┐                       x───┐
		//      │ D │                       │ B │
		//  80  └───┘                       x───┘
		//
		// 100                         ┌────x
		//                             │    │
		// 120                x───x    x────O
		//                    │ C │
		// 140                └───┘
		editor
			.select(ids.boxX)
			.pointerDown(40, 40, {
				target: 'selection',
				handle: 'top_left',
			})
			.pointerMove(123, 118, { ctrlKey: true })

		expect(editor.getShapePageBounds(ids.boxX)!).toMatchObject({
			x: 100,
			y: 100,
			w: 20,
			h: 20,
		})
		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "120,60 120,80 120,100 120,120",
        "60,120 80,120 100,120 120,120",
      ]
    `)
	})
})

describe('snapping while the grid is enabled', () => {
	it('does not snap to the grid', () => {
		// 0   20      60   80
		//  ┌───┐       ┌───┐
		//  │ A │       │ B │
		//  └───┘       └───┘

		editor.createShapes([box(ids.boxA, 0, 0, 20, 20), box(ids.boxB, 60, 0, 20, 20)])

		editor.updateInstanceState({ isGridMode: true })

		// try to move right side of A to left side of B
		// doesn't work because of the grid

		// 0   20      60   80
		//  ┌──────────┐┌───┐
		//  │ A        O│ B │
		//  └──────────┘└───┘

		editor
			.select(ids.boxA)
			.pointerDown(20, 10, {
				target: 'selection',
				handle: 'right',
			})
			.pointerMove(59, 10)

		// rounds up to nearest 10
		expect(editor.getShapePageBounds(ids.boxA)!.w).toEqual(60)

		// engage snap mode and it should indeed snap to B

		// 0   20      60   80
		//  x───────────x───x
		//  │ A         │ B │
		//  x───────────x───x
		editor.keyDown('Control')
		expect(editor.getShapePageBounds(ids.boxA)!.w).toEqual(60)
		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "0,0 60,0 80,0",
        "0,20 60,20 80,20",
        "60,0 60,20",
      ]
    `)

		// and if not snapping we can make the box any size
		editor.pointerMove(19, 10, { ctrlKey: true })
		expect(editor.getShapePageBounds(ids.boxA)!.w).toEqual(19)
	})
})

describe('resizing a shape with a child', () => {
	it('should not snap to the child', () => {
		// 0 1   11           50
		// ┌───────────────────┐
		// │ ┌───┐             │
		// │ │ B │             │
		// │ └───┘             │
		// │                   │
		// │          A        │
		// │                   │
		// │                   │
		// │                   │
		// └───────────────────┘

		editor.createShapes([
			box(ids.boxA, 0, 0, 50, 50),
			{ ...box(ids.boxB, 1, 1), parentId: ids.boxA },
		])
		editor
			.select(ids.boxA)
			.pointerDown(0, 0, { target: 'selection', handle: 'top_left' })
			.pointerMove(25, 25, { ctrlKey: true })

		expect(editor.snaps.lines.length).toBe(0)
		expect(editor.getShape(ids.boxA)).toMatchObject({ x: 25, y: 25, props: { w: 25, h: 25 } })
		expect(editor.getShape(ids.boxB)).toMatchObject({ x: 0.5, y: 0.5, props: { w: 5, h: 5 } })
		expect(editor.getShapePageBounds(ids.boxB)).toMatchObject({
			x: 25.5,
			y: 25.5,
			w: 5,
			h: 5,
		})
	})
})

describe('reisizing shapes with aspect ratio locked', () => {
	beforeEach(() => {
		//    0  10          40  50
		//
		//  0 ┌───┐           ┌───┐
		//    │ A │           │ B │ rot 90
		// 10 └───┘           └───┘
		//
		//
		//
		// 40 ┌───┐           ┌───┐
		//    │ D │ rot 270   │ C │ rot 180
		// 50 └───┘           └───┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			{ ...box(ids.boxB, 50, 0), rotation: Math.PI / 2 },
			{ ...box(ids.boxC, 50, 50), rotation: Math.PI },
			{ ...box(ids.boxD, 0, 50), rotation: Math.PI * 1.5 },
		])
	})
	it('does not flip Y when resizing with left edge', () => {
		//         0  10          40  50
		//       ┌───────────────────────┐
		//  0    │ ┌───┐           ┌───┐ │         50 55     70 75
		//       │ │ A │           │ B │ │          ┌───────────┐  12.5
		// 10    │ └───┘           └───┘ │          │ B       A │
		//       │                       │          │           │  17.5
		//      ┌┼┐drag ->               │   ──►    │          ┌┼┐
		//      └┼┘                      │          │          └┼┘
		//       │                       │          │           │  32.5
		// 40    │ ┌───┐           ┌───┐ │          │ C       D │
		//       │ │ D │           │ C │ │          └───────────┘  37.5
		// 50    │ └───┘           └───┘ │
		//       └───────────────────────┘
		editor.select(ids.boxA, ids.boxB, ids.boxC, ids.boxD)
		editor
			.pointerDown(0, 25, {
				target: 'selection',
				handle: 'left',
			})
			.pointerMove(75, 25, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 70, y: 12.5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 50, y: 12.5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: 50, y: 32.5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: 70, y: 32.5, w: 5, h: 5 })
	})
	it('does not flip Y when resizing with right edge', () => {
		//         0  10          40  50
		//       ┌───────────────────────┐
		//  0    │ ┌───┐           ┌───┐ │        -25 -20    -5 0
		//       │ │ A │           │ B │ │          ┌───────────┐  12.5
		// 10    │ └───┘           └───┘ │          │ B       A │
		//       │                       │          │           │  17.5
		//       │                <-drag┌┼┐  ──►   ┌┼┐          │
		//       │                      └┼┘        └┼┘          │
		//       │                       │          │           │  32.5
		// 40    │ ┌───┐           ┌───┐ │          │ C       D │
		//       │ │ D │           │ C │ │          └───────────┘  37.5
		// 50    │ └───┘           └───┘ │
		//       └───────────────────────┘
		editor.select(ids.boxA, ids.boxB, ids.boxC, ids.boxD)
		editor
			.pointerDown(50, 25, {
				target: 'selection',
				handle: 'right',
			})
			.pointerMove(-25, 25, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: -5, y: 12.5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: -25, y: 12.5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: -25, y: 32.5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: -5, y: 32.5, w: 5, h: 5 })
	})
	it('does not flip X when resizing top edge', () => {
		//         0  10          40  50
		//                  ┌─┐
		//       ┌──────────┼┼┼──────────┐
		//       │          └─┘          │
		//  0    │ ┌───┐           ┌───┐ │
		//       │ │ A │     │     │ B │ │
		// 10    │ └───┘     ▼     └───┘ │
		//       │                       │
		//       │         drag          │
		//       │                       │
		//       │                       │
		// 40    │ ┌───┐           ┌───┐ │
		//       │ │ D │           │ C │ │
		// 50    │ └───┘           └───┘ │
		//       └───────────────────────┘
		//                   │
		//                   ▼
		//
		//          12.5 17.5   32.5 37.5
		// 50          ┌───────────┐
		//             │ D       C │
		// 55          │           │
		//             │           │
		//             │           │
		// 70          │           │
		//             │ A  ┌─┐  B │
		// 75          └────┼┼┼────┘
		//                  └─┘
		editor.select(ids.boxA, ids.boxB, ids.boxC, ids.boxD)
		editor
			.pointerDown(25, 0, {
				target: 'selection',
				handle: 'top',
			})
			.pointerMove(25, 75, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 12.5, y: 70, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 32.5, y: 70, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: 32.5, y: 50, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: 12.5, y: 50, w: 5, h: 5 })
	})
	it('does not flip X when resizing bottom edge', () => {
		//         0  10          40  50
		//
		//       ┌───────────────────────┐
		//  0    │ ┌───┐           ┌───┐ │
		//       │ │ A │           │ B │ │
		// 10    │ └───┘           └───┘ │
		//       │                       │
		//       │                       │
		//       │                       │
		//       │         drag up       │
		// 40    │ ┌───┐           ┌───┐ │
		//       │ │ D │     ▲     │ C │ │
		// 50    │ └───┘     │     └───┘ │
		//       │          ┌┼┐          │
		//       └──────────┼┼┼──────────┘
		//                  └─┘
		//
		//
		//                   │
		//                   ▼
		//
		//
		//          12.5 17.5   32.5 37.5
		//                  ┌─┐
		// -25         ┌────┼┼┼────┐
		//             │ D  └─┘  C │
		// -20         │           │
		//             │           │
		//             │           │
		// -5          │           │
		//             │ A       B │
		//  0          └───────────┘
		editor.select(ids.boxA, ids.boxB, ids.boxC, ids.boxD)
		editor
			.pointerDown(25, 50, {
				target: 'selection',
				handle: 'bottom',
			})
			.pointerMove(25, -25, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 12.5, y: -5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 32.5, y: -5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: 32.5, y: -25, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: 12.5, y: -25, w: 5, h: 5 })
	})
	it('preserves the correct alignment when dragging the top left corner around', () => {
		editor.select(ids.boxA, ids.boxB, ids.boxC, ids.boxD)
		editor.pointerDown(0, 0, { target: 'selection', handle: 'top_left' })
		//       25 30      45 50
		//         ┌───────────┐   50
		//         │ D       C │
		//         │           │   55
		//         │           │
		//         │           │
		//         │           │   70
		//         │ A       B │
		//    ──►  x───────────┘   75
		// top left corner
		// scale 0.5
		editor.pointerMove(25, 51, { shiftKey: true })

		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 25, y: 70, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 45, y: 70, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: 45, y: 50, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: 25, y: 50, w: 5, h: 5 })

		//
		//        50 55     70 75
		//         ┌───────────┐   50
		//         │ C       D │
		//         │           │   55
		//         │           │
		//         │           │
		//         │           │   70
		//         │ B       A │
		//         └───────────x   75
		// top left corner     ▲
		// scale 0.5           │
		editor.pointerMove(51, 75, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 70, y: 70, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 50, y: 70, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: 50, y: 50, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: 70, y: 50, w: 5, h: 5 })

		// top left corner     │
		// scale 0.5           ▼
		//         ┌───────────x   25
		//         │ B       A │
		//         │           │   30
		//         │           │
		//         │           │
		//         │           │   45
		//         │ C       D │
		//         └───────────┘   50
		//       50 55     70 75
		editor.pointerMove(51, 25, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 70, y: 25, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 50, y: 25, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: 50, y: 45, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: 70, y: 45, w: 5, h: 5 })
	})
	it('preserves the correct alignment when dragging the top right corner around', () => {
		editor.select(ids.boxA, ids.boxB, ids.boxC, ids.boxD)
		editor.pointerDown(50, 0, { target: 'selection', handle: 'top_right' })
		//       -25 -20    -5 0
		//         ┌───────────┐   50
		//         │ C       D │
		//         │           │   55
		//         │           │
		//         │           │
		//         │           │   70
		//         │ B       A │
		//    ──►  x───────────┘   75
		// top right corner
		// scale 0.5
		editor.pointerMove(-25, 75, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: -5, y: 70, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: -25, y: 70, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: -25, y: 50, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: -5, y: 50, w: 5, h: 5 })

		//        0 5       20 25
		//         ┌───────────┐   50
		//         │ D       C │
		//         │           │   55
		//         │           │
		//         │           │
		//         │           │   70
		//         │ A       B │
		//         └───────────x   75
		// top right corner    ▲
		// scale 0.5           │
		editor.pointerMove(25, 75, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 0, y: 70, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 20, y: 70, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: 20, y: 50, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: 0, y: 50, w: 5, h: 5 })

		//      top right corner
		//   │  scale 0.5
		//   ▼
		//   x───────────┐   25
		//   │ B       A │
		//   │           │   30
		//   │           │
		//   │           │
		//   │           │   45
		//   │ C       D │
		//   └───────────┘   50
		// -25 -20    -5 0
		editor.pointerMove(-25, 25, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: -5, y: 25, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: -25, y: 25, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: -25, y: 45, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: -5, y: 45, w: 5, h: 5 })
	})
	it('preserves the correct alignment when dragging the bottom right corner around', () => {
		editor.select(ids.boxA, ids.boxB, ids.boxC, ids.boxD)
		editor.pointerDown(50, 50, { target: 'selection', handle: 'bottom_right' })
		//       -25 -20    -5 0
		//         ┌───────────┐    0
		//         │ B       A │
		//         │           │    5
		//         │           │
		//         │           │
		//         │           │   20
		//         │ C       D │
		//    ──►  x───────────┘   25
		// bottom right corner
		// scale 0.5
		editor.pointerMove(-25, 25, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: -5, y: 0, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: -25, y: 0, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: -25, y: 20, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: -5, y: 20, w: 5, h: 5 })
		// bottom right corner │
		// scale 0.5           ▼
		//         ┌───────────x -25
		//         │ D       C │
		//         │           │ -20
		//         │           │
		//         │           │
		//         │           │  -5
		//         │ A       B │
		//         └───────────┘   0
		//        0  5      20  25
		editor.pointerMove(25, -25, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 0, y: -5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 20, y: -5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: 20, y: -25, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: 0, y: -25, w: 5, h: 5 })
		//      bottom right corner
		//   │  scale 0.5
		//   ▼
		//   x───────────┐ -25
		//   │ C       D │
		//   │           │ -20
		//   │           │
		//   │           │
		//   │           │  -5
		//   │ B       A │
		//   └───────────┘   0
		// -25 -20    -5 0
		editor.pointerMove(-25, -25, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: -5, y: -5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: -25, y: -5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: -25, y: -25, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: -5, y: -25, w: 5, h: 5 })
	})
	it('preserves the correct alignment when dragging the bottom left corner around', () => {
		editor.select(ids.boxA, ids.boxB, ids.boxC, ids.boxD)
		editor.pointerDown(0, 50, { target: 'selection', handle: 'bottom_left' })
		//        50 55     70 75
		//         ┌───────────┐    0
		//         │ B       A │
		//         │           │    5
		//         │           │
		//         │           │
		//         │           │   20
		//         │ C       D │
		//         └───────────x   25
		// bottom left corner  ▲
		// scale 0.5           │
		editor.pointerMove(75, 25, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 70, y: 0, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 50, y: 0, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: 50, y: 20, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: 70, y: 20, w: 5, h: 5 })
		// bottom left corner  │
		// scale 0.5           ▼
		//         ┌───────────x -25
		//         │ C       D │
		//         │           │ -20
		//         │           │
		//         │           │
		//         │           │  -5
		//         │ B       A │
		//         └───────────┘   0
		//        50 55     70 75
		editor.pointerMove(75, -25, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 70, y: -5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 50, y: -5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: 50, y: -25, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: 70, y: -25, w: 5, h: 5 })
		//     bottom left corner
		//  │  scale 0.5
		//  ▼
		//  x───────────┐ -25
		//  │ D       C │
		//  │           │ -20
		//  │           │
		//  │           │
		//  │           │  -5
		//  │ A       B │
		//  └───────────┘   0
		// 25 30    45 50
		editor.pointerMove(25, -25, { shiftKey: true })
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 25, y: -5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 45, y: -5, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: 45, y: -25, w: 5, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: 25, y: -25, w: 5, h: 5 })
	})
})

describe('resizing a selection of mixed rotations', () => {
	beforeEach(() => {
		//    0  10          40  50
		//
		//  0 ┌───┐           ┌───┐
		//    │ A │           │ B │ rot 90
		// 10 └───┘           └───┘
		//
		//
		//
		// 40 ┌───┐           ┌───┐
		//    │ D │ rot 270   │ C │ rot 180
		// 50 └───┘           └───┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			{ ...box(ids.boxB, 50, 0), rotation: Math.PI / 2 },
			{ ...box(ids.boxC, 50, 50), rotation: Math.PI },
			{ ...box(ids.boxD, 0, 50), rotation: Math.PI * 1.5 },
		])
	})
	it('does not lock the aspect ratio if the rotations are compatible', () => {
		editor.select(ids.boxA, ids.boxB, ids.boxC, ids.boxD)
		//     0        20              80      100
		//
		//     ┌──────────────────────────────────┐
		//  0  │ ┌───────┐              ┌───────┐ │
		//     │ │   A   │              │   B   │ │
		//  5  │ └───────┘              └───────┘ │
		//     │                                  │
		//     │                                  │
		// 20  │ ┌───────┐              ┌───────┐ │
		//     │ │   D   │              │   C   │ │
		// 25  │ └───────┘              └───────┘ │
		//     └──────────────────────────────────x drag
		editor.pointerDown(50, 50, { target: 'selection', handle: 'bottom_right' }).pointerMove(100, 25)
		expect(roundedPageBounds(ids.boxA)).toMatchObject({ x: 0, y: 0, w: 20, h: 5 })
		expect(roundedPageBounds(ids.boxB)).toMatchObject({ x: 80, y: 0, w: 20, h: 5 })
		expect(roundedPageBounds(ids.boxC)).toMatchObject({ x: 80, y: 20, w: 20, h: 5 })
		expect(roundedPageBounds(ids.boxD)).toMatchObject({ x: 0, y: 20, w: 20, h: 5 })
	})
	it('does lock the aspect ratio if the rotations are not compatible', () => {
		editor.updateShapes([{ id: ids.boxC, type: 'geo', rotation: Math.PI + EPSILON }])
		editor.select(ids.boxA, ids.boxB, ids.boxC, ids.boxD)
		editor.pointerDown(50, 50, { target: 'selection', handle: 'bottom_right' }).pointerMove(100, 25)
		expect(roundedPageBounds(ids.boxA, 0.5)).toMatchObject({ x: 0, y: 0, w: 20, h: 20 })
	})

	it('does lock the aspect ratio if one of the shapes has a child with an incompatible aspect ratio', () => {
		editor.updateShapes([
			{ id: ids.boxC, type: 'geo', rotation: Math.PI + EPSILON, parentId: ids.boxA },
		])

		editor.select(ids.boxA, ids.boxB, ids.boxD)
		editor.pointerDown(50, 50, { target: 'selection', handle: 'bottom_right' }).pointerMove(100, 25)
		expect(roundedPageBounds(ids.boxA, 0.5)).toMatchObject({ x: 0, y: 0, w: 20, h: 20 })
	})
})

// describe('Icons', () => {
// 	beforeEach(() => {
// 		editor =new TestEditor()

// 		editor.createShapes([
// 			{
// 				id: ids.iconA,
// 				type: 'icon',
// 				x: 0,
// 				y: 0,
// 				props: {
// 					size: 'm',
// 				},
// 			},
// 		])
// 	})

// 	it('scale correctly from each corner', () => {
// 		editor.select(ids.iconA)

// 		// Scale to 2x from bottom right corner
// 		app
// 			.pointerDown(32, 32, { target: 'selection', handle: 'bottom_right' })
// 			.pointerMove(64, 64)
// 			.pointerUp()

// 		expect(editor.getShape(ids.iconA)).toMatchObject({
// 			x: 0,
// 			y: 0,
// 			props: {
// 				scale: 2,
// 			},
// 		})
// 		expect(editor.getPageBounds(ids.iconA)).toMatchObject({
// 			width: 64,
// 			height: 64,
// 		})

// 		// Scale to 1x from top right corner
// 		app
// 			.pointerDown(64, 0, { target: 'selection', handle: 'top_right' })
// 			.pointerMove(32, 32)
// 			.pointerUp()
// 		expect(editor.getShape(ids.iconA)).toMatchObject({
// 			x: 0,
// 			y: 32,
// 			props: {
// 				scale: 1,
// 			},
// 		})
// 		expect(editor.getPageBounds(ids.iconA)).toMatchObject({
// 			width: 32,
// 			height: 32,
// 		})

// 		// Scale to 0.5x from top left corner but make sure
// 		// the min scale works
// 		app
// 			.pointerDown(0, 32, { target: 'selection', handle: 'top_left' })
// 			.pointerMove(16, 48)
// 			.pointerUp()
// 		expect(editor.getShape(ids.iconA)).toMatchObject({
// 			x: 16,
// 			y: 48,
// 			props: {
// 				scale: 0.5,
// 			},
// 		})
// 		expect(editor.getPageBounds(ids.iconA)).toMatchObject({
// 			width: 16,
// 			height: 16,
// 		})
// 	})
// })

describe('nodes that have do not resize', () => {
	it('are still translated if part of a selection', () => {
		const noteBId = createShapeId('noteB')
		editor.createShapes([box(ids.boxA, 0, 0, 200, 200), { id: noteBId, type: 'note', x: 0, y: 0 }])

		// the default width and height of a note is 200
		expect(editor.getShapePageBounds(ids.boxA)).toMatchObject({ x: 0, y: 0, w: 200, h: 200 })
		expect(editor.getShapePageBounds(noteBId)).toMatchObject({ x: 0, y: 0, w: 200, h: 200 })

		editor.select(ids.boxA, noteBId)

		editor.resizeSelection({ scaleX: 2, scaleY: 2 }, 'bottom_right')

		expect(editor.getShapePageBounds(ids.boxA)).toMatchObject({ x: 0, y: 0, w: 400, h: 400 })
		// noteB should be in the middle of boxA
		expect(editor.getShapePageBounds(noteBId)).toMatchObject({ x: 100, y: 100, w: 200, h: 200 })
	})
	it('can flip', () => {
		const noteBId = createShapeId('noteB')
		const noteCId = createShapeId('noteC')
		editor.createShapes([
			box(ids.boxA, 0, 0, 200, 200),
			{ id: noteBId, type: 'note', x: 300, y: 0 },
			{ id: noteCId, type: 'note', x: 0, y: 300 },
		])

		editor.select(ids.boxA, noteBId, noteCId)

		editor.flipShapes(editor.selectedShapeIds, 'horizontal')

		expect(editor.getShapePageBounds(ids.boxA)).toMatchObject({ x: 300, y: 0, w: 200, h: 200 })
		expect(editor.getShapePageBounds(noteBId)).toMatchObject({ x: 0, y: 0, w: 200, h: 200 })
		expect(editor.getShapePageBounds(noteCId)).toMatchObject({ x: 300, y: 300, w: 200, h: 200 })

		editor.flipShapes(editor.selectedShapeIds, 'vertical')

		expect(editor.getShapePageBounds(ids.boxA)).toMatchObject({
			x: 300,
			y: 300,
			w: 200,
			h: 200,
		})
		expect(editor.getShapePageBounds(noteBId)).toMatchObject({ x: 0, y: 300, w: 200, h: 200 })
		expect(editor.getShapePageBounds(noteCId)).toMatchObject({ x: 300, y: 0, w: 200, h: 200 })
	})
})

// describe('clicking the drag handle imprecisely', () => {
//   it('does not prevent grid snapping', () => {
//     // 0   10
//     //  ┌───┐
//     //  │ A │
//     //  └───┘

//     editor =new TestScene({
//       nodes: [box(ids.boxA, 0, 0)],
//     })

//     editor.setGrid(true)

//     // click bottom right handle with x: 2, y: -3 offset
//     app
//       .select(ids.boxA)
//       .pointerDown(12, 7, {
//         target: 'selection',
//         handle: 'bottom_right',
//       })
//       .pointerMove(20, 20)

//     // corner point is actually at 18, 23
//     // nearest grid point is at 16, 24
//     expect(roundedPageBounds(ids.boxA)).toEqual({ x: 0, y: 0, w: 16, h: 24 })
//   })
//   it('does not prevent edge snapping', () => {
//     // 0   20      60     100
//     //  ┌───┐       ┌───────┐
//     //  │ A │       │ B     │
//     //  └───┘       │       │
//     //              │       │
//     //              └───────┘

//     editor =new TestScene({
//       nodes: [box(ids.boxA, 0, 0, 20, 20), box(ids.boxB, 60, 0, 40, 40)],
//     })

//     // offset by x: 5, y: -3
//     app
//       .select(ids.boxA)
//       .pointerDown(25, 17, { target: 'selection', handle: 'bottom_right' })

//     // 0   20      60     100
//     //  x───────────x───────x
//     //  │ A         │ B     │
//     //  x───────────x   x   │
//     //              │       │
//     //              └───────┘
//     // snap bottom-right corner of A to left edge and center of B
//     editor.pointerMove(72, 9, undefined, { ctrlKey: true })
//     // actual corner point is 67, 12, should snap to 60, 20

//     expect(roundedPageBounds(ids.boxA)).toEqual({ x: 0, y: 0, w: 60, h: 20 })
//   })
// })

// describe('nodes that have aspect ratio locked', () => {
//   // no onResize return value
//   class AspectRatioAlwaysLocked extends TLBoxShape {
//     static override id = 'aspect_ratio_always_locked'
//     override canChangeAspectRatio = () => {
//       return false
//     }
//   }

//   beforeEach(() => {
//     //   0   10  20   30
//     //    ┌───┐   ┌───┐
//     //    │ A │   │ B │
//     // 10 └───┘   └───┘
//     //
//     // 20 ┌───┐
//     //    │ C │
//     // 30 └───┘
//     editor =new TestScene({
//       shapeUtils: [TLBoxShape, AspectRatioAlwaysLocked],
//       nodes: [
//         {
//           id: ids.boxA,
//           type: 'geo',
//           x: 0,
//           y: 0,
//           width: 10,
//           height: 10,
//           isAspectRatioLocked: false,
//         },
//         {
//           id: ids.boxB,
//           type: 'geo',
//           x: 20,
//           y: 0,
//           width: 10,
//           height: 10,
//           isAspectRatioLocked: true,
//         },
//         { id: ids.boxC, type: AspectRatioAlwaysLocked.id, x: 0, y: 20, width: 10, height: 10 },
//       ],
//     })
//   })

//   it('can have their aspect ratio locked by the class property', () => {
//     //   0   10  20   30
//     //    ┌───┐   ┌───┐
//     //    │ A │   │ B │
//     // 10 └───┘   └───┘
//     //
//     // 20 ┌───┐
//     //    │ C │
//     // 30 └───x drag ->
//     app
//       .select(ids.boxC)
//       .pointerDown(10, 30, { target: 'selection', handle: 'bottom_right' })
//       .pointerMove(20, 30)
//     //   0   10  20   30
//     //    ┌───┐   ┌───┐
//     //    │ A │   │ B │
//     // 10 └───┘   └───┘
//     //
//     // 20 ┌───────┐
//     //    │ C     │
//     // 30 │       x pointer is here
//     //    │       │
//     //    └───────┘
//     expect(roundedPageBounds(ids.boxC)).toEqual({ x: 0, y: 20, w: 20, h: 20 })
//   })

//   it('can have their aspect ratio locked by the model property', () => {
//     //   0   10  20   30
//     //    ┌───┐   ┌───┐
//     //    │ A │   │ B │
//     // 10 └───┘   └───x drag ->
//     //
//     // 20 ┌───┐
//     //    │ C │
//     // 30 └───┘
//     app
//       .select(ids.boxB)
//       .pointerDown(30, 10, { target: 'selection', handle: 'bottom_right' })
//       .pointerMove(40, 10)
//     //   0   10  20   30
//     //    ┌───┐   ┌───────┐
//     //    │ A │   │ B     │
//     // 10 └───┘   │       x pointer is here
//     //            │       │
//     // 20 ┌───┐   └───────┘
//     //    │ C │
//     // 30 └───┘
//     expect(roundedPageBounds(ids.boxB)).toEqual({ x: 20, y: 0, w: 20, h: 20 })
//   })
//   it('cause the whole selection to have the aspect ratio locked (model)', () => {
//     //   0   10  20   30
//     //    ┌───┐- -┌───┐
//     //    │ A │   │ B │
//     // 10 └───┘- -└───x drag ->
//     //
//     // 20 ┌───┐
//     //    │ C │
//     // 30 └───┘
//     //

//     app
//       .select(ids.boxA, ids.boxB)
//       .pointerDown(30, 10, { target: 'selection', handle: 'bottom_right' })
//       .pointerMove(60, 10)
//     //   0   10          40       60
//     //    ┌───────┬·······┬───────┐
//     //    │ A     │       │ B     │
//     // 10 │       │       │       x pointer
//     //    │       │       │       │
//     // 20 ├───┬───┴·······┴───────┘
//     //    │ C │
//     // 30 └───┘
//     expect(roundedPageBounds(ids.boxA)).toEqual({ x: 0, y: 0, w: 20, h: 20 })
//     expect(roundedPageBounds(ids.boxB)).toEqual({ x: 40, y: 0, w: 20, h: 20 })
//   })
//   it('cause the whole selection to have the aspect ratio locked (class property)', () => {
//     //   0   10  20   30
//     //    ┌───┐   ┌───┐
//     //    │ A │   │ B │
//     // 10 └───┘   └───┘
//     //    |   |
//     // 20 ┌───┐
//     //    │ C │
//     // 30 └───x drag ->
//     app
//       .select(ids.boxA, ids.boxC)
//       .pointerDown(10, 30, { target: 'selection', handle: 'bottom_right' })
//       .pointerMove(10, 60)
//     //   0   10  20   30
//     //    ┌───────┬───┐
//     //    │ A     │ B │
//     // 10 │       ├───┘
//     //    │       │
//     //    └───────┘
//     //    |       |
//     //    |       x pointer is here
//     //    ┌───────┐
//     //    │ C     │
//     //    │       │
//     //    │       │
//     //    └───────┘
//     expect(roundedPageBounds(ids.boxA)).toEqual({ x: 0, y: 0, w: 20, h: 20 })
//     expect(roundedPageBounds(ids.boxC)).toEqual({ x: 0, y: 40, w: 20, h: 20 })
//   })
// })

describe('bugs', () => {
	// it('resizing a zero width shape', () => {
	//	// Draw shapes can no longer have zero width / height
	// 	const shapeId = createShapeId()
	// 	app
	// 		.createShapes([
	// 			{
	// 				id: shapeId,
	// 				type: 'draw',
	// 				x: 0,
	// 				y: 0,
	// 				props: {
	// 					segments: [
	// 						{
	// 							type: 'straight',
	// 							points: [
	// 								{ x: 0, y: 0 },
	// 								{ x: 0, y: 100 },
	// 							],
	// 						},
	// 					],
	// 				},
	// 			},
	// 		])
	// 		.select(shapeId)
	// 	expect(editor.selectionRotatedBounds!.width).toBe(0)
	// 	editor.pointerDown(0, 100, { target: 'selection', handle: 'bottom_right' }).pointerMove(10, 110)
	// 	expect(editor.selectionRotatedBounds!.width).toBe(0)
	// })
})

it('uses the cross cursor when create resizing', () => {
	editor.setCurrentTool('geo')
	editor.pointerDown(0, 0)
	editor.pointerMove(100, 100)
	editor.expectToBeIn('select.resizing')
	expect(editor.instanceState.cursor.type).toBe('cross')
	expect(editor.instanceState.cursor.rotation).toBe(0)

	editor.pointerMove(120, 120)
	expect(editor.instanceState.cursor.type).toBe('cross')
	expect(editor.instanceState.cursor.rotation).toBe(0)

	editor.pointerMove(-120, -120)
	expect(editor.instanceState.cursor.type).toBe('cross')
	expect(editor.instanceState.cursor.rotation).toBe(0)
})

describe('Resizing text from the right edge', () => {
	it('Resizes text from the right edge', () => {
		const id = createShapeId()
		editor.createShapes([{ id, type: 'text', props: { text: 'H' } }])
		editor.updateShapes([{ id, type: 'text', props: { text: 'Hello World' } }]) // auto size

		editor.select(id)

		const bounds = editor.getShapeGeometry(id).bounds

		editor.updateInstanceState({ isCoarsePointer: false })

		// Resize from the right edge
		editor.pointerDown(bounds.maxX, bounds.midY, { target: 'selection', handle: 'right' }) // right edge
		editor.expectToBeIn('select.pointing_resize_handle')
		editor.pointerMove(bounds.maxX + 5, bounds.midY, { target: 'selection', handle: 'right' })
		editor.expectToBeIn('select.resizing')
		editor.pointerUp()

		editor.expectShapeToMatch({
			id,
			type: 'text',
			props: { text: 'Hello World', w: bounds.width + 5 },
		})
	})

	it('Resizes text from the right edge when pointer is coarse', () => {
		editor.updateInstanceState({ isCoarsePointer: true })

		const id = createShapeId()
		editor.createShapes([{ id, type: 'text', props: { text: 'H' } }])
		editor.updateShapes([{ id, type: 'text', props: { text: 'Hello World' } }]) // auto size

		editor.select(id)

		const bounds = editor.getShapeGeometry(id).bounds

		// Resize from the right edge
		editor.pointerDown(bounds.maxX, bounds.midY, { target: 'selection', handle: 'right' }) // right edge
		editor.expectToBeIn('select.pointing_resize_handle')
		editor.pointerMove(bounds.maxX + 5, bounds.midY, { target: 'selection', handle: 'right' })
		editor.expectToBeIn('select.pointing_resize_handle')
		editor.pointerMove(bounds.maxX + 10, bounds.midY, { target: 'selection', handle: 'right' })
		editor.expectToBeIn('select.resizing')
		editor.pointerUp()

		editor.expectShapeToMatch({
			id,
			type: 'text',
			props: { text: 'Hello World', w: bounds.width + 10 },
		})
	})
})

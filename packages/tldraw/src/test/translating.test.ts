import {
	GapsSnapLine,
	PointsSnapLine,
	SnapLine,
	TLArrowShape,
	TLShapeId,
	TLShapePartial,
	Vec2d,
	createShapeId,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'
import { getSnapLines } from './getSnapLines'

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

beforeEach(() => {
	console.error = jest.fn()
	editor = new TestEditor()
})

const getNumSnapPoints = (snap: SnapLine): number => {
	return snap.type === 'points' ? snap.points.length : (null as any as number)
}

function assertGaps(snap: SnapLine): asserts snap is GapsSnapLine {
	expect(snap.type).toBe('gaps')
}

function getGapAndPointLines(snaps: SnapLine[]) {
	const gapLines = snaps.filter((snap) => snap.type === 'gaps') as GapsSnapLine[]
	const pointLines = snaps.filter((snap) => snap.type === 'points') as PointsSnapLine[]
	return { gapLines, pointLines }
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

describe('When translating...', () => {
	beforeEach(() => {
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: 10,
				y: 10,
				props: {
					w: 100,
					h: 100,
				},
			},
			{
				id: ids.box2,
				type: 'geo',
				x: 200,
				y: 200,
				props: {
					w: 100,
					h: 100,
				},
			},
			{
				id: ids.line1,
				type: 'line',
				x: 100,
				y: 100,
			},
		])
	})

	it('enters and exits the translating state', () => {
		editor
			.pointerDown(50, 50, ids.box1)
			.expectToBeIn('select.pointing_shape')
			.pointerMove(50, 40)
			.expectToBeIn('select.translating')
			.pointerUp()
			.expectToBeIn('select.idle')
	})

	it('exits the translating state when canceled', () => {
		editor
			.pointerDown(50, 50, ids.box1)
			.pointerMove(50, 40) // [0, -10]
			.expectToBeIn('select.translating')
			.cancel()
			.expectToBeIn('select.idle')
	})

	it('translates a single shape', () => {
		editor
			.pointerDown(50, 50, ids.box1)
			.pointerMove(50, 40) // [0, -10]
			.expectShapeToMatch({ id: ids.box1, x: 10, y: 0 })
			.pointerMove(100, 100) // [50, 50]
			.expectShapeToMatch({ id: ids.box1, x: 60, y: 60 })
			.pointerUp()
			.expectShapeToMatch({ id: ids.box1, x: 60, y: 60 })
	})

	it('translates multiple shapes', () => {
		editor
			.select(ids.box1, ids.box2)
			.pointerDown(50, 50, ids.box1)
			.pointerMove(50, 40) // [0, -10]
			.expectShapeToMatch({ id: ids.box1, x: 10, y: 0 }, { id: ids.box2, x: 200, y: 190 })
			.pointerMove(100, 100) // [50, 50]
			.expectShapeToMatch({ id: ids.box1, x: 60, y: 60 }, { id: ids.box2, x: 250, y: 250 })
			.pointerUp()
			.expectShapeToMatch({ id: ids.box1, x: 60, y: 60 }, { id: ids.box2, x: 250, y: 250 })
	})
})

describe('When cloning...', () => {
	beforeEach(() => {
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: 10,
				y: 10,
				props: {
					w: 100,
					h: 100,
				},
			},
			{
				id: ids.box2,
				type: 'geo',
				x: 200,
				y: 200,
				props: {
					w: 100,
					h: 100,
				},
			},
			{
				id: ids.line1,
				type: 'line',
				x: 100,
				y: 100,
			},
		])
	})

	it('clones a single shape and restores when stopping cloning', () => {
		expect(editor.currentPageShapeIds.size).toBe(3)
		expect(editor.currentPageShapeIds.size).toBe(3)
		editor.select(ids.box1).pointerDown(50, 50, ids.box1).pointerMove(50, 40) // [0, -10]
		expect(editor.currentPageShapeIds.size).toBe(3)
		editor.expectShapeToMatch({ id: ids.box1, x: 10, y: 0 }) // Translated A...

		// Start cloning!
		editor.keyDown('Alt')
		expect(editor.currentPageShapeIds.size).toBe(4)
		const newShape = editor.selectedShapes[0]
		expect(newShape.id).not.toBe(ids.box1)

		editor
			.expectShapeToMatch({ id: ids.box1, x: 10, y: 10 }) // A should be back to original position...
			.expectShapeToMatch({ id: newShape.id, x: 10, y: 0 }) // New node should be at A's previous position
			.pointerMove(60, 40) // [10, -10]
			.expectShapeToMatch({ id: ids.box1, x: 10, y: 10 }) // No movement on A
			.expectShapeToMatch({ id: newShape.id, x: 20, y: 0 }) // Clone should be moving

		// Stop cloning!
		editor.keyUp('Alt')
		jest.advanceTimersByTime(500)

		editor.expectShapeToMatch({ id: ids.box1, x: 20, y: 0 }) // A should be at the translated position...
		expect(editor.getShape(newShape.id)).toBeUndefined() // And the new node should be gone!
	})

	it('clones multiple single shape and restores when stopping cloning', () => {
		editor.select(ids.box1, ids.box2).pointerDown(50, 50, ids.box1).pointerMove(50, 40) // [0, -10]
		expect(editor.currentPageShapeIds.size).toBe(3)
		editor.expectShapeToMatch({ id: ids.box1, x: 10, y: 0 }) // Translated A...
		editor.expectShapeToMatch({ id: ids.box2, x: 200, y: 190 }) // Translated B...

		// Start cloning!
		editor.keyDown('Alt')
		expect(editor.currentPageShapeIds.size).toBe(5) // Two new shapes!
		const newShapeA = editor.getShape(editor.selectedShapeIds[0])!
		const newShapeB = editor.getShape(editor.selectedShapeIds[1])!
		expect(newShapeA).toBeDefined()
		expect(newShapeB).toBeDefined()

		editor
			.expectShapeToMatch({ id: ids.box1, x: 10, y: 10 }) // A should be back to original position...
			.expectShapeToMatch({ id: ids.box2, x: 200, y: 200 }) // B should be back to original position...
			.expectShapeToMatch({ id: newShapeA.id, x: 10, y: 0 }) // New node should be at A's previous position
			.expectShapeToMatch({ id: newShapeB.id, x: 200, y: 190 }) // New node should be at B's previous position
			.pointerMove(60, 40) // [10, -10]
			.expectShapeToMatch({ id: ids.box1, x: 10, y: 10 }) // No movement on A
			.expectShapeToMatch({ id: ids.box2, x: 200, y: 200 }) // No movement on B
			.expectShapeToMatch({ id: newShapeA.id, x: 20, y: 0 }) // Clone A should be moving
			.expectShapeToMatch({ id: newShapeB.id, x: 210, y: 190 }) // Clone B should be moving

		// Stop cloning!
		editor.keyUp('Alt')

		// wait 500ms
		jest.advanceTimersByTime(500)
		editor
			.expectShapeToMatch({ id: ids.box1, x: 20, y: 0 }) // A should be at the translated position...
			.expectShapeToMatch({ id: ids.box2, x: 210, y: 190 }) // B should be at the translated position...
		expect(editor.getShape(newShapeA.id)).toBeUndefined() // And the new node A should be gone!
		expect(editor.getShape(newShapeB.id)).toBeUndefined() // And the new node B should be gone!
	})

	it('clones a parent and its descendants and removes descendants when stopping cloning', () => {
		editor.updateShapes([{ id: ids.line1, type: 'geo', parentId: ids.box2 }])
		expect(editor.getShape(ids.line1)!.parentId).toBe(ids.box2)
		editor.select(ids.box2).pointerDown(250, 250, ids.box2).pointerMove(250, 240) // [0, -10]

		expect(editor.currentPageShapeIds.size).toBe(3)
		editor.keyDown('Alt', { altKey: true })
		expect(editor.currentPageShapeIds.size).toBe(5) // Creates a clone of B and C (its descendant)

		const newShapeA = editor.getShape(editor.selectedShapeIds[0])!
		const newShapeB = editor.getShape(editor.getSortedChildIdsForParent(newShapeA.id)[0])!

		expect(newShapeA).toBeDefined()
		expect(newShapeB).toBeDefined()

		const cloneB = newShapeA.x === editor.getShape(ids.box2)!.x ? newShapeA : newShapeB
		const cloneC = newShapeA.x === editor.getShape(ids.box2)!.x ? newShapeB : newShapeA

		editor
			.expectShapeToMatch({ id: ids.box2, x: 200, y: 200 }) // B should be back to original position...
			.expectShapeToMatch({ id: cloneB.id, x: 200, y: 190 }) // New node should be at A's previous position
			.expectShapeToMatch({ id: cloneC.id, x: 100, y: 100 }) // New node should be at B's previous position
			.pointerMove(260, 240) // [10, -10]
			.expectShapeToMatch({ id: ids.box2, x: 200, y: 200 }) // No movement on B
			.expectShapeToMatch({ id: cloneB.id, x: 210, y: 190 }) // Clone A should be moving
			.expectShapeToMatch({ id: cloneC.id, x: 100, y: 100 }) // New node should be at B's previous position

		// Stop cloning!
		editor.keyUp('Alt')
		// wait 500ms
		jest.advanceTimersByTime(500)

		editor.expectShapeToMatch({ id: ids.box2, x: 210, y: 190 }) // B should be at the translated position...
		expect(editor.getShape(cloneB.id)).toBeUndefined() // And the new node A should be gone!
		expect(editor.getShape(cloneC.id)).toBeUndefined() // And the new node B should be gone!
	})

	it('Clones twice', () => {
		const groupId = createShapeId('g')
		editor.groupShapes([ids.box1, ids.box2], groupId)
		const count1 = editor.currentPageShapes.length

		editor.pointerDown(50, 50, { shape: editor.getShape(groupId)!, target: 'shape' })
		editor.expectPathToBe('root.select.pointing_shape')

		editor.pointerMove(199, 199)
		editor.expectPathToBe('root.select.translating')
		expect(editor.currentPageShapes.length).toBe(count1) // 2 new box and group

		editor.keyDown('Alt')

		editor.expectPathToBe('root.select.translating')
		expect(editor.currentPageShapes.length).toBe(count1 + 3) // 2 new box and group

		editor.keyUp('Alt')
		jest.advanceTimersByTime(500)

		expect(editor.currentPageShapes.length).toBe(count1) // 2 new box and group

		editor.keyDown('Alt')

		expect(editor.currentPageShapes.length).toBe(count1 + 3) // 2 new box and group
	})
})

describe('When translating shapes that are descendants of a rotated shape...', () => {
	beforeEach(() => {
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: 10,
				y: 10,
				props: {
					w: 100,
					h: 100,
				},
			},
			{
				id: ids.box2,
				type: 'geo',
				x: 200,
				y: 200,
				props: {
					w: 100,
					h: 100,
				},
			},
			{
				id: ids.line1,
				type: 'line',
				x: 100,
				y: 100,
			},
		])
	})

	it('Translates correctly', () => {
		editor.createShapes([
			{
				id: ids.boxD,
				parentId: ids.box1,
				type: 'geo',
				x: 20,
				y: 20,
				props: {
					w: 10,
					h: 10,
				},
			},
		])

		const shapeA = editor.getShape(ids.box1)!
		const shapeD = editor.getShape(ids.boxD)!

		expect(editor.getPageCenter(shapeA)).toMatchObject(new Vec2d(60, 60))
		expect(editor.getShapeGeometry(shapeD).center).toMatchObject(new Vec2d(5, 5))
		expect(editor.getPageCenter(shapeD)).toMatchObject(new Vec2d(35, 35))

		const rads = 0

		expect(editor.getPageCenter(shapeA)).toMatchObject(new Vec2d(60, 60))

		// Expect the node's page position to be rotated around its parent's page center
		expect(editor.getPageCenter(shapeD)).toMatchObject(
			new Vec2d(35, 35).rotWith(editor.getPageCenter(shapeA)!, rads)
		)

		const centerD = editor.getPageCenter(shapeD)!.clone().toFixed()

		editor
			.select(ids.boxD)
			.pointerDown(centerD.x, centerD.y, ids.boxD)
			.pointerMove(centerD.x, centerD.y - 10)
			.pointerMove(centerD.x, centerD.y - 10)
			.pointerUp()

		expect(editor.getPageCenter(shapeD)).toMatchObject(new Vec2d(centerD.x, centerD.y - 10))

		const centerA = editor.getPageCenter(shapeA)!.clone().toFixed()

		editor
			.select(ids.box1)
			.pointerDown(centerA.x, centerA.y, ids.box1)
			.pointerMove(centerA.x, centerA.y - 100)
			.pointerUp()

		const centerB = editor.getPageCenter(shapeA)!.clone().toFixed()

		expect(centerB).toMatchObject({ x: centerA.x, y: centerA.y - 100 })
	})
})

describe('snapping with single shapes', () => {
	beforeEach(() => {
		// 0      10     20     30
		// ┌──────┐      ┌──────┐
		// │  A   │      │  B   │
		// └──────┘      └──────┘
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 10, h: 10 },
			},
			{
				id: ids.box2,
				type: 'geo',
				x: 20,
				y: 0,
				props: { w: 10, h: 10 },
			},
		])
	})

	it('happens when the ctrl key is pressed', () => {
		// 0     10 11     21
		// ┌──────┐ ┌──────┐
		// │      │ │      │ <- dragging left
		// └──────┘ └──────┘
		//
		//    │
		//    │ press ctrl
		//    ▼
		//
		// 0     10      20
		// ┌──────┬──────┐
		// │      │      │  *snap*
		// └──────┴──────┘

		editor.pointerDown(25, 5, ids.box2).pointerMove(16, 5)

		// expect box B to be at 11, 0
		expect(editor.getShape(ids.box2)!).toMatchObject({ x: 11, y: 0 })

		// press ctrl key and it snaps to 10, 0
		editor.keyDown('Control')
		expect(editor.getShape(ids.box2)!).toMatchObject({ x: 10, y: 0 })

		// release ctrl key and it unsnaps
		editor.keyUp('Control')
		jest.advanceTimersByTime(200)

		expect(editor.getShape(ids.box2)!).toMatchObject({ x: 11, y: 0 })

		// press ctrl and release the pointer and it should stay snapped
		editor.keyDown('Control')
		expect(editor.getShape(ids.box2)!).toMatchObject({ x: 10, y: 0 })

		editor.pointerUp(16, 5, { ctrlKey: true })
		expect(editor.getShape(ids.box2)!).toMatchObject({ x: 10, y: 0 })
	})

	it('snaps to the center point as well as all four corners of a bounding box', () => {
		// ┌──────┐
		// │  B   │
		// └──────┘
		//         ┌──────┐
		//         │  A   │
		//         └──────┘
		editor.pointerDown(25, 5, ids.box2).pointerMove(-6, -6, { ctrlKey: true })
		expect(editor.getShape(ids.box2)!).toMatchObject({ x: -10, y: -10 })

		//         ┌──────┐
		//         │  B   │
		//         └──────┘
		// ┌──────┐
		// │  A   │
		// └──────┘
		editor.pointerMove(16, -6, { ctrlKey: true })
		expect(editor.getShape(ids.box2)!).toMatchObject({ x: 10, y: -10 })

		// ┌──────┐
		// │  A   │
		// └──────┘
		//         ┌──────┐
		//         │  B   │
		//         └──────┘
		editor.pointerMove(16, 16, { ctrlKey: true })
		expect(editor.getShape(ids.box2)!).toMatchObject({ x: 10, y: 10 })

		//         ┌──────┐
		//         │  A   │
		//         └──────┘
		// ┌──────┐
		// │  B   │
		// └──────┘
		editor.pointerMove(-6, 16, { ctrlKey: true })
		expect(editor.getShape(ids.box2)!).toMatchObject({ x: -10, y: 10 })

		// ┌──────┐
		// │  AB  │
		// └──────┘
		editor.pointerMove(6, 6, { ctrlKey: true })
		expect(editor.getShape(ids.box2)!).toMatchObject({ x: 0, y: 0 })
	})

	it('creates snap lines + points to render in the UI', () => {
		// 0     10
		// ┌──────┐  ┼
		// │      │
		// └──────┘  ┼     one line, four points
		//         │
		//         │
		//         │
		//         │11     21
		//       ┼  ┌──────┐
		//          │      │
		//       ┼  └──────┘

		editor.pointerDown(25, 5, ids.box2).pointerMove(16, 35, { ctrlKey: true })
		expect(editor.snaps.lines?.length).toBe(1)

		expect(getNumSnapPoints(editor.snaps.lines![0])).toBe(4)
	})

	it('shows all the horizonal lines + points where the bounding boxes align', () => {
		// x─────x────────────────────x─────x
		// ┌─────┐                    ┌─────┐
		// │  x──┼────────────────────┼──x  │
		// └─────┘                    └─────┘
		// x─────x────────────────────x─────x
		editor.pointerDown(25, 5, ids.box2).pointerMove(36, 5, { ctrlKey: true })

		const snaps = editor.snaps.lines!.sort((a, b) => getNumSnapPoints(a) - getNumSnapPoints(b))
		expect(snaps.length).toBe(3)

		// center snap line
		expect(getNumSnapPoints(snaps[0])).toBe(2)

		// top and bottom lines
		expect(getNumSnapPoints(snaps[1])).toBe(4)
		expect(getNumSnapPoints(snaps[2])).toBe(4)
	})

	it('shows all the vertical lines + points where the bounding boxes align', () => {
		// x ┌─────┐ x
		// │ │  x  │ │
		// x └──┼──┘ x
		// │    │    │
		// x ┌──┼──┐ x
		// │ │  x  │ │
		// x └─────┘ x
		editor.pointerDown(25, 5, ids.box2).pointerMove(5, 45, { ctrlKey: true })

		const snaps = editor.snaps.lines!.sort((a, b) => getNumSnapPoints(a) - getNumSnapPoints(b))
		expect(snaps.length).toBe(3)

		// center snap line
		expect(getNumSnapPoints(snaps[0])).toBe(2)

		// left and right lines
		expect(getNumSnapPoints(snaps[1])).toBe(4)
		expect(getNumSnapPoints(snaps[2])).toBe(4)
	})

	it('does not snap to shapes that are not visible in the viewport', () => {
		// move A off screen
		editor.updateShapes([{ id: ids.box1, type: 'geo', x: -20 }])

		editor.pointerDown(25, 5, ids.box2).pointerMove(36, 5, { ctrlKey: true })
		expect(editor.snaps.lines!.length).toBe(0)

		editor.updateShapes([{ id: ids.box1, type: 'geo', x: editor.viewportScreenBounds.w + 10 }])
		editor.pointerMove(33, 5, { ctrlKey: true })

		expect(editor.snaps.lines!.length).toBe(0)
		editor.updateShapes([{ id: ids.box1, type: 'geo', y: -20 }])

		editor.pointerMove(5, 5, { ctrlKey: true })
		expect(editor.snaps.lines!.length).toBe(0)

		editor.updateShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: editor.viewportScreenBounds.h + 10 },
		])

		editor.pointerMove(5, 5, { ctrlKey: true })
		expect(editor.snaps.lines!.length).toBe(0)
	})

	it('does not snap on the Y axis if the shift key is pressed', () => {
		//               ┌──────┐ ──────►
		// ┌──────┐      │  B   │ drag with shift
		// │  A   │      └──────┘
		// └──────┘

		// move B up one pixel
		editor.updateShapes([{ id: ids.box2, type: 'geo', y: editor.getShape(ids.box2)!.y - 1 }])

		editor.pointerDown(25, 5, ids.box2).pointerMove(36, 5, { ctrlKey: true })

		// should snap without shift key
		expect(editor.getShape(ids.box2)).toMatchObject({ x: 31, y: 0 })

		editor.keyDown('Shift')
		// should unsnap with shift key
		expect(editor.getShape(ids.box2)).toMatchObject({ x: 31, y: -1 })
		// and continue not snapping while moving
		editor.pointerMove(45, 5, { ctrlKey: true, shiftKey: true })
		expect(editor.getShape(ids.box2)).toMatchObject({ x: 40, y: -1 })

		// should still snap to things on the X axis
		editor.createShapes([{ type: 'geo', id: ids.line1, x: 100, y: 0, props: { w: 10, h: 10 } }])
		editor.pointerMove(106, 5, { ctrlKey: true, shiftKey: true })
		expect(editor.getShape(ids.box2)).toMatchObject({ x: 100, y: -1 })
	})

	it('does not snap on the X axis if the shift key is pressed', () => {
		// ┌──────┐
		// │  A   │
		// └──────┘
		//
		//  ┌──────┐                 │
		//  │  B   │ drag with shift │
		//  └──────┘                 ▼

		// move B into place
		editor.updateShapes([{ id: ids.box2, type: 'geo', x: 1, y: 20 }])

		editor.pointerDown(6, 25, ids.box2).pointerMove(6, 35, { ctrlKey: true })

		// should snap without shift key
		expect(editor.getShape(ids.box2)).toMatchObject({ x: 0, y: 30 })

		editor.keyDown('Shift')
		// should unsnap with shift key
		expect(editor.getShape(ids.box2)).toMatchObject({ x: 1, y: 30 })
		// and continue not snapping while moving
		editor.pointerMove(6, 50, { ctrlKey: true, shiftKey: true })
		expect(editor.getShape(ids.box2)).toMatchObject({ x: 1, y: 45 })

		// should still snap to things on the Y axis
		editor.createShapes([{ type: 'geo', id: ids.line1, x: 20, y: 100, props: { w: 10, h: 10 } }])
		editor.pointerMove(6, 106, { ctrlKey: true, shiftKey: true })
		expect(editor.getShape(ids.box2)).toMatchObject({ x: 1, y: 100 })
	})
})

describe('snapping with multiple shapes', () => {
	beforeEach(() => {
		// 0      100    200    300
		// ┌──────┐      ┌──────┐
		// │  A   │      │  B   │
		// └──────┘      └──────┘
		//
		// ┌────────────────────┐
		// │                    │
		// │                    │
		// │                    │
		// │         C          │
		// │                    │
		// │                    │
		// └────────────────────┘
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 100, h: 100 },
			},
			{
				id: ids.box2,
				type: 'geo',
				x: 200,
				y: 0,
				props: { w: 100, h: 100 },
			},
			{
				id: ids.line1,
				type: 'geo',
				x: 0,
				y: 200,
				props: { w: 300, h: 300 },
			},
		])
	})

	it("will not snap to inidivual shape's edges", () => {
		// 0      100    200    300
		//               ┌──────┐      ┌──────┐
		//               │  A   │      │  B   │
		//               └──────┘      └──────┘
		//
		// ┌────────────────────┐
		// │                    │
		// │                    │
		// │                    │
		// │         C          │
		// │                    │
		// │                    │
		// └────────────────────┘

		editor.select(ids.box1, ids.box2)
		editor.pointerDown(50, 50, ids.box1).pointerMove(249, 50, { ctrlKey: true })
		expect(editor.getShape(ids.box1)!).toMatchObject({ x: 199, y: 0 })
	})

	it("will snap to the selection's bounding box", () => {
		// 0      100    200    300
		//                      ┌──────┐      ┌──────┐
		//                      │  A   │      │  B   │
		//                      └──────┘      └──────┘
		// ┌────────────────────┐
		// │                    │
		// │                    │
		// │                    │
		// │         C          │
		// │                    │
		// │                    │
		// └────────────────────┘

		editor.select(ids.box1, ids.box2)
		editor.pointerDown(50, 50, ids.box1).pointerMove(349, 50, { ctrlKey: true })
		expect(editor.getShape(ids.box1)!).toMatchObject({ x: 300, y: 0 })
	})
})

describe('Snap-between behavior', () => {
	beforeEach(() => {
		editor?.dispose()
	})
	it('snaps a shape horizontally between two others', () => {
		// ┌─────┐               ┌─────┐
		// │     │               │     │
		// │     │               │     │
		// │     │               │     │
		// │  A  │               │  B  │
		// │     │     ┌───┐     │     │
		// │     ├──┼──┤ C ├──┼──┤     │
		// │     │     └───┘     │     │
		// └─────┘               └─────┘
		editor.createShapes([
			{ type: 'geo', id: ids.box1, x: 0, y: 0, props: { w: 50, h: 100 } },
			{ type: 'geo', id: ids.box2, x: 200, y: 0, props: { w: 50, h: 100 } },
			{ type: 'geo', id: ids.line1, x: 50, y: 0, props: { w: 10, h: 10 } },
		])

		// the midpoint is 125 and c is 10 wide so it should snap to 120 if we put it at 121
		editor.pointerDown(55, 5, ids.line1).pointerMove(126, 67, { ctrlKey: true })
		expect(editor.getShape(ids.line1)).toMatchObject({ x: 120, y: 62 })
		expect(editor.snaps.lines?.length).toBe(1)
		assertGaps(editor.snaps.lines![0])
		expect(editor.snaps.lines![0].gaps.length).toBe(2)
	})
	it('shows horizontal point snaps at the same time as horizontal gap snaps', () => {
		// ┌─────┐               ┌─────┐
		// │     │               │     │
		// │     │               │     │
		// │     │               │     │
		// │  A  │               │  B  │
		// │     │               │     │
		// │     │     ┌───┐     │     │
		// │     ├──┼──┤ C ├──┼──┤     │
		// └─────┘     └───┘     └─────┘
		// x─────x─────x───x─────x─────x
		editor.createShapes([
			{ type: 'geo', id: ids.box1, x: 0, y: 0, props: { w: 50, h: 100 } },
			{ type: 'geo', id: ids.box2, x: 200, y: 0, props: { w: 50, h: 100 } },
			{ type: 'geo', id: ids.line1, x: 50, y: 0, props: { w: 10, h: 10 } },
		])

		editor.pointerDown(55, 5, ids.line1).pointerMove(126, 94, { ctrlKey: true })
		expect(editor.getShape(ids.line1)).toMatchObject({ x: 120, y: 90 })
		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)
		expect(gapLines).toHaveLength(1)
		expect(pointLines).toHaveLength(1)
		expect(gapLines[0].gaps.length).toBe(2)
		expect(pointLines[0].points.length).toBe(6)
	})
	it('shows vertical point snaps at the same time as horizontal gap snaps', () => {
		// ┌─────┐               ┌─────┐
		// │     │               │     │
		// │     │               │     │
		// │     │               │     │
		// │  A  │               │  B  │
		// │     │     ┌───┐     │     │
		// │     ├──┼──┤ C ├──┼──┤     │ x
		// │     │     └───┘     │     │ │
		// └─────┘               └─────┘ │
		//                               │
		//           ┌───────┐           │
		//           │   D   │           x
		//           └───────┘
		editor.createShapes([
			{ type: 'geo', id: ids.box1, x: 0, y: 0, props: { w: 50, h: 100 } },
			{ type: 'geo', id: ids.box2, x: 200, y: 0, props: { w: 50, h: 100 } },
			{ type: 'geo', id: ids.line1, x: 50, y: 0, props: { w: 10, h: 10 } },
			{ type: 'geo', id: ids.boxD, x: 75, y: 150, props: { w: 100, h: 10 } },
		])

		// the midpoint is 125 and c is 10 wide so it should snap to 120 if we put it at 121
		editor.pointerDown(55, 5, ids.line1).pointerMove(126, 67, { ctrlKey: true })
		expect(editor.getShape(ids.line1)).toMatchObject({ x: 120, y: 62 })
		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)
		expect(gapLines).toHaveLength(1)
		expect(pointLines).toHaveLength(1)

		expect(gapLines[0].gaps.length).toBe(2)
		expect(pointLines[0].points.length).toBe(2)
	})
	it('snaps a shape vertically between two others', () => {
		// ┌──────────────────────────┐
		// │                          │
		// │            A             │
		// │                          │
		// └─────┬────────────────────┘
		//       │
		//      ─┼─
		//       │
		//     ┌─┴─┐
		//     │ C │
		//     └─┬─┘
		//       │
		//      ─┼─
		//       │
		// ┌─────┴────────────────────┐
		// │                          │
		// │            B             │
		// │                          │
		// └──────────────────────────┘
		editor.createShapes([
			{ type: 'geo', id: ids.box1, x: 0, y: 0, props: { w: 100, h: 50 } },
			{ type: 'geo', id: ids.box2, x: 0, y: 200, props: { w: 100, h: 50 } },
			{ type: 'geo', id: ids.line1, x: 50, y: 150, props: { w: 10, h: 10 } },
		])
		// the midpoint is 125 and c is 10 wide so it should snap to 120 if we put it at 121
		editor.pointerDown(55, 155, ids.line1).pointerMove(27, 126, { ctrlKey: true })
		expect(editor.getShape(ids.line1)).toMatchObject({ x: 22, y: 120 })
		expect(editor.snaps.lines?.length).toBe(1)
		assertGaps(editor.snaps.lines![0])
		const { gapLines } = getGapAndPointLines(editor.snaps.lines!)
		expect(gapLines[0].gaps.length).toBe(2)
	})
	it('shows vertical snap points at the same time as vertical gaps', () => {
		// x ┌──────────────────────────┐
		// │ │                          │
		// │ │            A             │
		// │ │                          │
		// x └─┬────────────────────────┘
		// │   │
		// │  ─┼─
		// │   │
		// x ┌─┴─┐
		// │ │ C │
		// x └─┬─┘
		// │   │
		// │  ─┼─
		// │   │
		// x ┌─┴────────────────────────┐
		// │ │                          │
		// │ │            B             │
		// │ │                          │
		// x └──────────────────────────┘
		editor.createShapes([
			{ type: 'geo', id: ids.box1, x: 0, y: 0, props: { w: 100, h: 50 } },
			{ type: 'geo', id: ids.box2, x: 0, y: 200, props: { w: 100, h: 50 } },
			{ type: 'geo', id: ids.line1, x: 50, y: 150, props: { w: 10, h: 10 } },
		])
		// the midpoint is 125 and c is 10 wide so it should snap to 120 if we put it at 121
		editor.pointerDown(55, 155, ids.line1).pointerMove(6, 126, { ctrlKey: true })
		expect(editor.getShape(ids.line1)).toMatchObject({ x: 0, y: 120 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)
		expect(gapLines).toHaveLength(1)
		expect(pointLines).toHaveLength(1)
		expect(gapLines[0].gaps.length).toBe(2)
		expect(pointLines[0].points.length).toBe(6)
	})
	it('shows horizontal snap points at the same time as vertical gaps', () => {
		// ┌──────────────────────────┐
		// │                          │
		// │            A             │
		// │                          │
		// └────┬─────────────────────┘
		//      │
		//     ─┼─       D┌───────────┐
		//      │         │           │
		//   C┌─┴─┐       │           │
		//    │ x─┼───────┼─────x     │
		//    └─┬─┘       │           │
		//      │         │           │
		//     ─┼─        └───────────┘
		//      │
		// ┌────┴─────────────────────┐
		// │                          │
		// │            B             │
		// │                          │
		// └──────────────────────────┘
		editor.createShapes([
			{ type: 'geo', id: ids.box1, x: 0, y: 0, props: { w: 100, h: 50 } },
			{ type: 'geo', id: ids.box2, x: 0, y: 200, props: { w: 100, h: 50 } },
			{ type: 'geo', id: ids.line1, x: 50, y: 150, props: { w: 10, h: 10 } },
			{ type: 'geo', id: ids.boxD, x: 50, y: 75, props: { w: 10, h: 100 } },
		])
		// the midpoint is 125 and c is 10 wide so it should snap to 120 if we put it at 121
		editor.pointerDown(55, 155, ids.line1).pointerMove(27, 126, { ctrlKey: true })
		expect(editor.getShape(ids.line1)).toMatchObject({ x: 22, y: 120 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)
		expect(gapLines).toHaveLength(1)
		expect(pointLines).toHaveLength(1)
		expect(gapLines[0].gaps).toHaveLength(2)
		expect(pointLines[0].points).toHaveLength(2)
	})
	it('can happen on multiple axes at the same time', () => {
		//           ┌──────────────────────────┐
		//           │                          │
		//           │            A             │
		// ┌─────┐   │               ┌─────┐    │
		// │     │   └─────┬─────────┼─────┼────┘
		// │     │         │         │     │
		// │     │        ─┼─        │     │
		// │  D  │         │         │  B  │
		// │     │       ┌─┴─┐       │     │
		// │     ├───┼───┤ E ├───┼───┤     │
		// │     │       └─┬─┘       │     │
		// └─────┘         │         └─────┘
		//                ─┼─
		//                 │
		//           ┌─────┴────────────────────┐
		//           │                          │
		//           │            C             │
		//           │                          │
		//           └──────────────────────────┘
		editor.createShapes([
			{ type: 'geo', id: ids.box1, x: 50, y: 0, props: { w: 200, h: 50 } },
			{ type: 'geo', id: ids.box2, x: 150, y: 50, props: { w: 50, h: 100 } },
			{ type: 'geo', id: ids.line1, x: 50, y: 200, props: { w: 200, h: 50 } },
			{ type: 'geo', id: ids.boxD, x: 0, y: 50, props: { w: 50, h: 100 } },
			{ type: 'geo', id: ids.boxE, x: 0, y: 0, props: { w: 10, h: 10 } },
		])
		editor.pointerDown(5, 5, ids.boxE).pointerMove(101, 126, { ctrlKey: true })
		expect(editor.getShape(ids.boxE)).toMatchObject({ x: 95, y: 120 })
		expect(editor.snaps.lines?.length).toBe(2)
		assertGaps(editor.snaps.lines![0])
		assertGaps(editor.snaps.lines![1])
		const { gapLines } = getGapAndPointLines(editor.snaps.lines!)
		expect(gapLines[0].gaps.length).toBe(2)
		expect(gapLines[1].gaps.length).toBe(2)
	})
	it('will expand a horizontal and vertical selections outwards if possible', () => {
		//                 ┌───┐
		//                 │ E │
		//                 └─┬─┘
		//                   ┼
		//                 ┌─┴─┐
		//                 │ F │
		//                 └─┬─┘
		//                   ┼
		// ┌───┐   ┌───┐   ┌─┴─┐   ┌───┐   ┌───┐
		// │ A ├─┼─┤ B ├─┼─┤ X ├─┼─┤ C ├─┼─┤ D │
		// └───┘   └───┘   └─┬─┘   └───┘   └───┘
		//                   ┼
		//                 ┌─┴─┐
		//                 │ G │
		//                 └─┬─┘
		//                   ┼
		//                 ┌─┴─┐
		//                 │ H │
		//                 └───┘
		// dragging X

		editor.createShapes([
			box(ids.box1, 0, 40),
			box(ids.box2, 20, 40),
			box(ids.line1, 60, 40),
			box(ids.boxD, 80, 40),
			box(ids.boxE, 40, 0),
			box(ids.boxF, 40, 20),
			box(ids.boxG, 40, 60),
			box(ids.boxH, 40, 80),

			box(ids.boxX, 0, 0),
		])

		editor.pointerDown(5, 5, ids.boxX).pointerMove(46, 46, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 40, y: 40 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)
		expect(gapLines).toHaveLength(2)
		expect(gapLines[0].gaps).toHaveLength(4)
		expect(gapLines[1].gaps).toHaveLength(4)

		// it should also have snap lines for all the edge/center alignments
		expect(pointLines).toHaveLength(6)
	})

	it('will show multiple non-overlapping snap-betweens on the same axis', () => {
		// ┌─────┐   ┌─────┐
		// │  A  │   │  B  │
		// └──┬──┘   └──┬──┘
		//    ┼         ┼
		// ┌──┴─────────┴──┐
		// │    X  drag    │
		// └──┬─────────┬──┘
		//    ┼         ┼
		// ┌──┴──┐   ┌──┴──┐
		// │  C  │   │  D  │
		// └─────┘   └─────┘

		editor.createShapes([
			box(ids.box1, 0, 0),
			box(ids.box2, 20, 0),
			box(ids.line1, 0, 40),
			box(ids.boxD, 20, 40),
			box(ids.boxX, 50, 20, 30),
		])

		editor.pointerDown(65, 25, ids.boxX).pointerMove(16, 25, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 0, y: 20 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)
		expect(gapLines).toHaveLength(2)
		expect(gapLines[0].gaps).toHaveLength(2)
		expect(gapLines[1].gaps).toHaveLength(2)

		// check outer edge snaps too
		expect(pointLines).toHaveLength(2)
		expect(pointLines[0].points).toHaveLength(6)
		expect(pointLines[1].points).toHaveLength(6)
	})

	it('should not snap horizontally if the shape is larger than the gap', () => {
		//        ┌─────┐             ┌─────┐
		//        │     │             │     │
		//        │  A  │             │  B  │
		//        │     │             │     │
		//        │     │             │     │
		// ┌──────┼─────┼─────────────┼─────┼──────┐
		// │      │     │             │     │      │
		// │      │     │      X      │     │      │ ◄─── drag
		// │      │     │             │     │      │
		// └──────┼─────┼─────────────┼─────┼──────┘
		//        │     │             │     │
		//        │     │             │     │
		//        │     │             │     │
		//        └─────┘             └─────┘
		//
		//   no snap to center gap between A + B
		editor.createShapes([
			box(ids.box1, 20, 0, 10, 100),
			box(ids.box2, 70, 0, 10, 100),
			box(ids.boxX, 0, 50, 100, 10),
		])

		editor.pointerDown(50, 55, ids.boxX).pointerMove(51, 66, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 1, y: 61 })
		expect(editor.snaps.lines?.length).toBe(0)
	})

	it('should work if the thing being dragged is a selection', () => {
		//                   selection
		//                  ┌─────────────────────────┐
		//                  │                         │       ┌────────┐
		// ┌────────┐       │          ┌────────────┐ │       │        │
		// │        │       │          │            │ │       │        │
		// │        │       │          │    C       │ │       │        │
		// │   A    ├───┼───┤ ┌────┐   └────────────┘ ├───┼───┤   B    │
		// │        │       │ │    │                  │       │        │
		// │        │       │ │  D │                  │       │        │
		// └────────┘       │ └────┘                  │       └────────┘
		//                  └─────────────────────────┘
		editor.createShapes([
			box(ids.box1, 0, 50, 50, 100),
			box(ids.box2, 350, 0, 50, 100),
			box(ids.line1, 200, 10, 100, 10),
			box(ids.boxD, 100, 80, 10, 50),
		])

		editor.select(ids.line1, ids.boxD)

		editor.pointerDown(200, 50, ids.line1).pointerMove(201, 61, { ctrlKey: true })

		expect(editor.getShape(ids.line1)).toMatchObject({ x: 200, y: 21 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)

		expect(gapLines).toHaveLength(1)
		expect(pointLines).toHaveLength(0)

		expect(gapLines[0].gaps).toHaveLength(2)

		const sortedGaps = gapLines[0].gaps.sort((a, b) => a.startEdge[0].x - b.startEdge[0].x)

		expect(sortedGaps[0].startEdge[0].x).toBeCloseTo(50)
		expect(sortedGaps[0].endEdge[0].x).toBeCloseTo(100)

		expect(sortedGaps[1].startEdge[0].x).toBeCloseTo(300)
		expect(sortedGaps[1].endEdge[0].x).toBeCloseTo(350)
	})
})

describe('Snap-next-to behavior', () => {
	beforeEach(() => {
		editor?.dispose()
	})
	it('snaps a shape to the left of two others, matching the gap size', () => {
		// ┌───┐
		// │ X │
		// └───┘         ┌───┐         ┌───┐
		//               │ A │         │ B │
		//               └───┘         └───┘
		//   │
		//   │  drag x down
		//   ▼
		//
		// ┌───┐         ┌───┐         ┌───┐
		// │ X ├────┼────┤ A ├────┼────┤ B │   *snap*
		// └───┘         └───┘         └───┘
		editor.createShapes([box(ids.boxX, 0, 0), box(ids.box1, 50, 10), box(ids.box2, 100, 10)])

		editor.pointerDown(5, 5, ids.boxX).pointerMove(6, 16, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 0, y: 10 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)

		expect(gapLines).toHaveLength(1)
		expect(gapLines[0].gaps).toHaveLength(2)

		// also check the outer edge snaps
		expect(pointLines).toHaveLength(3)
	})

	it('expands the selection to the right for left snap-besides ', () => {
		// ┌───┐
		// │ X │
		// └───┘         ┌───┐         ┌───┐         ┌───┐         ┌───┐
		//               │ A │         │ B │         │ C │         │ D │
		//               └───┘         └───┘         └───┘         └───┘
		//   │
		//   │  drag x down
		//   ▼
		//
		// ┌───┐         ┌───┐         ┌───┐         ┌───┐         ┌───┐
		// │ X ├────┼────┤ A ├────┼────┤ B ├────┼────┤ C ├────┼────┤ D │
		// └───┘         └───┘         └───┘         └───┘         └───┘
		//
		//                                     *snap*
		//
		editor.createShapes([
			box(ids.boxX, 0, 0),
			box(ids.box1, 50, 10),
			box(ids.box2, 100, 10),
			box(ids.line1, 150, 10),
			box(ids.boxD, 200, 10),
		])

		editor.pointerDown(5, 5, ids.boxX).pointerMove(6, 16, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 0, y: 10 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)

		expect(gapLines).toHaveLength(1)
		expect(gapLines[0].gaps).toHaveLength(4)

		// also check the outer edge snaps
		expect(pointLines).toHaveLength(3)
	})

	it('snaps a shape to the right of two others, matching the gap size', () => {
		//                             ┌───┐
		//                             │ X │
		// ┌───┐         ┌───┐         └───┘
		// │ A │         │ B │
		// └───┘         └───┘
		//                        │
		//                        │  drag X down
		//                        ▼
		//
		// ┌───┐         ┌───┐         ┌───┐
		// │ A ├────┼────┤ B ├────┼────┤ X │   *snap*
		// └───┘         └───┘         └───┘
		editor.createShapes([box(ids.box1, 0, 10), box(ids.box2, 50, 10), box(ids.boxX, 100, 0)])

		editor.pointerDown(105, 5, ids.boxX).pointerMove(106, 16, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 100, y: 10 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)

		expect(gapLines).toHaveLength(1)
		expect(gapLines[0].gaps).toHaveLength(2)

		// also check the outer edge snaps
		expect(pointLines).toHaveLength(3)
	})
	it('expands the selection to the left for right snap-besides ', () => {
		//                                                         ┌───┐
		//                                                         │ X │
		// ┌───┐         ┌───┐         ┌───┐         ┌───┐         └───┘
		// │ A │         │ B │         │ C │         │ D │
		// └───┘         └───┘         └───┘         └───┘
		//                                                           │
		//                                             drag x down   │
		//                                                           ▼
		//
		// ┌───┐         ┌───┐         ┌───┐         ┌───┐         ┌───┐
		// │ A ├────┼────┤ B ├────┼────┤ C ├────┼────┤ D ├────┼────┤ x │
		// └───┘         └───┘         └───┘         └───┘         └───┘
		//
		//                            *snap*
		editor.createShapes([
			box(ids.box1, 0, 10),
			box(ids.box2, 50, 10),
			box(ids.line1, 100, 10),
			box(ids.boxD, 150, 10),
			box(ids.boxX, 200, 0),
		])

		editor.pointerDown(205, 5, ids.boxX).pointerMove(206, 16, { ctrlKey: true })
		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 200, y: 10 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)

		expect(gapLines).toHaveLength(1)
		expect(gapLines[0].gaps).toHaveLength(4)

		// also check the outer edge snaps
		expect(pointLines).toHaveLength(3)
	})
	it('snaps a shape above two others, matching the gap size', () => {
		// ┌───┐                 ┌───┐
		// │ X │                 │ X │
		// └───┘                 └─┬─┘
		//            drag X       ┼
		//    ┌───┐              ┌─┴─┐
		//    │ A │     ────►    │ A │   *snap*
		//    └───┘              └─┬─┘
		//                         ┼
		//    ┌───┐              ┌─┴─┐
		//    │ B │              │ B │
		//    └───┘              └───┘
		editor.createShapes([box(ids.boxX, 0, 0), box(ids.box1, 10, 20), box(ids.box2, 10, 40)])

		editor.pointerDown(5, 5, ids.boxX).pointerMove(16, 6, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 10, y: 0 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)

		expect(gapLines).toHaveLength(1)
		expect(gapLines[0].gaps).toHaveLength(2)

		// also check the outer edge snaps
		expect(pointLines).toHaveLength(3)
	})

	it('expands the selection downwards for top snap-besides ', () => {
		// ┌───┐                 ┌───┐
		// │ X │                 │ X │
		// └───┘                 └─┬─┘
		//            drag X       ┼
		//    ┌───┐              ┌─┴─┐
		//    │ A │     ────►    │ A │   *snap*
		//    └───┘              └─┬─┘
		//                         ┼
		//    ┌───┐              ┌─┴─┐
		//    │ B │              │ B │
		//    └───┘              └─┬─┘
		//                         ┼
		//    ┌───┐              ┌─┴─┐
		//    │ C │              │ C │
		//    └───┘              └─┬─┘
		//                         ┼
		//    ┌───┐              ┌─┴─┐
		//    │ D │              │ D │
		//    └───┘              └───┘

		editor.createShapes([
			box(ids.boxX, 0, 0),
			box(ids.box1, 10, 20),
			box(ids.box2, 10, 40),
			box(ids.line1, 10, 60),
			box(ids.boxD, 10, 80),
		])

		editor.pointerDown(5, 5, ids.boxX).pointerMove(16, 6, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 10, y: 0 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)

		expect(gapLines).toHaveLength(1)
		expect(gapLines[0].gaps).toHaveLength(4)

		// also check the outer edge snaps
		expect(pointLines).toHaveLength(3)
	})

	it('snaps a shape below two others, matching the gap size', () => {
		//     ┌───┐              ┌───┐
		//     │ A │              │ A │
		//     └───┘              └─┬─┘
		//                          ┼
		//     ┌───┐              ┌─┴─┐
		//     │ B │              │ B │
		//     └───┘              └─┬─┘
		//                          ┼
		// ┌───┐      drag X      ┌─┴─┐  *snap*
		// │ X │                  │ X │
		// └───┘        ────►     └───┘
		editor.createShapes([box(ids.box1, 10, 0), box(ids.box2, 10, 20), box(ids.boxX, 0, 40)])

		editor.pointerDown(5, 45, ids.boxX).pointerMove(16, 46, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 10, y: 40 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)

		expect(gapLines).toHaveLength(1)
		expect(gapLines[0].gaps).toHaveLength(2)

		// also check the outer edge snaps
		expect(pointLines).toHaveLength(3)
	})

	it('expands the selection upwards for bottom snap-besides ', () => {
		//     ┌───┐              ┌───┐
		//     │ A │              │ A │
		//     └───┘              └─┬─┘
		//                          ┼
		//     ┌───┐              ┌─┴─┐
		//     │ B │              │ B │
		//     └───┘              └─┬─┘
		//                          ┼
		//     ┌───┐              ┌─┴─┐
		//     │ C │              │ C │
		//     └───┘              └─┬─┘
		//                          ┼
		//     ┌───┐              ┌─┴─┐
		//     │ D │              │ D │
		//     └───┘              └─┬─┘
		//                          ┼
		// ┌───┐      drag X      ┌─┴─┐  *snap*
		// │ X │                  │ X │
		// └───┘        ────►     └───┘
		editor.createShapes([
			box(ids.box1, 10, 0),
			box(ids.box2, 10, 20),
			box(ids.line1, 10, 40),
			box(ids.boxD, 10, 60),
			box(ids.boxX, 0, 80),
		])

		editor.pointerDown(5, 85, ids.boxX).pointerMove(16, 86, { ctrlKey: true })

		expect(editor.getShape(ids.boxX)).toMatchObject({ x: 10, y: 80 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)

		expect(gapLines).toHaveLength(1)
		expect(gapLines[0].gaps).toHaveLength(4)

		// also check the outer edge snaps
		expect(pointLines).toHaveLength(3)
	})

	it('should work if the thing being dragged is a selection', () => {
		//                                    selection
		//                                   ┌─────────────────────────┐
		//                                   │                         │
		// ┌────────┐       ┌────────┐       │          ┌────────────┐ │
		// │        │       │        │       │          │  C         │ │
		// │        │       │        │       │          │            │ │
		// │   A    ├───┼───┤   B    ├───┼───┤ ┌────┐   └────────────┘ │
		// │        │       │        │       │ │ D  │                  │
		// │        │       │        │       │ │    │                  │
		// └────────┘       └────────┘       │ └────┘                  │
		//                                   └─────────────────────────┘
		editor.createShapes([
			box(ids.box1, 0, 50, 50, 100),
			box(ids.box2, 100, 50, 50, 100),
			box(ids.line1, 300, 10, 100, 10),
			box(ids.boxD, 200, 80, 10, 50),
		])

		editor.select(ids.line1, ids.boxD)

		editor.pointerDown(300, 50, ids.line1).pointerMove(301, 101, { ctrlKey: true })

		expect(editor.getShape(ids.boxD)).toMatchObject({ x: 200, y: 131 })

		const { gapLines, pointLines } = getGapAndPointLines(editor.snaps.lines!)

		expect(gapLines).toHaveLength(1)
		expect(pointLines).toHaveLength(0)

		expect(gapLines[0].gaps).toHaveLength(2)

		const sortedGaps = gapLines[0].gaps.sort((a, b) => a.startEdge[0].x - b.startEdge[0].x)

		expect(sortedGaps[0].startEdge[0].x).toBeCloseTo(50)
		expect(sortedGaps[0].endEdge[0].x).toBeCloseTo(100)

		expect(sortedGaps[1].startEdge[0].x).toBeCloseTo(150)
		expect(sortedGaps[1].endEdge[0].x).toBeCloseTo(200)
	})
})

describe('translating while the grid is enabled', () => {
	it('does not snap to the grid', () => {
		// 0   20      50   70
		//  ┌───┐       ┌───┐
		//  │ A │       │ B │
		//  └───┘       └───┘
		editor.createShapes([box(ids.box1, 0, 0, 20, 20), box(ids.box2, 50, 0, 20, 20)])

		editor.updateInstanceState({ isGridMode: true })

		// try to snap A to B
		// doesn't work because of the grid

		// 0   20      50   70
		//         ┌───┬┬───┐
		//         │ A ││ B │
		//         └───┴┴───┘

		editor.select(ids.box1).pointerDown(10, 10, ids.box1).pointerMove(39, 10)

		// rounds to nearest 10
		expect(editor.getShapePageBounds(ids.box1)!.x).toEqual(30)

		// engage snap mode and it should indeed snap to B

		// 0   20      50   70
		//          ┌───┬───┐
		//          │ A │ B │
		//          └───┴───┘
		editor.keyDown('Control')
		expect(editor.getShapePageBounds(ids.box1)!.x).toEqual(30)

		// and we can move the box anywhere if there are no snaps nearby
		editor.pointerMove(-19, -32, { ctrlKey: true })
		expect(editor.getShapePageBounds(ids.box1)!).toMatchObject({ x: -29, y: -42 })
	})
})

describe('snap lines', () => {
	it('should show up for all matching snaps, even if the axis is locked', () => {
		//   0           60                    200
		//
		//               ┌─────────────┐        ┌─────────────┐
		//               │ A           │        │ B           │
		//               │             │        │             │
		//     ◄──────── │             │        │             │
		//               │             │        │             │
		//               │             │        │             │
		// 100           └─────────────┘        └─────────────┘
		//
		//     hold shift and
		//     drag A left to C
		//
		// 200 ┌─────────────┐
		//     │ C           │
		//     │             │
		//     │             │
		//     │             │
		//     │             │
		//     └─────────────┘
		//
		//
		//    ────────────────────────────────────────────────────────
		//
		//
		//   0    *snap*    100                200
		//
		//     x─────────────x──────────────────x─────────────x
		//     │ A           │                  │ B           │
		//     │             │                  │             │
		//     │      x──────┼──────────────────┼──────x      │
		//     │      │      │                  │             │
		//     │      │      │                  │             │
		// 100 x──────┼──────x──────────────────x─────────────x
		//     │      │      │
		//     │      │      │
		//     │      │      │
		//     │      │      │
		//     │      │      │
		// 200 x──────┼──────x
		//     │ C    │      │
		//     │      │      │
		//     │      x      │
		//     │             │
		//     │             │
		//     x─────────────x
		editor.createShapes([
			box(ids.box1, 60, 0, 100, 100),
			box(ids.box2, 200, 0, 100, 100),
			box(ids.line1, 0, 200, 100, 100),
		])

		editor
			.select(ids.box1)
			.pointerDown(110, 50, ids.box1)
			.pointerMove(49, 52, { shiftKey: true, ctrlKey: true })

		expect(editor.getShape(ids.box1)).toMatchObject({
			x: 0,
			y: 0,
			props: { w: 100, h: 100 },
		})

		expect(getSnapLines(editor)).toMatchInlineSnapshot(`
      Array [
        "0,0 0,100 0,200 0,300",
        "0,0 100,0 200,0 300,0",
        "0,100 100,100 200,100 300,100",
        "100,0 100,100 100,200 100,300",
        "50,50 250,50",
        "50,50 50,250",
      ]
    `)
	})
})

describe('translating a shape with a child', () => {
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
		editor.createShapes([box(ids.box1, 0, 0, 50, 50), box(ids.box2, 1, 1)])
		editor.updateShapes([{ id: ids.box2, type: 'geo', parentId: ids.box1 }])

		editor.pointerDown(25, 25, ids.box1).pointerMove(50, 25, { ctrlKey: true })

		expect(editor.snaps.lines?.length).toBe(0)
		expect(editor.getShape(ids.box1)).toMatchObject({
			x: 25,
			y: 0,
			props: { w: 50, h: 50 },
		})
		expect(editor.getShape(ids.box2)).toMatchObject({ x: 1, y: 1, props: { w: 10, h: 10 } })
		expect(editor.getShapePageBounds(ids.box2)).toMatchObject({
			x: 26,
			y: 1,
			w: 10,
			h: 10,
		})
	})
})

describe('translating a shape with a bound shape', () => {
	it('should not snap to arrows', () => {
		//   100         200
		// ┌───────────────────┐
		// │ ┌───┐      ┌───┐  │
		// │ │ A │ ---> │ B │  │
		// │ └───┘      └───┘  │
		// └───────────────────┘
		editor.createShapes([box(ids.box1, 0, 0, 100, 100), box(ids.box2, 200, 0, 100, 100)])

		// Create an arrow starting within the first box and ending within the second box
		editor.setCurrentTool('arrow').pointerDown(50, 50).pointerMove(250, 50).pointerUp()

		//   100         200
		// ┌───────────────────┐
		// │            ┌───┐  │
		// │          , │ B │  │
		// │      ┌───┐ └───┘  │
		// |      │ A │        |
		// |      └───┘        |
		// └───────────────────┘

		expect(editor.getShape(editor.selectedShapeIds[0])?.type).toBe('arrow')

		editor.pointerDown(50, 50, ids.box1).pointerMove(84, 110, { ctrlKey: true })

		expect(editor.snaps.lines.length).toBe(0)
	})

	it('should preserve arrow bindings', () => {
		const arrow1 = createShapeId('arrow1')
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
			{
				id: arrow1,
				type: 'arrow',
				x: 150,
				y: 150,
				props: {
					start: {
						type: 'binding',
						isExact: false,
						boundShapeId: ids.box1,
						normalizedAnchor: { x: 0.5, y: 0.5 },
					},
					end: {
						type: 'binding',
						isExact: false,
						boundShapeId: ids.box2,
						normalizedAnchor: { x: 0.5, y: 0.5 },
					},
				},
			},
		])

		editor.select(ids.box1, arrow1)
		editor.pointerDown(150, 150, ids.box1).pointerMove(0, 0)

		expect(editor.getShape(ids.box1)).toMatchObject({ x: -50, y: -50 })
		expect(editor.getShape(arrow1)).toMatchObject({
			props: { start: { type: 'binding' }, end: { type: 'binding' } },
		})
	})

	it('breaks arrow bindings when cloning', () => {
		const arrow1 = createShapeId('arrow1')
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
			{
				id: arrow1,
				type: 'arrow',
				x: 150,
				y: 150,
				props: {
					start: {
						type: 'binding',
						isExact: false,
						boundShapeId: ids.box1,
						normalizedAnchor: { x: 0.5, y: 0.5 },
					},
					end: {
						type: 'binding',
						isExact: false,
						boundShapeId: ids.box2,
						normalizedAnchor: { x: 0.5, y: 0.5 },
					},
				},
			},
		])

		editor.select(ids.box1, arrow1)
		editor.pointerDown(150, 150, ids.box1).pointerMove(0, 0, { altKey: true })

		expect(editor.getShape(ids.box1)).toMatchObject({ x: 100, y: 100 })
		expect(editor.getShape(arrow1)).toMatchObject({
			props: { start: { type: 'binding' }, end: { type: 'binding' } },
		})

		const newArrow = editor.currentPageShapes.find(
			(s) => editor.isShapeOfType<TLArrowShape>(s, 'arrow') && s.id !== arrow1
		)
		expect(newArrow).toMatchObject({
			props: { start: { type: 'binding' }, end: { type: 'point' } },
		})
	})
})

describe('When dragging a shape onto a parent', () => {
	it('reparents the shape', () => {
		editor.createShapes([
			{
				id: ids.frame1,
				type: 'frame',
				x: 0,
				y: 0,
				props: {
					w: 200,
					h: 200,
				},
			},
			{
				id: ids.box1,
				type: 'geo',
				x: 500,
				y: 500,
				props: {
					w: 100,
					h: 100,
				},
			},
		])

		editor.pointerDown(550, 550, ids.box1).pointerMove(100, 100).pointerUp()
		expect(editor.getShape(ids.box1)?.parentId).toBe(ids.frame1)
	})

	it('does not reparent the shape when the parent is clipped', () => {
		editor.createShapes([
			{
				id: ids.frame1,
				type: 'frame',
				x: 0,
				y: 0,
				props: {
					w: 200,
					h: 200,
				},
			},
			{
				id: ids.frame2,
				type: 'frame',
				x: 200,
				y: 200,
				props: {
					w: 500,
					h: 500,
				},
			},
			{
				id: ids.box1,
				type: 'geo',
				x: 500,
				y: 500,
				props: {
					w: 100,
					h: 100,
				},
			},
		])

		// drop the frame2 onto frame 1
		editor.reparentShapes([ids.frame2], ids.frame1)
		expect(editor.getShape(ids.frame2)?.parentId).toBe(ids.frame1)

		// drop box1 onto the CLIPPED part of frame2
		editor.pointerDown(550, 550, ids.box1).pointerMove(350, 350).pointerUp()

		// It should not become the child of frame2 because it is clipped
		expect(editor.getShape(ids.box1)?.parentId).toBe(editor.currentPageId)
	})
})

describe('When dragging shapes', () => {
	it('should drag and undo and redo', () => {
		editor.deleteShapes(editor.currentPageShapes)

		editor.setCurrentTool('arrow').pointerMove(0, 0).pointerDown().pointerMove(100, 100).pointerUp()

		editor.expectShapeToMatch({
			id: editor.currentPageShapes[0]!.id,
			x: 0,
			y: 0,
		})

		editor.setCurrentTool('geo').pointerMove(-10, 100).pointerDown().pointerUp()

		editor.expectShapeToMatch({
			id: editor.currentPageShapes[1]!.id,
			x: -110,
			y: 0,
		})

		editor
			.selectAll()
			.pointerMove(50, 50)
			.pointerDown()
			.pointerMove(100, 50)
			.pointerUp()
			.expectShapeToMatch({
				id: editor.currentPageShapes[0]!.id,
				x: 50, // 50 to the right
				y: 0,
			})
			.expectShapeToMatch({
				id: editor.currentPageShapes[1]!.id,
				x: -60, // 50 to the right
				y: 0,
			})

		editor
			.undo()
			.expectShapeToMatch({
				id: editor.currentPageShapes[0]!.id,
				x: 0, // 50 to the right
				y: 0,
			})
			.expectShapeToMatch({
				id: editor.currentPageShapes[1]!.id,
				x: -110, // 50 to the right
				y: 0,
			})
	})
})

it('clones a single shape simply', () => {
	editor
		// create a note shape
		.setCurrentTool('note')
		.pointerMove(50, 50)
		.click()

	expect(editor.onlySelectedShape).toBe(editor.currentPageShapes[0])
	expect(editor.hoveredShape).toBe(editor.currentPageShapes[0])

	// click on the canvas to deselect
	editor.pointerMove(200, 50).click()

	expect(editor.onlySelectedShape).toBe(null)
	expect(editor.hoveredShape).toBe(undefined)

	// move back over the the shape
	editor.pointerMove(50, 50)

	expect(editor.onlySelectedShape).toBe(null)
	expect(editor.hoveredShape).toBe(editor.currentPageShapes[0])

	// start dragging the shape
	editor
		.pointerDown()
		.pointerMove(50, 500)
		// start cloning
		.keyDown('Alt')
		// stop dragging
		.pointerUp()

	expect(editor.currentPageShapes).toHaveLength(2)
	const [, sticky2] = editor.currentPageShapes
	expect(editor.onlySelectedShape).toBe(sticky2)
	expect(editor.editingShape).toBe(undefined)
	expect(editor.hoveredShape).toBe(sticky2)
})

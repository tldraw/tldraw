import { Vec, createShapeId } from '@tldraw/editor'
import { defaultHandleOverlays, TestEditor } from './TestEditor'

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
}

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultHandleOverlays })

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
	])
})

describe('When pointing a rotate handle...', () => {
	it('enters the pointing_rotate_handle state from the mobile rotate handle on coarse pointers', () => {
		editor.updateInstanceState({ isCoarsePointer: true })
		editor.select(ids.box1)
		const p = editor.getSelectionHandlePagePoint('mobile_rotate')
		editor
			.pointerMove(p.x, p.y)
			.pointerDown()
			.expectToBeIn('select.pointing_rotate_handle')
			.pointerUp()
			.expectToBeIn('select.idle')
	})

	it('enters and exits the pointing_rotate_handle state when pointing a rotate handle', () => {
		editor.select(ids.box1)
		const p = editor.getSelectionHandlePagePoint('top_left_rotate')
		editor
			.pointerMove(p.x, p.y)
			.pointerDown()
			.expectToBeIn('select.pointing_rotate_handle')
			.pointerUp()
			.expectToBeIn('select.idle')
	})

	it('enters the pointing_rotate_handle state when pointing a rotate corner', () => {
		editor.select(ids.box1)
		const p = editor.getSelectionHandlePagePoint('top_right_rotate')
		editor
			.pointerMove(p.x, p.y)
			.pointerDown()
			.expectToBeIn('select.pointing_rotate_handle')
			.pointerUp()
			.expectToBeIn('select.idle')
	})

	it('exits the pointing_rotate_handle state on pointer up', () => {
		editor.select(ids.box1)
		const p = editor.getSelectionHandlePagePoint('top_right_rotate')
		editor.pointerMove(p.x, p.y).pointerDown().pointerUp().expectToBeIn('select.idle')
	})

	it('exits the pointing_rotate_handle state on Escape', () => {
		editor.select(ids.box1)
		const p = editor.getSelectionHandlePagePoint('top_right_rotate')
		editor
			.pointerMove(p.x, p.y)
			.pointerDown()
			.expectToBeIn('select.pointing_rotate_handle')
			.cancel()
			.expectToBeIn('select.idle')
	})
})

describe('When rotating...', () => {
	it('enters and exits the rotating state', () => {
		editor.select(ids.box1)
		const p = editor.getSelectionHandlePagePoint('top_right_rotate')
		editor
			.pointerMove(p.x, p.y)
			.pointerDown()
			.expectToBeIn('select.pointing_rotate_handle')
			.pointerMove(p.x, p.y - 10)
			.expectToBeIn('select.rotating')
			.pointerUp()
			.expectToBeIn('select.idle')
	})

	it('exits the rotating state when cancelled and restores initial points / rotation', () => {
		editor.select(ids.box1)
		const p = editor.getSelectionHandlePagePoint('top_right_rotate')
		editor
			.pointerMove(p.x, p.y)
			.pointerDown()
			.pointerMove(p.x, p.y - 10)
			.cancel()
			.expectToBeIn('select.idle')
	})

	it('rotates a single shape', () => {
		editor.select(ids.box1)

		const shapeA = editor.getShape(ids.box1)!
		const box = editor.getSelectionPageBounds()!
		const center = box.center.clone().toFixed()

		expect(Vec.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(center)

		const p1 = editor.getSelectionHandlePagePoint('top_right_rotate')
		editor.pointerMove(p1.x, p1.y).pointerDown()

		// Move to the point 90° clockwise from p1 around center
		const next1 = Vec.RotWith(new Vec(p1.x, p1.y), center, Math.PI * 0.5)
		editor
			.pointerMove(next1.x, next1.y)
			.expectShapeToMatch({ id: ids.box1, rotation: Math.PI * 0.5 })

		expect(Vec.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(center)

		const next2 = Vec.RotWith(new Vec(p1.x, p1.y), center, Math.PI)
		editor
			.pointerMove(next2.x, next2.y)
			.expectShapeToMatch({ id: ids.box1, rotation: Math.PI * 1.0 })

		expect(Vec.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(center)

		const next3 = Vec.RotWith(new Vec(p1.x, p1.y), center, Math.PI * 1.5)
		editor
			.pointerMove(next3.x, next3.y)
			.expectShapeToMatch({ id: ids.box1, rotation: Math.PI * 1.5 })

		expect(Vec.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(center)

		// Preserves the selection bounds same center
		expect(center).toMatchObject(box.center)
	})

	it('rotates multiple shapes', () => {
		const shapeA = editor.getShape(ids.box1)!
		const centerA = editor.getPageCenter(shapeA)!.clone()

		const shapeB = editor.getShape(ids.box2)!
		const centerB = editor.getPageCenter(shapeB)!.clone()

		editor.select(ids.box1, ids.box2)

		const box = editor.getSelectionPageBounds()!
		const center = box.center.clone()

		const p2 = editor.getSelectionHandlePagePoint('top_left_rotate')
		editor.pointerMove(p2.x, p2.y).pointerDown()

		const next = Vec.RotWith(new Vec(p2.x, p2.y), center, Math.PI * 0.5)

		editor
			.pointerMove(next.x, next.y)
			.expectShapeToMatch({ id: ids.box1, rotation: Math.PI * 0.5 })
			.expectShapeToMatch({ id: ids.box2, rotation: Math.PI * 0.5 })

		expect(Vec.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(
			Vec.RotWith(centerA, center, Math.PI * 0.5).toFixed()
		)

		expect(Vec.ToFixed(editor.getPageCenter(shapeB)!)).toMatchObject(
			Vec.RotWith(centerB, center, Math.PI * 0.5).toFixed()
		)

		const nextPi = Vec.RotWith(new Vec(p2.x, p2.y), center, Math.PI)
		editor
			.pointerMove(nextPi.x, nextPi.y)
			.expectShapeToMatch(
				{ id: ids.box1, rotation: Math.PI * 1.0 },
				{ id: ids.box2, rotation: Math.PI * 1.0 }
			)

		expect(Vec.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(
			Vec.RotWith(centerA, center, Math.PI).toFixed()
		)
		expect(Vec.ToFixed(editor.getPageCenter(shapeB)!)).toMatchObject(
			Vec.RotWith(centerB, center, Math.PI).toFixed()
		)

		const next15 = Vec.RotWith(new Vec(p2.x, p2.y), center, Math.PI * 1.5)
		editor
			.pointerMove(next15.x, next15.y)
			.expectShapeToMatch(
				{ id: ids.box1, rotation: Math.PI * 1.5 },
				{ id: ids.box2, rotation: Math.PI * 1.5 }
			)

		expect(Vec.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(
			Vec.RotWith(centerA, center, Math.PI * 1.5).toFixed()
		)
		expect(Vec.ToFixed(editor.getPageCenter(shapeB)!)).toMatchObject(
			Vec.RotWith(centerB, center, Math.PI * 1.5).toFixed()
		)

		// Preserves the selection bounds same center
		expect(center).toMatchObject(box.center)
	})

	it.todo('rotates a shape with handles')

	it('restores initial points / rotation when cancelled', () => {
		editor.select(ids.box1, ids.box2)

		const box = editor.getSelectionPageBounds()!
		const center = box.center.clone()

		const shapeA = editor.getShape(ids.box1)!
		const centerA = editor.getPageCenter(shapeA)!

		const p3 = editor.getSelectionHandlePagePoint('top_left_rotate')
		editor
			.pointerMove(p3.x, p3.y)
			.pointerDown()
			.pointerMove(box.maxX, box.midY)
			.cancel()
			.expectShapeToMatch(
				{ id: ids.box1, x: 10, y: 10, rotation: 0 },
				{ id: ids.box2, x: 200, y: 200, rotation: 0 }
			)

		expect(Vec.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(centerA.toFixed())

		// Preserves the selection bounds same center
		expect(center).toMatchObject(box.center)
	})

	it('uses the same selection box center when rotating multiple times', () => {
		editor.select(ids.box1, ids.box2)

		const centerBefore = editor.getSelectionPageBounds()!.center.clone()

		const p4 = editor.getSelectionHandlePagePoint('top_left_rotate')
		editor.pointerMove(p4.x, p4.y).pointerDown().pointerMove(50, 100).pointerUp()

		const centerBetween = editor.getSelectionPageBounds()!.center.clone()

		expect(centerBefore.toFixed().toJson()).toMatchObject(centerBetween.toFixed().toJson())

		const p5 = editor.getSelectionHandlePagePoint('top_left_rotate')
		editor.pointerMove(p5.x, p5.y).pointerDown().pointerMove(0, 0).pointerUp()

		const centerAfter = editor.getSelectionPageBounds()!.center.clone()

		expect(centerBefore.toFixed().toJson()).toMatchObject(centerAfter.toFixed().toJson())
	})

	it("doesn't crash when rotating a deleted shape", () => {
		editor.select(ids.box1)
		editor.deleteShapes([ids.box1])

		// After deletion the selection foreground overlay no longer has handles,
		// but a stray click somewhere on the canvas should not crash.
		editor.pointerMove(0, 0).pointerDown().pointerMove(50, 100).pointerUp()

		expect(editor.getShape(ids.box1)).toBeUndefined()
	})

	// todo
	it.skip("rotates shapes that aren't the currently selected ones", () => {
		editor.select(ids.box1)

		editor.rotateShapesBy([ids.box2], Math.PI * 0.5)

		editor.expectShapeToMatch(
			{ id: ids.box1, rotation: 0 },
			{ id: ids.box2, rotation: Math.PI * 0.5 }
		)
	})
})

describe('Rotation math', () => {
	it('rotates one point around another', () => {
		const a = new Vec(100, 100)
		const b = new Vec(200, 200)
		expect(
			Vec.RotWith(a, b, Math.PI / 2)
				.toFixed()
				.toJson()
		).toMatchObject({ x: 300, y: 100 })
		expect(Vec.RotWith(a, b, Math.PI).toFixed().toJson()).toMatchObject({ x: 300, y: 300 })
		expect(
			Vec.RotWith(a, b, Math.PI * 1.5)
				.toFixed()
				.toJson()
		).toMatchObject({ x: 100, y: 300 })
	})
})

describe('Edge cases', () => {
	it('does not enter the pointing_rotate_handle state when pointing a rotate corner of an image while holding command / control', () => {
		const id = createShapeId()
		editor
			.createShape({
				id,
				type: 'image',
			})
			.select(id)
		const p = editor.getSelectionHandlePagePoint('top_right_rotate')
		editor
			.pointerMove(p.x, p.y)
			.pointerDown(p.x, p.y, undefined, { ctrlKey: true })
			.expectToBeIn('select.brushing')
			.pointerUp()
			.expectToBeIn('select.idle')
	})
})

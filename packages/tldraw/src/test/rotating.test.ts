import { Vec2d, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

afterEach(() => {
	editor?.dispose()
})

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
}

beforeEach(() => {
	editor = new TestEditor()

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
	it('enters and exits the pointing_rotate_handle state when pointing a rotate handle', () => {
		editor
			.select(ids.box1)
			.pointerDown(60, 10, {
				target: 'selection',
				handle: 'top_left_rotate',
			})
			.expectToBeIn('select.pointing_rotate_handle')
			.pointerUp()
			.expectToBeIn('select.idle')
	})

	it('enters the pointing_rotate_handle state when pointing a rotate corner', () => {
		editor
			.select(ids.box1)
			.pointerDown(60, 10, {
				target: 'selection',
				handle: 'top_right_rotate',
			})
			.expectToBeIn('select.pointing_rotate_handle')
			.pointerUp()
			.expectToBeIn('select.idle')
	})

	it('exits the pointing_rotate_handle state on pointer up', () => {
		editor
			.select(ids.box1)
			.pointerDown(60, 10, {
				target: 'selection',
				handle: 'top_right_rotate',
			})
			.pointerUp()
			.expectToBeIn('select.idle')
	})

	it('exits the pointing_rotate_handle state on Escape', () => {
		editor
			.select(ids.box1)
			.pointerDown(60, 10, {
				target: 'selection',
				handle: 'top_right_rotate',
			})
			.expectToBeIn('select.pointing_rotate_handle')
			.cancel()
			.expectToBeIn('select.idle')
	})
})

describe('When rotating...', () => {
	it('enters and exits the rotating state', () => {
		editor
			.select(ids.box1)
			.pointerDown(50, 0, {
				target: 'selection',
				handle: 'top_right_rotate',
			})
			.expectToBeIn('select.pointing_rotate_handle')
			.pointerMove(50, -10)
			.expectToBeIn('select.rotating')
			.pointerUp()
			.expectToBeIn('select.idle')
	})

	it('exits the rotating state when cancelled and restores initial points / rotation', () => {
		editor
			.select(ids.box1)
			.pointerDown(50, 0, {
				target: 'selection',
				handle: 'top_right_rotate',
			})
			.pointerMove(50, -10)
			.cancel()
			.expectToBeIn('select.idle')
	})

	it('rotates a single shape', () => {
		editor.select(ids.box1)

		const shapeA = editor.getShape(ids.box1)!
		const box = editor.selectionPageBounds!
		const center = box.center.clone().toFixed()

		expect(Vec2d.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(center)

		editor
			.pointerDown(box.midX, box.minY, {
				target: 'selection',
				handle: 'top_right_rotate',
			})
			.pointerMove(box.maxX, box.midY)
			.expectShapeToMatch({ id: ids.box1, rotation: Math.PI * 0.5 })

		expect(Vec2d.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(center)

		editor
			.pointerMove(box.midY, box.maxY)
			.expectShapeToMatch({ id: ids.box1, rotation: Math.PI * 1.0 })

		expect(Vec2d.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(center)

		editor
			.pointerMove(box.minX, box.midY)
			.expectShapeToMatch({ id: ids.box1, rotation: Math.PI * 1.5 })

		expect(Vec2d.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(center)

		// Preserves the selection bounds same center
		expect(center).toMatchObject(box.center)
	})

	it('rotates multiple shapes', () => {
		const shapeA = editor.getShape(ids.box1)!
		const centerA = editor.getPageCenter(shapeA)!.clone()

		const shapeB = editor.getShape(ids.box2)!
		const centerB = editor.getPageCenter(shapeB)!.clone()

		editor.select(ids.box1, ids.box2)

		const box = editor.selectionPageBounds!
		const center = box.center.clone()

		editor.pointerDown(box.midX, box.minY, {
			target: 'selection',
			handle: 'top_left_rotate',
		})

		const next = Vec2d.RotWith(new Vec2d(box.midX, box.minY), center, Math.PI * 0.5)

		editor
			.pointerMove(next.x, next.y)
			.expectShapeToMatch({ id: ids.box1, rotation: Math.PI * 0.5 })
			.expectShapeToMatch({ id: ids.box2, rotation: Math.PI * 0.5 })

		expect(Vec2d.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(
			Vec2d.RotWith(centerA, center, Math.PI * 0.5).toFixed()
		)

		expect(Vec2d.ToFixed(editor.getPageCenter(shapeB)!)).toMatchObject(
			Vec2d.RotWith(centerB, center, Math.PI * 0.5).toFixed()
		)

		editor
			.pointerMove(box.midY, box.maxY)
			.expectShapeToMatch(
				{ id: ids.box1, rotation: Math.PI * 1.0 },
				{ id: ids.box2, rotation: Math.PI * 1.0 }
			)

		expect(Vec2d.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(
			Vec2d.RotWith(centerA, center, Math.PI).toFixed()
		)
		expect(Vec2d.ToFixed(editor.getPageCenter(shapeB)!)).toMatchObject(
			Vec2d.RotWith(centerB, center, Math.PI).toFixed()
		)

		editor
			.pointerMove(box.minX, box.midY)
			.expectShapeToMatch(
				{ id: ids.box1, rotation: Math.PI * 1.5 },
				{ id: ids.box2, rotation: Math.PI * 1.5 }
			)

		expect(Vec2d.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(
			Vec2d.RotWith(centerA, center, Math.PI * 1.5).toFixed()
		)
		expect(Vec2d.ToFixed(editor.getPageCenter(shapeB)!)).toMatchObject(
			Vec2d.RotWith(centerB, center, Math.PI * 1.5).toFixed()
		)

		// Preserves the selection bounds same center
		expect(center).toMatchObject(box.center)
	})

	it.todo('rotates a shape with handles')

	it('restores initial points / rotation when cancelled', () => {
		editor.select(ids.box1, ids.box2)

		const box = editor.selectionPageBounds!
		const center = box.center.clone()

		const shapeA = editor.getShape(ids.box1)!
		const centerA = editor.getPageCenter(shapeA)!

		editor
			.pointerDown(box.midX, box.minY, {
				target: 'selection',
				handle: 'top_left_rotate',
			})
			.pointerMove(box.maxX, box.midY)
			.cancel()
			.expectShapeToMatch(
				{ id: ids.box1, x: 10, y: 10, rotation: 0 },
				{ id: ids.box2, x: 200, y: 200, rotation: 0 }
			)

		expect(Vec2d.ToFixed(editor.getPageCenter(shapeA)!)).toMatchObject(centerA.toFixed())

		// Preserves the selection bounds same center
		expect(center).toMatchObject(box.center)
	})

	it('uses the same selection box center when rotating multiple times', () => {
		editor.select(ids.box1, ids.box2)

		const centerBefore = editor.selectionPageBounds!.center.clone()

		editor
			.pointerDown(0, 0, {
				target: 'selection',
				handle: 'top_left_rotate',
			})
			.pointerMove(50, 100)
			.pointerUp()

		const centerBetween = editor.selectionPageBounds!.center.clone()

		expect(centerBefore.toFixed().toJson()).toMatchObject(centerBetween.toFixed().toJson())

		editor
			.pointerDown(50, 100, {
				target: 'selection',
				handle: 'top_left_rotate',
			})
			.pointerMove(0, 0)
			.pointerUp()

		const centerAfter = editor.selectionPageBounds!.center.clone()

		expect(centerBefore.toFixed().toJson()).toMatchObject(centerAfter.toFixed().toJson())
	})

	it("doesn't crash when rotating a deleted shape", () => {
		editor.select(ids.box1)

		editor.deleteShapes([ids.box1])

		editor
			.pointerDown(0, 0, {
				target: 'selection',
				handle: 'top_left_rotate',
			})
			.pointerMove(50, 100)
			.pointerUp()

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
		const a = new Vec2d(100, 100)
		const b = new Vec2d(200, 200)
		expect(
			Vec2d.RotWith(a, b, Math.PI / 2)
				.toFixed()
				.toJson()
		).toMatchObject({ x: 300, y: 100 })
		expect(Vec2d.RotWith(a, b, Math.PI).toFixed().toJson()).toMatchObject({ x: 300, y: 300 })
		expect(
			Vec2d.RotWith(a, b, Math.PI * 1.5)
				.toFixed()
				.toJson()
		).toMatchObject({ x: 100, y: 300 })
	})
})

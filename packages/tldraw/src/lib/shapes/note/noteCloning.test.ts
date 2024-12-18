import { Box, TLNoteShape, Vec, toRichText } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ options: { adjacentShapeMargin: 20 } })
	// We don't want the camera to move when the shape gets created off screen
	editor.updateViewportScreenBounds(new Box(0, 0, 2000, 2000))
})

afterEach(() => {
	editor?.dispose()
})

function testCloneHandles(x: number, y: number, rotation: number) {
	editor.createShape({ type: 'note', x, y, rotation })

	const shape = editor.getLastCreatedShape()!

	editor.select(shape.id)

	const handles = editor.getShapeHandles(shape.id)!

	const positions = [new Vec(0, -220), new Vec(220, 0), new Vec(0, 220), new Vec(-220, 0)].map(
		(v) => v.rot(rotation).addXY(x, y)
	)

	handles.forEach((handle, i) => {
		const handleInPageSpace = editor.getShapePageTransform(shape).applyToPoint(handle)
		editor.select(shape.id)
		editor.pointerMove(handleInPageSpace.x, handleInPageSpace.y)
		expect(editor.inputs.currentPagePoint).toMatchObject({
			x: handleInPageSpace.x,
			y: handleInPageSpace.y,
		})
		editor.pointerDown(handleInPageSpace.x, handleInPageSpace.y, {
			target: 'handle',
			shape,
			handle,
		})

		editor.expectToBeIn('select.pointing_handle')

		editor.pointerUp()

		const newShape = editor.getLastCreatedShape()

		expect(newShape.id).not.toBe(shape.id)

		const expectedPosition = positions[i]

		editor.expectShapeToMatch({
			id: newShape.id,
			type: 'note',
			x: expectedPosition.x,
			y: expectedPosition.y,
		})

		editor.expectToBeIn('select.editing_shape')

		editor.cancel().undo().forceTick()
	})
}

describe('Note clone handles', () => {
	it('Creates a new sticky note using handles', () => {
		testCloneHandles(1000, 1000, 0)
	})

	it('Creates a new sticky when rotated', () => {
		testCloneHandles(1000, 1000, Math.PI / 2)
	})

	it('Creates a new sticky when translated and rotated', () => {
		testCloneHandles(1000, 1000, Math.PI / 2)
	})
})

function testDragCloneHandles(x: number, y: number, rotation: number) {
	editor.createShape({ type: 'note', x, y, rotation })

	const shape = editor.getLastCreatedShape()!

	editor.select(shape.id)

	const handles = editor.getShapeHandles(shape.id)!

	handles.forEach((handle) => {
		const handleInPageSpace = editor.getShapePageTransform(shape).applyToPoint(handle)
		editor.select(shape.id)
		editor.pointerMove(handleInPageSpace.x, handleInPageSpace.y)
		editor.pointerDown(handleInPageSpace.x, handleInPageSpace.y, {
			target: 'handle',
			shape,
			handle,
		})

		editor.expectToBeIn('select.pointing_handle')

		editor.pointerMove(handleInPageSpace.x + 30, handleInPageSpace.y + 30)

		editor.expectToBeIn('select.translating')

		const newShape = editor.getLastCreatedShape()

		expect(newShape.id).not.toBe(shape.id)

		const offset = new Vec(100, 100).rot(rotation)

		editor.expectShapeToMatch({
			id: newShape.id,
			type: 'note',
			x: handleInPageSpace.x + 30 - offset.x,
			y: handleInPageSpace.y + 30 - offset.y,
		})

		editor.pointerUp()

		editor.expectToBeIn('select.editing_shape')

		editor.cancel().undo()
	})
}

describe('Dragging clone handles', () => {
	it('Creates a new sticky note using handles', () => {
		testDragCloneHandles(1000, 1000, 0)
	})

	it('Creates a new sticky when rotated', () => {
		testDragCloneHandles(1000, 1000, Math.PI / 2)
	})

	it('Creates a new sticky when translated and rotated', () => {
		testDragCloneHandles(1000, 1000, Math.PI / 2)
	})
})

it('Selects an adjacent note when clicking the clone handle', () => {
	editor.createShape({ type: 'note', x: 1220, y: 1000 })
	const shapeA = editor.getLastCreatedShape()!

	editor.createShape({ type: 'note', x: 1000, y: 1000 })
	const shapeB = editor.getLastCreatedShape()!

	editor.select(shapeB.id)

	const handles = editor.getShapeHandles(shapeB.id)!

	const handle = handles[1]

	editor.select(shapeB.id)
	editor.pointerDown(handle.x, handle.y, {
		target: 'handle',
		shape: shapeB,
		handle,
	})

	editor.expectToBeIn('select.pointing_handle')

	editor.pointerUp()

	// Because there's a shape already in that direction...

	// We didn't create a new shape; newShape is still shapeB
	expect(editor.getLastCreatedShape().id).toBe(shapeB.id)

	// the first shape is selected and we're editing it
	expect(editor.getSelectedShapeIds()).toEqual([shapeA.id])

	editor.expectToBeIn('select.editing_shape')
})

it('Creates an adjacent note when dragging the clone handle', () => {
	editor.createShape({
		type: 'note',
		x: 1220,
		y: 1000,
		props: { richText: toRichText('rich hello') },
	})
	const shapeA = editor.getLastCreatedShape()!

	editor.createShape({
		type: 'note',
		x: 1000,
		y: 1000,
		props: { richText: toRichText('rich hello') },
	})
	const shapeB = editor.getLastCreatedShape()!

	editor.select(shapeB.id)

	const handles = editor.getShapeHandles(shapeB.id)!

	const handle = handles[0]

	editor.select(shapeB.id)
	editor.pointerDown(handle.x, handle.y, {
		target: 'handle',
		shape: shapeB,
		handle,
	})

	editor.expectToBeIn('select.pointing_handle')

	editor.pointerMove(handle.x + 30, handle.y + 30)

	const newShape = editor.getLastCreatedShape()

	expect(newShape.id).not.toBe(shapeB.id)
	expect(newShape.id).not.toBe(shapeA.id)

	const offset = new Vec(100, 100).rot(0)

	editor.expectShapeToMatch<TLNoteShape>({
		id: newShape.id,
		type: 'note',
		x: handle.x + 30 - offset.x,
		y: handle.y + 30 - offset.y,
		props: {
			richText: toRichText(''),
		},
	})

	editor.pointerUp()

	editor.expectToBeIn('select.editing_shape')
})

it('Does not put the new shape into a frame if its center is not in the frame', () => {
	editor.createShape({ type: 'frame', x: 1321, y: 1000 }) // one pixel too far...
	const frameA = editor.getLastCreatedShape()!
	// center no longer in the frame
	editor.createShape({ type: 'note', x: 1000, y: 1000 })
	const shapeA = editor.getLastCreatedShape()!
	// to the right
	const handle = editor.getShapeHandles(shapeA.id)![1]
	editor
		.select(shapeA.id)
		.pointerDown(handle.x, handle.y, {
			target: 'handle',
			shape: shapeA,
			handle,
		})
		.expectToBeIn('select.pointing_handle')
		.pointerUp()

	const newShape = editor.getLastCreatedShape()
	// Should be a child of the frame
	expect(newShape.parentId).not.toBe(frameA.id)
})

it('Puts the new shape into a frame based on its center', () => {
	editor.createShape({ type: 'frame', x: 1320, y: 1100 })
	const frameA = editor.getLastCreatedShape()!
	// top left won't be in the frame, but the center will (barely but yes)
	editor.createShape({ type: 'note', x: 1000, y: 1000 })
	const shapeA = editor.getLastCreatedShape()!
	// to the right
	const handle = editor.getShapeHandles(shapeA.id)![1]
	editor
		.select(shapeA.id)
		.pointerDown(handle.x, handle.y, {
			target: 'handle',
			shape: shapeA,
			handle,
		})
		.expectToBeIn('select.pointing_handle')
		.pointerUp()

	const newShape = editor.getLastCreatedShape()
	// Should be a child of the frame
	expect(newShape.parentId).toBe(frameA.id)
})

function testNoteShapeFrameRotations(sourceRotation: number, rotation: number) {
	editor.createShape({ type: 'frame', x: 1220, y: 1000, rotation: rotation })
	const frameA = editor.getLastCreatedShape()!
	// top left won't be in the frame, but the center will (barely but yes)
	editor.createShape({ type: 'note', x: 1000, y: 1000, rotation: sourceRotation })
	const shapeA = editor.getLastCreatedShape()!
	// to the right
	const handle = editor.getShapeHandles(shapeA.id)![1]
	editor
		.select(shapeA.id)
		.pointerDown(handle.x, handle.y, {
			target: 'handle',
			shape: shapeA,
			handle,
		})
		.expectToBeIn('select.pointing_handle')
		.pointerUp()

	const newShape = editor.getLastCreatedShape()
	// Should be a child of the frame
	expect(newShape.parentId).toBe(frameA.id)

	expect(editor.getShapePageTransform(newShape).rotation()).toBeCloseTo(sourceRotation)

	editor.cancel().undo()
}

it('Puts the new shape into a rotated frame and keeps the source page rotation', () => {
	testNoteShapeFrameRotations(0, 0.01)
	testNoteShapeFrameRotations(0.01, 0)
	testNoteShapeFrameRotations(0.01, 0.01)
})

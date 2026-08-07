import { createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.setScreenBounds({ w: 1000, h: 1000, x: 0, y: 0 })
	editor.createShapes([
		// box1 center (50, 50)
		{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { fill: 'solid', w: 100, h: 100 } },
		// box2 center (250, 50)
		{ id: ids.box2, type: 'geo', x: 200, y: 0, props: { fill: 'solid', w: 100, h: 100 } },
		// box3 center (450, 50)
		{ id: ids.box3, type: 'geo', x: 400, y: 0, props: { fill: 'solid', w: 100, h: 100 } },
	])
})

// Drive a zoom pinch around an origin without any preceding pointer_down.
// This models the Safari trackpad path, where pinches arrive as gesture events.
function pinchZoom(originX = 250, originY = 50, toZoom = 2) {
	editor
		.pinchStart(originX, originY, editor.getZoomLevel(), 0, 0, 0)
		.pinchTo(originX, originY, toZoom, 0, 0, 0)
		.pinchEnd(originX, originY, toZoom, 0, 0, 0)
}

describe('Pinch preserves the pre-gesture selection', () => {
	it('rolls back an incidental selection change made by the first finger (touch)', () => {
		editor.select(ids.box1)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])

		// First finger lands on box2 and changes the selection. We don't lift it —
		// the second finger arrives and starts the pinch while box2 is selected.
		editor.pointerMove(250, 50)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])

		pinchZoom()

		// The incidental selection of box2 is rolled back to the pre-gesture selection.
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		// ...and stays rolled back through the deferred re-restore on the next tick.
		editor.forceTick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('rolls the incidental selection back at pinch start, not only at the end (touch)', () => {
		editor.select(ids.box1)

		editor.pointerMove(250, 50)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])

		// As soon as the pinch starts we know the first finger's selection was
		// incidental, so it's rolled back immediately — not shown for the whole
		// gesture and reverted only on pinch end.
		editor.pinchStart(250, 50, editor.getZoomLevel(), 0, 0, 0)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])

		// ...and it stays rolled back through the rest of the gesture.
		editor.pinchTo(250, 50, 2, 0, 0, 0)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		editor.pinchEnd(250, 50, 2, 0, 0, 0)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('restores an empty selection when nothing was selected before the pinch (touch)', () => {
		expect(editor.getSelectedShapeIds()).toEqual([])

		// First finger selects box2, then the pinch begins.
		editor.pointerMove(250, 50)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])

		pinchZoom()

		// Because the pre-gesture selection was empty, box2 is deselected again.
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('restores correctly across two consecutive pinches (touch)', () => {
		editor.select(ids.box1)

		editor.pointerMove(250, 50)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box2])
		pinchZoom()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])

		// Reset the camera so screen coordinates map back to page coordinates.
		editor.setCamera({ x: 0, y: 0, z: 1 }, { immediate: true }).forceTick()

		// A second pinch must capture fresh state, not reuse the first pinch's snapshot.
		editor.select(ids.box3)
		editor.pointerMove(50, 50)
		editor.pointerDown()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		pinchZoom(50, 50)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box3])
	})

	it('keeps the live selection for a pinch with no preceding pointer down (Safari trackpad)', () => {
		// Regression guard for #6907: a click changes the selection, then a later
		// pinch must keep that selection rather than reverting to an earlier one.
		editor.select(ids.box1, ids.box2)

		// A complete click on box3 (pointer down + up) selects box3.
		editor.pointerMove(450, 50)
		editor.pointerDown()
		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box3])

		// Safari delivers the pinch as gesture events — there is no pointer_down to
		// stash a pre-gesture selection, so the live selection (box3) is preserved.
		pinchZoom(450, 50)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box3])
		editor.forceTick()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box3])
	})

	it('does not stash or restore selection for a pinch while editing a shape', () => {
		editor.select(ids.box1)
		editor.setEditingShape(ids.box1)
		expect(editor.getEditingShapeId()).toBe(ids.box1)

		pinchZoom()

		// Editing pinches are a no-op for selection (guarded by isEditing).
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		expect(editor.getEditingShapeId()).toBe(ids.box1)
	})
})

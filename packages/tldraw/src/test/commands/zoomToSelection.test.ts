import { createShapeId } from '@tldraw/editor'
import { TestEditor, createDefaultShapes } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
})

it('zooms to 100% when not already at 100%', () => {
	editor.zoomIn() // zoom to something other than 100%
	editor.setSelectedShapes([ids.box1, ids.box2])
	editor.zoomToSelection()
	expect(editor.getZoomLevel()).toBeCloseTo(1)
})

it('zooms to fit selection when already at 100%', () => {
	// Editor starts at 100%, so first call zooms to fit
	editor.setSelectedShapes([ids.box1, ids.box2])
	editor.zoomToSelection()
	// Should now be zoomed to fit the selection bounds (greater than 100% for small selection)
	expect(editor.getZoomLevel()).toBeGreaterThan(1)
})

it('does not zoom past max', () => {
	editor.updateShapes([{ id: ids.box1, type: 'geo', props: { w: 1, h: 1 } }])
	editor.select(ids.box1)
	editor.zoomToSelection()
	// When at 100%, zooms to fit but respects camera max zoom
	const { zoomSteps } = editor.getCameraOptions()
	expect(editor.getZoomLevel()).toBe(zoomSteps[zoomSteps.length - 1])
})

it('does not zoom past min', () => {
	editor.updateShapes([{ id: ids.box1, type: 'geo', props: { w: 100000, h: 100000 } }])
	editor.select(ids.box1)
	editor.zoomToSelection()
	expect(editor.getZoomLevel()).toBe(0.05)
})

it('does not zoom to selection when camera is frozen', () => {
	const cameraBefore = { ...editor.getCamera() }
	editor.setCameraOptions({ isLocked: true })
	editor.setSelectedShapes([ids.box1, ids.box2])
	editor.zoomToSelection()
	expect(editor.getCamera()).toMatchObject(cameraBefore)
})

it('is ignored by undo/redo', () => {
	editor.markHistoryStoppingPoint()
	editor.setSelectedShapes([ids.box1, ids.box2])
	editor.zoomToSelection()
	const camera = editor.getCamera()
	editor.undo()
	expect(editor.getCamera()).toBe(camera)
})

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

it('zooms to selection bounds', () => {
	editor.setSelectedShapes([ids.box1, ids.box2])
	editor.zoomToSelection()
	editor.expectCameraToBe(354.64, 139.29, 1)
})

it('does not zoom past max', () => {
	editor.updateShapes([{ id: ids.box1, type: 'geo', props: { w: 1, h: 1 } }])
	editor.select(ids.box1)
	editor.zoomToSelection()
	expect(editor.zoomLevel).toBe(1) // double check again when we're zooming in hard
})

it('does not zoom past min', () => {
	editor.updateShapes([{ id: ids.box1, type: 'geo', props: { w: 100000, h: 100000 } }])
	editor.select(ids.box1)
	editor.zoomToSelection()
	expect(editor.zoomLevel).toBe(0.1)
})

it('does not zoom to selection when camera is frozen', () => {
	const cameraBefore = { ...editor.camera }
	editor.updateInstanceState({ canMoveCamera: false })
	editor.setSelectedShapes([ids.box1, ids.box2])
	editor.zoomToSelection()
	expect(editor.camera).toMatchObject(cameraBefore)
})

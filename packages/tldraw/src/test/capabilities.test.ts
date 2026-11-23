import { createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

const id = createShapeId('a')

function setupEditor() {
	const editor = new TestEditor()
	editor.createShapes([{ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
	return editor
}

describe('the default tools ask capabilities', () => {
	it('does not draw without create-shape', () => {
		const editor = setupEditor()
		editor.registerCapabilityCheck('create-shape', () => false)
		editor.setCurrentTool('geo')
		editor.pointerDown(300, 300).pointerMove(400, 400).pointerUp()
		expect(editor.getCurrentPageShapeIds().size).toBe(1)
	})

	it('does not draw without edit-shape, because a drag updates the new shape', () => {
		const editor = setupEditor()
		editor.registerCapabilityCheck('edit-shape', () => false)
		editor.setCurrentTool('draw')
		editor.pointerDown(300, 300).pointerMove(400, 400).pointerUp()
		expect(editor.getCurrentPageShapeIds().size).toBe(1)
	})

	it('selects but does not drag, nudge or edit without edit-shape', () => {
		const editor = setupEditor()
		editor.registerCapabilityCheck('edit-shape', () => false)
		editor.pointerDown(50, 50, id).pointerMove(150, 150).pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([id])
		expect(editor.getShape(id)!.x).toBe(0)

		editor.keyDown('ArrowRight').keyUp('ArrowRight')
		expect(editor.getShape(id)!.x).toBe(0)

		expect(editor.canEditShape(id)).toBe(false)
	})

	it('does not erase without delete-shape', () => {
		const editor = setupEditor()
		editor.registerCapabilityCheck('delete-shape', () => false)
		editor.setCurrentTool('eraser')
		editor.pointerDown(50, 50).pointerUp()
		expect(editor.getShape(id)).toBeDefined()
	})

	it('does not take external content without create-shape', async () => {
		const editor = setupEditor()
		editor.registerCapabilityCheck('create-shape', () => false)
		await editor.putExternalContent({ type: 'text', text: 'hello' })
		expect(editor.getCurrentPageShapeIds().size).toBe(1)
	})
})

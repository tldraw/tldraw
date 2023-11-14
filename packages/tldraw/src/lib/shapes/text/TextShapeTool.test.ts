import { TestEditor } from '../../../test/TestEditor'
import { TextShapeTool } from './TextShapeTool'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

describe(TextShapeTool, () => {
	it('Creates text, edits it, undoes and redoes', () => {
		expect(editor.getCurrentPageShapes().length).toBe(0)
		editor.setCurrentTool('text')
		editor.expectToBeIn('text.idle')
		editor.pointerDown(0, 0)
		editor.expectToBeIn('text.pointing')
		editor.pointerUp()
		editor.expectToBeIn('select.editing_shape')
		// This comes from the component, not the state chart
		editor.updateShapes([
			{ ...editor.getCurrentPageShapes()[0]!, type: 'text', props: { text: 'Hello' } },
		])
		// Deselect the editing shape
		editor.cancel()
		editor.expectToBeIn('select.idle')
		expect(editor.getCurrentPageShapes().length).toBe(1)
		editor.expectShapeToMatch({
			id: editor.getCurrentPageShapes()[0].id,
			type: 'text',
			props: { text: 'Hello' },
		})

		editor.undo()

		expect(editor.getCurrentPageShapes().length).toBe(0)

		editor.redo()

		expect(editor.getCurrentPageShapes().length).toBe(1)

		editor.expectShapeToMatch({
			id: editor.getCurrentPageShapes()[0].id,
			type: 'text',
			props: { text: 'Hello' },
		})
	})
})

describe('When selecting the tool', () => {
	it('starts in idle, transitions to pointing and dragging', () => {
		editor.setCurrentTool('text')
		editor.expectToBeIn('text.idle')
	})
})

describe('When in idle state', () => {
	it('Transitions to pointing on pointer down', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.expectToBeIn('text.pointing')
		editor.pointerUp()
		editor.expectToBeIn('select.editing_shape')
	})

	it('creates a shape on pointer up', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.pointerUp()
		editor.expectToBeIn('select.editing_shape')
		expect(editor.getCurrentPageShapes().length).toBe(1)
	})

	it('returns to select on cancel', () => {
		editor.setCurrentTool('text')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})
})

describe('When in the pointing state', () => {
	it('returns to idle on escape', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.cancel()
		editor.expectToBeIn('text.idle')
		expect(editor.getCurrentPageShapes().length).toBe(0)
	})

	it('returns to idle on interrupt', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.expectToBeIn('text.pointing')
		editor.interrupt()
		editor.expectToBeIn('text.idle')
		expect(editor.getCurrentPageShapes().length).toBe(0)
	})

	it('transitions to select.resizing when dragging and edits on pointer up', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.pointerMove(10, 10)
		editor.expectToBeIn('select.resizing')
		editor.pointerUp()
		expect(editor.getCurrentPageShapes().length).toBe(1)
		editor.expectToBeIn('select.editing_shape')
	})

	it('on pointer up, preserves the center when the text has a auto width', () => {
		editor.setCurrentTool('text')
		const x = 0
		const y = 0
		editor.pointerDown(x, y)
		editor.pointerUp()
		const bounds = editor.getShapePageBounds(editor.getCurrentPageShapes()[0])!
		expect(editor.getCurrentPageShapes()[0]).toMatchObject({
			x: x - bounds.width / 2,
			y: y - bounds.height / 2,
		})
	})
})

describe('When resizing', () => {
	it('bails on escape while resizing and returns to text.idle', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.pointerMove(100, 100)
		editor.expectToBeIn('select.resizing')
		editor.cancel()
		editor.expectToBeIn('text.idle')
		expect(editor.getCurrentPageShapes().length).toBe(0)
	})

	it('does not bails on interrupt while resizing', () => {
		editor.setCurrentTool('text')
		editor.pointerDown(0, 0)
		editor.pointerMove(100, 100)
		editor.expectToBeIn('select.resizing')
		editor.interrupt()
		expect(editor.getCurrentPageShapes().length).toBe(1)
	})

	it('preserves the top left when the text has a fixed width', () => {
		editor.setCurrentTool('text')
		const x = 0
		const y = 0
		editor.pointerDown(x, y)
		editor.pointerMove(x + 100, y + 100)
		expect(editor.getCurrentPageShapes()[0]).toMatchObject({
			x,
			y,
		})
	})
})

import { TestEditor } from '../../../test/TestEditor'
import { NoteShapeTool } from './NoteShapeTool'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

describe(NoteShapeTool, () => {
	it('Creates note shapes on click-and-drag, supports undo and redo', () => {
		expect(editor.getCurrentPageShapes().length).toBe(0)

		editor.setCurrentTool('note')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)

		expect(editor.getCurrentPageShapes().length).toBe(1)
		expect(editor.getCurrentPageShapes()[0]?.type).toBe('note')
		expect(editor.getSelectedShapeIds()[0]).toBe(editor.getCurrentPageShapes()[0]?.id)

		editor.cancel() // leave edit mode

		editor.undo() // undoes the selection change
		editor.undo()

		expect(editor.getCurrentPageShapes().length).toBe(0)

		editor.redo()

		expect(editor.getCurrentPageShapes().length).toBe(1)
	})

	it('Creates note shapes on click, supports undo and redo', () => {
		expect(editor.getCurrentPageShapes().length).toBe(0)

		editor.setCurrentTool('note')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)

		expect(editor.getCurrentPageShapes().length).toBe(1)
		expect(editor.getCurrentPageShapes()[0]?.type).toBe('note')
		expect(editor.getSelectedShapeIds()[0]).toBe(editor.getCurrentPageShapes()[0]?.id)

		editor.undo()

		expect(editor.getCurrentPageShapes().length).toBe(0)

		editor.redo()

		expect(editor.getCurrentPageShapes().length).toBe(1)
	})
})

describe('When selecting the tool', () => {
	it('selects the tool and enters the idle state', () => {
		editor.setCurrentTool('note')
		editor.expectToBeIn('note.idle')
	})
})

describe('When in the idle state', () => {
	it('Enters pointing state on pointer down', () => {
		editor.setCurrentTool('note')
		editor.pointerDown(100, 100)
		editor.expectToBeIn('note.pointing')
	})

	it('Switches back to select tool on cancel', () => {
		editor.setCurrentTool('note')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})

	it('Does nothing on interrupt', () => {
		editor.setCurrentTool('note')
		editor.interrupt()
		editor.expectToBeIn('note.idle')
	})
})

describe('When in the pointing state', () => {
	it('Switches back to idle on cancel', () => {
		editor.setCurrentTool('note')
		editor.pointerDown(50, 50)
		editor.expectToBeIn('note.pointing')
		editor.cancel()
		editor.expectToBeIn('note.idle')
	})

	it('Enters the select.translating state on drag start', () => {
		editor.setCurrentTool('note')
		editor.pointerDown(50, 50)
		editor.pointerMove(51, 51) // not far enough!
		editor.expectToBeIn('note.pointing')
		editor.pointerMove(55, 55)
		editor.expectToBeIn('select.translating')
	})

	it('Returns to the note tool on cancel from translating', () => {
		editor.setCurrentTool('note')
		editor.pointerDown(50, 50)
		editor.pointerMove(55, 55)
		editor.cancel()
		editor.expectToBeIn('note.idle')
	})

	it('Returns to the note tool on complete from translating when tool lock is enabled', () => {
		editor.updateInstanceState({ isToolLocked: true })
		editor.setCurrentTool('note')
		editor.pointerDown(50, 50)
		editor.pointerMove(55, 55)
		editor.pointerUp()
		editor.expectToBeIn('note.idle')
	})

	it('Returns to the idle state on interrupt', () => {
		editor.setCurrentTool('note')
		editor.pointerDown(50, 50)
		editor.interrupt()
		editor.expectToBeIn('note.idle')
	})

	it('Creates a note and begins editing on pointer up', () => {
		expect(editor.getCurrentPageShapes().length).toBe(0)
		editor.setCurrentTool('note')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)
		editor.expectToBeIn('select.editing_shape')
		expect(editor.getCurrentPageShapes().length).toBe(1)
	})

	it('Creates a frame and returns to frame.idle on pointer up if tool lock is enabled', () => {
		editor.updateInstanceState({ isToolLocked: true })
		expect(editor.getCurrentPageShapes().length).toBe(0)
		editor.setCurrentTool('note')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)
		editor.expectToBeIn('note.idle')
		expect(editor.getCurrentPageShapes().length).toBe(1)
	})
})

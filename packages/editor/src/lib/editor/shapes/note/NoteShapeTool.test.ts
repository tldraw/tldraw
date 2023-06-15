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
		expect(editor.shapesArray.length).toBe(0)

		editor.setSelectedTool('note')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)

		expect(editor.shapesArray.length).toBe(1)
		expect(editor.shapesArray[0]?.type).toBe('note')
		expect(editor.selectedIds[0]).toBe(editor.shapesArray[0]?.id)

		editor.cancel() // leave edit mode

		editor.undo() // undoes the selection change
		editor.undo()

		expect(editor.shapesArray.length).toBe(0)

		editor.redo()

		expect(editor.shapesArray.length).toBe(1)
	})

	it('Creates note shapes on click, supports undo and redo', () => {
		expect(editor.shapesArray.length).toBe(0)

		editor.setSelectedTool('note')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)

		expect(editor.shapesArray.length).toBe(1)
		expect(editor.shapesArray[0]?.type).toBe('note')
		expect(editor.selectedIds[0]).toBe(editor.shapesArray[0]?.id)

		editor.undo()

		expect(editor.shapesArray.length).toBe(0)

		editor.redo()

		expect(editor.shapesArray.length).toBe(1)
	})
})

describe('When selecting the tool', () => {
	it('selects the tool and enters the idle state', () => {
		editor.setSelectedTool('note')
		editor.expectPathToBe('root.note.idle')
	})
})

describe('When in the idle state', () => {
	it('Enters pointing state on pointer down', () => {
		editor.setSelectedTool('note')
		editor.pointerDown(100, 100)
		editor.expectPathToBe('root.note.pointing')
	})

	it('Switches back to select tool on cancel', () => {
		editor.setSelectedTool('note')
		editor.cancel()
		editor.expectPathToBe('root.select.idle')
	})

	it('Does nothing on interrupt', () => {
		editor.setSelectedTool('note')
		editor.interrupt()
		editor.expectPathToBe('root.note.idle')
	})
})

describe('When in the pointing state', () => {
	it('Switches back to idle on cancel', () => {
		editor.setSelectedTool('note')
		editor.pointerDown(50, 50)
		editor.expectPathToBe('root.note.pointing')
		editor.cancel()
		editor.expectPathToBe('root.note.idle')
	})

	it('Enters the select.translating state on drag start', () => {
		editor.setSelectedTool('note')
		editor.pointerDown(50, 50)
		editor.pointerMove(51, 51) // not far enough!
		editor.expectPathToBe('root.note.pointing')
		editor.pointerMove(55, 55)
		editor.expectPathToBe('root.select.translating')
	})

	it('Returns to the note tool on cancel from translating', () => {
		editor.setSelectedTool('note')
		editor.pointerDown(50, 50)
		editor.pointerMove(55, 55)
		editor.cancel()
		editor.expectPathToBe('root.note.idle')
	})

	it('Returns to the note tool on complete from translating when tool lock is enabled', () => {
		editor.setToolLocked(true)
		editor.setSelectedTool('note')
		editor.pointerDown(50, 50)
		editor.pointerMove(55, 55)
		editor.pointerUp()
		editor.expectPathToBe('root.note.idle')
	})

	it('Returns to the idle state on interrupt', () => {
		editor.setSelectedTool('note')
		editor.pointerDown(50, 50)
		editor.interrupt()
		editor.expectPathToBe('root.note.idle')
	})

	it('Creates a note and begins editing on pointer up', () => {
		expect(editor.shapesArray.length).toBe(0)
		editor.setSelectedTool('note')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)
		editor.expectPathToBe('root.select.editing_shape')
		expect(editor.shapesArray.length).toBe(1)
	})

	it('Creates a frame and returns to frame.idle on pointer up if tool lock is enabled', () => {
		editor.setToolLocked(true)
		expect(editor.shapesArray.length).toBe(0)
		editor.setSelectedTool('note')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)
		editor.expectPathToBe('root.note.idle')
		expect(editor.shapesArray.length).toBe(1)
	})
})

import { TLNoteTool } from '../../app/statechart/TLNoteTool/TLNoteTool'
import { TestApp } from '../TestApp'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})
afterEach(() => {
	app?.dispose()
})

describe(TLNoteTool, () => {
	it('Creates note shapes on click-and-drag, supports undo and redo', () => {
		expect(app.shapesArray.length).toBe(0)

		app.setSelectedTool('note')
		app.pointerDown(50, 50)
		app.pointerMove(100, 100)
		app.pointerUp(100, 100)

		expect(app.shapesArray.length).toBe(1)
		expect(app.shapesArray[0]?.type).toBe('note')
		expect(app.selectedIds[0]).toBe(app.shapesArray[0]?.id)

		app.cancel() // leave edit mode

		app.undo() // undoes the selection change
		app.undo()

		expect(app.shapesArray.length).toBe(0)

		app.redo()

		expect(app.shapesArray.length).toBe(1)
	})

	it('Creates note shapes on click, supports undo and redo', () => {
		expect(app.shapesArray.length).toBe(0)

		app.setSelectedTool('note')
		app.pointerDown(50, 50)
		app.pointerUp(50, 50)

		expect(app.shapesArray.length).toBe(1)
		expect(app.shapesArray[0]?.type).toBe('note')
		expect(app.selectedIds[0]).toBe(app.shapesArray[0]?.id)

		app.undo()

		expect(app.shapesArray.length).toBe(0)

		app.redo()

		expect(app.shapesArray.length).toBe(1)
	})
})

describe('When selecting the tool', () => {
	it('selects the tool and enters the idle state', () => {
		app.setSelectedTool('note')
		app.expectPathToBe('root.note.idle')
	})
})

describe('When in the idle state', () => {
	it('Enters pointing state on pointer down', () => {
		app.setSelectedTool('note')
		app.pointerDown(100, 100)
		app.expectPathToBe('root.note.pointing')
	})

	it('Switches back to select tool on cancel', () => {
		app.setSelectedTool('note')
		app.cancel()
		app.expectPathToBe('root.select.idle')
	})

	it('Does nothing on interrupt', () => {
		app.setSelectedTool('note')
		app.interrupt()
		app.expectPathToBe('root.note.idle')
	})
})

describe('When in the pointing state', () => {
	it('Switches back to idle on cancel', () => {
		app.setSelectedTool('note')
		app.pointerDown(50, 50)
		app.expectPathToBe('root.note.pointing')
		app.cancel()
		app.expectPathToBe('root.note.idle')
	})

	it('Enters the select.translating state on drag start', () => {
		app.setSelectedTool('note')
		app.pointerDown(50, 50)
		app.pointerMove(51, 51) // not far enough!
		app.expectPathToBe('root.note.pointing')
		app.pointerMove(55, 55)
		app.expectPathToBe('root.select.translating')
	})

	it('Returns to the note tool on cancel from translating', () => {
		app.setSelectedTool('note')
		app.pointerDown(50, 50)
		app.pointerMove(55, 55)
		app.cancel()
		app.expectPathToBe('root.note.idle')
	})

	it('Returns to the note tool on complete from translating when tool lock is enabled', () => {
		app.setToolLocked(true)
		app.setSelectedTool('note')
		app.pointerDown(50, 50)
		app.pointerMove(55, 55)
		app.pointerUp()
		app.expectPathToBe('root.note.idle')
	})

	it('Returns to the idle state on interrupt', () => {
		app.setSelectedTool('note')
		app.pointerDown(50, 50)
		app.interrupt()
		app.expectPathToBe('root.note.idle')
	})

	it('Creates a note and begins editing on pointer up', () => {
		expect(app.shapesArray.length).toBe(0)
		app.setSelectedTool('note')
		app.pointerDown(50, 50)
		app.pointerUp(50, 50)
		app.expectPathToBe('root.select.editing_shape')
		expect(app.shapesArray.length).toBe(1)
	})

	it('Creates a frame and returns to frame.idle on pointer up if tool lock is enabled', () => {
		app.setToolLocked(true)
		expect(app.shapesArray.length).toBe(0)
		app.setSelectedTool('note')
		app.pointerDown(50, 50)
		app.pointerUp(50, 50)
		app.expectPathToBe('root.note.idle')
		expect(app.shapesArray.length).toBe(1)
	})
})

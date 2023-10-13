import { TestEditor } from '../../../test/TestEditor'
import { FrameShapeTool } from './FrameShapeTool'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

describe(FrameShapeTool, () => {
	it('Creates frame shapes on click-and-drag, supports undo and redo', () => {
		expect(editor.currentPageShapes.length).toBe(0)

		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)

		expect(editor.currentPageShapes.length).toBe(1)
		expect(editor.currentPageShapes[0]?.type).toBe('frame')
		expect(editor.selectedShapeIds[0]).toBe(editor.currentPageShapes[0]?.id)

		editor.undo()

		expect(editor.currentPageShapes.length).toBe(0)

		editor.redo()

		expect(editor.currentPageShapes.length).toBe(1)
	})

	it('Creates frame shapes on click, supports undo and redo', () => {
		expect(editor.currentPageShapes.length).toBe(0)

		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)

		expect(editor.currentPageShapes.length).toBe(1)
		expect(editor.currentPageShapes[0]?.type).toBe('frame')
		expect(editor.selectedShapeIds[0]).toBe(editor.currentPageShapes[0]?.id)

		editor.undo()

		expect(editor.currentPageShapes.length).toBe(0)

		editor.redo()

		expect(editor.currentPageShapes.length).toBe(1)
	})
})

describe('When selecting the tool', () => {
	it('selects the tool and enters the idle state', () => {
		editor.setCurrentTool('frame')
		editor.expectPathToBe('root.frame.idle')
	})
})

describe('When in the idle state', () => {
	it('Enters pointing state on pointer down', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100)
		editor.expectPathToBe('root.frame.pointing')
	})

	it('Switches back to select tool on cancel', () => {
		editor.setCurrentTool('frame')
		editor.cancel()
		editor.expectPathToBe('root.select.idle')
	})

	it('Does nothing on interrupt', () => {
		editor.setCurrentTool('frame')
		editor.interrupt()
		editor.expectPathToBe('root.frame.idle')
	})
})

describe('When in the pointing state', () => {
	it('Switches back to idle on cancel', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.expectPathToBe('root.frame.pointing')
		editor.cancel()
		editor.expectPathToBe('root.frame.idle')
	})

	it('Enters the select.resizing state on drag start', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerMove(51, 51) // not far enough!
		editor.expectPathToBe('root.frame.pointing')
		editor.pointerMove(55, 55)
		editor.expectPathToBe('root.select.resizing')
	})

	it('Enters the select.resizing state on pointer move', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.cancel()
		editor.expectPathToBe('root.frame.idle')
	})

	it('Returns to the frame state on cancel', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.cancel()
		editor.expectPathToBe('root.frame.idle')
	})

	it('Creates a frame and returns to select tool on pointer up', () => {
		expect(editor.currentPageShapes.length).toBe(0)
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)
		editor.expectPathToBe('root.select.idle')
		expect(editor.currentPageShapes.length).toBe(1)
	})

	it('Creates a frame and returns to frame.idle on pointer up if tool lock is enabled', () => {
		editor.updateInstanceState({ isToolLocked: true })
		expect(editor.currentPageShapes.length).toBe(0)
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)
		editor.expectPathToBe('root.frame.idle')
		expect(editor.currentPageShapes.length).toBe(1)
	})
})

describe('When in the resizing state', () => {
	it('Returns to frame on cancel', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerMove(55, 55)
		editor.expectPathToBe('root.select.resizing')
		editor.cancel()
		editor.expectPathToBe('root.frame.idle')
	})

	it('Returns to select.idle on complete', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)
		editor.expectPathToBe('root.select.idle')
	})

	it('Returns to frame.idle on complete if tool lock is enabled', () => {
		editor.updateInstanceState({ isToolLocked: true })
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)
		editor.expectPathToBe('root.frame.idle')
	})
})

it('Returns to the idle state on interrupt', () => {
	editor.setCurrentTool('frame')
	editor.pointerDown(50, 50)
	editor.interrupt()
	editor.expectPathToBe('root.frame.idle')
})

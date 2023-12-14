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
		expect(editor.getCurrentPageShapes().length).toBe(0)

		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)

		expect(editor.getCurrentPageShapes().length).toBe(1)
		expect(editor.getCurrentPageShapes()[0]?.type).toBe('frame')
		expect(editor.getSelectedShapeIds()[0]).toBe(editor.getCurrentPageShapes()[0]?.id)

		editor.undo()

		expect(editor.getCurrentPageShapes().length).toBe(0)

		editor.redo()

		expect(editor.getCurrentPageShapes().length).toBe(1)
	})

	it('Creates frame shapes on click, supports undo and redo', () => {
		expect(editor.getCurrentPageShapes().length).toBe(0)

		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)

		expect(editor.getCurrentPageShapes().length).toBe(1)
		expect(editor.getCurrentPageShapes()[0]?.type).toBe('frame')
		expect(editor.getSelectedShapeIds()[0]).toBe(editor.getCurrentPageShapes()[0]?.id)

		editor.undo()

		expect(editor.getCurrentPageShapes().length).toBe(0)

		editor.redo()

		expect(editor.getCurrentPageShapes().length).toBe(1)
	})
})

describe('When selecting the tool', () => {
	it('selects the tool and enters the idle state', () => {
		editor.setCurrentTool('frame')
		editor.expectToBeIn('frame.idle')
	})
})

describe('When in the idle state', () => {
	it('Enters pointing state on pointer down', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100)
		editor.expectToBeIn('frame.pointing')
	})

	it('Switches back to select tool on cancel', () => {
		editor.setCurrentTool('frame')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})

	it('Does nothing on interrupt', () => {
		editor.setCurrentTool('frame')
		editor.interrupt()
		editor.expectToBeIn('frame.idle')
	})
})

describe('When in the pointing state', () => {
	it('Switches back to idle on cancel', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.expectToBeIn('frame.pointing')
		editor.cancel()
		editor.expectToBeIn('frame.idle')
	})

	it('Enters the select.resizing state on drag start', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerMove(51, 51) // not far enough!
		editor.expectToBeIn('frame.pointing')
		editor.pointerMove(55, 55)
		editor.expectToBeIn('select.resizing')
	})

	it('Enters the select.resizing state on pointer move', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.cancel()
		editor.expectToBeIn('frame.idle')
	})

	it('Returns to the frame state on cancel', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.cancel()
		editor.expectToBeIn('frame.idle')
	})

	it('Creates a frame and returns to select tool on pointer up', () => {
		expect(editor.getCurrentPageShapes().length).toBe(0)
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)
		editor.expectToBeIn('select.idle')
		expect(editor.getCurrentPageShapes().length).toBe(1)
	})

	it('Creates a frame and returns to frame.idle on pointer up if tool lock is enabled', () => {
		editor.updateInstanceState({ isToolLocked: true })
		expect(editor.getCurrentPageShapes().length).toBe(0)
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)
		editor.expectToBeIn('frame.idle')
		expect(editor.getCurrentPageShapes().length).toBe(1)
	})
})

describe('When in the resizing state', () => {
	it('Returns to frame on cancel', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerMove(55, 55)
		editor.expectToBeIn('select.resizing')
		editor.cancel()
		editor.expectToBeIn('frame.idle')
	})

	it('Returns to select.idle on complete', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)
		editor.expectToBeIn('select.idle')
	})

	it('Returns to frame.idle on complete if tool lock is enabled', () => {
		editor.updateInstanceState({ isToolLocked: true })
		editor.setCurrentTool('frame')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)
		editor.expectToBeIn('frame.idle')
	})
})

it('Returns to the idle state on interrupt', () => {
	editor.setCurrentTool('frame')
	editor.pointerDown(50, 50)
	editor.interrupt()
	editor.expectToBeIn('frame.idle')
})

import { TLBoxTool } from '../../app/statechart/TLBoxTool/TLBoxTool'
import { TestApp } from '../TestApp'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})
afterEach(() => {
	app?.dispose()
})

describe(TLBoxTool, () => {
	it('Creates frame shapes on click-and-drag, supports undo and redo', () => {
		expect(app.shapesArray.length).toBe(0)

		app.setSelectedTool('frame')
		app.pointerDown(50, 50)
		app.pointerMove(100, 100)
		app.pointerUp(100, 100)

		expect(app.shapesArray.length).toBe(1)
		expect(app.shapesArray[0]?.type).toBe('frame')
		expect(app.selectedIds[0]).toBe(app.shapesArray[0]?.id)

		app.undo()

		expect(app.shapesArray.length).toBe(0)

		app.redo()

		expect(app.shapesArray.length).toBe(1)
	})

	it('Creates frame shapes on click, supports undo and redo', () => {
		expect(app.shapesArray.length).toBe(0)

		app.setSelectedTool('frame')
		app.pointerDown(50, 50)
		app.pointerUp(50, 50)

		expect(app.shapesArray.length).toBe(1)
		expect(app.shapesArray[0]?.type).toBe('frame')
		expect(app.selectedIds[0]).toBe(app.shapesArray[0]?.id)

		app.undo()

		expect(app.shapesArray.length).toBe(0)

		app.redo()

		expect(app.shapesArray.length).toBe(1)
	})
})

describe('When selecting the tool', () => {
	it('selects the tool and enters the idle state', () => {
		app.setSelectedTool('frame')
		app.expectPathToBe('root.frame.idle')
	})
})

describe('When in the idle state', () => {
	it('Enters pointing state on pointer down', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100)
		app.expectPathToBe('root.frame.pointing')
	})

	it('Switches back to select tool on cancel', () => {
		app.setSelectedTool('frame')
		app.cancel()
		app.expectPathToBe('root.select.idle')
	})

	it('Does nothing on interrupt', () => {
		app.setSelectedTool('frame')
		app.interrupt()
		app.expectPathToBe('root.frame.idle')
	})
})

describe('When in the pointing state', () => {
	it('Switches back to idle on cancel', () => {
		app.setSelectedTool('frame')
		app.pointerDown(50, 50)
		app.expectPathToBe('root.frame.pointing')
		app.cancel()
		app.expectPathToBe('root.frame.idle')
	})

	it('Enters the select.resizing state on drag start', () => {
		app.setSelectedTool('frame')
		app.pointerDown(50, 50)
		app.pointerMove(51, 51) // not far enough!
		app.expectPathToBe('root.frame.pointing')
		app.pointerMove(55, 55)
		app.expectPathToBe('root.select.resizing')
	})

	it('Enters the select.resizing state on pointer move', () => {
		app.setSelectedTool('frame')
		app.pointerDown(50, 50)
		app.cancel()
		app.expectPathToBe('root.frame.idle')
	})

	it('Returns to the frame state on cancel', () => {
		app.setSelectedTool('frame')
		app.pointerDown(50, 50)
		app.pointerMove(100, 100)
		app.cancel()
		app.expectPathToBe('root.frame.idle')
	})

	it('Creates a frame and returns to select tool on pointer up', () => {
		expect(app.shapesArray.length).toBe(0)
		app.setSelectedTool('frame')
		app.pointerDown(50, 50)
		app.pointerUp(50, 50)
		app.expectPathToBe('root.select.idle')
		expect(app.shapesArray.length).toBe(1)
	})

	it('Creates a frame and returns to frame.idle on pointer up if tool lock is enabled', () => {
		app.setToolLocked(true)
		expect(app.shapesArray.length).toBe(0)
		app.setSelectedTool('frame')
		app.pointerDown(50, 50)
		app.pointerUp(50, 50)
		app.expectPathToBe('root.frame.idle')
		expect(app.shapesArray.length).toBe(1)
	})
})

describe('When in the resizing state', () => {
	it('Returns to frame on cancel', () => {
		app.setSelectedTool('frame')
		app.pointerDown(50, 50)
		app.pointerMove(55, 55)
		app.expectPathToBe('root.select.resizing')
		app.cancel()
		app.expectPathToBe('root.frame.idle')
	})

	it('Returns to select.idle on complete', () => {
		app.setSelectedTool('frame')
		app.pointerDown(50, 50)
		app.pointerMove(100, 100)
		app.pointerUp(100, 100)
		app.expectPathToBe('root.select.idle')
	})

	it('Returns to frame.idle on complete if tool lock is enabled', () => {
		app.setToolLocked(true)
		app.setSelectedTool('frame')
		app.pointerDown(50, 50)
		app.pointerMove(100, 100)
		app.pointerUp(100, 100)
		app.expectPathToBe('root.frame.idle')
	})
})

it('Returns to the idle state on interrupt', () => {
	app.setSelectedTool('frame')
	app.pointerDown(50, 50)
	app.interrupt()
	app.expectPathToBe('root.frame.idle')
})

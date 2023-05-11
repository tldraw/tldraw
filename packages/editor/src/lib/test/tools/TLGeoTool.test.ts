import { TLGeoTool } from '../../app/statechart/TLGeoTool/TLGeoTool'
import { TestApp } from '../TestApp'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})
afterEach(() => {
	app?.dispose()
})

describe(TLGeoTool, () => {
	it('Creates geo shapes on click-and-drag, supports undo and redo', () => {
		expect(app.shapesArray.length).toBe(0)

		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.pointerMove(100, 100)
		app.pointerUp(100, 100)

		expect(app.shapesArray.length).toBe(1)
		expect(app.shapesArray[0]?.type).toBe('geo')
		expect(app.selectedIds[0]).toBe(app.shapesArray[0]?.id)

		app.undo()

		expect(app.shapesArray.length).toBe(0)

		app.redo()

		expect(app.shapesArray.length).toBe(1)
	})

	it('Creates geo shapes on click, supports undo and redo', () => {
		expect(app.shapesArray.length).toBe(0)

		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.pointerUp(50, 50)

		expect(app.shapesArray.length).toBe(1)
		expect(app.shapesArray[0]?.type).toBe('geo')
		expect(app.selectedIds[0]).toBe(app.shapesArray[0]?.id)

		app.undo()

		expect(app.shapesArray.length).toBe(0)

		app.redo()

		expect(app.shapesArray.length).toBe(1)
	})
})

describe('When selecting the tool', () => {
	it('selects the tool and enters the idle state', () => {
		app.setSelectedTool('geo')
		app.expectPathToBe('root.geo.idle')
	})
})

describe('When in the idle state', () => {
	it('Enters pointing state on pointer down', () => {
		app.setSelectedTool('geo')
		app.pointerDown(100, 100)
		app.expectPathToBe('root.geo.pointing')
	})

	it('Switches back to select tool on cancel', () => {
		app.setSelectedTool('geo')
		app.cancel()
		app.expectPathToBe('root.select.idle')
	})

	it('Does nothing on interrupt', () => {
		app.setSelectedTool('geo')
		app.interrupt()
		app.expectPathToBe('root.geo.idle')
	})

	it('Enters edit shape state on "Enter" key up when we have one geo shape', () => {
		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.pointerMove(100, 100)
		app.pointerUp(100, 100)

		app.keyUp('Enter')
		app.expectPathToBe('root.select.editing_shape')
	})

	it('Does not enter edit shape state on "Enter" key up when multiple geo shapes are selected', () => {
		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.pointerMove(100, 100)
		app.pointerUp(100, 100)

		app.setSelectedTool('geo')
		app.pointerDown(150, 150)
		app.pointerMove(200, 200)
		app.pointerUp(200, 200)

		expect(app.shapesArray.length).toBe(2)

		app.selectAll()
		expect(app.selectedShapes.length).toBe(2)

		app.keyUp('Enter')
		app.expectPathToBe('root.select.idle')
	})
})

describe('When in the pointing state', () => {
	it('Switches back to idle on cancel', () => {
		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.expectPathToBe('root.geo.pointing')
		app.cancel()
		app.expectPathToBe('root.geo.idle')
	})

	it('Enters the select.resizing state on drag start', () => {
		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.pointerMove(51, 51) // not far enough!
		app.expectPathToBe('root.geo.pointing')
		app.pointerMove(55, 55)
		app.expectPathToBe('root.select.resizing')
	})

	it('Enters the select.resizing state on pointer move', () => {
		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.cancel()
		app.expectPathToBe('root.geo.idle')
	})

	it('Returns to the idle state on interrupt', () => {
		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.interrupt()
		app.expectPathToBe('root.geo.idle')
	})

	it('Creates a geo and returns to select tool on pointer up', () => {
		expect(app.shapesArray.length).toBe(0)
		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.pointerUp(50, 50)
		app.expectPathToBe('root.select.idle')
		expect(app.shapesArray.length).toBe(1)
	})

	it('Creates a geo and returns to geo.idle on pointer up if tool lock is enabled', () => {
		app.setToolLocked(true)
		expect(app.shapesArray.length).toBe(0)
		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.pointerUp(50, 50)
		app.expectPathToBe('root.geo.idle')
		expect(app.shapesArray.length).toBe(1)
	})
})

describe('When in the resizing state while creating a geo shape', () => {
	it('Returns to geo on cancel', () => {
		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.pointerMove(55, 55)
		app.expectPathToBe('root.select.resizing')
		app.cancel()
		app.expectPathToBe('root.geo.idle')
	})

	it('Returns to select.idle on complete', () => {
		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.pointerMove(100, 100)
		app.pointerUp(100, 100)
		app.expectPathToBe('root.select.idle')
	})

	it('Returns to geo.idle on complete if tool lock is enabled', () => {
		app.setToolLocked(true)
		app.setSelectedTool('geo')
		app.pointerDown(50, 50)
		app.pointerMove(100, 100)
		app.pointerUp(100, 100)
		app.expectPathToBe('root.geo.idle')
	})
})

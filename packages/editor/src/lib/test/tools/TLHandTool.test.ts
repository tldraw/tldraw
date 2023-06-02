import { TLHandTool } from '../../app/statechart/TLHandTool/TLHandTool'
import { createDefaultShapes, TestApp } from '../TestEditor'

let app: TestApp

beforeEach(() => {
	app = new TestApp()

	app._transformPointerDownSpy.mockRestore()
	app._transformPointerUpSpy.mockRestore()
})

afterEach(() => {
	app?.dispose()
})

jest.useFakeTimers()

describe(TLHandTool, () => {
	it('Double taps to zoom in', () => {
		app.setSelectedTool('hand')
		expect(app.zoomLevel).toBe(1)
		app.click()
		app.click() // double click!
		jest.advanceTimersByTime(300)
		expect(app.zoomLevel).not.toBe(1) // animating
		jest.advanceTimersByTime(300)
		expect(app.zoomLevel).toBe(2) // all done
	})

	it('Triple taps to zoom out', () => {
		app.setSelectedTool('hand')
		expect(app.zoomLevel).toBe(1)
		app.click()
		app.click()
		app.click() // triple click!
		jest.advanceTimersByTime(300)
		expect(app.zoomLevel).not.toBe(1) // animating
		jest.advanceTimersByTime(300)
		expect(app.zoomLevel).toBe(0.5) // all done
	})

	it('Quadruple taps to reset zoom', () => {
		app.setSelectedTool('hand')
		app.zoomIn() // zoom to 2
		expect(app.zoomLevel).toBe(2)
		app.click()
		app.click()
		app.click()
		app.click() // quad click!
		jest.advanceTimersByTime(300)
		expect(app.zoomLevel).not.toBe(2) // animating
		jest.advanceTimersByTime(300)
		expect(app.zoomLevel).toBe(1) // all done
	})

	it('Quadruple taps from zoom=1 to zoom to fit', () => {
		app.setSelectedTool('hand')
		expect(app.zoomLevel).toBe(1)
		app.createShapes(createDefaultShapes()) // makes some shapes
		app.click()
		app.click()
		app.click()
		app.click() // quad click!
		jest.advanceTimersByTime(300)
		expect(app.zoomLevel).not.toBe(1) // animating
		jest.advanceTimersByTime(300)
		const z = app.zoomLevel
		app.zoomToFit() // call zoom to fit manually to compare
		expect(app.zoomLevel).toBe(z) // zoom should not have changed
	})
})

describe('When in the idle state', () => {
	it('Returns to select on cancel', () => {
		app.setSelectedTool('hand')
		app.expectPathToBe('root.hand.idle')
		app.cancel()
		app.expectPathToBe('root.select.idle')
	})
})

describe('When selecting the tool', () => {
	it('selects the tool and enters the idle state', () => {
		app.setSelectedTool('hand')
		app.expectPathToBe('root.hand.idle')
	})
})

describe('When in the idle state', () => {
	it('Enters pointing state on pointer down', () => {
		app.setSelectedTool('hand')
		app.pointerDown(100, 100)
		app.expectPathToBe('root.hand.pointing')
	})

	it('Switches back to select tool on cancel', () => {
		app.setSelectedTool('hand')
		app.cancel()
		app.expectPathToBe('root.select.idle')
	})

	it('Does nothing on interrupt', () => {
		app.setSelectedTool('hand')
		app.interrupt()
		app.expectPathToBe('root.hand.idle')
	})
})

describe('When in the pointing state', () => {
	it('Switches back to idle on cancel', () => {
		app.setSelectedTool('hand')
		app.pointerDown(50, 50)
		app.expectPathToBe('root.hand.pointing')
		app.cancel()
		app.expectPathToBe('root.hand.idle')
	})

	it('Enters the dragging state on drag start', () => {
		app.setSelectedTool('hand')
		app.pointerDown(50, 50)
		app.pointerMove(51, 51) // not far enough!
		app.expectPathToBe('root.hand.pointing')
		app.pointerMove(55, 55)
		app.expectPathToBe('root.hand.dragging')
	})

	it('Returns to the idle state on cancel', () => {
		app.setSelectedTool('hand')
		app.pointerDown(50, 50)
		app.cancel()
		app.expectPathToBe('root.hand.idle')
	})

	it('Returns to the idle state on interrupt', () => {
		app.setSelectedTool('hand')
		app.pointerDown(50, 50)
		app.interrupt()
		app.expectPathToBe('root.hand.idle')
	})
})

describe('When in the dragging state', () => {
	it('Moves the camera', () => {
		app.setSelectedTool('hand')
		expect(app.camera.x).toBe(0)
		expect(app.camera.y).toBe(0)
		app.pointerDown(50, 50)
		app.expectPathToBe('root.hand.pointing')
		app.pointerMove(75, 75)
		expect(app.camera.x).toBe(25)
		expect(app.camera.y).toBe(25)
		app.expectPathToBe('root.hand.dragging')
		app.pointerMove(100, 100)
		expect(app.camera.x).toBe(50)
		expect(app.camera.y).toBe(50)
		app.pointerUp()
	})

	// it('Moves the camera with inertia on pointer up', () => {
	//  Can't test this—x is set to Inifnity in tests
	// 	app.setSelectedTool('hand')
	// 	expect(app.camera.x).toBe(0)
	// 	expect(app.camera.y).toBe(0)
	// 	app.pointerDown(50, 50)
	// 	app.pointerMove(56, 56)
	// 	expect(app.camera.x).toBe(6)
	// 	expect(app.camera.y).toBe(6)
	// 	app.pointerUp()
	// })

	// it('Lets the inertia die down using time', () => {
	//  Can't test this—x is set to Inifnity in tests
	// 	app.setSelectedTool('hand')
	// 	expect(app.camera.x).toBe(0)
	// 	expect(app.camera.y).toBe(0)
	// 	app.pointerDown(50, 50)
	// 	app.pointerMove(55, 55)
	// 	app.pointerMove(56, 56)
	// 	expect(app.camera.x).toBe(6)
	// 	expect(app.camera.y).toBe(6)
	// })

	it('Returns to the idle state on cancel', () => {
		app.setSelectedTool('hand')
		app.pointerDown(50, 50)
		app.pointerMove(100, 100)
		app.cancel()
		app.expectPathToBe('root.hand.idle')
	})
})

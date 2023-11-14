import { HandTool } from '../lib/tools/HandTool/HandTool'
import { TestEditor, createDefaultShapes } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()

	editor._transformPointerDownSpy.mockRestore()
	editor._transformPointerUpSpy.mockRestore()
})

afterEach(() => {
	editor?.dispose()
})

jest.useFakeTimers()

describe(HandTool, () => {
	it('Double taps to zoom in', () => {
		editor.setCurrentTool('hand')
		expect(editor.getZoomLevel()).toBe(1)
		editor.click()
		editor.click() // double click!
		jest.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).not.toBe(1) // animating
		jest.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(2) // all done
	})

	it('Triple taps to zoom out', () => {
		editor.setCurrentTool('hand')
		expect(editor.getZoomLevel()).toBe(1)
		editor.click()
		editor.click()
		editor.click() // triple click!
		jest.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).not.toBe(1) // animating
		jest.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(0.5) // all done
	})

	it('Quadruple taps to reset zoom', () => {
		editor.setCurrentTool('hand')
		editor.zoomIn() // zoom to 2
		expect(editor.getZoomLevel()).toBe(2)
		editor.click()
		editor.click()
		editor.click()
		editor.click() // quad click!
		jest.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).not.toBe(2) // animating
		jest.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(1) // all done
	})

	it('Quadruple taps from zoom=1 to zoom to fit', () => {
		editor.setCurrentTool('hand')
		expect(editor.getZoomLevel()).toBe(1)
		editor.createShapes(createDefaultShapes()) // makes some shapes
		editor.click()
		editor.click()
		editor.click()
		editor.click() // quad click!
		jest.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).not.toBe(1) // animating
		jest.advanceTimersByTime(300)
		const z = editor.getZoomLevel()
		editor.zoomToFit() // call zoom to fit manually to compare
		expect(editor.getZoomLevel()).toBe(z) // zoom should not have changed
	})
})

describe('When in the idle state', () => {
	it('Returns to select on cancel', () => {
		editor.setCurrentTool('hand')
		editor.expectToBeIn('hand.idle')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})
})

describe('When selecting the tool', () => {
	it('selects the tool and enters the idle state', () => {
		editor.setCurrentTool('hand')
		editor.expectToBeIn('hand.idle')
	})
})

describe('When in the idle state', () => {
	it('Enters pointing state on pointer down', () => {
		editor.setCurrentTool('hand')
		editor.pointerDown(100, 100)
		editor.expectToBeIn('hand.pointing')
	})

	it('Switches back to select tool on cancel', () => {
		editor.setCurrentTool('hand')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})

	it('Does nothing on interrupt', () => {
		editor.setCurrentTool('hand')
		editor.interrupt()
		editor.expectToBeIn('hand.idle')
	})
})

describe('When in the pointing state', () => {
	it('Switches back to idle on cancel', () => {
		editor.setCurrentTool('hand')
		editor.pointerDown(50, 50)
		editor.expectToBeIn('hand.pointing')
		editor.cancel()
		editor.expectToBeIn('hand.idle')
	})

	it('Enters the dragging state on drag start', () => {
		editor.setCurrentTool('hand')
		editor.pointerDown(50, 50)
		editor.pointerMove(51, 51) // not far enough!
		editor.expectToBeIn('hand.pointing')
		editor.pointerMove(55, 55)
		editor.expectToBeIn('hand.dragging')
	})

	it('Returns to the idle state on cancel', () => {
		editor.setCurrentTool('hand')
		editor.pointerDown(50, 50)
		editor.cancel()
		editor.expectToBeIn('hand.idle')
	})

	it('Returns to the idle state on interrupt', () => {
		editor.setCurrentTool('hand')
		editor.pointerDown(50, 50)
		editor.interrupt()
		editor.expectToBeIn('hand.idle')
	})
})

describe('When in the dragging state', () => {
	it('Moves the camera', () => {
		editor.setCurrentTool('hand')
		expect(editor.getCamera().x).toBe(0)
		expect(editor.getCamera().y).toBe(0)
		editor.pointerDown(50, 50)
		editor.expectToBeIn('hand.pointing')
		editor.pointerMove(75, 75)
		expect(editor.getCamera().x).toBe(25)
		expect(editor.getCamera().y).toBe(25)
		editor.expectToBeIn('hand.dragging')
		editor.pointerMove(100, 100)
		expect(editor.getCamera().x).toBe(50)
		expect(editor.getCamera().y).toBe(50)
		editor.pointerUp()
	})

	// it('Moves the camera with inertia on pointer up', () => {
	//  Can't test this—x is set to Inifnity in tests
	// 	editor.setCurrentTool('hand')
	// 	expect(editor.camera.x).toBe(0)
	// 	expect(editor.camera.y).toBe(0)
	// 	editor.pointerDown(50, 50)
	// 	editor.pointerMove(56, 56)
	// 	expect(editor.camera.x).toBe(6)
	// 	expect(editor.camera.y).toBe(6)
	// 	editor.pointerUp()
	// })

	// it('Lets the inertia die down using time', () => {
	//  Can't test this—x is set to Inifnity in tests
	// 	editor.setCurrentTool('hand')
	// 	expect(editor.camera.x).toBe(0)
	// 	expect(editor.camera.y).toBe(0)
	// 	editor.pointerDown(50, 50)
	// 	editor.pointerMove(55, 55)
	// 	editor.pointerMove(56, 56)
	// 	expect(editor.camera.x).toBe(6)
	// 	expect(editor.camera.y).toBe(6)
	// })

	it('Returns to the idle state on cancel', () => {
		editor.setCurrentTool('hand')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.cancel()
		editor.expectToBeIn('hand.idle')
	})
})

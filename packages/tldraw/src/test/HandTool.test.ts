import { Vec } from '@tldraw/editor'
import { vi } from 'vitest'
import { HandTool } from '../lib/tools/HandTool/HandTool'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()

	editor._transformPointerDownSpy.mockRestore()
	editor._transformPointerUpSpy.mockRestore()
})

afterEach(() => {
	editor?.dispose()
})

vi.useFakeTimers()

describe(HandTool, () => {
	it('Uses one-finger zoom when coarse pointer double-taps, holds, and drags', () => {
		editor.setCurrentTool('hand')
		editor.updateInstanceState({ isCoarsePointer: true })

		// Double-tap, holding the second press down.
		editor.pointerDown(0, 0).pointerUp(0, 0)
		editor.pointerDown(0, 0)
		// On the second press we're still just pointing — the zoom hasn't started yet.
		editor.expectToBeIn('hand.pointing')

		// One-finger zoom begins when the multi-click timer settles with the pointer
		// still held down (the `settle-down` phase).
		vi.advanceTimersByTime(editor.options.multiClickDurationMs)
		editor.expectToBeIn('hand.one_finger_zooming')

		const before = editor.getCamera().z
		editor.pointerMove(0, 100).pointerUp(0, 100).forceTick()
		expect(editor.getCamera().z).toBeGreaterThan(before)
	})

	it('Zooms in (not one-finger zoom) when a coarse pointer double-taps and releases', () => {
		editor.setCurrentTool('hand')
		editor.updateInstanceState({ isCoarsePointer: true })

		// Double-tap and release the second press before the timer settles.
		editor.pointerDown(0, 0).pointerUp(0, 0)
		editor.pointerDown(0, 0).pointerUp(0, 0)
		// Releasing means we never enter the one-finger zoom drag state.
		editor.expectToBeIn('hand.idle')

		// The `settle-up` phase zooms in by one step.
		const before = editor.getZoomLevel()
		vi.advanceTimersByTime(editor.options.multiClickDurationMs)
		vi.advanceTimersByTime(600) // let the zoom animation finish
		expect(editor.getZoomLevel()).toBeGreaterThan(before)
	})

	it('Double taps to zoom in', () => {
		editor.setCurrentTool('hand')
		expect(editor.getZoomLevel()).toBe(1)
		editor.click()
		editor.click() // double click!
		expect(editor.getZoomLevel()).toBe(1)
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).not.toBe(1) // animating
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(2) // all done
	})

	it('Does not zoom on overflow taps', () => {
		editor.setCurrentTool('hand')
		expect(editor.getZoomLevel()).toBe(1)
		editor.click()
		editor.click()
		editor.click() // overflow click
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(1)
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(1)
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

	it('Does not zoom when momentum panning on release', () => {
		editor.setCurrentTool('hand')
		editor.pointerDown(0, 0)
		editor.pointerMove(50, 50)
		editor.inputs.setPointerVelocity(new Vec(1, 1))
		editor.pointerUp().forceTick()

		expect(editor.getCamera().z).toBe(1)
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

	it('Returns to the idle state on interrupt', () => {
		editor.setCurrentTool('hand')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.expectToBeIn('hand.dragging')
		editor.interrupt()
		editor.expectToBeIn('hand.idle')
	})

	it('Ends the pan when a second touch starts, without jumping the camera', () => {
		editor.setCurrentTool('hand')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.expectToBeIn('hand.dragging')
		expect(editor.getCamera()).toMatchObject({ x: 50, y: 50 })

		// A second finger lands far from the first, resetting the input origin.
		editor.pointerDown(200, 0)
		editor.expectToBeIn('hand.idle')

		// Movement before pinch_start arrives no longer pans the camera.
		editor.pointerMove(210, 10)
		expect(editor.getCamera()).toMatchObject({ x: 50, y: 50 })
	})

	it('Does not resume the pan after a pinch ends', () => {
		editor.setCurrentTool('hand')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.expectToBeIn('hand.dragging')

		// A second finger lands and starts a pinch.
		editor.pointerDown(200, 0)
		editor.expectToBeIn('hand.idle')
		editor.pinchStart(150, 50, 1, 0, 0, 0)
		editor.pinchTo(150, 50, 2, 0, 0, 0)
		editor.pinchEnd(150, 50, 2, 0, 0, 0)
		editor.expectToBeIn('hand.idle')

		// Moving the remaining finger does not pan the camera.
		const { x, y } = editor.getCamera()
		editor.pointerMove(120, 120)
		expect(editor.getCamera()).toMatchObject({ x, y })
	})
})

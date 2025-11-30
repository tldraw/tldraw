import { Box } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.updateViewportScreenBounds(new Box(0, 0, 1600, 900))
})

describe('getCameraState', () => {
	it('starts as idle', () => {
		expect(editor.getCameraState()).toBe('idle')
	})

	it('becomes moving when the camera changes via setCamera', () => {
		expect(editor.getCameraState()).toBe('idle')
		editor.setCamera({ x: 100, y: 100, z: 1 })
		expect(editor.getCameraState()).toBe('moving')
	})

	it('becomes moving when the camera changes via pan', () => {
		expect(editor.getCameraState()).toBe('idle')
		editor.pan({ x: 100, y: 100 })
		expect(editor.getCameraState()).toBe('moving')
	})

	it('becomes moving when the camera changes via zoomIn', () => {
		expect(editor.getCameraState()).toBe('idle')
		editor.zoomIn(undefined, { immediate: true })
		expect(editor.getCameraState()).toBe('moving')
	})

	it('returns to idle after the timeout elapses', () => {
		expect(editor.getCameraState()).toBe('idle')
		editor.setCamera({ x: 100, y: 100, z: 1 })
		expect(editor.getCameraState()).toBe('moving')

		// The default timeout is 64ms (options.cameraMovingTimeoutMs)
		// Each tick is 16ms, so we need ~4 ticks to elapse
		editor.forceTick(5)
		expect(editor.getCameraState()).toBe('idle')
	})

	it('stays moving while camera continues to change', () => {
		expect(editor.getCameraState()).toBe('idle')
		editor.setCamera({ x: 100, y: 100, z: 1 })
		expect(editor.getCameraState()).toBe('moving')

		// Move again before timeout elapses
		editor.forceTick(2)
		editor.setCamera({ x: 200, y: 200, z: 1 })
		expect(editor.getCameraState()).toBe('moving')

		// Move again
		editor.forceTick(2)
		editor.setCamera({ x: 300, y: 300, z: 1 })
		expect(editor.getCameraState()).toBe('moving')

		// Now let it settle
		editor.forceTick(5)
		expect(editor.getCameraState()).toBe('idle')
	})

	it('stays idle when camera position does not actually change', () => {
		expect(editor.getCameraState()).toBe('idle')

		// Setting the same camera position should not trigger moving state
		const currentCamera = editor.getCamera()
		editor.setCamera({ x: currentCamera.x, y: currentCamera.y, z: currentCamera.z })
		expect(editor.getCameraState()).toBe('idle')
	})

	it('does not add multiple tick listeners when camera changes rapidly', () => {
		// This test verifies the fix: we should not have redundant listeners
		expect(editor.getCameraState()).toBe('idle')

		// Change camera multiple times rapidly
		editor.setCamera({ x: 100, y: 100, z: 1 })
		editor.setCamera({ x: 200, y: 200, z: 1 })
		editor.setCamera({ x: 300, y: 300, z: 1 })

		expect(editor.getCameraState()).toBe('moving')

		// After timeout, should return to idle exactly once
		// If there were multiple listeners, the state might behave unexpectedly
		editor.forceTick(5)
		expect(editor.getCameraState()).toBe('idle')
	})

	it('resets timeout when camera changes while already moving', () => {
		expect(editor.getCameraState()).toBe('idle')
		editor.setCamera({ x: 100, y: 100, z: 1 })
		expect(editor.getCameraState()).toBe('moving')

		// Wait almost until timeout
		editor.forceTick(3)
		expect(editor.getCameraState()).toBe('moving')

		// Change camera again - should reset timeout
		editor.setCamera({ x: 200, y: 200, z: 1 })
		expect(editor.getCameraState()).toBe('moving')

		// Wait 3 more ticks - would have been idle if timeout wasn't reset
		editor.forceTick(3)
		expect(editor.getCameraState()).toBe('moving')

		// Now let it fully settle
		editor.forceTick(3)
		expect(editor.getCameraState()).toBe('idle')
	})
})

describe('camera state with zoom', () => {
	it('becomes moving on zoomOut', () => {
		expect(editor.getCameraState()).toBe('idle')
		editor.zoomOut(undefined, { immediate: true })
		expect(editor.getCameraState()).toBe('moving')
	})

	it('becomes moving on centerOnPoint', () => {
		expect(editor.getCameraState()).toBe('idle')
		editor.centerOnPoint({ x: 500, y: 500 })
		expect(editor.getCameraState()).toBe('moving')
	})

	it('becomes moving on zoomToFit', () => {
		// Create a shape so zoomToFit has something to fit
		editor.createShape({ type: 'geo', x: 100, y: 100, props: { w: 200, h: 200 } })
		expect(editor.getCameraState()).toBe('idle')
		editor.zoomToFit({ immediate: true })
		expect(editor.getCameraState()).toBe('moving')
	})
})

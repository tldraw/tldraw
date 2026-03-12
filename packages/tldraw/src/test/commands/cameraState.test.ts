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

describe('getDebouncedZoomLevel', () => {
	it('returns the current zoom level when camera is idle', () => {
		expect(editor.getCameraState()).toBe('idle')
		expect(editor.getDebouncedZoomLevel()).toBe(editor.getZoomLevel())

		// Change zoom and let it settle
		editor.zoomIn(undefined, { immediate: true })
		editor.forceTick(5)
		expect(editor.getCameraState()).toBe('idle')
		expect(editor.getDebouncedZoomLevel()).toBe(editor.getZoomLevel())
	})

	it('captures zoom when camera starts moving', () => {
		expect(editor.getCameraState()).toBe('idle')

		// Start zooming - the debounced zoom is captured when movement starts
		editor.zoomIn(undefined, { immediate: true })
		expect(editor.getCameraState()).toBe('moving')

		// The debounced zoom is captured at the moment movement starts (after first change)
		const capturedZoom = editor.getDebouncedZoomLevel()
		expect(capturedZoom).toBe(editor.getZoomLevel())
	})

	it('keeps captured zoom during continued camera movement', () => {
		// Start zooming
		editor.zoomIn(undefined, { immediate: true })
		const capturedZoom = editor.getDebouncedZoomLevel()
		expect(editor.getCameraState()).toBe('moving')

		// Zoom again while still moving - debounced value should stay the same
		editor.zoomIn(undefined, { immediate: true })
		expect(editor.getCameraState()).toBe('moving')
		expect(editor.getDebouncedZoomLevel()).toBe(capturedZoom)

		// But current zoom should have changed
		expect(editor.getZoomLevel()).not.toBe(capturedZoom)
	})

	it('updates debounced zoom when camera becomes idle again', () => {
		// Start zooming
		editor.zoomIn(undefined, { immediate: true })
		const capturedZoom = editor.getDebouncedZoomLevel()

		// Zoom again while moving to change the current zoom
		editor.zoomIn(undefined, { immediate: true })
		expect(editor.getDebouncedZoomLevel()).toBe(capturedZoom)

		// Let camera settle
		editor.forceTick(5)
		expect(editor.getCameraState()).toBe('idle')

		// Debounced zoom should now match current zoom
		expect(editor.getDebouncedZoomLevel()).toBe(editor.getZoomLevel())
	})

	it('captures new zoom at the start of each new movement', () => {
		// First zoom and settle
		editor.zoomIn(undefined, { immediate: true })
		const firstCapturedZoom = editor.getDebouncedZoomLevel()
		editor.forceTick(5)
		expect(editor.getCameraState()).toBe('idle')

		// Second zoom - should capture new zoom level
		editor.zoomIn(undefined, { immediate: true })
		expect(editor.getCameraState()).toBe('moving')
		// The captured zoom should be different from the first capture
		expect(editor.getDebouncedZoomLevel()).not.toBe(firstCapturedZoom)
		// And it should match the current zoom (since we just started moving)
		expect(editor.getDebouncedZoomLevel()).toBe(editor.getZoomLevel())
	})

	describe('with debouncedZoom option disabled', () => {
		let editorWithoutDebouncedZoom: TestEditor

		beforeEach(() => {
			editorWithoutDebouncedZoom = new TestEditor({
				options: { debouncedZoom: false },
			})
			editorWithoutDebouncedZoom.updateViewportScreenBounds(new Box(0, 0, 1600, 900))
		})

		it('always returns the current zoom level even when camera is moving', () => {
			const initialZoom = editorWithoutDebouncedZoom.getZoomLevel()

			editorWithoutDebouncedZoom.zoomIn(undefined, { immediate: true })
			expect(editorWithoutDebouncedZoom.getCameraState()).toBe('moving')

			// Should return the current zoom, not the captured one
			expect(editorWithoutDebouncedZoom.getDebouncedZoomLevel()).toBe(
				editorWithoutDebouncedZoom.getZoomLevel()
			)
			expect(editorWithoutDebouncedZoom.getDebouncedZoomLevel()).not.toBe(initialZoom)
		})
	})
})

describe('hover updates during camera movement', () => {
	// Note: These tests verify the hover locking optimization during camera movement.
	// Important: pan({ x, y }) moves the camera, which changes how screen coordinates
	// map to page coordinates. After pan(10, 10), screen point (150, 150) maps to
	// page point (140, 140). Tests account for this by positioning pointer well
	// inside shapes so small pans don't move the effective page point outside.

	// Note: Default geo shapes have fill: 'none' (hollow), so hit testing only works on edges.
	// For interior points to register hits, shapes must have fill: 'solid'.

	it('keeps hover when camera starts moving and pointer is over same shape', () => {
		// Create a solid shape so we can hit anywhere inside it
		editor.createShapes([{ type: 'geo', x: 100, y: 100, props: { w: 200, h: 200, fill: 'solid' } }])
		const shape = editor.getLastCreatedShape()

		// Move pointer to center of shape (200, 200 is center of 100-300 range)
		editor.pointerMove(200, 200)
		expect(editor.getHoveredShapeId()).toBe(shape.id)

		// Start panning (camera moves)
		// After pan(10,10), screen (200,200) -> page (190,190), still inside shape (100-300)
		editor.pan({ x: 10, y: 10 })
		expect(editor.getCameraState()).toBe('moving')

		// Trigger a pointer move at the same screen position
		// Page point is (190, 190) which is still inside the shape
		editor.pointerMove(200, 200)
		expect(editor.getHoveredShapeId()).toBe(shape.id)
	})

	it('clears and locks hover when pointer moves to empty area while camera is moving', () => {
		// Create a solid shape so we can hit anywhere inside it
		editor.createShapes([{ type: 'geo', x: 100, y: 100, props: { w: 200, h: 200, fill: 'solid' } }])
		const shape = editor.getLastCreatedShape()

		// Move pointer over shape to hover it
		editor.pointerMove(200, 200)
		expect(editor.getHoveredShapeId()).toBe(shape.id)

		// Start panning
		editor.pan({ x: 10, y: 10 })
		expect(editor.getCameraState()).toBe('moving')

		// Move pointer to empty area - hover changes to null, so it locks
		editor.pointerMove(500, 500)
		expect(editor.getHoveredShapeId()).toBe(null)

		// Move pointer back to shape while still moving - should stay locked (no hover)
		editor.pointerMove(200, 200)
		expect(editor.getHoveredShapeId()).toBe(null)
	})

	it('resumes hover updates when camera becomes idle', () => {
		// Create a solid shape so we can hit anywhere inside it
		editor.createShapes([{ type: 'geo', x: 100, y: 100, props: { w: 200, h: 200, fill: 'solid' } }])
		const shape = editor.getLastCreatedShape()

		// Move pointer over shape
		editor.pointerMove(200, 200)
		expect(editor.getHoveredShapeId()).toBe(shape.id)

		// Start panning and move pointer off shape to trigger lock
		editor.pan({ x: 10, y: 10 })
		expect(editor.getCameraState()).toBe('moving')
		editor.pointerMove(500, 500) // Move to empty area
		expect(editor.getHoveredShapeId()).toBe(null)

		// Move pointer back over shape while still moving - still locked
		editor.pointerMove(200, 200)
		expect(editor.getHoveredShapeId()).toBe(null)

		// Let camera settle
		editor.forceTick(5)
		expect(editor.getCameraState()).toBe('idle')

		// Move pointer again now that camera is idle - hover should update
		// After pan(10,10), screen (200,200) -> page (190,190), still inside shape
		editor.pointerMove(200, 200)
		expect(editor.getHoveredShapeId()).toBe(shape.id)
	})

	it('locks immediately if there is no current hover when camera starts moving', () => {
		// Create a solid shape so we can hit anywhere inside it
		editor.createShapes([{ type: 'geo', x: 100, y: 100, props: { w: 200, h: 200, fill: 'solid' } }])
		const shape = editor.getLastCreatedShape()

		// Pointer is not over any shape
		editor.pointerMove(500, 500)
		expect(editor.getHoveredShapeId()).toBe(null)

		// Start panning
		editor.pan({ x: 10, y: 10 })
		expect(editor.getCameraState()).toBe('moving')

		// Move pointer over shape while moving - should be locked since no previous hover
		editor.pointerMove(200, 200)
		expect(editor.getHoveredShapeId()).toBe(null)

		// Let camera settle
		editor.forceTick(5)
		expect(editor.getCameraState()).toBe('idle')

		// Move pointer again now that camera is idle - hover should work
		// After pan(10,10), screen (200,200) -> page (190,190), still inside shape
		editor.pointerMove(200, 200)
		expect(editor.getHoveredShapeId()).toBe(shape.id)
	})
})

describe('getEfficientZoomLevel', () => {
	it('returns current zoom level when below shape threshold', () => {
		// Default threshold is 500 shapes, we have 0
		expect(editor.getZoomLevel()).toBe(editor.getEfficientZoomLevel())

		// Add a few shapes - still below threshold
		for (let i = 0; i < 10; i++) {
			editor.createShape({ type: 'geo', x: i * 100, y: 0, props: { w: 50, h: 50 } })
		}
		expect(editor.getCurrentPageShapeIds().size).toBe(10)

		// Start zooming
		editor.zoomIn(undefined, { immediate: true })
		expect(editor.getCameraState()).toBe('moving')

		// Should still return current zoom because we're below threshold
		expect(editor.getEfficientZoomLevel()).toBe(editor.getZoomLevel())
	})

	describe('with many shapes above threshold', () => {
		let editorWithManyShapes: TestEditor

		beforeEach(() => {
			// Use a lower threshold for testing
			editorWithManyShapes = new TestEditor({
				options: { debouncedZoomThreshold: 5 },
			})
			editorWithManyShapes.updateViewportScreenBounds(new Box(0, 0, 1600, 900))

			// Add shapes above the threshold
			for (let i = 0; i < 10; i++) {
				editorWithManyShapes.createShape({
					type: 'geo',
					x: i * 100,
					y: 0,
					props: { w: 50, h: 50 },
				})
			}
		})

		it('returns debounced zoom level when above shape threshold and camera is moving', () => {
			// First zoom to capture a debounced value
			editorWithManyShapes.zoomIn(undefined, { immediate: true })
			const capturedZoom = editorWithManyShapes.getEfficientZoomLevel()
			expect(editorWithManyShapes.getCameraState()).toBe('moving')

			// Zoom again while still moving
			editorWithManyShapes.zoomIn(undefined, { immediate: true })
			expect(editorWithManyShapes.getCameraState()).toBe('moving')

			// Should return the captured zoom, not the current zoom
			expect(editorWithManyShapes.getEfficientZoomLevel()).toBe(capturedZoom)
			expect(editorWithManyShapes.getEfficientZoomLevel()).not.toBe(
				editorWithManyShapes.getZoomLevel()
			)
		})

		it('returns current zoom level when above threshold but camera is idle', () => {
			editorWithManyShapes.zoomIn(undefined, { immediate: true })
			editorWithManyShapes.forceTick(5)
			expect(editorWithManyShapes.getCameraState()).toBe('idle')

			// Should return current zoom because camera is idle
			expect(editorWithManyShapes.getEfficientZoomLevel()).toBe(editorWithManyShapes.getZoomLevel())
		})
	})
})

import { Vec, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
}

vi.useFakeTimers()

describe('TLSelectTool.Zooming', () => {
	beforeEach(() => {
		editor = new TestEditor()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
	})

	it('Correctly zooms in when clicking', () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'select' })
		expect(editor.getZoomLevel()).toBe(1)
		expect(editor.getViewportPageBounds()).toMatchObject({ x: -0, y: -0, w: 1080, h: 720 })
		expect(editor.getViewportPageCenter()).toMatchObject({ x: 540, y: 360 })
		editor.click()
		editor.expectToBeIn('zoom.idle')
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(2)
	})

	it('Correctly zooms out when clicking while pressing Alt', () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'select' })
		editor.keyDown('Alt')
		expect(editor.getZoomLevel()).toBe(1)
		expect(editor.getViewportPageBounds()).toMatchObject({ x: -0, y: -0, w: 1080, h: 720 })
		expect(editor.getViewportPageCenter()).toMatchObject({ x: 540, y: 360 })
		editor.click()
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(0.5)
	})

	it('Cancels while pointing', () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'select' })
		editor.expectToBeIn('zoom.idle')
		editor.pointerDown()
		editor.expectToBeIn('zoom.pointing')
		editor.cancel()
		editor.expectToBeIn('zoom.idle')
		editor.pointerUp()
		expect(editor.getZoomLevel()).toBe(1)
	})

	it('Cancels while brushing', () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'select' })
		editor.expectToBeIn('zoom.idle')
		editor.pointerDown(0, 0)
		editor.expectToBeIn('zoom.pointing')
		editor.pointerMove(10, 10)
		vi.advanceTimersByTime(16) // Tick to process drag threshold
		editor.expectToBeIn('zoom.zoom_brushing')
		editor.cancel()
		editor.expectToBeIn('zoom.idle')
		editor.pointerUp()
		expect(editor.getZoomLevel()).toBe(1)
	})

	it('Interrupts while pointing', () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'select' })
		editor.expectToBeIn('zoom.idle')
		editor.pointerDown()
		editor.expectToBeIn('zoom.pointing')
		editor.interrupt()
		editor.expectToBeIn('select.idle')
		editor.pointerUp()
		expect(editor.getZoomLevel()).toBe(1)
	})

	it('Interrupts while brushing', () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'select' })
		editor.expectToBeIn('zoom.idle')
		editor.pointerDown(0, 0)
		editor.expectToBeIn('zoom.pointing')
		editor.pointerMove(10, 10)
		vi.advanceTimersByTime(16) // Tick to process drag threshold
		editor.expectToBeIn('zoom.zoom_brushing')
		editor.interrupt()
		editor.expectToBeIn('select.idle')
		editor.pointerUp()
		expect(editor.getZoomLevel()).toBe(1)
	})

	it('When the dragged area is small it zooms in instead of zooming to the area', () => {
		const originalCenter = { x: 540, y: 360 }
		const originalPageBounds = { x: -0, y: -0, w: 1080, h: 720 }
		const change = 6
		expect(editor.getZoomLevel()).toBe(1)
		expect(editor.getViewportPageBounds()).toMatchObject(originalPageBounds)
		expect(editor.getViewportPageCenter()).toMatchObject(originalCenter)
		editor.setCurrentTool('zoom', { onInteractionEnd: 'select' })
		editor.expectToBeIn('zoom.idle')
		editor.pointerDown(0, 0)
		editor.expectToBeIn('zoom.pointing')
		editor.pointerMove(change, change)
		vi.advanceTimersByTime(16) // Tick to process drag threshold
		editor.expectToBeIn('zoom.zoom_brushing')
		editor.pointerUp(change, change)
		editor.expectToBeIn('zoom.idle')
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(2)
		expect(editor.getViewportPageBounds()).toMatchObject({
			x: change / 2,
			y: change / 2,
			w: originalPageBounds.w / 2,
			h: originalPageBounds.h / 2,
		})
		expect(editor.getViewportPageCenter()).toMatchObject({
			x: (originalCenter.x + change) / 2,
			y: (originalCenter.y + change) / 2,
		})
	})

	it('Correctly zooms in when dragging a zoom area', () => {
		const newBoundsWidth = 540
		const newBoundsHeight = 360
		const newBoundsX = 100
		const newBoundsY = 200
		editor.expectToBeIn('select.idle')
		expect(editor.getZoomLevel()).toBe(1)
		expect(editor.getViewportPageBounds()).toMatchObject({ x: -0, y: -0, w: 1080, h: 720 })
		expect(editor.getViewportPageCenter()).toMatchObject({ x: 540, y: 360 })
		editor.setCurrentTool('zoom', { onInteractionEnd: 'select' })
		editor.expectToBeIn('zoom.idle')
		editor.pointerDown(newBoundsX, newBoundsY)
		editor.pointerMove(newBoundsX + newBoundsWidth, newBoundsY + newBoundsHeight)
		vi.advanceTimersByTime(16) // Tick to process drag threshold
		expect(editor.getInstanceState().zoomBrush).toMatchObject({
			x: newBoundsX,
			y: newBoundsY,
			w: newBoundsWidth,
			h: newBoundsHeight,
		})
		editor.pointerUp(newBoundsX + newBoundsWidth, newBoundsY + newBoundsHeight)
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBeCloseTo(1.64)
		expect(editor.getViewportPageBounds()).toMatchInlineSnapshot(`
		Box {
		  "h": 437.83783783783787,
		  "w": 656.7567567567568,
		  "x": 41.62162162162162,
		  "y": 161.0810810810811,
		}
	`)
		expect(editor.getViewportPageCenter()).toMatchObject({
			x: newBoundsX + newBoundsWidth / 2,
			y: newBoundsY + newBoundsHeight / 2,
		})
		editor.expectToBeIn('zoom.idle')
	})

	it('Correctly zooms out when dragging a zoom area and holding Alt key', () => {
		const newBoundsWidth = 1080
		const newBoundsHeight = 720
		const newBoundsX = 100
		const newBoundsY = 200
		editor.expectToBeIn('select.idle')
		const originalZoomLevel = 1
		expect(editor.getZoomLevel()).toBe(originalZoomLevel)
		expect(editor.getViewportPageBounds()).toMatchObject({ x: -0, y: -0, w: 1080, h: 720 })
		expect(editor.getViewportPageCenter()).toMatchObject({ x: 540, y: 360 })
		editor.setCurrentTool('zoom', { onInteractionEnd: 'select' })
		editor.expectToBeIn('zoom.idle')
		editor.keyDown('Alt')
		editor.pointerDown(newBoundsX, newBoundsY)
		editor.pointerMove(newBoundsX + newBoundsWidth, newBoundsY + newBoundsHeight)
		vi.advanceTimersByTime(16) // Tick to process drag threshold
		expect(editor.getInstanceState().zoomBrush).toMatchObject({
			x: newBoundsX,
			y: newBoundsY,
			w: newBoundsWidth,
			h: newBoundsHeight,
		})
		editor.pointerUp()
		vi.advanceTimersByTime(500)
		expect(editor.getZoomLevel()).toBeCloseTo(originalZoomLevel / 2)
		expect(editor.getViewportPageBounds()).toMatchObject({
			x: -440,
			y: -160,
			w: 2160,
			h: 1440,
		})
		expect(editor.getViewportPageCenter()).toMatchObject({
			x: newBoundsX + newBoundsWidth / 2,
			y: newBoundsY + newBoundsHeight / 2,
		})
		editor.expectToBeIn('zoom.idle')
	})
})

describe('ZoomQuick', () => {
	beforeEach(() => {
		editor = new TestEditor()
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
	})

	describe('entering quick zoom', () => {
		it('zooms out on enter', () => {
			expect(editor.getZoomLevel()).toBe(1)
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
			expect(editor.getZoomLevel()).toBeCloseTo(0.85)
		})

		it('preserves cursor position when zooming out', () => {
			// Position cursor at a specific point
			editor.pointerMove(200, 150)
			const cursorPagePoint = editor.inputs.getCurrentPagePoint()

			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })

			// The page point under the cursor should be the same after zooming
			const newCursorPagePoint = editor.inputs.getCurrentPagePoint()
			expect(newCursorPagePoint.x).toBeCloseTo(cursorPagePoint.x)
			expect(newCursorPagePoint.y).toBeCloseTo(cursorPagePoint.y)
		})

		it('sets zoom-in cursor', () => {
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
			expect(editor.getInstanceState().cursor.type).toBe('zoom-in')
		})

		it('shows the zoom brush immediately', () => {
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
			expect(editor.getInstanceState().zoomBrush).not.toBeNull()
		})
	})

	describe('idle state (before drag threshold)', () => {
		it('starts in idle state', () => {
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
			const zoomQuick = editor.getPath().includes('zoom_quick')
			expect(zoomQuick).toBe(true)
		})

		it('stays in idle state on small pointer movements', () => {
			editor.pointerMove(100, 100)
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })

			// Move less than drag threshold
			editor.pointerMove(101, 101)
			vi.advanceTimersByTime(16) // One tick

			// Should still be in idle internal state - brush updates but state doesn't change
			// If we exit now, we should return to original viewport
			const initialViewport = { x: 0, y: 0, w: 1080, h: 720 }
			editor.pointerUp()
			vi.advanceTimersByTime(300)

			// Returns to original viewport because we were in idle state
			expect(editor.getViewportPageBounds().w).toBeCloseTo(initialViewport.w)
			expect(editor.getViewportPageBounds().h).toBeCloseTo(initialViewport.h)
		})

		it('returns to original viewport when exiting from idle state', () => {
			editor.zoomIn()
			editor.zoomIn()
			expect(editor.getZoomLevel()).toBe(4)
			const initialViewport = editor.getViewportPageBounds().clone()

			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
			expect(editor.getZoomLevel()).toBeLessThan(4)

			// Exit without moving (stay in idle state)
			editor.pointerUp()
			vi.advanceTimersByTime(300)

			// Should return to original viewport
			expect(editor.getZoomLevel()).toBe(4)
			expect(editor.getViewportPageBounds().x).toBeCloseTo(initialViewport.x)
			expect(editor.getViewportPageBounds().y).toBeCloseTo(initialViewport.y)
		})
	})

	describe('moving state (after drag threshold)', () => {
		it('transitions to moving state after exceeding drag threshold', () => {
			editor.pointerMove(100, 100)
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })

			// Move beyond drag threshold (default is 16 pixels squared, so ~4px)
			editor.pointerMove(110, 110)
			vi.advanceTimersByTime(16)

			// Should now be in moving state - brush should update on pointer move
			const brushBefore = editor.getInstanceState().zoomBrush
			editor.pointerMove(200, 200)
			const brushAfter = editor.getInstanceState().zoomBrush

			expect(brushAfter).not.toEqual(brushBefore)
		})

		it('updates brush position when moving', () => {
			editor.pointerMove(100, 100)
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })

			// Move beyond threshold to enter moving state
			editor.pointerMove(150, 150)
			vi.advanceTimersByTime(16)

			const brush1 = editor.getInstanceState().zoomBrush
			editor.pointerMove(300, 300)
			const brush2 = editor.getInstanceState().zoomBrush

			expect(brush2!.x).not.toBe(brush1!.x)
			expect(brush2!.y).not.toBe(brush1!.y)
		})

		it('zooms to new viewport when exiting from moving state', () => {
			editor.zoomIn()
			editor.zoomIn()
			expect(editor.getZoomLevel()).toBe(4)
			const initialViewport = editor.getViewportPageBounds().clone()

			editor.pointerMove(540, 360) // Center of screen
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })

			// Move beyond threshold to enter moving state
			editor.pointerMove(100, 100)
			vi.advanceTimersByTime(16)

			// Exit
			editor.pointerUp()
			vi.advanceTimersByTime(300)

			// Should zoom to new location, not original
			expect(editor.getZoomLevel()).toBe(4)
			expect(editor.getViewportPageBounds().x).not.toBeCloseTo(initialViewport.x)
			expect(editor.getViewportPageBounds().y).not.toBeCloseTo(initialViewport.y)
		})

		it('calls edge scroll manager in moving state', () => {
			// Edge scrolling is enabled in moving state via edgeScrollManager.updateEdgeScrolling
			// This is called in onTick when in moving state
			editor.pointerMove(100, 100)
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })

			// Move beyond threshold to enter moving state
			editor.pointerMove(150, 150)
			vi.advanceTimersByTime(16)

			// Verify we're in moving state by checking brush updates on move
			const brush1 = editor.getInstanceState().zoomBrush
			editor.pointerMove(200, 200)
			const brush2 = editor.getInstanceState().zoomBrush

			expect(brush2!.x).not.toBe(brush1!.x)
		})
	})

	describe('exiting quick zoom', () => {
		it('exits to original tool on pointer up', () => {
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
			editor.pointerUp()
			editor.expectToBeIn('select.idle')
		})

		it('exits to draw tool when that was the original tool', () => {
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'draw.idle' })
			editor.pointerUp()
			editor.expectToBeIn('draw.idle')
		})

		it('returns to parent idle state on Shift key up', () => {
			editor.setCurrentTool('zoom', { onInteractionEnd: 'select' })
			editor.keyDown('Shift')
			editor.expectToBeIn('zoom.zoom_quick')

			editor.keyUp('Shift')
			vi.advanceTimersByTime(300)
			editor.expectToBeIn('zoom.idle')
		})

		it('clears zoom brush on exit', () => {
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
			expect(editor.getInstanceState().zoomBrush).not.toBeNull()

			editor.pointerUp()
			expect(editor.getInstanceState().zoomBrush).toBeNull()
		})
	})

	describe('cancel behavior', () => {
		it('resets to idle state on cancel', () => {
			editor.pointerMove(100, 100)
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })

			// Enter moving state
			editor.pointerMove(200, 200)
			vi.advanceTimersByTime(16)

			// Cancel should reset to idle state internally
			editor.cancel()
			editor.expectToBeIn('select.idle')
		})

		it('returns to original viewport on cancel', () => {
			editor.zoomIn()
			expect(editor.getZoomLevel()).toBe(2)
			const initialViewport = editor.getViewportPageBounds().clone()

			editor.pointerMove(100, 100)
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })

			// Enter moving state
			editor.pointerMove(500, 500)
			vi.advanceTimersByTime(16)

			editor.cancel()
			vi.advanceTimersByTime(300)

			// Should return to original viewport since cancel resets to idle
			expect(editor.getZoomLevel()).toBe(2)
			expect(editor.getViewportPageBounds().x).toBeCloseTo(initialViewport.x)
			expect(editor.getViewportPageBounds().y).toBeCloseTo(initialViewport.y)
		})

		it('exits to original tool on cancel', () => {
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'draw.idle' })
			editor.cancel()
			editor.expectToBeIn('draw.idle')
		})
	})

	describe('brush sizing', () => {
		it('brush maintains original viewport dimensions', () => {
			editor.zoomIn()
			const originalViewport = editor.getViewportPageBounds().clone()

			editor.pointerMove(100, 100)
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })

			const brush = editor.getInstanceState().zoomBrush!
			expect(brush.w).toBeCloseTo(originalViewport.w)
			expect(brush.h).toBeCloseTo(originalViewport.h)
		})

		it('brush position follows cursor proportionally', () => {
			editor.pointerMove(540, 360) // Center of 1080x720 viewport
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })

			// Enter moving state
			editor.pointerMove(600, 400)
			vi.advanceTimersByTime(16)

			const brush = editor.getInstanceState().zoomBrush!
			const cursorPage = editor.inputs.getCurrentPagePoint()

			// Cursor should be roughly in the center of the brush
			// (since we started at center and the brush matches viewport proportions)
			const brushCenterX = brush.x + brush.w / 2
			const brushCenterY = brush.y + brush.h / 2

			// The cursor position within the brush should match its position within the viewport
			expect(Math.abs(cursorPage.x - brushCenterX)).toBeLessThan(brush.w)
			expect(Math.abs(cursorPage.y - brushCenterY)).toBeLessThan(brush.h)
		})
	})

	describe('quickZoomPreservesScreenBounds option', () => {
		it('when true, brush resizes to preserve screen bounds on zoom change', () => {
			editor.pointerMove(540, 360)
			editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })

			const brushBefore = editor.getInstanceState().zoomBrush!
			const wBefore = brushBefore.w
			const hBefore = brushBefore.h

			// Zoom in on the overview (doubles the camera zoom)
			const cam = editor.getCamera()
			editor.setCamera(new Vec(cam.x, cam.y, cam.z * 2))

			const brushAfter = editor.getInstanceState().zoomBrush!
			// Brush page dimensions should halve to keep the same screen size
			expect(brushAfter.w).toBeCloseTo(wBefore / 2)
			expect(brushAfter.h).toBeCloseTo(hBefore / 2)
		})

		it('when false, brush keeps fixed page dimensions on zoom change', () => {
			const noPreserve = new TestEditor({
				options: { quickZoomPreservesScreenBounds: false },
			})
			noPreserve.pointerMove(540, 360)
			noPreserve.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })

			const brushBefore = noPreserve.getInstanceState().zoomBrush!
			const wBefore = brushBefore.w
			const hBefore = brushBefore.h

			// Zoom in on the overview
			const cam = noPreserve.getCamera()
			noPreserve.setCamera(new Vec(cam.x, cam.y, cam.z * 2))

			const brushAfter = noPreserve.getInstanceState().zoomBrush!
			// Brush page dimensions should stay the same
			expect(brushAfter.w).toBeCloseTo(wBefore)
			expect(brushAfter.h).toBeCloseTo(hBefore)
		})
	})

	describe('keyboard entry from zoom.idle', () => {
		it('enters quick zoom when pressing Shift from zoom.idle', () => {
			editor.setCurrentTool('zoom', { onInteractionEnd: 'select' })
			editor.expectToBeIn('zoom.idle')

			editor.keyDown('Shift')
			editor.expectToBeIn('zoom.zoom_quick')
			expect(editor.getZoomLevel()).toBeCloseTo(0.85)
		})

		it('returns to zoom.idle when releasing Shift', () => {
			editor.setCurrentTool('zoom', { onInteractionEnd: 'select' })
			editor.keyDown('Shift')
			editor.expectToBeIn('zoom.zoom_quick')

			editor.keyUp('Shift')
			vi.advanceTimersByTime(300)
			editor.expectToBeIn('zoom.idle')
		})
	})
})

describe('ZoomTool edge cases', () => {
	beforeEach(() => {
		editor = new TestEditor()
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
	})

	it('Exits zoom tool when releasing Z while holding Shift (uppercase Z)', () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'select.idle' })
		editor.expectToBeIn('zoom.idle')

		// Simulate releasing 'z' key while Shift is held, which produces 'Z'
		editor.keyUp('Z')
		editor.expectToBeIn('select.idle')
	})

	it('Exits zoom tool when releasing lowercase z', () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'select.idle' })
		editor.expectToBeIn('zoom.idle')

		editor.keyUp('z')
		editor.expectToBeIn('select.idle')
	})

	it('Returns to draw tool after zoom operation completes', () => {
		editor.setCurrentTool('draw')
		editor.expectToBeIn('draw.idle')

		editor.setCurrentTool('zoom', { onInteractionEnd: 'draw.idle' })
		editor.expectToBeIn('zoom.idle')

		// Complete the zoom operation by releasing z
		editor.keyUp('z')
		editor.expectToBeIn('draw.idle')
	})
})

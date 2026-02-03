import { createShapeId } from '@tldraw/editor'
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

describe('TLSelectTool.ZoomQuick', () => {
	beforeEach(() => {
		editor = new TestEditor()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.createShapes([
				{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
				{ id: ids.box2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } },
				{ id: ids.box3, type: 'geo', x: 1000, y: 1000, props: { w: 100, h: 100 } },
			])
	})

	it('Correctly handles zoom out and zoom back in', () => {
		editor.zoomIn()
		editor.zoomIn()
		expect(editor.getZoomLevel()).toBe(4)

		// Zoomed out to 5%, eagle eyes.
		editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(0.05)

		// Go back to original zoom level (centered on brush which is at cursor position)
		editor.keyUp('shift')
		editor.keyUp('z')
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(4)
		editor.expectToBeIn('select.idle')
	})

	it('Correctly handles manual quick zoom via a pointer move', () => {
		editor.zoomIn()
		editor.zoomIn()
		expect(editor.getZoomLevel()).toBe(4)
		expect(editor.getViewportPageBounds()).toMatchObject({ x: 405, y: 270, w: 270, h: 180 })

		// Zoomed out to 5%, eagle eyes.
		editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(0.05)

		// Move mouse somewhere and let go of keyboard shortcut.
		editor.pointerMove(100, 100)
		editor.keyUp('shift')
		editor.keyUp('z')
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(4)
		expect(editor.getViewportPageBounds().w).toBe(270)
		expect(editor.getViewportPageBounds().h).toBe(180)
		editor.expectToBeIn('select.idle')
	})

	it('Zooms to 5% regardless of content bounds', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.createShapes([
				{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
				{ id: ids.box2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } },
				{ id: ids.box3, type: 'geo', x: 10000, y: 10000, props: { w: 100, h: 100 } },
			])

		editor.zoomOut()
		editor.zoomOut()
		editor.zoomOut()
		expect(editor.getZoomLevel()).toBe(0.1)

		// Zoomed out to 5%, eagle eyes - always zooms to 5% regardless of content
		editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(0.05)

		// Release - zooms to brush bounds
		editor.keyUp('shift')
		editor.keyUp('z')
		vi.advanceTimersByTime(300)
		// Zoom level depends on brush size which is clamped
		expect(editor.getZoomLevel()).toBeGreaterThan(0.05)
		editor.expectToBeIn('select.idle')
	})

	it('Correctly handles manual zoom via manual click', () => {
		editor.zoomIn()
		editor.zoomIn()
		expect(editor.getZoomLevel()).toBe(4)
		expect(editor.getViewportPageBounds()).toMatchObject({ x: 405, y: 270, w: 270, h: 180 })

		// Zoomed out to 5%, eagle eyes.
		editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(0.05)

		// Click to zoom in back to original zoom level.
		editor.pointerUp(100, 100)
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(4)
		expect(editor.getViewportPageBounds().w).toBe(270)
		expect(editor.getViewportPageBounds().h).toBe(180)

		// Complete operation.
		editor.expectToBeIn('zoom.zoom_quick')
		editor.keyUp('shift')
		editor.keyUp('z')
		editor.expectToBeIn('select.idle')
	})

	it('Handles quick zoom cancel', () => {
		editor.zoomIn()
		expect(editor.getZoomLevel()).toBe(2)
		expect(editor.getViewportPageBounds()).toMatchObject({ x: 270, y: 180, w: 540, h: 360 })
		editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
		editor.pointerDown(100, 100)
		editor.cancel()
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(2)
		expect(editor.getViewportPageBounds()).toMatchObject({ x: 270, y: 180, w: 540, h: 360 })
		editor.expectToBeIn('select.idle')
	})

	it('Handles several quick zooms in succession consistently', () => {
		editor.zoomIn()
		expect(editor.getZoomLevel()).toBe(2)
		editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
		vi.advanceTimersByTime(300)
		editor.keyUp('shift')
		editor.keyUp('z')
		vi.advanceTimersByTime(150)
		editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'select' })
		vi.advanceTimersByTime(300)
		editor.keyUp('shift')
		editor.keyUp('z')
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(2)
		editor.expectToBeIn('select.idle')
	})

	it('Returns to original tool on cancel, not hardcoded select', () => {
		editor.setCurrentTool('draw')
		editor.expectToBeIn('draw.idle')

		editor.setCurrentTool('zoom.zoom_quick', { onInteractionEnd: 'draw.idle' })
		vi.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(0.05)

		editor.cancel()
		vi.advanceTimersByTime(300)
		editor.expectToBeIn('draw.idle')
	})

	it('Enters quick zoom via keyboard flow from zoom.idle', () => {
		editor.setCurrentTool('zoom', { onInteractionEnd: 'select.idle' })
		editor.expectToBeIn('zoom.idle')

		// Press Shift to enter quick zoom
		editor.keyDown('Shift')
		editor.expectToBeIn('zoom.zoom_quick')
		expect(editor.getZoomLevel()).toBe(0.05)

		// Release Shift to return to zoom.idle
		editor.keyUp('Shift')
		vi.advanceTimersByTime(300)
		editor.expectToBeIn('zoom.idle')
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

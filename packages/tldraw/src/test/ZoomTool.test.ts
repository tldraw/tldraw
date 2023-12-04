import { createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
}

jest.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
	editor
		.selectAll()
		.deleteShapes(editor.getSelectedShapeIds())
		.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
})

describe('TLSelectTool.Zooming', () => {
	it('Correctly enters and exists zooming mode when pressing and relasing z', () => {
		editor.expectToBeIn('select.idle')
		editor.keyDown('z')
		editor.expectToBeIn('zoom.idle')
		editor.keyUp('z')
		editor.expectToBeIn('select.idle')
	})

	it('Correctly enters and exists zooming mode when holding alt and pressing and relasing z', () => {
		editor.expectToBeIn('select.idle')
		editor.keyDown('Alt')
		editor.keyDown('z')
		editor.expectToBeIn('zoom.idle')
		editor.keyUp('z')
		editor.expectToBeIn('select.idle')
		editor.keyUp('Alt')
		editor.expectToBeIn('select.idle')
	})

	it('Correctly zooms in when clicking', () => {
		editor.keyDown('z')
		expect(editor.getZoomLevel()).toBe(1)
		expect(editor.getViewportPageBounds()).toMatchObject({ x: -0, y: -0, w: 1080, h: 720 })
		expect(editor.getViewportPageCenter()).toMatchObject({ x: 540, y: 360 })
		editor.click()
		editor.expectToBeIn('zoom.idle')
		jest.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(2)
	})

	it('Correctly zooms out when clicking while pressing Alt', () => {
		editor.keyDown('z')
		editor.keyDown('Alt')
		expect(editor.getZoomLevel()).toBe(1)
		expect(editor.getViewportPageBounds()).toMatchObject({ x: -0, y: -0, w: 1080, h: 720 })
		expect(editor.getViewportPageCenter()).toMatchObject({ x: 540, y: 360 })
		editor.click()
		jest.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBe(0.5)
	})

	it('Cancels while pointing', () => {
		editor.keyDown('z')
		editor.expectToBeIn('zoom.idle')
		editor.pointerDown()
		editor.expectToBeIn('zoom.pointing')
		editor.cancel()
		editor.expectToBeIn('zoom.idle')
		editor.pointerUp()
		expect(editor.getZoomLevel()).toBe(1)
	})

	it('Cancels while brushing', () => {
		editor.keyDown('z')
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
		editor.keyDown('z')
		editor.expectToBeIn('zoom.idle')
		editor.pointerDown()
		editor.expectToBeIn('zoom.pointing')
		editor.interrupt()
		editor.expectToBeIn('select.idle')
		editor.pointerUp()
		expect(editor.getZoomLevel()).toBe(1)
	})

	it('Interrupts while brushing', () => {
		editor.keyDown('z')
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
		editor.keyDown('z')
		editor.expectToBeIn('zoom.idle')
		editor.pointerDown(0, 0)
		editor.expectToBeIn('zoom.pointing')
		editor.pointerMove(change, change)
		editor.expectToBeIn('zoom.zoom_brushing')
		editor.pointerUp(change, change)
		editor.expectToBeIn('zoom.idle')
		jest.advanceTimersByTime(300)
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
		editor.keyDown('z')
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
		jest.advanceTimersByTime(300)
		expect(editor.getZoomLevel()).toBeCloseTo(1.2888)
		expect(editor.getViewportPageBounds()).toMatchObject({
			x: -48.9655172413793,
			y: 100.68965517241382,
			w: 837.9310344827586,
			h: 558.6206896551723,
		})
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
		editor.keyDown('z')
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
		jest.advanceTimersByTime(500)
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

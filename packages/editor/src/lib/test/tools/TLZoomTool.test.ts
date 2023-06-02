import { createCustomShapeId } from '@tldraw/tlschema'
import { TestApp } from '../TestEditor'

let app: TestApp

const ids = {
	box1: createCustomShapeId('box1'),
}

jest.useFakeTimers()

beforeEach(() => {
	app = new TestApp()
	app
		.selectAll()
		.deleteShapes()
		.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
})

describe('TLSelectTool.Zooming', () => {
	it('Correctly enters and exists zooming mode when pressing and relasing z', () => {
		app.expectToBeIn('select.idle')
		app.keyDown('z')
		app.expectToBeIn('zoom.idle')
		app.keyUp('z')
		app.expectToBeIn('select.idle')
	})

	it('Correctly enters and exists zooming mode when holding alt and pressing and relasing z', () => {
		app.expectToBeIn('select.idle')
		app.keyDown('Alt')
		app.keyDown('z')
		app.expectToBeIn('zoom.idle')
		app.keyUp('z')
		app.expectToBeIn('select.idle')
		app.keyUp('Alt')
		app.expectToBeIn('select.idle')
	})

	it('Correctly zooms in when clicking', () => {
		app.keyDown('z')
		expect(app.zoomLevel).toBe(1)
		expect(app.viewportPageBounds).toMatchObject({ x: 0, y: 0, w: 1080, h: 720 })
		expect(app.viewportPageCenter).toMatchObject({ x: 540, y: 360 })
		app.click()
		app.expectToBeIn('zoom.idle')
		jest.advanceTimersByTime(300)
		expect(app.zoomLevel).toBe(2)
	})

	it('Correctly zooms out when clicking while pressing Alt', () => {
		app.keyDown('z')
		app.keyDown('Alt')
		expect(app.zoomLevel).toBe(1)
		expect(app.viewportPageBounds).toMatchObject({ x: 0, y: 0, w: 1080, h: 720 })
		expect(app.viewportPageCenter).toMatchObject({ x: 540, y: 360 })
		app.click()
		jest.advanceTimersByTime(300)
		expect(app.zoomLevel).toBe(0.5)
	})

	it('Cancels while pointing', () => {
		app.keyDown('z')
		app.expectToBeIn('zoom.idle')
		app.pointerDown()
		app.expectToBeIn('zoom.pointing')
		app.cancel()
		app.expectToBeIn('zoom.idle')
		app.pointerUp()
		expect(app.zoomLevel).toBe(1)
	})

	it('Cancels while brushing', () => {
		app.keyDown('z')
		app.expectToBeIn('zoom.idle')
		app.pointerDown(0, 0)
		app.expectToBeIn('zoom.pointing')
		app.pointerMove(10, 10)
		app.expectToBeIn('zoom.zoom_brushing')
		app.cancel()
		app.expectToBeIn('zoom.idle')
		app.pointerUp()
		expect(app.zoomLevel).toBe(1)
	})

	it('Interrupts while pointing', () => {
		app.keyDown('z')
		app.expectToBeIn('zoom.idle')
		app.pointerDown()
		app.expectToBeIn('zoom.pointing')
		app.interrupt()
		app.expectToBeIn('select.idle')
		app.pointerUp()
		expect(app.zoomLevel).toBe(1)
	})

	it('Interrupts while brushing', () => {
		app.keyDown('z')
		app.expectToBeIn('zoom.idle')
		app.pointerDown(0, 0)
		app.expectToBeIn('zoom.pointing')
		app.pointerMove(10, 10)
		app.expectToBeIn('zoom.zoom_brushing')
		app.interrupt()
		app.expectToBeIn('select.idle')
		app.pointerUp()
		expect(app.zoomLevel).toBe(1)
	})

	it('When the dragged area is small it zooms in instead of zooming to the area', () => {
		const originalCenter = { x: 540, y: 360 }
		const originalPageBounds = { x: 0, y: 0, w: 1080, h: 720 }
		const change = 6
		expect(app.zoomLevel).toBe(1)
		expect(app.viewportPageBounds).toMatchObject(originalPageBounds)
		expect(app.viewportPageCenter).toMatchObject(originalCenter)
		app.keyDown('z')
		app.expectToBeIn('zoom.idle')
		app.pointerDown(0, 0)
		app.expectToBeIn('zoom.pointing')
		app.pointerMove(change, change)
		app.expectToBeIn('zoom.zoom_brushing')
		app.pointerUp(change, change)
		app.expectToBeIn('zoom.idle')
		jest.advanceTimersByTime(300)
		expect(app.zoomLevel).toBe(2)
		expect(app.viewportPageBounds).toMatchObject({
			x: change / 2,
			y: change / 2,
			w: originalPageBounds.w / 2,
			h: originalPageBounds.h / 2,
		})
		expect(app.viewportPageCenter).toMatchObject({
			x: (originalCenter.x + change) / 2,
			y: (originalCenter.y + change) / 2,
		})
	})

	it('Correctly zooms in when dragging a zoom area', () => {
		const newBoundsWidth = 540
		const newBoundsHeight = 360
		const newBoundsX = 100
		const newBoundsY = 200
		app.expectToBeIn('select.idle')
		expect(app.zoomLevel).toBe(1)
		expect(app.viewportPageBounds).toMatchObject({ x: 0, y: 0, w: 1080, h: 720 })
		expect(app.viewportPageCenter).toMatchObject({ x: 540, y: 360 })
		app.keyDown('z')
		app.expectToBeIn('zoom.idle')
		app.pointerDown(newBoundsX, newBoundsY)
		app.pointerMove(newBoundsX + newBoundsWidth, newBoundsY + newBoundsHeight)
		expect(app.zoomBrush).toMatchObject({
			x: newBoundsX,
			y: newBoundsY,
			w: newBoundsWidth,
			h: newBoundsHeight,
		})
		app.pointerUp(newBoundsX + newBoundsWidth, newBoundsY + newBoundsHeight)
		jest.advanceTimersByTime(300)
		expect(app.zoomLevel).toBeCloseTo(1.2888)
		expect(app.viewportPageBounds).toMatchObject({
			x: -48.9655172413793,
			y: 100.68965517241382,
			w: 837.9310344827586,
			h: 558.6206896551723,
		})
		expect(app.viewportPageCenter).toMatchObject({
			x: newBoundsX + newBoundsWidth / 2,
			y: newBoundsY + newBoundsHeight / 2,
		})
		app.expectToBeIn('zoom.idle')
	})

	it('Correctly zooms out when dragging a zoom area and holding Alt key', () => {
		const newBoundsWidth = 1080
		const newBoundsHeight = 720
		const newBoundsX = 100
		const newBoundsY = 200
		app.expectToBeIn('select.idle')
		const originalZoomLevel = 1
		expect(app.zoomLevel).toBe(originalZoomLevel)
		expect(app.viewportPageBounds).toMatchObject({ x: 0, y: 0, w: 1080, h: 720 })
		expect(app.viewportPageCenter).toMatchObject({ x: 540, y: 360 })
		app.keyDown('z')
		app.expectToBeIn('zoom.idle')
		app.keyDown('Alt')
		app.pointerDown(newBoundsX, newBoundsY)
		app.pointerMove(newBoundsX + newBoundsWidth, newBoundsY + newBoundsHeight)
		expect(app.zoomBrush).toMatchObject({
			x: newBoundsX,
			y: newBoundsY,
			w: newBoundsWidth,
			h: newBoundsHeight,
		})
		app.pointerUp()
		jest.advanceTimersByTime(500)
		expect(app.zoomLevel).toBeCloseTo(originalZoomLevel / 2)
		expect(app.viewportPageBounds).toMatchObject({
			x: -440,
			y: -160,
			w: 2160,
			h: 1440,
		})
		expect(app.viewportPageCenter).toMatchObject({
			x: newBoundsX + newBoundsWidth / 2,
			y: newBoundsY + newBoundsHeight / 2,
		})
		app.expectToBeIn('zoom.idle')
	})
})

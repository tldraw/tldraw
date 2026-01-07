import { Box } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('When zooming to bounds', () => {
	it('centers the camera on the new bounds', () => {
		expect(editor.getViewportPageCenter()).toMatchObject({ x: 540, y: 360 })

		editor.setScreenBounds({ x: 0, y: 0, w: 1000, h: 1000 })

		expect(editor.getViewportPageCenter()).toMatchObject({ x: 500, y: 500 })

		editor.setCamera({ x: 0, y: 0, z: 1 })

		expect(editor.getViewportPageBounds()).toCloselyMatchObject({
			x: -0,
			y: -0,
			w: 1000,
			h: 1000,
		})

		const padding = editor.options.zoomToFitPadding

		editor.zoomToBounds(new Box(200, 300, 300, 300))
		expect(editor.getCamera().z).toCloselyMatchObject((1000 - padding) / 300)
		expect(editor.getViewportPageBounds().width).toCloselyMatchObject(
			1000 / ((1000 - padding) / 300)
		)
		expect(editor.getViewportPageBounds().height).toCloselyMatchObject(
			1000 / ((1000 - padding) / 300)
		)
	})
})

it('does not zoom past max', () => {
	editor.zoomToBounds(new Box(0, 0, 1, 1))
	expect(editor.getZoomLevel()).toBe(8)
})

it('does not zoom past min', () => {
	editor.zoomToBounds(new Box(0, 0, 1000000, 100000))
	expect(editor.getZoomLevel()).toBe(0.05)
})

it('does not zoom to bounds when camera is frozen', () => {
	editor.setScreenBounds({ x: 0, y: 0, w: 1000, h: 1000 })
	expect(editor.getViewportPageCenter().toJson()).toCloselyMatchObject({ x: 500, y: 500 })
	editor.setCameraOptions({ isLocked: true })
	editor.zoomToBounds(new Box(200, 300, 300, 300))
	expect(editor.getViewportPageCenter().toJson()).toCloselyMatchObject({ x: 500, y: 500 })
})

it('is ignored by undo/redo', () => {
	editor.markHistoryStoppingPoint()
	editor.zoomToBounds(new Box(200, 300, 300, 300))
	editor.undo()
	expect(editor.getViewportPageCenter().toJson()).toCloselyMatchObject({ x: 350, y: 450 })
})

it('respects custom zoomToFitPadding option', () => {
	const customPadding = 64
	editor = new TestEditor({ options: { zoomToFitPadding: customPadding } })
	editor.setScreenBounds({ x: 0, y: 0, w: 1000, h: 1000 })
	editor.setCamera({ x: 0, y: 0, z: 1 })

	editor.zoomToBounds(new Box(200, 300, 300, 300))
	expect(editor.getCamera().z).toCloselyMatchObject((1000 - customPadding) / 300)
})

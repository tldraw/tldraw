import { Box2d } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('When zooming to bounds', () => {
	it('centers the camera on the new bounds', () => {
		expect(editor.viewportPageCenter).toMatchObject({ x: 540, y: 360 })

		editor.setScreenBounds({ x: 0, y: 0, w: 1000, h: 1000 })

		expect(editor.viewportPageCenter).toMatchObject({ x: 500, y: 500 })

		editor.setCamera({ x: 0, y: 0, z: 1 })

		expect(editor.viewportPageBounds).toCloselyMatchObject({
			x: -0,
			y: -0,
			w: 1000,
			h: 1000,
		})

		editor.zoomToBounds(new Box2d(200, 300, 300, 300))
		expect(editor.camera.z).toCloselyMatchObject((1000 - 256) / 300)
		expect(editor.viewportPageBounds.width).toCloselyMatchObject(1000 / ((1000 - 256) / 300))
		expect(editor.viewportPageBounds.height).toCloselyMatchObject(1000 / ((1000 - 256) / 300))
	})
})

it('does not zoom past max', () => {
	editor.zoomToBounds(new Box2d(0, 0, 1, 1))
	expect(editor.zoomLevel).toBe(8)
})

it('does not zoom past min', () => {
	editor.zoomToBounds(new Box2d(0, 0, 1000000, 100000))
	expect(editor.zoomLevel).toBe(0.1)
})

it('does not zoom to bounds when camera is frozen', () => {
	editor.setScreenBounds({ x: 0, y: 0, w: 1000, h: 1000 })
	expect(editor.viewportPageCenter.toJson()).toCloselyMatchObject({ x: 500, y: 500 })
	editor.updateInstanceState({ canMoveCamera: false })
	editor.zoomToBounds(new Box2d(200, 300, 300, 300))
	expect(editor.viewportPageCenter.toJson()).toCloselyMatchObject({ x: 500, y: 500 })
})

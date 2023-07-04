import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('When zooming to bounds', () => {
	it('centers the camera on the new bounds', () => {
		expect(editor.viewportPageCenter).toMatchObject({ x: 540, y: 360 })

		editor.setScreenBounds({ x: 0, y: 0, w: 1000, h: 1000 })
		editor.setCamera(0, 0, 1)
		editor.zoomToBounds(200, 300, 300, 300)
		expect(editor.viewportPageCenter.toJson()).toCloselyMatchObject({ x: 350, y: 450 })
	})
})

it('does not zoom past max', () => {
	editor.zoomToBounds(0, 0, 1, 1)
	expect(editor.zoomLevel).toBe(8)
})

it('does not zoom past min', () => {
	editor.zoomToBounds(0, 0, 1000000, 100000)
	expect(editor.zoomLevel).toBe(0.1)
})

it('does not zoom to bounds when camera is frozen', () => {
	editor.setScreenBounds({ x: 0, y: 0, w: 1000, h: 1000 })
	expect(editor.viewportPageCenter.toJson()).toCloselyMatchObject({ x: 500, y: 500 })
	editor.canMoveCamera = false
	editor.zoomToBounds(200, 300, 300, 300)
	expect(editor.viewportPageCenter.toJson()).toCloselyMatchObject({ x: 500, y: 500 })
})

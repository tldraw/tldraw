import { TestEditor } from '../TestEditor'

let editor: TestEditor

// Heads up! App no longer has a `setScreenBounds` method, but the test app does.
// This is a good way for us to test changes to the `updateViewportPageBounds`
// method without having to mock the actual elements involved. Maybe something to
// eventually push to e2e tests.

beforeEach(() => {
	editor = new TestEditor()
	// Trigger the initial bounds so that later bounds
	// can force a resize.
	editor.setScreenBounds({ x: 0, y: 0, w: 1080, h: 720 })
})

describe('When resizing', () => {
	it('sets the viewport bounds with Editor.resize', () => {
		editor.setScreenBounds({ x: 100, y: 200, w: 700, h: 600 })
		expect(editor.viewportScreenBounds).toMatchObject({
			x: 0,
			y: 0,
			w: 700,
			h: 600,
		})
	})

	it('updates the viewport as an ephemeral change', () => {
		editor.setScreenBounds({ x: 100, y: 200, w: 700, h: 600 })

		editor.undo() // this should have no effect

		expect(editor.viewportScreenBounds).toMatchObject({
			x: 0,
			y: 0,
			w: 700,
			h: 600,
		})
	})

	it('clamps bounds to minimim 0,0,1,1', () => {
		editor.setScreenBounds({ x: -100, y: -200, w: -700, h: 0 })
		expect(editor.viewportScreenBounds).toMatchObject({
			x: 0,
			y: 0,
			w: 1,
			h: 1,
		})
	})
})

describe('When center is false', () => {
	it('keeps the same top left when resized', () => {
		const a = editor.screenToPage(0, 0)
		editor.setScreenBounds({ x: 100, y: 200, w: 500, h: 600 }, false)
		const b = editor.screenToPage(0, 0)
		expect(a).toMatchObject(b)
	})

	it('keeps the same top left when resized while panned / zoomed', () => {
		editor.setCamera(-100, -100, 1.2)
		const a = editor.screenToPage(0, 0)
		editor.setScreenBounds({ x: 100, y: 200, w: 500, h: 600 }, false)
		const b = editor.screenToPage(0, 0)
		expect(a).toMatchObject(b)
	})
})

describe('When center is true', () => {
	it('keep the same page center when resized', () => {
		const a = editor.viewportPageCenter.toJson()
		editor.setScreenBounds({ x: 100, y: 200, w: 500, h: 600 }, true)
		const b = editor.viewportPageCenter.toJson()
		expect(a).toMatchObject(b)
	})

	it('keep the same page center when resized while panned / zoomed', () => {
		editor.setCamera(-100, -100, 1.2)
		const a = editor.viewportPageCenter.toJson()
		editor.setScreenBounds({ x: 100, y: 200, w: 500, h: 600 }, true)
		const b = editor.viewportPageCenter.toJson()
		expect(a).toMatchObject(b)
	})
})

test("if nothing changes it doesn't update the store", () => {
	const originalScreenBounds = editor.instanceState.screenBounds
	editor.setScreenBounds(originalScreenBounds, true)
	expect(editor.instanceState.screenBounds).toBe(originalScreenBounds)
	editor.setScreenBounds({ ...originalScreenBounds }, true)
	expect(editor.instanceState.screenBounds).toBe(originalScreenBounds)
})

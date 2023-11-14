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
		expect(editor.getViewportScreenBounds()).toMatchObject({
			x: 100,
			y: 200,
			w: 700,
			h: 600,
		})
	})

	it('updates the viewport as an ephemeral change', () => {
		editor.setScreenBounds({ x: 100, y: 200, w: 700, h: 600 })

		editor.undo() // this should have no effect

		expect(editor.getViewportScreenBounds()).toMatchObject({
			x: 100,
			y: 200,
			w: 700,
			h: 600,
		})
	})

	it('clamps bounds to minimim 0,0,1,1', () => {
		editor.setScreenBounds({ x: -100, y: -200, w: -700, h: 0 })
		expect(editor.getViewportScreenBounds()).toMatchObject({
			x: -100,
			y: -200,
			w: 1,
			h: 1,
		})
	})
})

describe('When center is false', () => {
	it('keeps the same top left when resized', () => {
		const a = editor.screenToPage({ x: 0, y: 0 })
		expect(a).toMatchObject({ x: 0, y: 0 })
		editor.setScreenBounds({ x: 100, y: 200, w: 500, h: 600 }, false)
		expect(editor.getViewportScreenBounds()).toMatchObject({
			x: 100,
			y: 200,
			w: 500,
			h: 600,
		})
		const b = editor.screenToPage({ x: 0, y: 0 })
		expect(b).toMatchObject({ x: -100, y: -200 })
	})

	it('keeps the same top left when resized while panned', () => {
		editor.setCamera({ x: -100, y: -100, z: 1 })
		const a = editor.screenToPage({ x: 0, y: 0 })
		expect(a).toMatchObject({ x: 100, y: 100 })

		editor.setScreenBounds({ x: 100, y: 200, w: 500, h: 600 }, false)
		expect(editor.getViewportScreenBounds()).toMatchObject({
			x: 100,
			y: 200,
			w: 500,
			h: 600,
		})
		const b = editor.screenToPage({ x: 0, y: 0 })
		expect(b).toMatchObject({ x: 0, y: -100 })
	})

	it('keeps the same top left when resized while panned / zoomed', () => {
		editor.setCamera({ x: -100, y: -100, z: 1 })
		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: 100, y: 100 })
		editor.setCamera({ x: -100, y: -100, z: 2 })
		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: 100, y: 100 })

		editor.setScreenBounds({ x: 100, y: 100, w: 500, h: 600 }, false)
		expect(editor.getViewportScreenBounds()).toMatchObject({
			x: 100,
			y: 100,
			w: 500,
			h: 600,
		})
		expect(editor.screenToPage({ x: 0, y: 0 })).toMatchObject({ x: 50, y: 50 })
	})
})

describe('When center is true', () => {
	it('keep the same page center when resized', () => {
		const a = editor.getViewportPageCenter().toJson()
		editor.setScreenBounds({ x: 100, y: 200, w: 500, h: 600 }, true)
		const b = editor.getViewportPageCenter().toJson()
		expect(a).toMatchObject(b)
	})

	it('keep the same page center when resized while panned / zoomed', () => {
		editor.setCamera({ x: -100, y: -100, z: 1.2 })
		const a = editor.getViewportPageCenter().toJson()
		editor.setScreenBounds({ x: 100, y: 200, w: 500, h: 600 }, true)
		const b = editor.getViewportPageCenter().toJson()
		expect(a).toMatchObject(b)
	})
})

test("if nothing changes it doesn't update the store", () => {
	const originalScreenBounds = editor.getInstanceState().screenBounds
	editor.setScreenBounds(originalScreenBounds, true)
	expect(editor.getInstanceState().screenBounds).toBe(originalScreenBounds)
	editor.setScreenBounds({ ...originalScreenBounds }, true)
	expect(editor.getInstanceState().screenBounds).toBe(originalScreenBounds)
})

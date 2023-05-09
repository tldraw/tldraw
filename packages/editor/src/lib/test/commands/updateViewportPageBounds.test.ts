import { TestApp } from '../TestApp'

let app: TestApp

// Heads up! App no longer has a `setScreenBounds` method, but the test app does.
// This is a good way for us to test changes to the `updateViewportPageBounds`
// method without having to mock the actual elements involved. Maybe something to
// eventually push to e2e tests.

beforeEach(() => {
	app = new TestApp()
	// Trigger the initial bounds so that later bounds
	// can force a resize.
	app.setScreenBounds({ x: 0, y: 0, w: 1080, h: 720 })
})

describe('When resizing', () => {
	it('sets the viewport bounds with App.resize', () => {
		app.setScreenBounds({ x: 100, y: 200, w: 700, h: 600 })
		expect(app.viewportScreenBounds).toMatchObject({
			x: 0,
			y: 0,
			w: 700,
			h: 600,
		})
	})

	it('updates the viewport as an ephemeral change', () => {
		app.setScreenBounds({ x: 100, y: 200, w: 700, h: 600 })

		app.undo() // this should have no effect

		expect(app.viewportScreenBounds).toMatchObject({
			x: 0,
			y: 0,
			w: 700,
			h: 600,
		})
	})

	it('clamps bounds to minimim 0,0,1,1', () => {
		app.setScreenBounds({ x: -100, y: -200, w: -700, h: 0 })
		expect(app.viewportScreenBounds).toMatchObject({
			x: 0,
			y: 0,
			w: 1,
			h: 1,
		})
	})
})

describe('When center is false', () => {
	it('keeps the same top left when resized', () => {
		const a = app.screenToPage(0, 0)
		app.setScreenBounds({ x: 100, y: 200, w: 500, h: 600 }, false)
		const b = app.screenToPage(0, 0)
		expect(a).toMatchObject(b)
	})

	it('keeps the same top left when resized while panned / zoomed', () => {
		app.setCamera(-100, -100, 1.2)
		const a = app.screenToPage(0, 0)
		app.setScreenBounds({ x: 100, y: 200, w: 500, h: 600 }, false)
		const b = app.screenToPage(0, 0)
		expect(a).toMatchObject(b)
	})
})

describe('When center is true', () => {
	it('keep the same page center when resized', () => {
		const a = app.viewportPageCenter.toJson()
		app.setScreenBounds({ x: 100, y: 200, w: 500, h: 600 }, true)
		const b = app.viewportPageCenter.toJson()
		expect(a).toMatchObject(b)
	})

	it('keep the same page center when resized while panned / zoomed', () => {
		app.setCamera(-100, -100, 1.2)
		const a = app.viewportPageCenter.toJson()
		app.setScreenBounds({ x: 100, y: 200, w: 500, h: 600 }, true)
		const b = app.viewportPageCenter.toJson()
		expect(a).toMatchObject(b)
	})
})

test("if nothing changes it doesn't update the store", () => {
	const originalScreenBounds = app.instanceState.screenBounds
	app.setScreenBounds(originalScreenBounds, true)
	expect(app.instanceState.screenBounds).toBe(originalScreenBounds)
	app.setScreenBounds({ ...originalScreenBounds }, true)
	expect(app.instanceState.screenBounds).toBe(originalScreenBounds)
})

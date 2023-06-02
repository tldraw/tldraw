import { TestApp } from '../TestEditor'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

describe('viewport.pageToScreen', () => {
	it('converts correctly', () => {
		expect(app.pageToScreen(0, 0)).toMatchObject({ x: 0, y: 0 })
		expect(app.pageToScreen(200, 200)).toMatchObject({
			x: 200,
			y: 200,
		})
		app.setCamera(100, 100)
		expect(app.pageToScreen(200, 200)).toMatchObject({
			x: 300,
			y: 300,
		})
	})
})

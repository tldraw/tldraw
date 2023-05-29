import { TestApp } from '../TestApp'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

jest.useRealTimers()

it('zooms in gradually when duration is present and reduce motion is not enabled', (done) => {
	expect(app.zoomLevel).toBe(1)
	app.setReduceMotion(false)
	app.zoomIn(undefined, { duration: 100 })
	setTimeout(() => {
		expect(app.zoomLevel).not.toBe(2) // some float between
		done()
	}, 10)
})

it('zooms in gradually when duration is present and reduce motion is not enabled', (done) => {
	expect(app.zoomLevel).toBe(1)
	app.setReduceMotion(true)
	app.zoomIn(undefined, { duration: 100 })
	setTimeout(() => {
		expect(app.zoomLevel).toBe(2) // duration is skipped
		done()
	}, 10)
})

import { TestApp } from '../TestEditor'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

jest.useFakeTimers()

it('zooms in gradually when duration is present and animtion speed is default', () => {
	expect(app.zoomLevel).toBe(1)
	app.setAnimationSpeed(1) // default
	app.zoomIn(undefined, { duration: 100 })
	app.emit('tick', 25) // <-- quarter way
	expect(app.zoomLevel).not.toBe(2)
	app.emit('tick', 25) // 50 <-- half way
	expect(app.zoomLevel).not.toBe(2)
	app.emit('tick', 50) // 50 <-- done!
	expect(app.zoomLevel).toBe(2)
})

it('zooms in gradually when duration is present and animtion speed is off', () => {
	expect(app.zoomLevel).toBe(1)
	app.setAnimationSpeed(0) // none
	app.zoomIn(undefined, { duration: 100 })
	expect(app.zoomLevel).toBe(2) // <-- Should skip!
})

it('zooms in gradually when duration is present and animtion speed is double', () => {
	expect(app.zoomLevel).toBe(1)
	app.setAnimationSpeed(2) // default
	app.zoomIn(undefined, { duration: 100 })
	app.emit('tick', 25) // <-- half way
	expect(app.zoomLevel).not.toBe(2)
	app.emit('tick', 25) // 50 <-- should finish
	expect(app.zoomLevel).toBe(2)
})

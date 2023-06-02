import { TestApp } from '../TestEditor'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

it('Sets the brush', () => {
	expect(app.brush).toEqual(null)

	app.setBrush({ x: 0, y: 0, w: 100, h: 100 })

	expect(app.brush).toMatchObject({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})

	app.undo()

	expect(app.brush).toEqual({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})

	app.redo()

	expect(app.brush).toEqual({
		x: 0,
		y: 0,
		w: 100,
		h: 100,
	})
})

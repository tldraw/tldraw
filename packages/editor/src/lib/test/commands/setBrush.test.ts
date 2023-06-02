import { TestEditor } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
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

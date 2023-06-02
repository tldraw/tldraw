import { TestApp } from '../TestEditor'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

afterEach(() => {
	app?.dispose()
})

it("When changing the style of a geo shape, if the text label is empty, don't measure it", () => {
	const id = app.createShapeId()

	app.createShapes([
		{
			id,
			type: 'geo',
			props: {
				text: '',
				size: 's',
				w: 5,
				h: 5,
			},
		},
	])

	const boundsBefore = app.getBoundsById(id)!

	app.updateShapes([
		{
			id,
			type: 'geo',
			props: { size: 'l' },
		},
	])

	expect(app.getBoundsById(id)).toMatchObject(boundsBefore)
})

it('When changing the style of a geo shape, if the text label has text, measure it and possibly update the size', () => {
	const id = app.createShapeId()

	app.createShapes([
		{
			id,
			type: 'geo',
			props: {
				text: 'h',
				size: 's',
				w: 5,
				h: 5,
			},
		},
	])

	const boundsBefore = app.getBoundsById(id)!

	app.updateShapes([
		{
			id,
			type: 'geo',
			props: { size: 'l' },
		},
	])

	expect(app.getBoundsById(id)).not.toMatchObject(boundsBefore)
})

import { TestEditor } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
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

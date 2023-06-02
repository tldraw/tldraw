import { createDefaultShapes, defaultShapesIds, TestEditor } from './TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
	app.createShapes(createDefaultShapes())
	app.reparentShapesById([defaultShapesIds.ellipse1], app.currentPageId)
})

describe('Editor.props', () => {
	it('should return props', () => {
		app.selectNone()
		expect(app.props).toEqual({
			color: 'black',
			dash: 'draw',
			fill: 'none',
			size: 'm',
			opacity: '1',
		})
	})

	it('should return props for a single shape', () => {
		app.select(defaultShapesIds.box1)
		expect(app.props).toEqual({
			align: 'middle',
			labelColor: 'black',
			color: 'black',
			dash: 'draw',
			fill: 'none',
			size: 'm',
			font: 'draw',
			geo: 'rectangle',
			verticalAlign: 'middle',
			// h: 100,
			// w: 100,
			// growY: 0,
			opacity: '1',
			// text: '',
			// url: '',
		})
	})

	it('should return props for two matching shapes', () => {
		app.select(defaultShapesIds.box1, defaultShapesIds.box2)
		expect(app.props).toEqual({
			align: 'middle',
			color: 'black',
			labelColor: 'black',
			dash: 'draw',
			fill: 'none',
			size: 'm',
			font: 'draw',
			geo: 'rectangle',
			verticalAlign: 'middle',
			// h: 100, // blacklisted
			// w: 100, // blacklisted
			// growY: 0, // blacklist
			opacity: '1',
			// text: '', // blacklisted
			// url: '', // blacklisted
		})
	})

	it('should return mixed props for shapes that have mixed values', () => {
		app.updateShapes([
			{
				id: defaultShapesIds.box1,
				type: 'geo',
				props: { h: 200, w: 200, color: 'red', dash: 'solid' },
			},
		])

		app.select(defaultShapesIds.box1, defaultShapesIds.box2)

		expect(app.props).toEqual({
			align: 'middle',
			labelColor: 'black',
			color: null, // mixed!
			dash: null, // mixed!
			fill: 'none',
			size: 'm',
			font: 'draw',
			geo: 'rectangle',
			opacity: '1',
			verticalAlign: 'middle',
			// h: null, // mixed! but also blacklisted
			// w: null, // mixed! but also blacklisted
			// growY: 0, // blacklist
			// text: '', // blacklisted
			// url: '', // blacklist
		})
	})

	it('should return null for all mixed props', () => {
		app.updateShapes([
			{
				id: defaultShapesIds.box1,
				type: 'geo',
				props: { h: 200, w: 200, color: 'red', dash: 'solid' },
			},
			{
				id: defaultShapesIds.box2,
				type: 'geo',
				props: { size: 'l', fill: 'pattern', font: 'mono' },
			},
			{
				id: defaultShapesIds.ellipse1,
				type: 'geo',
				props: {
					align: 'start',
					text: 'hello world this is a long sentence that should wrap',
					w: 100,
					opacity: '0.5',
					url: 'https://aol.com',
					verticalAlign: 'start',
				},
			},
		])

		app.selectAll()
		expect(app.props).toEqual({
			align: null,
			labelColor: 'black',
			color: null,
			dash: null,
			fill: null,
			geo: null,
			size: null,
			font: null,
			opacity: null,
			verticalAlign: null,
			// growY: null, // blacklist
			// url: null, // blacklist
		})
	})
})

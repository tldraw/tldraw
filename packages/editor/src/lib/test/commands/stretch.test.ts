import { PI } from '@tldraw/primitives'
import { createCustomShapeId, TLShapeId } from '@tldraw/tlschema'
import { TestApp } from '../TestApp'

let app: TestApp

jest.useFakeTimers()

const ids = {
	boxA: createCustomShapeId('boxA'),
	boxB: createCustomShapeId('boxB'),
	boxC: createCustomShapeId('boxC'),
	videoA: createCustomShapeId('videoA'),
}

function createVideoShape(id: TLShapeId) {
	app.createShapes([
		{
			id: id,
			type: 'video',
			x: 0,
			y: 0,
			props: {
				w: 160,
				h: 90,
			},
		},
	])
}

beforeEach(() => {
	app = new TestApp()
	app.selectAll()
	app.deleteShapes()
	app.createShapes([
		{
			id: ids.boxA,
			type: 'geo',
			x: 0,
			y: 0,
			props: {
				w: 100,
				h: 100,
			},
		},
		{
			id: ids.boxB,
			type: 'geo',
			x: 100,
			y: 100,
			props: {
				w: 50,
				h: 50,
			},
		},
		{
			id: ids.boxC,
			type: 'geo',
			x: 400,
			y: 400,
			props: {
				w: 100,
				h: 100,
			},
		},
	])
	app.selectAll()
})

describe('when less than two shapes are selected', () => {
	it('does nothing', () => {
		app.setSelectedIds([ids.boxB])
		const fn = jest.fn()
		app.on('change-history', fn)
		app.stretchShapes('horizontal')
		jest.advanceTimersByTime(1000)

		expect(fn).not.toHaveBeenCalled()
	})
})

describe('when multiple shapes are selected', () => {
	it('stretches horizontally', () => {
		app.selectAll()
		app.stretchShapes('horizontal')
		jest.advanceTimersByTime(1000)
		app.expectShapeToMatch(
			{ id: ids.boxA, x: 0, y: 0, props: { w: 500 } },
			{ id: ids.boxB, x: 0, y: 100, props: { w: 500 } },
			{ id: ids.boxC, x: 0, y: 400, props: { w: 500 } }
		)
	})

	it('stretches horizontally and preserves aspect ratio', () => {
		createVideoShape(ids.videoA)
		app.selectAll()
		expect(app.selectedShapes.length).toBe(4)
		app.stretchShapes('horizontal')
		jest.advanceTimersByTime(1000)
		const newHeight = (500 * 9) / 16
		app.expectShapeToMatch(
			{ id: ids.boxA, x: 0, y: 0, props: { w: 500 } },
			{ id: ids.boxB, x: 0, y: 100, props: { w: 500 } },
			{ id: ids.boxC, x: 0, y: 400, props: { w: 500 } },
			{ id: ids.videoA, x: 0, y: -95.625, props: { w: 500, h: newHeight } }
		)
	})

	it('stretches vertically', () => {
		app.selectAll()
		app.stretchShapes('vertical')
		jest.advanceTimersByTime(1000)
		app.expectShapeToMatch(
			{ id: ids.boxA, x: 0, y: 0, props: { h: 500 } },
			{ id: ids.boxB, x: 100, y: 0, props: { h: 500 } },
			{ id: ids.boxC, x: 400, y: 0, props: { h: 500 } }
		)
	})

	it('stretches vertically and preserves aspect ratio', () => {
		createVideoShape(ids.videoA)
		app.selectAll()
		expect(app.selectedShapes.length).toBe(4)
		app.stretchShapes('vertical')
		jest.advanceTimersByTime(1000)
		const newWidth = (500 * 16) / 9
		app.expectShapeToMatch(
			{ id: ids.boxA, x: 0, y: 0, props: { h: 500 } },
			{ id: ids.boxB, x: 100, y: 0, props: { h: 500 } },
			{ id: ids.boxC, x: 400, y: 0, props: { h: 500 } },
			{ id: ids.videoA, x: -364.44444444444446, y: 0, props: { w: newWidth, h: 500 } }
		)
	})

	it('does, undoes and redoes command', () => {
		app.mark('stretch')
		app.stretchShapes('horizontal')
		jest.advanceTimersByTime(1000)

		app.expectShapeToMatch({ id: ids.boxB, x: 0, props: { w: 500 } })
		app.undo()
		app.expectShapeToMatch({ id: ids.boxB, x: 100, props: { w: 50 } })
		app.redo()
		app.expectShapeToMatch({ id: ids.boxB, x: 0, props: { w: 500 } })
	})
})

describe('When shapes are the child of another shape.', () => {
	it('stretches horizontally', () => {
		app.reparentShapesById([ids.boxB], ids.boxA)
		app.select(ids.boxB, ids.boxC)
		app.stretchShapes('horizontal')
		jest.advanceTimersByTime(1000)
		app.expectShapeToMatch(
			{ id: ids.boxB, x: 100, y: 100, props: { w: 400 } },
			{ id: ids.boxC, x: 100, y: 400, props: { w: 400 } }
		)
	})

	it('stretches vertically', () => {
		app.reparentShapesById([ids.boxB], ids.boxA)
		app.select(ids.boxB, ids.boxC)
		app.stretchShapes('vertical')
		jest.advanceTimersByTime(1000)
		app.expectShapeToMatch(
			{ id: ids.boxB, x: 100, y: 100, props: { h: 400 } },
			{ id: ids.boxC, x: 400, y: 100, props: { h: 400 } }
		)
	})
})

describe('When shapes are the child of a rotated shape.', () => {
	beforeEach(() => {
		app = new TestApp()
		app.selectAll()
		app.deleteShapes()
		app.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
				props: {
					w: 100,
					h: 100,
				},
				rotation: PI,
			},
			{
				id: ids.boxB,
				type: 'geo',
				parentId: ids.boxA,
				x: 100,
				y: 100,
				props: {
					w: 50,
					h: 50,
				},
			},
			{
				id: ids.boxC,
				type: 'geo',
				x: 200,
				y: 200,
				props: {
					w: 100,
					h: 100,
				},
			},
		])
		app.selectAll()
	})

	it('does not stretches rotated shapes', () => {
		app.select(ids.boxB, ids.boxC)
		app.stretchShapes('horizontal')
		jest.advanceTimersByTime(1000)
		app.expectShapeToMatch(
			{
				id: ids.boxB,
				x: 100,
				y: 100,
				props: {
					w: 50,
					h: 50,
				},
			},
			{
				id: ids.boxC,
				x: -150,
				y: 200,
				props: {
					w: 450,
					h: 100,
				},
			}
		)
	})

	it('does not stretches rotated shapes', () => {
		app.select(ids.boxB, ids.boxC)
		app.stretchShapes('vertical')
		jest.advanceTimersByTime(1000)
		app.expectShapeToMatch(
			{
				id: ids.boxB,
				x: 100,
				y: 100,
				props: {
					w: 50,
					h: 50,
				},
			},
			{
				id: ids.boxC,
				x: 200,
				y: -150,
				props: {
					w: 100,
					h: 450,
				},
			}
		)
	})
})

describe('When shapes have 0-width or 0-height', () => {
	it('Does not error with 0-width', () => {
		app.selectAll()
		app.deleteShapes()

		app
			.setSelectedTool('arrow')
			.keyDown('shift')
			.pointerDown(50, 0)
			.pointerMove(50, 100)
			.pointerUp(50, 100)
			.keyUp('shift')

			.setSelectedTool('geo')
			.pointerDown(0, 0)
			.pointerMove(100, 100)
			.pointerUp(100, 100)

		app.selectAll()

		// make sure we don't get any errors:
		app.stretchShapes('horizontal')
		app.stretchShapes('vertical')
	})

	it('Does not error with 0-height', () => {
		app.selectAll()
		app.deleteShapes()

		app
			// draw a perfectly horiztonal arrow:
			.setSelectedTool('arrow')
			.keyDown('shift')
			.pointerDown(0, 50)
			.pointerMove(100, 50)
			.pointerUp(100, 50)
			.keyUp('shift')

			// plus a box:
			.setSelectedTool('geo')
			.pointerDown(0, 0)
			.pointerMove(100, 100)
			.pointerUp(100, 100)

		app.selectAll()

		// make sure we don't get any errors:
		app.stretchShapes('horizontal')
		app.stretchShapes('vertical')
	})
})

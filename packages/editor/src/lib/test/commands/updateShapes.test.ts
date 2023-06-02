import { createCustomShapeId } from '@tldraw/tlschema'
import { createDefaultShapes, TestApp } from '../TestEditor'

let app: TestApp

const ids = {
	box1: createCustomShapeId('box1'),
	ellipse1: createCustomShapeId('ellipse1'),
}

beforeEach(() => {
	app = new TestApp()
	app.createShapes(createDefaultShapes())
})

it('updates shapes', () => {
	app.mark('update shapes')
	app.updateShapes([
		{
			id: ids.box1,
			type: 'geo',
			x: 200,
			y: 200,
		},
	])

	expect(app.getShapeById(ids.box1)).toMatchObject({
		x: 200,
		y: 200,
		id: ids.box1,
		rotation: 0,
		type: 'geo',
		props: {
			h: 100,
			w: 100,
			color: 'black',
			dash: 'draw',
			fill: 'none',
			opacity: '1',
			size: 'm',
		},
	})

	app.undo()

	expect(app.getShapeById(ids.box1)).toMatchObject({
		x: 100,
		y: 100,
		id: ids.box1,
		rotation: 0,
		type: 'geo',
		props: {
			h: 100,
			w: 100,
			color: 'black',
			dash: 'draw',
			fill: 'none',
			opacity: '1',
			size: 'm',
		},
	})

	app.redo()

	expect(app.getShapeById(ids.box1)).toMatchObject({
		x: 200,
		y: 200,
		id: ids.box1,
		rotation: 0,
		type: 'geo',
		props: {
			h: 100,
			w: 100,
			color: 'black',
			dash: 'draw',
			fill: 'none',
			opacity: '1',
			size: 'm',
		},
	})
})

describe('When a shape has a different shape as a parent...', () => {
	it("Prevents updateShapes from updating a shape's parentId", () => {
		app.updateShapes([
			{ id: ids.ellipse1, type: 'geo', parentId: ids.box1, props: { geo: 'ellipse' } },
		])
	})
})

it('Throws out all shapes if any update is invalid', () => {
	app.selectAll().deleteShapes()

	app.createShapes([
		{ id: ids.box1, type: 'geo', x: 0, y: 0 },
		{ id: ids.ellipse1, type: 'geo', x: 0, y: 100 },
	])

	expect(() => {
		app.updateShapes([{ id: ids.box1, type: 'geo', x: 100, y: 0 }])
	}).not.toThrow()

	expect(() => {
		app.updateShapes([
			{ id: ids.box1, type: 'geo', x: 200 },
			// @ts-expect-error
			{ id: ids.ellipse1, type: 'geo', x: 'two hundred' }, // invalid x
		])
	}).toThrow()

	app.expectShapeToMatch(
		{
			id: ids.box1,
			type: 'geo',
			x: 100,
			y: 0,
		},
		{
			id: ids.ellipse1,
			type: 'geo',
			x: 0,
			y: 100,
		}
	)
})

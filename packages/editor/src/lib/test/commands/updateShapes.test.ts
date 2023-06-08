import { createShapeId } from '../../schema/records/TLShape'
import { createDefaultShapes, TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	ellipse1: createShapeId('ellipse1'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
})

it('updates shapes', () => {
	editor.mark('update shapes')
	editor.updateShapes([
		{
			id: ids.box1,
			type: 'geo',
			x: 200,
			y: 200,
		},
	])

	expect(editor.getShapeById(ids.box1)).toMatchObject({
		x: 200,
		y: 200,
		id: ids.box1,
		rotation: 0,
		type: 'geo',
		opacity: 1,
		props: {
			h: 100,
			w: 100,
			color: 'black',
			dash: 'draw',
			fill: 'none',
			size: 'm',
		},
	})

	editor.undo()

	expect(editor.getShapeById(ids.box1)).toMatchObject({
		x: 100,
		y: 100,
		id: ids.box1,
		rotation: 0,
		type: 'geo',
		opacity: 1,
		props: {
			h: 100,
			w: 100,
			color: 'black',
			dash: 'draw',
			fill: 'none',
			size: 'm',
		},
	})

	editor.redo()

	expect(editor.getShapeById(ids.box1)).toMatchObject({
		x: 200,
		y: 200,
		id: ids.box1,
		rotation: 0,
		type: 'geo',
		opacity: 1,
		props: {
			h: 100,
			w: 100,
			color: 'black',
			dash: 'draw',
			fill: 'none',
			size: 'm',
		},
	})
})

describe('When a shape has a different shape as a parent...', () => {
	it("Prevents updateShapes from updating a shape's parentId", () => {
		editor.updateShapes([
			{ id: ids.ellipse1, type: 'geo', parentId: ids.box1, props: { geo: 'ellipse' } },
		])
	})
})

it('Throws out all shapes if any update is invalid', () => {
	editor.selectAll().deleteShapes()

	editor.createShapes([
		{ id: ids.box1, type: 'geo', x: 0, y: 0 },
		{ id: ids.ellipse1, type: 'geo', x: 0, y: 100 },
	])

	expect(() => {
		editor.updateShapes([{ id: ids.box1, type: 'geo', x: 100, y: 0 }])
	}).not.toThrow()

	expect(() => {
		editor.updateShapes([
			{ id: ids.box1, type: 'geo', x: 200 },
			// @ts-expect-error
			{ id: ids.ellipse1, type: 'geo', x: 'two hundred' }, // invalid x
		])
	}).toThrow()

	editor.expectShapeToMatch(
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

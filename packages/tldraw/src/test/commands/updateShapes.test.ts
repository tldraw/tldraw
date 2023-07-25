import { TLArrowShape, TLGeoShape, createShapeId } from '@tldraw/editor'
import { TestEditor, createDefaultShapes } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	ellipse1: createShapeId('ellipse1'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
})

it('Uses typescript generics', () => {
	expect(() => {
		// No error here because no generic, the editor doesn't know what this guy is
		editor.updateShapes([
			{
				id: ids.box1,
				type: 'geo',
				props: { w: 'OH NO' },
			},
		])

		// Yep error here because we are giving the wrong props to the shape
		editor.updateShapes<TLGeoShape>([
			{
				id: ids.box1,
				type: 'geo',
				//@ts-expect-error
				props: { w: 'OH NO' },
			},
		])

		// Yep error here because we are giving the wrong generic
		editor.updateShapes<TLArrowShape>([
			{
				id: ids.box1,
				//@ts-expect-error
				type: 'geo',
				//@ts-expect-error
				props: { w: 'OH NO' },
			},
		])

		// All good, correct match of generic and shape type
		editor.updateShapes<TLGeoShape>([
			{
				id: ids.box1,
				type: 'geo',
				props: { w: 100 },
			},
		])

		editor.updateShapes<TLGeoShape>([
			{
				id: ids.box1,
				type: 'geo',
			},
			{
				id: ids.box1,
				// @ts-expect-error - wrong type
				type: 'arrow',
			},
		])

		// Unions are supported just fine
		editor.updateShapes<TLGeoShape | TLArrowShape>([
			{
				id: ids.box1,
				type: 'geo',
			},
			{
				id: ids.box1,
				type: 'arrow',
			},
		])
	}).toThrowError()
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

	expect(editor.getShape(ids.box1)).toMatchObject({
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

	expect(editor.getShape(ids.box1)).toMatchObject({
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

	expect(editor.getShape(ids.box1)).toMatchObject({
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
	editor.selectAll().deleteShapes(editor.selectedShapeIds)

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

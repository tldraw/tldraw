import { createCustomShapeId } from '@tldraw/tlschema'
import { TestApp } from '../TestEditor'

let app: TestApp

const ids = {
	box1: createCustomShapeId('box1'),
	box2: createCustomShapeId('box2'),
	box3: createCustomShapeId('box3'),
	box4: createCustomShapeId('box4'),
	arrow1: createCustomShapeId('arrow1'),
}

jest.useFakeTimers()

beforeEach(() => {
	app = new TestApp()
	app
		.selectAll()
		.deleteShapes()
		.createShapes([
			{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
			{ id: ids.box3, type: 'geo', x: 100, y: 500, props: { w: 100, h: 100 } },
			{ id: ids.box4, type: 'geo', x: 100, y: 800, props: { w: 100, h: 100 } },
			{
				id: ids.arrow1,
				type: 'arrow',
				x: 150,
				y: 150,
				props: {
					start: {
						type: 'binding',
						isExact: false,
						boundShapeId: ids.box1,
						normalizedAnchor: { x: 0.5, y: 0.5 },
					},
					end: {
						type: 'binding',
						isExact: false,
						boundShapeId: ids.box2,
						normalizedAnchor: { x: 0.5, y: 0.5 },
					},
				},
			},
		])
})

describe('App.deleteShapes', () => {
	it('Deletes a shape', () => {
		app.select(ids.box3, ids.box4)
		app.mark()
		app.deleteShapes() // delete the selected shapes
		expect(app.getShapeById(ids.box3)).toBeUndefined()
		expect(app.getShapeById(ids.box4)).toBeUndefined()
		expect(app.selectedIds).toMatchObject([])
		app.undo()
		expect(app.getShapeById(ids.box3)).not.toBeUndefined()
		expect(app.getShapeById(ids.box4)).not.toBeUndefined()
		expect(app.selectedIds).toMatchObject([ids.box3, ids.box4])
		app.redo()
		expect(app.getShapeById(ids.box3)).toBeUndefined()
		expect(app.getShapeById(ids.box4)).toBeUndefined()
		expect(app.selectedIds).toMatchObject([])
	})

	it('Does nothing on an empty ids array', () => {
		app.selectNone()
		const before = app.store.serialize()
		app.deleteShapes() // should be a noop, nothing to delete
		expect(app.store.serialize()).toStrictEqual(before)
	})

	it('Deletes descendants', () => {
		app.reparentShapesById([ids.box4], ids.box3)
		app.select(ids.box3)
		app.mark()
		app.deleteShapes() // should be a noop, nothing to delete
		expect(app.getShapeById(ids.box3)).toBeUndefined()
		expect(app.getShapeById(ids.box4)).toBeUndefined()
		app.undo()
		expect(app.getShapeById(ids.box3)).not.toBeUndefined()
		expect(app.getShapeById(ids.box4)).not.toBeUndefined()
		app.redo()
		expect(app.getShapeById(ids.box3)).toBeUndefined()
		expect(app.getShapeById(ids.box4)).toBeUndefined()
	})
})

describe('When deleting arrows', () => {
	it('Restores any bindings on undo', () => {
		app.select(ids.arrow1)
		app.mark()
		// @ts-expect-error
		expect(app._arrowBindingsIndex.value[ids.box1]).not.toBeUndefined()
		// @ts-expect-error
		expect(app._arrowBindingsIndex.value[ids.box2]).not.toBeUndefined()

		app.deleteShapes() // delete the selected shapes
		// @ts-expect-error
		expect(app._arrowBindingsIndex.value[ids.box1]).toBeUndefined()
		// @ts-expect-error
		expect(app._arrowBindingsIndex.value[ids.box2]).toBeUndefined()

		app.undo()
		// @ts-expect-error
		expect(app._arrowBindingsIndex.value[ids.box1]).not.toBeUndefined()
		// @ts-expect-error
		expect(app._arrowBindingsIndex.value[ids.box2]).not.toBeUndefined()
	})
})

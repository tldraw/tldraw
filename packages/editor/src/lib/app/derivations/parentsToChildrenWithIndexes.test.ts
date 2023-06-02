import { getIndexAbove, getIndexBetween } from '@tldraw/indices'
import { createCustomShapeId } from '@tldraw/tlschema'
import { TestApp } from '../../test/TestEditor'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

const ids = {
	box1: createCustomShapeId('box1'),
	box2: createCustomShapeId('box2'),
	box3: createCustomShapeId('box3'),

	box4: createCustomShapeId('box4'),
	box5: createCustomShapeId('box5'),
	box6: createCustomShapeId('box6'),
}

describe('parentsToChildrenWithIndexes', () => {
	it('keeps the children and parents up to date', () => {
		app.createShapes([{ type: 'geo', id: ids.box1 }])
		app.createShapes([{ type: 'geo', id: ids.box2 }])

		expect(app.getSortedChildIds(ids.box1)).toEqual([])
		expect(app.getSortedChildIds(ids.box2)).toEqual([])

		app.createShapes([{ type: 'geo', id: ids.box3, parentId: ids.box1 }])

		expect(app.getSortedChildIds(ids.box1)).toEqual([ids.box3])
		expect(app.getSortedChildIds(ids.box2)).toEqual([])

		app.updateShapes([{ id: ids.box3, type: 'geo', parentId: ids.box2 }])

		expect(app.getSortedChildIds(ids.box1)).toEqual([])
		expect(app.getSortedChildIds(ids.box2)).toEqual([ids.box3])

		app.updateShapes([{ id: ids.box1, type: 'geo', parentId: ids.box2 }])

		expect(app.getSortedChildIds(ids.box2)).toEqual([ids.box3, ids.box1])
	})

	it('keeps the children of pages too', () => {
		app.createShapes([
			{ type: 'geo', id: ids.box1 },
			{ type: 'geo', id: ids.box2 },
			{ type: 'geo', id: ids.box3 },
		])

		expect(app.getSortedChildIds(app.currentPageId)).toEqual([ids.box1, ids.box2, ids.box3])
	})

	it('keeps children sorted', () => {
		app.createShapes([
			{ type: 'geo', id: ids.box1 },
			{ type: 'geo', id: ids.box2 },
			{ type: 'geo', id: ids.box3 },
		])

		expect(app.getSortedChildIds(app.currentPageId)).toEqual([ids.box1, ids.box2, ids.box3])

		app.updateShapes([
			{
				id: ids.box1,
				type: 'geo',
				index: getIndexBetween(
					app.getShapeById(ids.box2)!.index,
					app.getShapeById(ids.box3)!.index
				),
			},
		])
		expect(app.getSortedChildIds(app.currentPageId)).toEqual([ids.box2, ids.box1, ids.box3])

		app.updateShapes([
			{ id: ids.box2, type: 'geo', index: getIndexAbove(app.getShapeById(ids.box3)!.index) },
		])

		expect(app.getSortedChildIds(app.currentPageId)).toEqual([ids.box1, ids.box3, ids.box2])
	})

	it('sorts children of next parent when a shape is reparented', () => {
		app.createShapes([
			{ type: 'geo', id: ids.box1 },
			{ type: 'geo', id: ids.box2, parentId: ids.box1 },
			{ type: 'geo', id: ids.box3, parentId: ids.box1 },
			{ type: 'geo', id: ids.box4 },
		])

		const box2Index = app.getShapeById(ids.box2)!.index
		const box3Index = app.getShapeById(ids.box3)!.index
		const box4Index = getIndexBetween(box2Index, box3Index)

		app.updateShapes([
			{
				id: ids.box4,
				type: 'geo',
				parentId: ids.box1,
				index: box4Index,
			},
		])

		expect(app.getSortedChildIds(ids.box1)).toEqual([ids.box2, ids.box4, ids.box3])
	})
})

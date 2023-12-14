import { createShapeId, getIndexAbove, getIndexBetween } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),

	box4: createShapeId('box4'),
	box5: createShapeId('box5'),
	box6: createShapeId('box6'),
}

describe('parentsToChildrenWithIndexes', () => {
	it('keeps the children and parents up to date', () => {
		editor.createShapes([{ type: 'geo', id: ids.box1 }])
		editor.createShapes([{ type: 'geo', id: ids.box2 }])

		expect(editor.getSortedChildIdsForParent(ids.box1)).toEqual([])
		expect(editor.getSortedChildIdsForParent(ids.box2)).toEqual([])

		editor.createShapes([{ type: 'geo', id: ids.box3, parentId: ids.box1 }])

		expect(editor.getSortedChildIdsForParent(ids.box1)).toEqual([ids.box3])
		expect(editor.getSortedChildIdsForParent(ids.box2)).toEqual([])

		editor.updateShapes([{ id: ids.box3, type: 'geo', parentId: ids.box2 }])

		expect(editor.getSortedChildIdsForParent(ids.box1)).toEqual([])
		expect(editor.getSortedChildIdsForParent(ids.box2)).toEqual([ids.box3])

		editor.updateShapes([{ id: ids.box1, type: 'geo', parentId: ids.box2 }])

		expect(editor.getSortedChildIdsForParent(ids.box2)).toEqual([ids.box3, ids.box1])
	})

	it('keeps the children of pages too', () => {
		editor.createShapes([
			{ type: 'geo', id: ids.box1 },
			{ type: 'geo', id: ids.box2 },
			{ type: 'geo', id: ids.box3 },
		])

		expect(editor.getSortedChildIdsForParent(editor.getCurrentPageId())).toEqual([
			ids.box1,
			ids.box2,
			ids.box3,
		])
	})

	it('keeps children sorted', () => {
		editor.createShapes([
			{ type: 'geo', id: ids.box1 },
			{ type: 'geo', id: ids.box2 },
			{ type: 'geo', id: ids.box3 },
		])

		expect(editor.getSortedChildIdsForParent(editor.getCurrentPageId())).toEqual([
			ids.box1,
			ids.box2,
			ids.box3,
		])

		editor.updateShapes([
			{
				id: ids.box1,
				type: 'geo',
				index: getIndexBetween(editor.getShape(ids.box2)!.index, editor.getShape(ids.box3)!.index),
			},
		])
		expect(editor.getSortedChildIdsForParent(editor.getCurrentPageId())).toEqual([
			ids.box2,
			ids.box1,
			ids.box3,
		])

		editor.updateShapes([
			{ id: ids.box2, type: 'geo', index: getIndexAbove(editor.getShape(ids.box3)!.index) },
		])

		expect(editor.getSortedChildIdsForParent(editor.getCurrentPageId())).toEqual([
			ids.box1,
			ids.box3,
			ids.box2,
		])
	})

	it('sorts children of next parent when a shape is reparented', () => {
		editor.createShapes([
			{ type: 'geo', id: ids.box1 },
			{ type: 'geo', id: ids.box2, parentId: ids.box1 },
			{ type: 'geo', id: ids.box3, parentId: ids.box1 },
			{ type: 'geo', id: ids.box4 },
		])

		const box2Index = editor.getShape(ids.box2)!.index
		const box3Index = editor.getShape(ids.box3)!.index
		const box4Index = getIndexBetween(box2Index, box3Index)

		editor.updateShapes([
			{
				id: ids.box4,
				type: 'geo',
				parentId: ids.box1,
				index: box4Index,
			},
		])

		expect(editor.getSortedChildIdsForParent(ids.box1)).toEqual([ids.box2, ids.box4, ids.box3])
	})
})

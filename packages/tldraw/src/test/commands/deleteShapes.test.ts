import { createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	arrow1: createShapeId('arrow1'),
}

jest.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
	editor
		.selectAll()
		.deleteShapes(editor.selectedShapeIds)
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

describe('Editor.deleteShapes', () => {
	it('Deletes a shape', () => {
		editor.select(ids.box3, ids.box4)
		editor.mark('before deleting')
		editor.deleteShapes(editor.selectedShapeIds) // delete the selected shapes
		expect(editor.getShape(ids.box3)).toBeUndefined()
		expect(editor.getShape(ids.box4)).toBeUndefined()
		expect(editor.selectedShapeIds).toMatchObject([])
		editor.undo()
		expect(editor.getShape(ids.box3)).not.toBeUndefined()
		expect(editor.getShape(ids.box4)).not.toBeUndefined()
		expect(editor.selectedShapeIds).toMatchObject([ids.box3, ids.box4])
		editor.redo()
		expect(editor.getShape(ids.box3)).toBeUndefined()
		expect(editor.getShape(ids.box4)).toBeUndefined()
		expect(editor.selectedShapeIds).toMatchObject([])
	})

	it('Does nothing on an empty ids array', () => {
		editor.selectNone()
		const before = editor.store.serialize()
		editor.deleteShapes(editor.selectedShapeIds) // should be a noop, nothing to delete
		expect(editor.store.serialize()).toStrictEqual(before)
	})

	it('Deletes descendants', () => {
		editor.reparentShapes([ids.box4], ids.box3)
		editor.select(ids.box3)
		editor.mark('before deleting')
		editor.deleteShapes(editor.selectedShapeIds) // should be a noop, nothing to delete
		expect(editor.getShape(ids.box3)).toBeUndefined()
		expect(editor.getShape(ids.box4)).toBeUndefined()
		editor.undo()
		expect(editor.getShape(ids.box3)).not.toBeUndefined()
		expect(editor.getShape(ids.box4)).not.toBeUndefined()
		editor.redo()
		expect(editor.getShape(ids.box3)).toBeUndefined()
		expect(editor.getShape(ids.box4)).toBeUndefined()
	})
})

describe('When deleting arrows', () => {
	it('Restores any bindings on undo', () => {
		editor.select(ids.arrow1)
		editor.mark('before deleting')
		// @ts-expect-error
		expect(editor._arrowBindingsIndex.value[ids.box1]).not.toBeUndefined()
		// @ts-expect-error
		expect(editor._arrowBindingsIndex.value[ids.box2]).not.toBeUndefined()

		editor.deleteShapes(editor.selectedShapeIds) // delete the selected shapes
		// @ts-expect-error
		expect(editor._arrowBindingsIndex.value[ids.box1]).toBeUndefined()
		// @ts-expect-error
		expect(editor._arrowBindingsIndex.value[ids.box2]).toBeUndefined()

		editor.undo()
		// @ts-expect-error
		expect(editor._arrowBindingsIndex.value[ids.box1]).not.toBeUndefined()
		// @ts-expect-error
		expect(editor._arrowBindingsIndex.value[ids.box2]).not.toBeUndefined()
	})
})

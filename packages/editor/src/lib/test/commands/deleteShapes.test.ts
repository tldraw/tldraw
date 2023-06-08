import { createShapeId } from '@tldraw/tlschema'
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

describe('Editor.deleteShapes', () => {
	it('Deletes a shape', () => {
		editor.select(ids.box3, ids.box4)
		editor.mark()
		editor.deleteShapes() // delete the selected shapes
		expect(editor.getShapeById(ids.box3)).toBeUndefined()
		expect(editor.getShapeById(ids.box4)).toBeUndefined()
		expect(editor.selectedIds).toMatchObject([])
		editor.undo()
		expect(editor.getShapeById(ids.box3)).not.toBeUndefined()
		expect(editor.getShapeById(ids.box4)).not.toBeUndefined()
		expect(editor.selectedIds).toMatchObject([ids.box3, ids.box4])
		editor.redo()
		expect(editor.getShapeById(ids.box3)).toBeUndefined()
		expect(editor.getShapeById(ids.box4)).toBeUndefined()
		expect(editor.selectedIds).toMatchObject([])
	})

	it('Does nothing on an empty ids array', () => {
		editor.selectNone()
		const before = editor.store.serialize()
		editor.deleteShapes() // should be a noop, nothing to delete
		expect(editor.store.serialize()).toStrictEqual(before)
	})

	it('Deletes descendants', () => {
		editor.reparentShapesById([ids.box4], ids.box3)
		editor.select(ids.box3)
		editor.mark()
		editor.deleteShapes() // should be a noop, nothing to delete
		expect(editor.getShapeById(ids.box3)).toBeUndefined()
		expect(editor.getShapeById(ids.box4)).toBeUndefined()
		editor.undo()
		expect(editor.getShapeById(ids.box3)).not.toBeUndefined()
		expect(editor.getShapeById(ids.box4)).not.toBeUndefined()
		editor.redo()
		expect(editor.getShapeById(ids.box3)).toBeUndefined()
		expect(editor.getShapeById(ids.box4)).toBeUndefined()
	})
})

describe('When deleting arrows', () => {
	it('Restores any bindings on undo', () => {
		editor.select(ids.arrow1)
		editor.mark()
		// @ts-expect-error
		expect(editor._arrowBindingsIndex.value[ids.box1]).not.toBeUndefined()
		// @ts-expect-error
		expect(editor._arrowBindingsIndex.value[ids.box2]).not.toBeUndefined()

		editor.deleteShapes() // delete the selected shapes
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

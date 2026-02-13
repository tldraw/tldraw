import { createBindingId, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { getArrowBindings } from '../../lib/shapes/arrow/shared'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	arrow1: createShapeId('arrow1'),
}

vi.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
	editor
		.selectAll()
		.deleteShapes(editor.getSelectedShapeIds())
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
					start: { x: 0, y: 0 },
					end: { x: 0, y: 0 },
				},
			},
		])
		.createBindings([
			{
				id: createBindingId(),
				fromId: ids.arrow1,
				toId: ids.box1,
				type: 'arrow',
				props: {
					terminal: 'start',
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
			{
				id: createBindingId(),
				fromId: ids.arrow1,
				toId: ids.box2,
				type: 'arrow',
				props: {
					terminal: 'end',
					isExact: false,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
		])
})

describe('Editor.deleteShapes', () => {
	it('Deletes a shape', () => {
		editor.select(ids.box3, ids.box4)
		editor.markHistoryStoppingPoint('before deleting')
		editor.deleteShapes(editor.getSelectedShapeIds()) // delete the selected shapes
		expect(editor.getShape(ids.box3)).toBeUndefined()
		expect(editor.getShape(ids.box4)).toBeUndefined()
		expect(editor.getSelectedShapeIds()).toMatchObject([])
		editor.undo()
		expect(editor.getShape(ids.box3)).not.toBeUndefined()
		expect(editor.getShape(ids.box4)).not.toBeUndefined()
		expect(editor.getSelectedShapeIds()).toMatchObject([ids.box3, ids.box4])
		editor.redo()
		expect(editor.getShape(ids.box3)).toBeUndefined()
		expect(editor.getShape(ids.box4)).toBeUndefined()
		expect(editor.getSelectedShapeIds()).toMatchObject([])
	})

	it('Does nothing on an empty ids array', () => {
		editor.selectNone()
		const before = editor.store.serialize()
		editor.deleteShapes(editor.getSelectedShapeIds()) // should be a noop, nothing to delete
		expect(editor.store.serialize()).toStrictEqual(before)
	})

	it('Deletes descendants', () => {
		editor.reparentShapes([ids.box4], ids.box3)
		editor.select(ids.box3)
		editor.markHistoryStoppingPoint('before deleting')
		editor.deleteShapes(editor.getSelectedShapeIds()) // should be a noop, nothing to delete
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
	function bindings() {
		return getArrowBindings(editor, editor.getShape(ids.arrow1)!)
	}
	it('Restores any bindings on undo', () => {
		editor.select(ids.arrow1)
		editor.markHistoryStoppingPoint('before deleting')

		expect(bindings().start).toBeDefined()
		expect(bindings().end).toBeDefined()

		editor.deleteShapes(editor.getSelectedShapeIds()) // delete the selected shapes
		expect(editor.store.query.records('binding').get()).toHaveLength(0)

		editor.undo()
		expect(bindings().start).toBeDefined()
		expect(bindings().end).toBeDefined()
	})
})

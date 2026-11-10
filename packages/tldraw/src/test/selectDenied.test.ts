import { TLRecordChange, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

// Shapes can be created and deleted but not updated: read-only shapes.
const noUpdate = (change: TLRecordChange<any>) =>
	(change.next ?? change.prev).typeName !== 'shape' || change.type !== 'update'

const id = createShapeId('box')
let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ canChangeRecord: noUpdate })
	editor.createShapes([
		{ id, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100, fill: 'solid' } },
	])
})

describe('a shape the user may not update', () => {
	it('is selected by a click', () => {
		editor.click(150, 150)
		expect(editor.getSelectedShapeIds()).toEqual([id])
	})

	it('is selected by a brush', () => {
		editor.pointerDown(50, 50).pointerMove(250, 250).pointerUp(250, 250)
		expect(editor.getSelectedShapeIds()).toEqual([id])
	})

	it('is selected by select all', () => {
		editor.selectAll()
		expect(editor.getSelectedShapeIds()).toEqual([id])
	})

	it('is not moved by a drag, and the drag never starts', () => {
		const before = editor.getShape(id)
		editor.pointerDown(150, 150).pointerMove(300, 300)
		expect(editor.getPath()).not.toBe('select.translating')
		editor.pointerUp(300, 300)

		expect(editor.getShape(id)).toEqual(before)
		expect(editor.getPath()).toBe('select.idle')
		expect(editor.getSelectedShapeIds()).toEqual([id])
	})

	it('can be deleted once selected', () => {
		editor.click(150, 150)
		editor.deleteShapes(editor.getSelectedShapeIds())
		expect(editor.getShape(id)).toBeUndefined()
	})

	it('still is not selected by a click when it is locked', () => {
		editor = new TestEditor()
		editor.createShapes([
			{ id, type: 'geo', x: 100, y: 100, isLocked: true, props: { w: 100, h: 100, fill: 'solid' } },
		])
		editor.click(150, 150)
		expect(editor.getSelectedShapeIds()).toEqual([])
	})
})

import { createShapeId } from '@tldraw/tlschema'
import { createDefaultShapes, TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	ellipse1: createShapeId('ellipse1'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
})

it('Sets selected shapes', () => {
	expect(editor.selectedIds).toMatchObject([])
	editor.setSelectedIds([ids.box1, ids.box2])
	expect(editor.selectedIds).toMatchObject([ids.box1, ids.box2])
	editor.undo()
	expect(editor.selectedIds).toMatchObject([])
	editor.redo()
	expect(editor.selectedIds).toMatchObject([ids.box1, ids.box2])
})

it('Prevents parent and child from both being selected', () => {
	editor.setSelectedIds([ids.box2, ids.ellipse1]) // ellipse1 is child of box2
	expect(editor.selectedIds).toMatchObject([ids.box2])
})

it('Deleting the parent also deletes descendants', () => {
	editor.setSelectedIds([ids.box2])

	expect(editor.selectedIds).toMatchObject([ids.box2])
	expect(editor.getShapeById(ids.box2)).not.toBeUndefined()
	expect(editor.getShapeById(ids.ellipse1)).not.toBeUndefined()

	editor.mark('')
	editor.deleteShapes([ids.box2])

	expect(editor.selectedIds).toMatchObject([])
	expect(editor.getShapeById(ids.box2)).toBeUndefined()
	expect(editor.getShapeById(ids.ellipse1)).toBeUndefined()

	editor.undo()

	expect(editor.selectedIds).toMatchObject([ids.box2])
	expect(editor.getShapeById(ids.box2)).not.toBe(undefined)
	expect(editor.getShapeById(ids.ellipse1)).not.toBe(undefined)

	editor.redo()

	expect(editor.selectedIds).toMatchObject([])
	expect(editor.getShapeById(ids.box2)).toBeUndefined()
	expect(editor.getShapeById(ids.ellipse1)).toBeUndefined()
})

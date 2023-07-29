import { TAU, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	ellipse1: createShapeId('ellipse1'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{
			id: ids.box1,
			type: 'geo',
			x: 100,
			y: 100,
			props: {
				w: 100,
				h: 100,
				geo: 'rectangle',
			},
		},
		{
			id: ids.box2,
			type: 'geo',
			x: 200,
			y: 200,
			rotation: TAU / 2,
			props: {
				w: 100,
				h: 100,
				color: 'black',
				fill: 'none',
				dash: 'draw',
				size: 'm',
				geo: 'rectangle',
			},
		},
		{
			id: ids.ellipse1,
			type: 'geo',
			parentId: ids.box2, // parented to box 2
			x: 200,
			y: 200,
			props: {
				w: 50,
				h: 50,
				color: 'black',
				fill: 'none',
				dash: 'draw',
				size: 'm',
				geo: 'ellipse',
			},
		},
	])
})

it('Sets selected shapes', () => {
	editor.mark()

	expect(editor.selectedShapeIds).toMatchObject([])
	editor.setSelectedShapeIds([ids.box1, ids.box2])
	expect(editor.selectedShapeIds).toMatchObject([ids.box1, ids.box2])
	editor.undo()
	expect(editor.selectedShapeIds).toMatchObject([])
	editor.redo()
	expect(editor.selectedShapeIds).toMatchObject([ids.box1, ids.box2])
})

it('Prevents parent and child from both being selected', () => {
	editor.setSelectedShapeIds([ids.box2, ids.ellipse1]) // ellipse1 is child of box2
	expect(editor.selectedShapeIds).toMatchObject([ids.box2])
})

it('Deleting a shape also deselects it', () => {
	editor.setSelectedShapeIds([ids.box1])

	editor.mark('here')

	editor.deleteShapes([ids.box1])
	expect(editor.selectedShapeIds).toMatchObject([])

	editor.undo()

	expect(editor.selectedShapeIds).toMatchObject([ids.box1])

	editor.redo()

	expect(editor.selectedShapeIds).toMatchObject([])
})

it('Deleting the parent also deletes descendants', () => {
	editor.setSelectedShapeIds([ids.box2])

	editor.mark('here')

	expect(editor.selectedShapeIds).toMatchObject([ids.box2])
	expect(editor.getShape(ids.box2)).not.toBeUndefined()
	expect(editor.getShape(ids.ellipse1)).not.toBeUndefined()

	editor.mark('')
	editor.deleteShapes([ids.box2])

	expect(editor.selectedShapeIds).toMatchObject([])
	expect(editor.getShape(ids.box2)).toBeUndefined()
	expect(editor.getShape(ids.ellipse1)).toBeUndefined() // should be deleted because it was a descendant of box1

	editor.undo()

	expect(editor.selectedShapeIds).toMatchObject([ids.box2])
	expect(editor.getShape(ids.box2)).not.toBe(undefined)
	expect(editor.getShape(ids.ellipse1)).not.toBe(undefined)

	editor.redo()

	expect(editor.selectedShapeIds).toMatchObject([])
	expect(editor.getShape(ids.box2)).toBeUndefined()
	expect(editor.getShape(ids.ellipse1)).toBeUndefined()
})

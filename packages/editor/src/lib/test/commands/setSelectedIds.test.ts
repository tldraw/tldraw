import { createCustomShapeId } from '@tldraw/tlschema'
import { createDefaultShapes, TestApp } from '../TestApp'

let app: TestApp

const ids = {
	box1: createCustomShapeId('box1'),
	box2: createCustomShapeId('box2'),
	ellipse1: createCustomShapeId('ellipse1'),
}

beforeEach(() => {
	app = new TestApp()
	app.createShapes(createDefaultShapes())
})

it('Sets selected shapes', () => {
	expect(app.selectedIds).toMatchObject([])
	app.setSelectedIds([ids.box1, ids.box2])
	expect(app.selectedIds).toMatchObject([ids.box1, ids.box2])
	app.undo()
	expect(app.selectedIds).toMatchObject([])
	app.redo()
	expect(app.selectedIds).toMatchObject([ids.box1, ids.box2])
})

it('Prevents parent and child from both being selected', () => {
	app.setSelectedIds([ids.box2, ids.ellipse1]) // ellipse1 is child of box2
	expect(app.selectedIds).toMatchObject([ids.box2])
})

it('Deleting the parent also deletes descendants', () => {
	app.setSelectedIds([ids.box2])

	expect(app.selectedIds).toMatchObject([ids.box2])
	expect(app.getShapeById(ids.box2)).not.toBeUndefined()
	expect(app.getShapeById(ids.ellipse1)).not.toBeUndefined()

	app.mark('')
	app.deleteShapes([ids.box2])

	expect(app.selectedIds).toMatchObject([])
	expect(app.getShapeById(ids.box2)).toBeUndefined()
	expect(app.getShapeById(ids.ellipse1)).toBeUndefined()

	app.undo()

	expect(app.selectedIds).toMatchObject([ids.box2])
	expect(app.getShapeById(ids.box2)).not.toBe(undefined)
	expect(app.getShapeById(ids.ellipse1)).not.toBe(undefined)

	app.redo()

	expect(app.selectedIds).toMatchObject([])
	expect(app.getShapeById(ids.box2)).toBeUndefined()
	expect(app.getShapeById(ids.ellipse1)).toBeUndefined()
})

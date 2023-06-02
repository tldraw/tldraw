import { createCustomShapeId } from '@tldraw/tlschema'
import { createDefaultShapes, defaultShapesIds, TestEditor } from '../TestEditor'

let app: TestEditor

const ids = {
	...defaultShapesIds,
	box3: createCustomShapeId('box3'),
	box4: createCustomShapeId('box4'),
	box5: createCustomShapeId('box5'),
}

beforeEach(() => {
	app = new TestEditor()
	app.createShapes(createDefaultShapes())
	app.createShapes([
		{
			id: ids.box3,
			type: 'geo',
		},
		{
			id: ids.box4,
			type: 'geo',
		},
		{
			id: ids.box5,
			type: 'geo',
		},
	])
})

it('reparents a shape', () => {
	expect(app.getShapeById(ids.box2)!.parentId).toBe(app.currentPageId)
	app.reparentShapesById([ids.box2], ids.box1)
	expect(app.getShapeById(ids.box2)!.parentId).toBe(ids.box1)
	app.reparentShapesById([ids.box2], app.currentPageId)
	expect(app.getShapeById(ids.box2)!.parentId).toBe(app.currentPageId)
})

it('preserves shape page transfors', () => {
	const before = app.getShapeById(ids.box1)!
	const A = app.getPageTransformById(ids.box1)
	const A1 = app.getTransform(before)
	app.reparentShapesById([ids.box2], ids.box1)

	const after = app.getShapeById(ids.box1)!
	const B = app.getPageTransformById(ids.box1)!
	const B1 = app.getTransform(after)
	expect(A1).toMatchObject(B1)
	expect(A).toMatchObject(B)
})

it('adds children to the top of the parents children by default', () => {
	expect(app.getShapeById(ids.box2)!.index).toBe('a2')
	expect(app.getShapeById(ids.box3)!.index).toBe('a3')
	expect(app.getShapeById(ids.box4)!.index).toBe('a4')

	app.reparentShapesById([ids.box2, ids.box3], ids.box1)

	// Set the index based on the current children

	// When moving to an empty shape, start at a0
	expect(app.getShapeById(ids.box2)!.index).toBe('a1')
	expect(app.getShapeById(ids.box3)!.index).toBe('a2')

	app.reparentShapesById([ids.box2], app.currentPageId)

	// When moving back, place at the top of the stack
	expect(app.getShapeById(ids.box2)!.index).toBe('a6')
})

it('adds children at a given index', () => {
	expect(app.getShapeById(ids.box1)!.index).toBe('a1')
	expect(app.getShapeById(ids.box2)!.index).toBe('a2')
	expect(app.getShapeById(ids.box3)!.index).toBe('a3')
	expect(app.getShapeById(ids.box4)!.index).toBe('a4')
	expect(app.getShapeById(ids.box5)!.index).toBe('a5')

	// Page
	// - box1 a1
	// - box2 a2
	//   - ellipse1 a1
	// - box3 a3
	// - box4 a4
	// - box5 a5

	app.reparentShapesById([ids.box2], ids.box1)

	// Page
	// - box1 a1
	//   - box2 a1
	//     - ellipse1 a1
	// - box3 a3
	// - box4 a4
	// - box5 a5

	// Set the index based on the current children

	// When moving to an empty shape, start at a1
	expect(app.getShapeById(ids.box1)!.index).toBe('a1')
	expect(app.getShapeById(ids.box2)!.index).toBe('a1')
	expect(app.getShapeById(ids.box3)!.index).toBe('a3')
	expect(app.getShapeById(ids.box4)!.index).toBe('a4')
	expect(app.getShapeById(ids.box5)!.index).toBe('a5')
	expect(app.getShapeById(ids.ellipse1)!.index).toBe('a1')

	// Handles collisions (trying to move box3 to a0, but box2 is there already)
	app.reparentShapesById([ids.box3], ids.box1, 'a1')

	// Page
	// - box1 a1
	//   - box2 a1
	//     - ellipse1 a1
	//   - box3 a2
	// - box4 a4
	// - box5 a5

	expect(app.getShapeById(ids.box1)!.index).toBe('a1')
	expect(app.getShapeById(ids.box2)!.index).toBe('a1')
	expect(app.getShapeById(ids.box3)!.index).toBe('a2')
	expect(app.getShapeById(ids.box4)!.index).toBe('a4')
	expect(app.getShapeById(ids.box5)!.index).toBe('a5')
	expect(app.getShapeById(ids.ellipse1)!.index).toBe('a1')

	// Handles collisions (trying to move box5 to a0, but box2 is there already)
	// should end up between box 2 and box 3 (a0 and a1)
	app.reparentShapesById([ids.box5], ids.box1, 'a1')

	// Page
	// - box1 a1
	//   - box2 a1
	//     - ellipse1 a1
	//   - box5 a1V
	//   - box3 a2
	// - box4 a2

	expect(app.getShapeById(ids.box1)!.index).toBe('a1')
	expect(app.getShapeById(ids.box2)!.index).toBe('a1')
	expect(app.getShapeById(ids.box3)!.index).toBe('a2')
	expect(app.getShapeById(ids.box4)!.index).toBe('a4')
	expect(app.getShapeById(ids.box5)!.index).toBe('a1V')
	expect(app.getShapeById(ids.ellipse1)!.index).toBe('a1')

	// Handles collisions (trying to move boxes 2, 3, and 5 to a0, but box1 is there already)
	// Should order them between box1 and box4
	app.reparentShapesById([ids.box2, ids.box3, ids.box5], app.currentPageId, 'a1')

	// Page
	// - box1 a1
	// - box2 a1V
	//   - ellipse1 a1
	// - box3 a2
	// - box5 a3
	// - box4 a4

	expect(app.getShapeById(ids.box1)!.index).toBe('a1')
	expect(app.getShapeById(ids.box2)!.index).toBe('a1V')
	expect(app.getShapeById(ids.box3)!.index).toBe('a2')
	expect(app.getShapeById(ids.box4)!.index).toBe('a4')
	expect(app.getShapeById(ids.box5)!.index).toBe('a3')
	expect(app.getShapeById(ids.ellipse1)!.index).toBe('a1')
})

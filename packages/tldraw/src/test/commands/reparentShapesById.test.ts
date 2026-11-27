import { IndexKey, createShapeId } from '@tldraw/editor'
import { TestEditor, createDefaultShapes, defaultShapesIds } from '../TestEditor'

let editor: TestEditor

const ids = {
	...defaultShapesIds,
	box3: createShapeId('box3'),
	box4: createShapeId('box4'),
	box5: createShapeId('box5'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
	editor.createShapes([
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
	expect(editor.getShape(ids.box2)!.parentId).toBe(editor.getCurrentPageId())
	editor.reparentShapes([ids.box2], ids.box1)
	expect(editor.getShape(ids.box2)!.parentId).toBe(ids.box1)
	editor.reparentShapes([ids.box2], editor.getCurrentPageId())
	expect(editor.getShape(ids.box2)!.parentId).toBe(editor.getCurrentPageId())
})

it('preserves shape page transfors', () => {
	const before = editor.getShape(ids.box1)!
	const A = editor.getShapePageTransform(ids.box1)
	const A1 = editor.getShapeLocalTransform(before)
	editor.reparentShapes([ids.box2], ids.box1)

	const after = editor.getShape(ids.box1)!
	const B = editor.getShapePageTransform(ids.box1)!
	const B1 = editor.getShapeLocalTransform(after)
	expect(A1).toMatchObject(B1)
	expect(A).toMatchObject(B)
})

it('adds children to the top of the parents children by default', () => {
	expect(editor.getShape(ids.box2)!.index).toBe('a2')
	expect(editor.getShape(ids.box3)!.index).toBe('a3')
	expect(editor.getShape(ids.box4)!.index).toBe('a4')

	editor.reparentShapes([ids.box2, ids.box3], ids.box1)

	// Set the index based on the current children

	// When moving to an empty shape, start at a0
	expect(editor.getShape(ids.box2)!.index).toBe('a1')
	expect(editor.getShape(ids.box3)!.index).toBe('a2')

	editor.reparentShapes([ids.box2], editor.getCurrentPageId())

	// When moving back, place at the top of the stack
	expect(editor.getShape(ids.box2)!.index).toBe('a6')
})

it('adds children at a given index', () => {
	expect(editor.getShape(ids.box1)!.index).toBe('a1')
	expect(editor.getShape(ids.box2)!.index).toBe('a2')
	expect(editor.getShape(ids.box3)!.index).toBe('a3')
	expect(editor.getShape(ids.box4)!.index).toBe('a4')
	expect(editor.getShape(ids.box5)!.index).toBe('a5')

	// Page
	// - box1 a1
	// - box2 a2
	//   - ellipse1 a1
	// - box3 a3
	// - box4 a4
	// - box5 a5

	editor.reparentShapes([ids.box2], ids.box1)

	// Page
	// - box1 a1
	//   - box2 a1
	//     - ellipse1 a1
	// - box3 a3
	// - box4 a4
	// - box5 a5

	// Set the index based on the current children

	// When moving to an empty shape, start at a1
	expect(editor.getShape(ids.box1)!.index).toBe('a1')
	expect(editor.getShape(ids.box2)!.index).toBe('a1')
	expect(editor.getShape(ids.box3)!.index).toBe('a3')
	expect(editor.getShape(ids.box4)!.index).toBe('a4')
	expect(editor.getShape(ids.box5)!.index).toBe('a5')
	expect(editor.getShape(ids.ellipse1)!.index).toBe('a1')

	// Handles collisions (trying to move box3 to a0, but box2 is there already)
	editor.reparentShapes([ids.box3], ids.box1, 'a1' as IndexKey)

	// Page
	// - box1 a1
	//   - box2 a1
	//     - ellipse1 a1
	//   - box3 a2
	// - box4 a4
	// - box5 a5

	expect(editor.getShape(ids.box1)!.index).toBe('a1')
	expect(editor.getShape(ids.box2)!.index).toBe('a1')
	expect(editor.getShape(ids.box3)!.index).toBe('a2')
	expect(editor.getShape(ids.box4)!.index).toBe('a4')
	expect(editor.getShape(ids.box5)!.index).toBe('a5')
	expect(editor.getShape(ids.ellipse1)!.index).toBe('a1')

	// Handles collisions (trying to move box5 to a0, but box2 is there already)
	// should end up between box 2 and box 3 (a0 and a1)
	editor.reparentShapes([ids.box5], ids.box1, 'a1' as IndexKey)

	// Page
	// - box1 a1
	//   - box2 a1
	//     - ellipse1 a1
	//   - box5 a1V
	//   - box3 a2
	// - box4 a2

	expect(editor.getShape(ids.box1)!.index).toBe('a1')
	expect(editor.getShape(ids.box2)!.index).toBe('a1')
	expect(editor.getShape(ids.box3)!.index).toBe('a2')
	expect(editor.getShape(ids.box4)!.index).toBe('a4')
	expect(editor.getShape(ids.box5)!.index).toBe('a1V')
	expect(editor.getShape(ids.ellipse1)!.index).toBe('a1')

	// Handles collisions (trying to move boxes 2, 3, and 5 to a0, but box1 is there already)
	// Should order them between box1 and box4
	editor.reparentShapes([ids.box2, ids.box3, ids.box5], editor.getCurrentPageId(), 'a1' as IndexKey)

	// Page
	// - box1 a1
	// - box2 a1V
	//   - ellipse1 a1
	// - box5 a2
	// - box3 a3
	// - box4 a4

	expect(editor.getShape(ids.box1)!.index).toBe('a1')
	expect(editor.getShape(ids.box2)!.index).toBe('a1V')
	expect(editor.getShape(ids.box3)!.index).toBe('a3')
	expect(editor.getShape(ids.box4)!.index).toBe('a4')
	expect(editor.getShape(ids.box5)!.index).toBe('a2')
	expect(editor.getShape(ids.ellipse1)!.index).toBe('a1')
})

describe('reparents that would create a parent cycle (#6152)', () => {
	it('undoes a redone reparent that a remote change has since made cyclic', () => {
		editor.markHistoryStoppingPoint()
		editor.reparentShapes([ids.box1], ids.box2)
		editor.undo()
		editor.store.mergeRemoteChanges(() => {
			editor.store.put([{ ...editor.getShape(ids.box2)!, parentId: ids.box1 }])
		})
		const before = editor.getShape(ids.box1)!

		editor.redo()

		expect(editor.getShape(ids.box1)).toEqual(before)
		expect(editor.getShape(ids.box2)!.parentId).toBe(ids.box1)
	})

	it('keeps the previous parent, index and position of a remote change, and applies the rest', () => {
		editor.reparentShapes([ids.box2], ids.box1)
		const before = editor.getShape(ids.box1)!

		editor.store.mergeRemoteChanges(() => {
			editor.store.put([
				{ ...before, parentId: ids.box2, index: 'a9' as IndexKey, x: 999, opacity: 0.5 },
			])
		})

		expect(editor.getShape(ids.box1)).toEqual({ ...before, opacity: 0.5 })
		expect(editor.getShape(ids.box2)!.parentId).toBe(ids.box1)
	})

	it('leaves a remote reparent that forms no cycle alone', () => {
		editor.store.mergeRemoteChanges(() => {
			editor.store.put([{ ...editor.getShape(ids.box3)!, parentId: ids.box1 }])
		})
		expect(editor.getShape(ids.box3)!.parentId).toBe(ids.box1)
	})
})

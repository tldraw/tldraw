import { createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	lockedShapeA: createShapeId('boxA'),
	unlockedShapeA: createShapeId('boxB'),
	unlockedShapeB: createShapeId('boxC'),
	lockedShapeB: createShapeId('boxD'),
	lockedGroup: createShapeId('lockedGroup'),
	groupedBoxA: createShapeId('grouppedBoxA'),
	groupedBoxB: createShapeId('grouppedBoxB'),
	lockedFrame: createShapeId('lockedFrame'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.selectAll()
	editor.deleteShapes(editor.getSelectedShapeIds())
	editor.createShapes([
		{
			id: ids.lockedShapeA,
			type: 'geo',
			x: 0,
			y: 0,
			isLocked: true,
		},
		{
			id: ids.lockedShapeB,
			type: 'geo',
			x: 100,
			y: 100,
			isLocked: true,
		},
		{
			id: ids.unlockedShapeA,
			type: 'geo',
			x: 200,
			y: 200,
			isLocked: false,
		},
		{
			id: ids.unlockedShapeB,
			type: 'geo',
			x: 300,
			y: 300,
			isLocked: false,
		},
		{
			id: ids.lockedGroup,
			type: 'group',
			x: 800,
			y: 800,
			isLocked: true,
		},
		{
			id: ids.groupedBoxA,
			type: 'geo',
			x: 1000,
			y: 1000,
			parentId: ids.lockedGroup,
			isLocked: false,
		},
		{
			id: ids.groupedBoxB,
			type: 'geo',
			x: 1200,
			y: 1200,
			parentId: ids.lockedGroup,
			isLocked: false,
		},
		{
			id: ids.lockedFrame,
			type: 'frame',
			x: 1600,
			y: 1600,
			isLocked: true,
		},
	])
})

describe('Locking', () => {
	it('Can lock shapes', () => {
		editor.setSelectedShapes([ids.unlockedShapeA])
		editor.toggleLock(editor.getSelectedShapeIds())
		expect(editor.getShape(ids.unlockedShapeA)!.isLocked).toBe(true)
		// Locking deselects the shape
		expect(editor.getSelectedShapeIds()).toEqual([])
	})
})

describe('Locked shapes', () => {
	it('Cannot be deleted', () => {
		const numberOfShapesBefore = editor.getCurrentPageShapes().length
		editor.deleteShapes([ids.lockedShapeA])
		expect(editor.getCurrentPageShapes().length).toBe(numberOfShapesBefore)
	})

	it('Cannot be changed', () => {
		const xBefore = editor.getShape(ids.lockedShapeA)!.x
		editor.updateShapes([{ id: ids.lockedShapeA, type: 'geo', x: 100 }])
		expect(editor.getShape(ids.lockedShapeA)!.x).toBe(xBefore)
	})

	it('Cannot be moved', () => {
		const shape = editor.getShape(ids.lockedShapeA)
		editor.pointerDown(150, 150, { target: 'shape', shape })
		editor.expectToBeIn('select.pointing_canvas')

		editor.pointerMove(10, 10)
		editor.expectToBeIn('select.brushing')

		editor.pointerUp()
		editor.expectToBeIn('select.idle')
	})

	it('Cannot be selected with select all', () => {
		editor.selectAll()
		expect(editor.getSelectedShapeIds()).toEqual([ids.unlockedShapeA, ids.unlockedShapeB])
	})

	it('Cannot be selected by clicking', () => {
		const shape = editor.getShape(ids.lockedShapeA)!

		editor
			.pointerDown(10, 10, { target: 'shape', shape })
			.expectToBeIn('select.pointing_canvas')
			.pointerUp()
			.expectToBeIn('select.idle')
		expect(editor.getSelectedShapeIds()).not.toContain(shape.id)
	})

	it('Cannot be edited', () => {
		const shape = editor.getShape(ids.lockedShapeA)!
		const shapeCount = editor.getCurrentPageShapes().length

		// We create a new shape and we edit that one
		editor.doubleClick(10, 10, { target: 'shape', shape }).expectToBeIn('select.editing_shape')
		expect(editor.getCurrentPageShapes().length).toBe(shapeCount + 1)
		expect(editor.getSelectedShapeIds()).not.toContain(shape.id)
	})

	it('Cannot be grouped', () => {
		const shapeCount = editor.getCurrentPageShapes().length
		const parentBefore = editor.getShape(ids.lockedShapeA)!.parentId

		editor.groupShapes([ids.lockedShapeA, ids.unlockedShapeA, ids.unlockedShapeB])
		expect(editor.getCurrentPageShapes().length).toBe(shapeCount + 1)

		const parentAfter = editor.getShape(ids.lockedShapeA)!.parentId
		expect(parentAfter).toBe(parentBefore)
	})
})

describe('Unlocking', () => {
	it('Can unlock shapes', () => {
		editor.setSelectedShapes([ids.lockedShapeA, ids.lockedShapeB])
		const getLockedStatus = () =>
			[ids.lockedShapeA, ids.lockedShapeB].map((id) => editor.getShape(id)!.isLocked)
		expect(getLockedStatus()).toStrictEqual([true, true])
		editor.toggleLock(editor.getSelectedShapeIds())
		expect(getLockedStatus()).toStrictEqual([false, false])
	})
})

describe('When forced', () => {
	it('Can be deleted', () => {
		editor.run(
			() => {
				const numberOfShapesBefore = editor.getCurrentPageShapes().length
				editor.deleteShapes([ids.lockedShapeA])
				expect(editor.getCurrentPageShapes().length).toBe(numberOfShapesBefore - 1)
			},
			{ ignoreShapeLock: true }
		)
	})

	it('Can be changed', () => {
		editor.run(
			() => {
				editor.updateShapes([{ id: ids.lockedShapeA, type: 'geo', x: 100 }])
				expect(editor.getShape(ids.lockedShapeA)!.x).toBe(100)
			},
			{ ignoreShapeLock: true }
		)
	})

	it('Can be grouped / ungrouped', () => {
		editor.run(
			() => {
				const shapeCount = editor.getCurrentPageShapes().length
				editor.groupShapes([ids.lockedShapeA, ids.unlockedShapeA, ids.unlockedShapeB])
				expect(editor.getCurrentPageShapes().length).toBe(shapeCount + 1)
				expect(editor.getShape(ids.lockedShapeA)!.parentId).not.toBe(editor.getCurrentPageId())
			},
			{ ignoreShapeLock: true }
		)
	})

	it('Cannot be moved', () => {
		editor.run(
			() => {
				const shape = editor.getShape(ids.lockedShapeA)
				editor.pointerDown(150, 150, { target: 'shape', shape })
				editor.expectToBeIn('select.pointing_canvas')

				editor.pointerMove(10, 10)
				editor.expectToBeIn('select.brushing')

				editor.pointerUp()
				editor.expectToBeIn('select.idle')
			},
			{ ignoreShapeLock: true }
		)
	})

	it('Can be selected with select all', () => {
		editor.run(
			() => {
				editor.selectAll()
				expect(editor.getSelectedShapeIds()).toEqual([ids.unlockedShapeA, ids.unlockedShapeB])
			},
			{ ignoreShapeLock: true }
		)
	})

	it('Cannot be selected by clicking', () => {
		editor.run(
			() => {
				const shape = editor.getShape(ids.lockedShapeA)!

				editor
					.pointerDown(10, 10, { target: 'shape', shape })
					.expectToBeIn('select.pointing_canvas')
					.pointerUp()
					.expectToBeIn('select.idle')
				expect(editor.getSelectedShapeIds()).not.toContain(shape.id)
			},
			{ ignoreShapeLock: true }
		)
	})

	it('Cannot be edited', () => {
		editor.run(
			() => {
				const shape = editor.getShape(ids.lockedShapeA)!
				const shapeCount = editor.getCurrentPageShapes().length

				// We create a new shape and we edit that one
				editor.doubleClick(10, 10, { target: 'shape', shape }).expectToBeIn('select.editing_shape')
				expect(editor.getCurrentPageShapes().length).toBe(shapeCount + 1)
				expect(editor.getSelectedShapeIds()).not.toContain(shape.id)
			},
			{ ignoreShapeLock: true }
		)
	})
})

it('does not update a locked shape, even if spreading in a full shape', () => {
	const myShapeId = createShapeId()
	editor.createShape({ id: myShapeId, type: 'geo', isLocked: true })
	const myLockedShape = editor.getShape(myShapeId)!
	// include the `isLocked` property, but don't change it
	editor.updateShape({ ...myLockedShape, x: 100 })
	expect(editor.getShape(myShapeId)).toMatchObject(myLockedShape)
})

it('works when forced', () => {
	const myShapeId = createShapeId()
	editor.createShape({ id: myShapeId, type: 'geo', isLocked: true })
	const myLockedShape = editor.getShape(myShapeId)!

	// no change from update
	editor.updateShape({ ...myLockedShape, x: 100 })
	expect(editor.getShape(myShapeId)).toMatchObject(myLockedShape)

	// no change from delete
	editor.deleteShapes([myLockedShape])
	expect(editor.getShape(myShapeId)).toMatchObject(myLockedShape)

	// update works
	editor.run(
		() => {
			editor.updateShape({ ...myLockedShape, x: 100 })
		},
		{ ignoreShapeLock: true }
	)
	expect(editor.getShape(myShapeId)).toMatchObject({ ...myLockedShape, x: 100 })

	// delete works
	editor.run(
		() => {
			editor.deleteShapes([myLockedShape])
		},
		{ ignoreShapeLock: true }
	)
	expect(editor.getShape(myShapeId)).toBeUndefined()
})

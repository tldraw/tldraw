import { createShapeId } from '@tldraw/tlschema'
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
	editor.deleteShapes()
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
		editor.setSelectedIds([ids.unlockedShapeA])
		editor.toggleLock()
		expect(editor.getShapeById(ids.unlockedShapeA)!.isLocked).toBe(true)
		// Locking deselects the shape
		expect(editor.selectedIds).toEqual([])
	})
})

describe('Locked shapes', () => {
	it('Cannot be deleted', () => {
		const numberOfShapesBefore = editor.shapesArray.length
		editor.deleteShapes([ids.lockedShapeA])
		expect(editor.shapesArray.length).toBe(numberOfShapesBefore)
	})

	it('Cannot be changed', () => {
		const xBefore = editor.getShapeById(ids.lockedShapeA)!.x
		editor.updateShapes([{ id: ids.lockedShapeA, type: 'geo', x: 100 }])
		expect(editor.getShapeById(ids.lockedShapeA)!.x).toBe(xBefore)
	})

	it('Cannot be moved', () => {
		const shape = editor.getShapeById(ids.lockedShapeA)
		editor.pointerDown(150, 150, { target: 'shape', shape })
		editor.expectToBeIn('select.idle')

		editor.pointerMove(10, 10)
		editor.expectToBeIn('select.idle')

		editor.pointerUp()
		editor.expectToBeIn('select.idle')
	})

	it('Cannot be selected with select all', () => {
		editor.selectAll()
		expect(editor.selectedIds).toEqual([ids.unlockedShapeA, ids.unlockedShapeB])
	})

	it('Cannot be selected by clicking', () => {
		const shape = editor.getShapeById(ids.lockedShapeA)!

		editor
			.pointerDown(10, 10, { target: 'shape', shape })
			.expectToBeIn('select.idle')
			.pointerUp()
			.expectToBeIn('select.idle')
		expect(editor.selectedIds).not.toContain(shape.id)
	})

	it('Cannot be edited', () => {
		const shape = editor.getShapeById(ids.lockedShapeA)!
		const shapeCount = editor.shapesArray.length

		// We create a new shape and we edit that one
		editor.doubleClick(10, 10, { target: 'shape', shape }).expectToBeIn('select.editing_shape')
		expect(editor.shapesArray.length).toBe(shapeCount + 1)
		expect(editor.selectedIds).not.toContain(shape.id)
	})

	it('Cannot be grouped', () => {
		const shapeCount = editor.shapesArray.length
		const parentBefore = editor.getShapeById(ids.lockedShapeA)!.parentId

		editor.groupShapes([ids.lockedShapeA, ids.unlockedShapeA, ids.unlockedShapeB])
		expect(editor.shapesArray.length).toBe(shapeCount + 1)

		const parentAfter = editor.getShapeById(ids.lockedShapeA)!.parentId
		expect(parentAfter).toBe(parentBefore)
	})

	it('Locked frames do not accept new shapes', () => {
		const frame = editor.getShapeById(ids.lockedFrame)!
		const frameUtil = editor.getShapeUtil(frame)

		expect(frameUtil.canReceiveNewChildrenOfType(frame, 'box')).toBe(false)
		const shape = editor.getShapeById(ids.lockedShapeA)!
		expect(frameUtil.canDropShapes(frame, [shape])).toBe(false)
	})
})

describe('Unlocking', () => {
	it('Can unlock shapes', () => {
		editor.setSelectedIds([ids.lockedShapeA, ids.lockedShapeB])
		let lockedStatus = [ids.lockedShapeA, ids.lockedShapeB].map(
			(id) => editor.getShapeById(id)!.isLocked
		)
		expect(lockedStatus).toStrictEqual([true, true])
		editor.toggleLock()
		lockedStatus = [ids.lockedShapeA, ids.lockedShapeB].map(
			(id) => editor.getShapeById(id)!.isLocked
		)
		expect(lockedStatus).toStrictEqual([false, false])
	})
})

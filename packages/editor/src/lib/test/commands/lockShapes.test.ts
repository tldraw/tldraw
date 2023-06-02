import { createCustomShapeId } from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'
let app: TestEditor

const ids = {
	lockedShapeA: createCustomShapeId('boxA'),
	unlockedShapeA: createCustomShapeId('boxB'),
	unlockedShapeB: createCustomShapeId('boxC'),
	lockedShapeB: createCustomShapeId('boxD'),
	lockedGroup: createCustomShapeId('lockedGroup'),
	groupedBoxA: createCustomShapeId('grouppedBoxA'),
	groupedBoxB: createCustomShapeId('grouppedBoxB'),
	lockedFrame: createCustomShapeId('lockedFrame'),
}

beforeEach(() => {
	app = new TestEditor()
	app.selectAll()
	app.deleteShapes()
	app.createShapes([
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
		app.setSelectedIds([ids.unlockedShapeA])
		app.toggleLock()
		expect(app.getShapeById(ids.unlockedShapeA)!.isLocked).toBe(true)
		// Locking deselects the shape
		expect(app.selectedIds).toEqual([])
	})
})

describe('Locked shapes', () => {
	it('Cannot be deleted', () => {
		const numberOfShapesBefore = app.shapesArray.length
		app.deleteShapes([ids.lockedShapeA])
		expect(app.shapesArray.length).toBe(numberOfShapesBefore)
	})

	it('Cannot be changed', () => {
		const xBefore = app.getShapeById(ids.lockedShapeA)!.x
		app.updateShapes([{ id: ids.lockedShapeA, type: 'geo', x: 100 }])
		expect(app.getShapeById(ids.lockedShapeA)!.x).toBe(xBefore)
	})

	it('Cannot be moved', () => {
		const shape = app.getShapeById(ids.lockedShapeA)
		app.pointerDown(150, 150, { target: 'shape', shape })
		app.expectToBeIn('select.idle')

		app.pointerMove(10, 10)
		app.expectToBeIn('select.idle')

		app.pointerUp()
		app.expectToBeIn('select.idle')
	})

	it('Cannot be selected with select all', () => {
		app.selectAll()
		expect(app.selectedIds).toEqual([ids.unlockedShapeA, ids.unlockedShapeB])
	})

	it('Cannot be selected by clicking', () => {
		const shape = app.getShapeById(ids.lockedShapeA)!

		app
			.pointerDown(10, 10, { target: 'shape', shape })
			.expectToBeIn('select.idle')
			.pointerUp()
			.expectToBeIn('select.idle')
		expect(app.selectedIds).not.toContain(shape.id)
	})

	it('Cannot be edited', () => {
		const shape = app.getShapeById(ids.lockedShapeA)!
		const shapeCount = app.shapesArray.length

		// We create a new shape and we edit that one
		app.doubleClick(10, 10, { target: 'shape', shape }).expectToBeIn('select.editing_shape')
		expect(app.shapesArray.length).toBe(shapeCount + 1)
		expect(app.selectedIds).not.toContain(shape.id)
	})

	it('Cannot be grouped', () => {
		const shapeCount = app.shapesArray.length
		const parentBefore = app.getShapeById(ids.lockedShapeA)!.parentId

		app.groupShapes([ids.lockedShapeA, ids.unlockedShapeA, ids.unlockedShapeB])
		expect(app.shapesArray.length).toBe(shapeCount + 1)

		const parentAfter = app.getShapeById(ids.lockedShapeA)!.parentId
		expect(parentAfter).toBe(parentBefore)
	})

	it('Locked frames do not accept new shapes', () => {
		const frame = app.getShapeById(ids.lockedFrame)!
		const frameUtil = app.getShapeUtil(frame)

		expect(frameUtil.canReceiveNewChildrenOfType(frame, 'box')).toBe(false)
		const shape = app.getShapeById(ids.lockedShapeA)!
		expect(frameUtil.canDropShapes(frame, [shape])).toBe(false)
	})
})

describe('Unlocking', () => {
	it('Can unlock shapes', () => {
		app.setSelectedIds([ids.lockedShapeA, ids.lockedShapeB])
		let lockedStatus = [ids.lockedShapeA, ids.lockedShapeB].map(
			(id) => app.getShapeById(id)!.isLocked
		)
		expect(lockedStatus).toStrictEqual([true, true])
		app.toggleLock()
		lockedStatus = [ids.lockedShapeA, ids.lockedShapeB].map((id) => app.getShapeById(id)!.isLocked)
		expect(lockedStatus).toStrictEqual([false, false])
	})
})

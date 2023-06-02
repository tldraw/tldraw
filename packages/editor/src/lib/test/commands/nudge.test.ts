import { createCustomShapeId, TLShapeId } from '@tldraw/tlschema'
import { TestApp } from '../TestEditor'

let app: TestApp

const ids = {
	boxA: createCustomShapeId('boxA'),
	boxB: createCustomShapeId('boxB'),
}

beforeEach(() => {
	app = new TestApp()
	app.createShapes([
		{
			id: ids.boxA,
			type: 'geo',
			x: 10,
			y: 10,
			props: {
				w: 100,
				h: 100,
			},
		},
		{
			id: ids.boxB,
			type: 'geo',
			x: 27,
			y: 13,
			props: {
				w: 120,
				h: 167,
			},
		},
	])
})

function nudgeAndGet(ids: TLShapeId[], key: string, shiftKey: boolean) {
	switch (key) {
		case 'ArrowLeft': {
			app.mark('nudge')
			app.nudgeShapes(app.selectedIds, { x: -1, y: 0 }, shiftKey)
			break
		}
		case 'ArrowRight': {
			app.mark('nudge')
			app.nudgeShapes(app.selectedIds, { x: 1, y: 0 }, shiftKey)
			break
		}
		case 'ArrowUp': {
			app.mark('nudge')
			app.nudgeShapes(app.selectedIds, { x: 0, y: -1 }, shiftKey)
			break
		}
		case 'ArrowDown': {
			app.mark('nudge')
			app.nudgeShapes(app.selectedIds, { x: 0, y: 1 }, shiftKey)
			break
		}
	}

	const shapes = ids.map((id) => app.getShapeById(id)!)
	return shapes.map((shape) => ({ x: shape.x, y: shape.y }))
}

function getShape(ids: TLShapeId[]) {
	const shapes = ids.map((id) => app.getShapeById(id)!)
	return shapes.map((shape) => ({ x: shape.x, y: shape.y }))
}

describe('When a shape is selected...', () => {
	it('nudges and undoes', () => {
		app.setSelectedIds([ids.boxA])

		app.keyDown('ArrowUp')
		expect(app.selectedPageBounds).toMatchObject({ x: 10, y: 9 })
		app.keyUp('ArrowUp')

		app.undo()
		expect(app.selectedPageBounds).toMatchObject({ x: 10, y: 10 })

		app.redo()
		expect(app.selectedPageBounds).toMatchObject({ x: 10, y: 9 })
	})

	it('nudges and holds', () => {
		app.setSelectedIds([ids.boxA])

		app.keyDown('ArrowUp')
		app.keyRepeat('ArrowUp')
		app.keyRepeat('ArrowUp')
		app.keyRepeat('ArrowUp')
		app.keyRepeat('ArrowUp')
		app.keyUp('ArrowUp')

		expect(app.selectedPageBounds).toMatchObject({ x: 10, y: 5 })

		// Undoing should go back to the keydown state, all those
		// repeats should be ephemeral and squashed down
		app.undo()
		expect(app.selectedPageBounds).toMatchObject({ x: 10, y: 10 })

		app.redo()
		expect(app.selectedPageBounds).toMatchObject({ x: 10, y: 5 })
	})

	it('nudges a shape correctly', () => {
		app.setSelectedIds([ids.boxA])

		app.keyDown('ArrowUp')
		expect(app.selectedPageBounds).toMatchObject({ x: 10, y: 9 })
		app.keyUp('ArrowUp')

		app.keyDown('ArrowRight')
		expect(app.selectedPageBounds).toMatchObject({ x: 11, y: 9 })
		app.keyUp('ArrowRight')

		app.keyDown('ArrowDown')
		expect(app.selectedPageBounds).toMatchObject({ x: 11, y: 10 })
		app.keyUp('ArrowDown')

		app.keyDown('ArrowLeft')
		expect(app.selectedPageBounds).toMatchObject({ x: 10, y: 10 })
		app.keyUp('ArrowLeft')
	})
})

// The tests below were written before the tests above; they all still work
// but there may be some redundancy. They may cover a few cases that aren't
// covered above though.

describe('When a shape is rotated...', () => {
	it('Translates correctly in page space', () => {
		// Rotate boxB by 90 degrees and move it to 0,0 for simplicity's sake
		app.select(ids.boxB)
		app.rotateShapesBy([ids.boxB], Math.PI / 2)
		app.updateShapes([{ id: ids.boxB, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
		// Make box A a child of box B
		app.reparentShapesById([ids.boxA], ids.boxB)
		// app.updateShapes([{ id: ids.boxB, type: 'geo', x: 10, y: 10 }])

		// Here's the selection page bounds and shape before we nudge it
		app.setSelectedIds([ids.boxA])
		expect(app.selectedPageBounds).toCloselyMatchObject({ x: 10, y: 10, w: 100, h: 100 })
		expect(app.getShapeById(ids.boxA)).toCloselyMatchObject({ x: 10, y: -10 })

		// Select box A and move it up. The page bounds should move up, but the
		// shape should move left (since its parent is rotated 90 degrees)
		app.keyDown('ArrowUp')
		expect(app.selectedPageBounds).toMatchObject({ x: 10, y: 9, w: 100, h: 100 })
		expect(app.getShapeById(ids.boxA)).toMatchObject({ x: 9, y: -10 })
		app.keyUp('ArrowUp')
	})
})

describe('When a shape is selected...', () => {
	it('nudges a shape correctly', () => {
		app.setSelectedIds([ids.boxA])

		expect(nudgeAndGet([ids.boxA], 'ArrowUp', false)).toMatchObject([{ x: 10, y: 9 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowRight', false)).toMatchObject([{ x: 11, y: 9 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowDown', false)).toMatchObject([{ x: 11, y: 10 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowLeft', false)).toMatchObject([{ x: 10, y: 10 }])
	})

	it('nudges a shape with shift key pressed', () => {
		app.setSelectedIds([ids.boxA])

		expect(nudgeAndGet([ids.boxA], 'ArrowUp', true)).toMatchObject([{ x: 10, y: 0 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowRight', true)).toMatchObject([{ x: 20, y: 0 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowDown', true)).toMatchObject([{ x: 20, y: 10 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowLeft', true)).toMatchObject([{ x: 10, y: 10 }])
	})

	it.todo('updates bound shapes')
})

describe('When grid is enabled...', () => {
	it('nudges a shape correctly', () => {
		app.updateUserDocumentSettings({
			isGridMode: true,
		})
		app.setSelectedIds([ids.boxA])

		expect(nudgeAndGet([ids.boxA], 'ArrowUp', false)).toMatchObject([{ x: 10, y: 0 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowRight', false)).toMatchObject([{ x: 20, y: 0 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowDown', false)).toMatchObject([{ x: 20, y: 10 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowLeft', false)).toMatchObject([{ x: 10, y: 10 }])
	})

	it('nudges a shape with shift key pressed', () => {
		app.updateUserDocumentSettings({
			isGridMode: true,
		})
		app.setSelectedIds([ids.boxA])

		expect(nudgeAndGet([ids.boxA], 'ArrowUp', true)).toMatchObject([{ x: 10, y: -40 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowRight', true)).toMatchObject([{ x: 60, y: -40 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowDown', true)).toMatchObject([{ x: 60, y: 10 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowLeft', true)).toMatchObject([{ x: 10, y: 10 }])
	})
})

describe('When multiple shapes are selected...', () => {
	it('Nudges all shapes correctly', () => {
		app.setSelectedIds([ids.boxA, ids.boxB])

		expect(nudgeAndGet([ids.boxA, ids.boxB], 'ArrowUp', false)).toMatchObject([
			{ x: 10, y: 9 },
			{ x: 27, y: 12 },
		])
		expect(nudgeAndGet([ids.boxA, ids.boxB], 'ArrowRight', false)).toMatchObject([
			{ x: 11, y: 9 },
			{ x: 28, y: 12 },
		])
		expect(nudgeAndGet([ids.boxA, ids.boxB], 'ArrowDown', false)).toMatchObject([
			{ x: 11, y: 10 },
			{ x: 28, y: 13 },
		])
		expect(nudgeAndGet([ids.boxA, ids.boxB], 'ArrowLeft', false)).toMatchObject([
			{ x: 10, y: 10 },
			{ x: 27, y: 13 },
		])
	})
})

describe('When undo redo is on...', () => {
	it('Does not nudge any shapes', () => {
		app.setSelectedIds([ids.boxA])

		expect(nudgeAndGet([ids.boxA], 'ArrowUp', false)).toMatchObject([{ x: 10, y: 9 }])
		app.undo()
		expect(getShape([ids.boxA])).toMatchObject([{ x: 10, y: 10 }])
		app.redo()
		expect(getShape([ids.boxA])).toMatchObject([{ x: 10, y: 9 }])

		expect(nudgeAndGet([ids.boxA], 'ArrowRight', false)).toMatchObject([{ x: 11, y: 9 }])
		app.undo()
		expect(getShape([ids.boxA])).toMatchObject([{ x: 10, y: 9 }])
		app.redo()
		expect(getShape([ids.boxA])).toMatchObject([{ x: 11, y: 9 }])
	})
})

describe('When nudging a rotated shape...', () => {
	it('Moves the page point correctly', () => {
		app.setSelectedIds([ids.boxA])
		const shapeA = app.getShapeById(ids.boxA)!

		app.updateShapes([{ id: ids.boxA, type: shapeA.type, rotation: 90 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowRight', false)).toMatchObject([{ x: 11, y: 10 }])

		app.updateShapes([{ id: ids.boxA, type: shapeA.type, rotation: -90 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowDown', false)).toMatchObject([{ x: 11, y: 11 }])
	})
})

describe('When nudging multiple rotated shapes...', () => {
	it('Moves the page point correctly', () => {
		app.setSelectedIds([ids.boxA, ids.boxB])
		const shapeA = app.getShapeById(ids.boxA)!
		const shapeB = app.getShapeById(ids.boxB)!

		app.updateShapes([
			{
				...shapeA,
				rotation: 90,
			},
			{
				...shapeB,
				rotation: -90,
			},
		])
		expect(nudgeAndGet([ids.boxA, ids.boxB], 'ArrowRight', false)).toMatchObject([
			{ x: 11, y: 10 },
			{ x: 28, y: 13 },
		])

		app.updateShapes([
			{
				id: shapeA.id,
				type: shapeA.type,
				rotation: -90,
			},
			{
				id: shapeB.id,
				type: shapeB.type,
				rotation: 90,
			},
		])
		expect(nudgeAndGet([ids.boxA, ids.boxB], 'ArrowDown', false)).toMatchObject([
			{ x: 11, y: 11 },
			{ x: 28, y: 14 },
		])
	})
})

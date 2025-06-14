import { TLShapeId, Vec, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	boxA: createShapeId('boxA'),
	boxB: createShapeId('boxB'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
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
	const step = editor.getInstanceState().isGridMode ? (shiftKey ? 50 : 10) : shiftKey ? 10 : 1
	switch (key) {
		case 'ArrowLeft': {
			editor.markHistoryStoppingPoint('nudge')
			editor.nudgeShapes(editor.getSelectedShapeIds(), new Vec(-step, 0))
			break
		}
		case 'ArrowRight': {
			editor.markHistoryStoppingPoint('nudge')
			editor.nudgeShapes(editor.getSelectedShapeIds(), new Vec(step, 0))
			break
		}
		case 'ArrowUp': {
			editor.markHistoryStoppingPoint('nudge')
			editor.nudgeShapes(editor.getSelectedShapeIds(), new Vec(0, -step))
			break
		}
		case 'ArrowDown': {
			editor.markHistoryStoppingPoint('nudge')
			editor.nudgeShapes(editor.getSelectedShapeIds(), new Vec(0, step))
			break
		}
	}

	const shapes = ids.map((id) => editor.getShape(id)!)
	return shapes.map((shape) => ({ x: shape.x, y: shape.y }))
}

function getShape(ids: TLShapeId[]) {
	const shapes = ids.map((id) => editor.getShape(id)!)
	return shapes.map((shape) => ({ x: shape.x, y: shape.y }))
}

describe('When a shape is selected...', () => {
	it('nudges and undoes', () => {
		editor.setSelectedShapes([ids.boxA])

		editor.keyDown('ArrowUp')
		expect(editor.getSelectionPageBounds()).toMatchObject({ x: 10, y: 9 })
		editor.keyUp('ArrowUp')

		editor.undo()
		expect(editor.getSelectionPageBounds()).toMatchObject({ x: 10, y: 10 })

		editor.redo()
		expect(editor.getSelectionPageBounds()).toMatchObject({ x: 10, y: 9 })
	})

	it('nudges and holds', () => {
		editor.setSelectedShapes([ids.boxA])

		editor.keyDown('ArrowUp')
		editor.keyRepeat('ArrowUp')
		editor.keyRepeat('ArrowUp')
		editor.keyRepeat('ArrowUp')
		editor.keyRepeat('ArrowUp')
		editor.keyUp('ArrowUp')

		expect(editor.getSelectionPageBounds()).toMatchObject({ x: 10, y: 5 })

		// Undoing should go back to the keydown state, all those
		// repeats should be ephemeral and squashed down
		editor.undo()
		expect(editor.getSelectionPageBounds()).toMatchObject({ x: 10, y: 10 })

		editor.redo()
		expect(editor.getSelectionPageBounds()).toMatchObject({ x: 10, y: 5 })
	})

	it('nudges a shape correctly', () => {
		editor.setSelectedShapes([ids.boxA])

		editor.keyDown('ArrowUp')
		expect(editor.getSelectionPageBounds()).toMatchObject({ x: 10, y: 9 })
		editor.keyUp('ArrowUp')

		editor.keyDown('ArrowRight')
		expect(editor.getSelectionPageBounds()).toMatchObject({ x: 11, y: 9 })
		editor.keyUp('ArrowRight')

		editor.keyDown('ArrowDown')
		expect(editor.getSelectionPageBounds()).toMatchObject({ x: 11, y: 10 })
		editor.keyUp('ArrowDown')

		editor.keyDown('ArrowLeft')
		expect(editor.getSelectionPageBounds()).toMatchObject({ x: 10, y: 10 })
		editor.keyUp('ArrowLeft')
	})
})

// The tests below were written before the tests above; they all still work
// but there may be some redundancy. They may cover a few cases that aren't
// covered above though.

describe('When a shape is rotated...', () => {
	it('Translates correctly in page space', () => {
		editor.createShape({ type: 'frame', x: 0, y: 0, props: { w: 200, h: 200 } })
		const frame = editor.getLastCreatedShape()
		editor.reparentShapes([ids.boxA], frame.id)
		editor.updateShape({ id: ids.boxA, type: 'geo', x: 10, y: 10, props: { w: 100, h: 100 } })

		// Here's the selection page bounds and shape before we nudge it
		editor.setSelectedShapes([ids.boxA])
		expect(editor.getSelectionPageBounds()).toCloselyMatchObject({ x: 10, y: 10, w: 100, h: 100 })
		expect(editor.getShape(ids.boxA)).toCloselyMatchObject({ x: 10, y: 10 })

		// Select box A and move it up.
		editor.keyDown('ArrowUp')
		editor.keyUp('ArrowUp')
		expect(editor.getShape(ids.boxA)).toMatchObject({ x: 10, y: 9 })
		expect(editor.getSelectionPageBounds()).toMatchObject({ x: 10, y: 9, w: 100, h: 100 })

		editor.updateShape({ id: frame.id, type: 'frame', rotation: Math.PI / 2, x: 100 })

		expect(editor.getShape(ids.boxA)).toMatchObject({ x: 10, y: 9 })
		expect(editor.getSelectionPageBounds()).toMatchObject({ x: -9, y: 10, w: 100, h: 100 })

		editor.setSelectedShapes([ids.boxA])
		editor.keyDown('ArrowUp')
		editor.keyUp('ArrowUp')
		// The relative position moves down by 1 on x, because the shape's parent frame is rotated 90deg
		expect(editor.getShape(ids.boxA)).toMatchObject({ x: 9, y: 9 })
		// The absolute position moves up by 1 on y though, because nudges occur in absolute space
		expect(editor.getSelectionPageBounds()).toMatchObject({ x: -9, y: 9, w: 100, h: 100 })
	})
})

describe('When a shape is a child of a frame...', () => {
	it('Nudges out of the parent', () => {
		editor.createShape({ type: 'frame', x: 0, y: 0, props: { w: 200, h: 200 } })
		const frame = editor.getLastCreatedShape()
		editor.reparentShapes([ids.boxA], frame.id)
		editor.updateShape({ id: ids.boxA, type: 'geo', x: 0, y: 0, props: { w: 10, h: 10 } })

		// Here's the selection page bounds and shape before we nudge it
		editor.setSelectedShapes([ids.boxA])
		expect(editor.getSelectionPageBounds()).toCloselyMatchObject({ x: 0, y: 0 })
		expect(editor.getShape(ids.boxA)).toCloselyMatchObject({ parentId: frame.id, x: 0, y: 0 })

		editor.keyDown('ArrowUp')
		editor.keyDown('ArrowUp')
		editor.keyDown('ArrowUp')
		editor.keyDown('ArrowUp')
		editor.keyDown('ArrowUp')
		editor.keyDown('ArrowUp')
		editor.keyDown('ArrowUp')
		editor.keyDown('ArrowUp')
		editor.keyDown('ArrowUp')
		editor.keyDown('ArrowUp')

		// still barely in the parent frame
		expect(editor.getSelectionPageBounds()).toCloselyMatchObject({ x: 0, y: -10 })
		expect(editor.getShape(ids.boxA)).toCloselyMatchObject({ parentId: frame.id, x: 0, y: -10 })

		editor.keyDown('ArrowUp')
		// now we're out of the parent frame and reparented to the page
		expect(editor.getSelectionPageBounds()).toCloselyMatchObject({ x: 0, y: -11 })
		expect(editor.getShape(ids.boxA)).toCloselyMatchObject({
			parentId: editor.getCurrentPageId(),
			x: 0,
			y: -11,
		})
	})
})

describe('When a shape is selected...', () => {
	it('nudges a shape correctly', () => {
		editor.setSelectedShapes([ids.boxA])

		expect(nudgeAndGet([ids.boxA], 'ArrowUp', false)).toMatchObject([{ x: 10, y: 9 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowRight', false)).toMatchObject([{ x: 11, y: 9 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowDown', false)).toMatchObject([{ x: 11, y: 10 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowLeft', false)).toMatchObject([{ x: 10, y: 10 }])
	})

	it('nudges a shape with shift key pressed', () => {
		editor.setSelectedShapes([ids.boxA])

		expect(nudgeAndGet([ids.boxA], 'ArrowUp', true)).toMatchObject([{ x: 10, y: 0 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowRight', true)).toMatchObject([{ x: 20, y: 0 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowDown', true)).toMatchObject([{ x: 20, y: 10 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowLeft', true)).toMatchObject([{ x: 10, y: 10 }])
	})

	it.todo('updates bound shapes')
})

describe('When grid is enabled...', () => {
	it('nudges a shape correctly', () => {
		editor.updateInstanceState({ isGridMode: true })
		editor.setSelectedShapes([ids.boxA])

		expect(nudgeAndGet([ids.boxA], 'ArrowUp', false)).toMatchObject([{ x: 10, y: 0 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowRight', false)).toMatchObject([{ x: 20, y: 0 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowDown', false)).toMatchObject([{ x: 20, y: 10 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowLeft', false)).toMatchObject([{ x: 10, y: 10 }])
	})

	it('nudges a shape with shift key pressed', () => {
		editor.updateInstanceState({ isGridMode: true })
		editor.setSelectedShapes([ids.boxA])

		expect(nudgeAndGet([ids.boxA], 'ArrowUp', true)).toMatchObject([{ x: 10, y: -40 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowRight', true)).toMatchObject([{ x: 60, y: -40 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowDown', true)).toMatchObject([{ x: 60, y: 10 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowLeft', true)).toMatchObject([{ x: 10, y: 10 }])
	})
})

describe('When multiple shapes are selected...', () => {
	it('Nudges all shapes correctly', () => {
		editor.setSelectedShapes([ids.boxA, ids.boxB])

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
		editor.setSelectedShapes([ids.boxA])

		expect(nudgeAndGet([ids.boxA], 'ArrowUp', false)).toMatchObject([{ x: 10, y: 9 }])
		editor.undo()
		expect(getShape([ids.boxA])).toMatchObject([{ x: 10, y: 10 }])
		editor.redo()
		expect(getShape([ids.boxA])).toMatchObject([{ x: 10, y: 9 }])

		expect(nudgeAndGet([ids.boxA], 'ArrowRight', false)).toMatchObject([{ x: 11, y: 9 }])
		editor.undo()
		expect(getShape([ids.boxA])).toMatchObject([{ x: 10, y: 9 }])
		editor.redo()
		expect(getShape([ids.boxA])).toMatchObject([{ x: 11, y: 9 }])
	})
})

describe('When nudging a rotated shape...', () => {
	it('Moves the page point correctly', () => {
		editor.setSelectedShapes([ids.boxA])
		const shapeA = editor.getShape(ids.boxA)!

		editor.updateShapes([{ id: ids.boxA, type: shapeA.type, rotation: 90 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowRight', false)).toMatchObject([{ x: 11, y: 10 }])

		editor.updateShapes([{ id: ids.boxA, type: shapeA.type, rotation: -90 }])
		expect(nudgeAndGet([ids.boxA], 'ArrowDown', false)).toMatchObject([{ x: 11, y: 11 }])
	})
})

describe('When nudging multiple rotated shapes...', () => {
	it('Moves the page point correctly', () => {
		editor.setSelectedShapes([ids.boxA, ids.boxB])
		const shapeA = editor.getShape(ids.boxA)!
		const shapeB = editor.getShape(ids.boxB)!

		editor.updateShapes([
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

		editor.updateShapes([
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

import { IndexKey, createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	line1: createShapeId('line1'),
	embed1: createShapeId('embed1'),
	arrow1: createShapeId('arrow1'),
}

jest.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
	editor
		.selectAll()
		.deleteShapes(editor.getSelectedShapeIds())
		.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
})

describe('TLSelectTool.Idle', () => {
	it('Updates hovered ID on pointer move', () => {
		editor.pointerMove(100, 100)
		expect(editor.getHoveredShapeId()).not.toBeNull()
	})

	it('Transitions to pointing_shape on shape pointer down', () => {
		const shape = editor.getShape(ids.box1)!
		editor.pointerDown(shape.x + 10, shape.y + 10, { target: 'shape', shape })
		editor.expectToBeIn('select.pointing_shape')
	})

	it('Transitions to pointing_canvas on canvas pointer down', () => {
		editor.pointerDown(10, 10, { target: 'canvas' })
		editor.expectToBeIn('select.pointing_canvas')
	})

	it('Nudges selected shapes on arrow key down', () => {
		const shape = editor.getShape(ids.box1)!
		editor.select(shape.id)
		editor.keyDown('ArrowRight')
		// Assuming nudgeSelectedShapes moves the shape by 1 unit to the right
		const nudgedShape = editor.getShape(shape.id)
		expect(nudgedShape).toBeDefined()
		expect(nudgedShape?.x).toBe(101)
	})
})

// todo: turn on feature flag for these tests or remove them
describe.skip('Edit on type', () => {
	it('Starts editing shape on key down if shape does auto-edit on key stroke', () => {
		const id = createShapeId()
		editor.createShapes([{ id, type: 'note', x: 100, y: 100, props: { text: 'hello' } }])!
		const shape = editor.getShape(id)!
		editor.select(shape.id)
		editor.keyDown('a') // Press a key that would start editing
		expect(editor.getEditingShapeId()).toBe(shape.id)
	})

	it('Does not start editing if shape does not auto-edit on key stroke', () => {
		const shape = editor.getShape(ids.box1)!
		editor.select(shape.id)
		editor.keyDown('a') // Press a key that would not start editing for non-editable shapes
		expect(editor.getEditingShapeId()).not.toBe(shape.id)
	})

	it('Does not start editing on excluded keys', () => {
		const id = createShapeId()
		editor.createShapes([{ id, type: 'note', x: 100, y: 100, props: { text: 'hello' } }])!
		const shape = editor.getShape(id)!
		editor.select(shape.id)
		editor.keyDown('Enter') // Press an excluded key
		expect(editor.getEditingShapeId()).not.toBe(shape.id)
	})

	it('Ignores key down if altKey or ctrlKey is pressed', () => {
		const id = createShapeId()
		editor.createShapes([{ id, type: 'note', x: 100, y: 100, props: { text: 'hello' } }])!
		const shape = editor.getShape(id)!
		editor.select(shape.id)
		// Simulate altKey being pressed
		editor.keyDown('a', { altKey: true })
		// Simulate ctrlKey being pressed
		editor.keyDown('a', { ctrlKey: true })
		expect(editor.getEditingShapeId()).not.toBe(shape.id)
	})
})

describe('TLSelectTool.Translating', () => {
	it('Enters from pointing and exits to idle', () => {
		const shape = editor.getShape(ids.box1)
		editor.pointerDown(150, 150, { target: 'shape', shape })
		editor.expectToBeIn('select.pointing_shape')

		editor.pointerMove(200, 200)
		editor.expectToBeIn('select.translating')

		editor.pointerUp()
		editor.expectToBeIn('select.idle')
	})

	it('Drags a shape', () => {
		const shape = editor.getShape(ids.box1)
		editor.pointerDown(150, 150, { target: 'shape', shape })
		editor.pointerMove(200, 200)
		editor.pointerUp()
		editor.expectShapeToMatch({ id: ids.box1, x: 150, y: 150 })
	})

	it('Clones a shape, removes the clone, and re-creates the clone', () => {
		const shape = editor.getShape(ids.box1)
		editor.pointerDown(150, 150, { target: 'shape', shape })
		editor.pointerMove(200, 200)

		expect(editor.getCurrentPageShapes().length).toBe(1)
		editor.expectShapeToMatch({ id: ids.box1, x: 150, y: 150 })
		const t1 = [...editor.getCurrentPageShapeIds().values()]

		editor.keyDown('Alt')
		expect(editor.getCurrentPageShapes().length).toBe(2)
		editor.expectShapeToMatch({ id: ids.box1, x: 100, y: 100 })
		// const t2 = [...editor.shapeIds.values()]

		editor.keyUp('Alt')

		// There's a timer here! We shouldn't end the clone until the timer is done
		expect(editor.getCurrentPageShapes().length).toBe(2)

		jest.advanceTimersByTime(250) // tick tock

		// Timer is done! We should have ended the clone.
		expect(editor.getCurrentPageShapes().length).toBe(1)
		editor.expectToBeIn('select.translating')

		editor.expectShapeToMatch({ id: ids.box1, x: 150, y: 150 })

		expect([...editor.getCurrentPageShapeIds().values()]).toMatchObject(t1)

		// todo: Should cloning again duplicate new shapes, or restore the last clone?
		// editor.keyDown('Alt')
		// expect(editor.currentPageShapes.length).toBe(2)
		// editor.expectShapeToMatch({ id: ids.box1, x: 100, y: 100 })
		// expect([...editor.shapeIds.values()]).toMatchObject(t2)
	})

	it('Constrains when holding shift', () => {
		const shape = editor.getShape(ids.box1)
		editor.pointerDown(150, 150, { target: 'shape', shape })
		editor.pointerMove(200, 170)
		editor.expectShapeToMatch({ id: ids.box1, x: 150, y: 120 })
		editor.keyDown('Shift')
		editor.expectShapeToMatch({ id: ids.box1, x: 150, y: 100 })
	})

	it('Does not expand selection when holding shift and alt', () => {
		const shape = editor.getShape(ids.box1)
		editor.keyDown('Shift')

		// alt-drag to create a copy:
		editor.keyDown('Alt')
		editor.pointerDown(150, 150, { target: 'shape', shape })
		editor.pointerMove(150, 250)
		editor.pointerUp()
		const box2Id = editor.getOnlySelectedShape()!.id
		expect(editor.getCurrentPageShapes().length).toStrictEqual(2)
		expect(ids.box1).not.toEqual(box2Id)

		// shift-alt-drag the original, we shouldn't duplicate the copy too:
		editor.pointerDown(150, 150, { target: 'shape', shape })
		expect(editor.getSelectedShapeIds()).toStrictEqual([ids.box1])
		editor.pointerMove(250, 150)
		editor.pointerUp()
		expect(editor.getCurrentPageShapes().length).toStrictEqual(3)
	})
})

describe('PointingHandle', () => {
	it('Enters from idle and exits to idle', () => {
		const shape = editor.getShape(ids.box1)
		editor.pointerDown(150, 150, {
			target: 'handle',
			shape,
			handle: { id: 'start', type: 'vertex', index: 'a1' as IndexKey, x: 0, y: 0 },
		})
		editor.expectToBeIn('select.pointing_handle')

		editor.pointerUp()
		editor.expectToBeIn('select.idle')
	})

	it('Bails on escape', () => {
		const shape = editor.getShape(ids.box1)
		editor.pointerDown(150, 150, {
			target: 'handle',
			shape,
			handle: { id: 'start', type: 'vertex', index: 'a1' as IndexKey, x: 0, y: 0 },
		})
		editor.expectToBeIn('select.pointing_handle')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})
})

describe('DraggingHandle', () => {
	it('Enters from pointing_handle and exits to idle', () => {
		editor.createShapes([{ id: ids.line1, type: 'line', x: 100, y: 100 }])
		const shape = editor.getShape(ids.line1)
		editor.pointerDown(150, 150, {
			target: 'handle',
			shape,
			handle: { id: 'start', type: 'vertex', index: 'a1' as IndexKey, x: 0, y: 0 },
		})
		editor.pointerMove(100, 100)
		editor.expectToBeIn('select.dragging_handle')

		editor.pointerUp()
		editor.expectToBeIn('select.idle')
	})

	it('Bails on escape', () => {
		editor.createShapes([{ id: ids.line1, type: 'line', x: 100, y: 100 }])
		const shape = editor.getShape(ids.line1)

		editor.pointerDown(150, 150, {
			target: 'handle',
			shape,
			handle: { id: 'start', type: 'vertex', index: 'a1' as IndexKey, x: 0, y: 0 },
		})
		editor.pointerMove(100, 100)
		editor.expectToBeIn('select.dragging_handle')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})
})

describe('PointingLabel', () => {
	it('Enters from pointing_arrow_label and exits to idle', () => {
		editor.createShapes([
			{ id: ids.arrow1, type: 'arrow', x: 100, y: 100, props: { text: 'Test Label' } },
		])
		const shape = editor.getShape(ids.arrow1)
		editor.pointerDown(150, 150, {
			target: 'shape',
			shape,
		})
		editor.pointerMove(100, 100)
		editor.expectToBeIn('select.pointing_arrow_label')

		editor.pointerUp()
		editor.expectToBeIn('select.idle')
	})

	it('Bails on escape', () => {
		editor.createShapes([
			{ id: ids.arrow1, type: 'arrow', x: 100, y: 100, props: { text: 'Test Label' } },
		])
		const shape = editor.getShape(ids.arrow1)

		editor.pointerDown(150, 150, {
			target: 'shape',
			shape,
		})
		editor.pointerMove(100, 100)
		editor.expectToBeIn('select.pointing_arrow_label')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})

	it('Doesnt go into pointing_arrow_label mode if not selecting the arrow shape', () => {
		editor.createShapes([
			{ id: ids.arrow1, type: 'arrow', x: 100, y: 100, props: { text: 'Test Label' } },
		])
		const shape = editor.getShape(ids.arrow1)
		editor.pointerDown(0, 150, {
			target: 'shape',
			shape,
		})
		editor.pointerMove(100, 100)
		editor.expectToBeIn('select.translating')

		editor.pointerUp()
		editor.expectToBeIn('select.idle')
	})
})

describe('When double clicking a shape', () => {
	it('begins editing a geo shapes label', () => {
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([{ id: createShapeId(), type: 'geo' }])
			.doubleClick(50, 50, { target: 'shape', shape: editor.getCurrentPageShapes()[0] })
			.expectToBeIn('select.editing_shape')
	})
})

describe('When pressing enter on a selected shape', () => {
	it('begins editing a geo shapes label', () => {
		const id = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([{ id, type: 'geo' }])
			.select(id)
			.keyUp('Enter')
			.expectToBeIn('select.editing_shape')
	})
})

// it('selects the child of a group', () => {
//   const id1 = createShapeId()
//   const id2 = createShapeId()
//   app
//     .selectAll()
//     .deleteShapes(editor.selectedShapeIds)
//     .selectNone()
//     .createShapes([
//       { id: id1, type: 'geo', x: 100, y: 100 },
//       { id: id2, type: 'geo', x: 200, y: 200 },
//     ])
//     .selectAll()
//     .groupShapes(editor.selectedShapeIds)
//     .doubleClick(50, 50, { target: 'shape', shape: editor.getShape(id1) })
//     .expectToBeIn('select.editing_shape')
// })

describe('When double clicking the selection edge', () => {
	it('Resets text scale when double clicking the edge of the text', () => {
		const id = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([{ id, type: 'text', x: 100, y: 100, props: { scale: 2, text: 'hello' } }])
			.select(id)
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		editor.expectShapeToMatch({ id, props: { scale: 1 } })
	})

	it('Resets text autosize first when double clicking the edge of the text', () => {
		const id = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([
				{
					id,
					type: 'text',
					props: { scale: 2, autoSize: false, w: 200, text: 'hello' },
				},
			])
			.select(id)
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		editor.expectShapeToMatch({ id, props: { scale: 2, autoSize: true } })

		editor.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		editor.expectShapeToMatch({ id, props: { scale: 1, autoSize: true } })
	})

	it('Begins editing the text if handler returns no change', () => {
		const id = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([
				{
					id,
					type: 'text',
					props: { scale: 2, autoSize: false, w: 200, text: 'hello' },
				},
			])
			.select(id)
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		expect(editor.getEditingShapeId()).toBe(null)
		editor.expectShapeToMatch({ id, props: { scale: 1, autoSize: true } })

		editor.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		expect(editor.getEditingShapeId()).toBe(id)
	})

	it('Selects a geo shape when double clicking on its edge', () => {
		const id = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([
				{
					id,
					type: 'geo',
				},
			])
			.select(id)
		expect(editor.getEditingShapeId()).toBe(null)

		editor.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		expect(editor.getEditingShapeId()).toBe(id)
	})
})

describe('When editing shapes', () => {
	let ids: any

	beforeEach(() => {
		ids = {
			geo1: createShapeId(),
			geo2: createShapeId(),
			text1: createShapeId(),
			text2: createShapeId(),
		}

		editor.createShapes([
			{ id: ids.geo1, type: 'geo', props: { text: 'hello world ' } },
			{ id: ids.geo2, type: 'geo', props: { text: 'hello world ' } },
			{ id: ids.text1, type: 'text', props: { text: 'hello world ' } },
			{ id: ids.text2, type: 'text', props: { text: 'hello world ' } },
		])
	})

	it('Pointing a shape of a different type selects it and leaves editing', () => {
		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds().length).toBe(0)

		// start editing the geo shape
		editor.doubleClick(50, 50, { target: 'shape', shape: editor.getShape(ids.geo1) })
		expect(editor.getEditingShapeId()).toBe(ids.geo1)
		expect(editor.getOnlySelectedShapeId()).toBe(ids.geo1)
		// point the text shape
		editor.pointerDown(50, 50, { target: 'shape', shape: editor.getShape(ids.text1) })
		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getOnlySelectedShapeId()).toBe(ids.text1)
	})

	// The behavior described here will only work end to end, not with the library,
	// because useEditableText implements the behavior in React
	it.skip('Pointing a shape of a different type selects it and leaves editing', () => {
		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds().length).toBe(0)

		// start editing the geo shape
		editor.doubleClick(50, 50, { target: 'shape', shape: editor.getShape(ids.geo1) })
		expect(editor.getEditingShapeId()).toBe(ids.geo1)
		expect(editor.getOnlySelectedShapeId()).toBe(ids.geo1)
		// point the other geo shape
		editor.pointerDown(50, 50, { target: 'shape', shape: editor.getShape(ids.geo2) })
		// that other shape should now be editing and selected!
		expect(editor.getEditingShapeId()).toBe(ids.geo2)
		expect(editor.getOnlySelectedShapeId()).toBe(ids.geo2)
	})

	// This works but only end to end — the logic had to move to React
	it.skip('Works with text, too', () => {
		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds().length).toBe(0)

		// start editing the geo shape
		editor.doubleClick(50, 50, { target: 'shape', shape: editor.getShape(ids.text1) })
		editor.pointerDown(50, 50, { target: 'shape', shape: editor.getShape(ids.text2) })
		// that other shape should now be editing and selected!
		expect(editor.getEditingShapeId()).toBe(ids.text2)
		expect(editor.getOnlySelectedShapeId()).toBe(ids.text2)
	})

	it('Double clicking the canvas creates a new text shape', () => {
		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds().length).toBe(0)
		expect(editor.getCurrentPageShapes().length).toBe(5)
		editor.doubleClick(750, 750)
		expect(editor.getCurrentPageShapes().length).toBe(6)
		expect(editor.getCurrentPageShapes()[5].type).toBe('text')
	})

	it('It deletes an empty text shape when your click away', () => {
		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds().length).toBe(0)
		expect(editor.getCurrentPageShapes().length).toBe(5)

		// Create a new shape by double clicking
		editor.doubleClick(750, 750)
		expect(editor.getSelectedShapeIds().length).toBe(1)
		expect(editor.getCurrentPageShapes().length).toBe(6)
		const shapeId = editor.getSelectedShapeIds()[0]

		// Click away
		editor.click(1000, 1000)
		expect(editor.getSelectedShapeIds().length).toBe(0)
		expect(editor.getCurrentPageShapes().length).toBe(5)
		expect(editor.getShape(shapeId)).toBe(undefined)
	})

	it('It deletes an empty text shape when you click another text shape', () => {
		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds().length).toBe(0)
		expect(editor.getCurrentPageShapes().length).toBe(5)

		// Create a new shape by double clicking
		editor.doubleClick(750, 750)
		expect(editor.getSelectedShapeIds().length).toBe(1)
		expect(editor.getCurrentPageShapes().length).toBe(6)
		const shapeId = editor.getSelectedShapeIds()[0]

		// Click another text shape
		editor.pointerMove(50, 50)
		editor.click()
		expect(editor.getSelectedShapeIds().length).toBe(1)
		expect(editor.getCurrentPageShapes().length).toBe(5)
		expect(editor.getShape(shapeId)).toBe(undefined)
	})

	it.todo('restores selection after changing styles')
})

describe('When in readonly mode', () => {
	beforeEach(() => {
		editor.createShapes([
			{
				id: ids.embed1,
				type: 'embed',
				x: 100,
				y: 100,
				opacity: 1,
				props: { w: 100, h: 100, url: 'https://tldraw.com' },
			},
		])
		editor.updateInstanceState({ isReadonly: true })
		editor.setCurrentTool('hand')
		editor.setCurrentTool('select')
	})

	it('Begins editing embed when double clicked', () => {
		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds().length).toBe(0)
		expect(editor.getInstanceState().isReadonly).toBe(true)

		const shape = editor.getShape(ids.embed1)
		editor.doubleClick(100, 100, { target: 'shape', shape })
		expect(editor.getEditingShapeId()).toBe(ids.embed1)
	})

	it('Begins editing embed when pressing Enter on a selected embed', () => {
		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds().length).toBe(0)
		expect(editor.getInstanceState().isReadonly).toBe(true)

		editor.setSelectedShapes([ids.embed1])
		expect(editor.getSelectedShapeIds().length).toBe(1)

		editor.keyUp('Enter')
		expect(editor.getEditingShapeId()).toBe(ids.embed1)
	})
})

// This should be end to end, the problem is the blur handler of the react component
it('goes into pointing canvas', () => {
	editor
		.createShape({ type: 'note' })
		.pointerMove(50, 50)
		.doubleClick()
		.expectToBeIn('select.editing_shape')
		.pointerDown(300, 300)
		.expectToBeIn('select.pointing_canvas')
})

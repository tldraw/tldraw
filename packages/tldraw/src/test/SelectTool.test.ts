import {
	IndexKey,
	ShapeUtil,
	TLArrowShape,
	TLFrameShape,
	createShapeId,
	toRichText,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { defaultHandleExternalTldrawContent } from '../lib/defaultExternalContentHandlers'
import { defaultOverlayUtils } from '../lib/defaultOverlayUtils'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	line1: createShapeId('line1'),
	embed1: createShapeId('embed1'),
	arrow1: createShapeId('arrow1'),
}

vi.useFakeTimers()

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
		editor.createShapes([
			{
				id,
				type: 'note',
				x: 100,
				y: 100,
				props: { richText: toRichText('hello') },
			},
		])!
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
		editor.createShapes([
			{
				id,
				type: 'note',
				x: 100,
				y: 100,
				props: { richText: toRichText('hello') },
			},
		])!
		const shape = editor.getShape(id)!
		editor.select(shape.id)
		editor.keyDown('Enter') // Press an excluded key
		expect(editor.getEditingShapeId()).not.toBe(shape.id)
	})

	it('Ignores key down if altKey or ctrlKey is pressed', () => {
		const id = createShapeId()
		editor.createShapes([
			{
				id,
				type: 'note',
				x: 100,
				y: 100,
				props: { richText: toRichText('hello') },
			},
		])!
		const shape = editor.getShape(id)!
		editor.select(shape.id)
		// Simulate altKey being pressed
		editor.keyDown('a', { altKey: true })
		// Simulate ctrlKey being pressed
		editor.keyDown('a', { ctrlKey: true })
		expect(editor.getEditingShapeId()).not.toBe(shape.id)
	})
})

describe('TLSelectTool.PointingShape when the shape is deleted mid-click', () => {
	// Reproduces https://github.com/tldraw/tldraw/issues/8558: a remote user,
	// undo, or other actor can delete the pointed-at shape between pointer down
	// and pointer up. The tool should bail to idle instead of crashing.

	it('does not crash on pointer up when an already-selected shape is deleted', () => {
		// pre-selecting the shape means didSelectOnEnter is false, so pointer up
		// runs the selection logic that dereferences the (now deleted) shape
		editor.select(ids.box1)
		const shape = editor.getShape(ids.box1)!

		editor.pointerDown(shape.x + 10, shape.y + 10, { target: 'shape', shape })
		editor.expectToBeIn('select.pointing_shape')

		editor.deleteShapes([ids.box1])

		expect(() => editor.pointerUp(shape.x + 10, shape.y + 10)).not.toThrow()
		editor.expectToBeIn('select.idle')
	})

	it('does not crash on pointer up when a ctrl-clicked shape is deleted', () => {
		// ctrl/accel on enter also leaves didSelectOnEnter false
		const shape = editor.getShape(ids.box1)!

		editor.pointerDown(shape.x + 10, shape.y + 10, {
			target: 'shape',
			shape,
			accelKey: true,
		})
		editor.expectToBeIn('select.pointing_shape')

		editor.deleteShapes([ids.box1])

		expect(() => editor.pointerUp(shape.x + 10, shape.y + 10)).not.toThrow()
		editor.expectToBeIn('select.idle')
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

		vi.advanceTimersByTime(250) // tick tock

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

describe('Pasting during an interaction', () => {
	// Regression for #8305: pasting tldraw content mid-interaction should not
	// steal the selection from the shape being manipulated. The paste handler
	// leaves the selection alone while dragging/translating/resizing/rotating,
	// so the interacted shape stays selected (and an arrow's binding hint stays
	// visible) without needing the tool to reselect on completion.

	it('does not steal selection while dragging an arrow handle, keeping the binding hint visible', async () => {
		const overlayEditor = new TestEditor({ overlayUtils: defaultOverlayUtils })
		const arrowId = createShapeId('hintArrow')
		const targetId = createShapeId('hintTarget')
		const clipboardId = createShapeId('hintClipboard')
		overlayEditor.createShapes([
			{ id: targetId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			{ id: clipboardId, type: 'geo', x: 400, y: 400, props: { w: 50, h: 50 } },
			{
				id: arrowId,
				type: 'arrow',
				x: 150,
				y: 150,
				props: { start: { x: 0, y: 0 }, end: { x: 120, y: 0 } },
			},
		])
		// Bind the arrow's start to the target so a binding survives an end-handle drag.
		overlayEditor.createBindings([
			{
				fromId: arrowId,
				toId: targetId,
				type: 'arrow',
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			},
		])

		// Snapshot a shape to paste through the real external-content path.
		const content = overlayEditor.getContentFromCurrentPage([clipboardId])!

		const hasBindingHint = () =>
			overlayEditor.overlays.getCurrentOverlays().some((o) => o.type === 'arrow_binding_hint')

		const arrow = overlayEditor.getShape(arrowId)!
		const endHandle = overlayEditor.getShapeHandles(arrow)!.find((h) => h.id === 'end')!

		overlayEditor.select(arrowId)
		overlayEditor.pointerDown(arrow.x + endHandle.x, arrow.y + endHandle.y, {
			target: 'handle',
			shape: arrow,
			handle: endHandle,
		})
		overlayEditor.pointerMove(arrow.x + endHandle.x + 20, arrow.y + endHandle.y)
		overlayEditor.expectToBeIn('select.dragging_handle')
		expect(hasBindingHint()).toBe(true)

		// Paste a shape mid-drag.
		const countBefore = overlayEditor.getCurrentPageShapes().length
		await defaultHandleExternalTldrawContent(overlayEditor, { content })
		expect(overlayEditor.getCurrentPageShapes().length).toBeGreaterThan(countBefore)

		// Selection is left alone, so the arrow stays selected and the hint stays up.
		expect(overlayEditor.getOnlySelectedShapeId()).toBe(arrowId)
		expect(hasBindingHint()).toBe(true)

		overlayEditor.pointerUp()
		expect(overlayEditor.getSelectedShapeIds()).toEqual([arrowId])
	})

	it('does not steal selection while translating a shape', async () => {
		const content = editor.getContentFromCurrentPage([ids.box1])!

		editor.select(ids.box1)
		editor.pointerDown(150, 150, { target: 'shape', shape: editor.getShape(ids.box1)! })
		editor.pointerMove(250, 250)
		editor.expectToBeIn('select.translating')

		const countBefore = editor.getCurrentPageShapes().length
		await defaultHandleExternalTldrawContent(editor, { content })
		expect(editor.getCurrentPageShapes().length).toBeGreaterThan(countBefore)
		expect(editor.getOnlySelectedShapeId()).toBe(ids.box1)

		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('does not steal selection while resizing a shape', async () => {
		const content = editor.getContentFromCurrentPage([ids.box1])!

		editor.select(ids.box1)
		editor.pointerDown(200, 200, { target: 'selection', handle: 'bottom_right' })
		editor.pointerMove(250, 250)
		editor.expectToBeIn('select.resizing')

		const countBefore = editor.getCurrentPageShapes().length
		await defaultHandleExternalTldrawContent(editor, { content })
		expect(editor.getCurrentPageShapes().length).toBeGreaterThan(countBefore)
		expect(editor.getOnlySelectedShapeId()).toBe(ids.box1)

		editor.pointerUp()
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
	})

	it('does not flash the selection (isChangingStyle) while mid-interaction', async () => {
		const content = editor.getContentFromCurrentPage([ids.box1])!

		editor.select(ids.box1)
		editor.pointerDown(150, 150, { target: 'shape', shape: editor.getShape(ids.box1)! })
		editor.pointerMove(250, 250)
		editor.expectToBeIn('select.translating')

		// The paste flash's overlap check compares the selection bounds before
		// and after paste. Mid-interaction we don't reselect, so those bounds
		// are identical and the check would always pass — isChangingStyle must
		// stay false.
		await defaultHandleExternalTldrawContent(editor, { content })
		expect(editor.getInstanceState().isChangingStyle).toBe(false)
	})

	it('still selects pasted content when not mid-interaction', async () => {
		const content = editor.getContentFromCurrentPage([ids.box1])!

		editor.selectNone()
		editor.expectToBeIn('select.idle')

		await defaultHandleExternalTldrawContent(editor, { content })

		const selected = editor.getOnlySelectedShapeId()
		expect(selected).not.toBeNull()
		expect(selected).not.toBe(ids.box1)
	})
})

describe('PointingLabel', () => {
	it('Enters from pointing_arrow_label and exits to idle', () => {
		editor.createShapes([
			{
				id: ids.arrow1,
				type: 'arrow',
				x: 100,
				y: 100,
				props: {
					richText: toRichText('Test Label'),
					start: { x: 0, y: 0 },
					end: { x: 100, y: 0 },
				},
			},
		])
		const shape = editor.getShape(ids.arrow1)!
		// First select the shape so it's already selected
		editor.select(shape.id)

		// Click at the middle of the arrow where the label would be and drag to move the label
		editor.pointerDown(150, 100, {
			target: 'shape',
			shape,
		})
		editor.pointerMove(160, 100)
		editor.expectToBeIn('select.pointing_arrow_label')

		// Continue dragging to actually move the label, then it should go to idle
		editor.pointerMove(170, 100)
		editor.pointerUp()
		editor.expectToBeIn('select.idle')
	})

	it('Bails on escape', () => {
		editor.createShapes([
			{
				id: ids.arrow1,
				type: 'arrow',
				x: 100,
				y: 100,
				props: {
					richText: toRichText('Test Label'),
					start: { x: 0, y: 0 },
					end: { x: 100, y: 0 },
				},
			},
		])
		const shape = editor.getShape(ids.arrow1)

		// Click at the middle of the arrow where the label would be
		editor.pointerDown(150, 100, {
			target: 'shape',
			shape,
		})
		editor.pointerMove(160, 100)
		editor.expectToBeIn('select.pointing_arrow_label')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})

	it('Doesnt go into pointing_arrow_label mode if not selecting the arrow shape', () => {
		editor.createShapes([
			{
				id: ids.arrow1,
				type: 'arrow',
				x: 100,
				y: 100,
				props: {
					richText: toRichText(''), // Empty label
					start: { x: 0, y: 0 },
					end: { x: 100, y: 0 },
				},
			},
		])
		const shape = editor.getShape(ids.arrow1)!
		// Click anywhere on the arrow - since there's no label, it should go to translating
		editor.pointerDown(150, 100, {
			target: 'shape',
			shape,
		})
		editor.pointerMove(155, 105)
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

	it('does not edit a shape while double clicking into a group', () => {
		const childAId = createShapeId()
		const childBId = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([
				{ id: childAId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
				{ id: childBId, type: 'geo', x: 300, y: 100, props: { w: 100, h: 100 } },
			])
			.groupShapes([childAId, childBId])

		const groupId = editor.getOnlySelectedShapeId()!
		editor.selectNone()

		editor.click(150, 150, { target: 'shape', shape: editor.getShape(childAId)! })
		// Each click is a separate user click that drills one level. Reset the
		// click state between them so they aren't coalesced into a double-click.
		editor.cancelDoubleClick()
		editor.click(150, 150, { target: 'shape', shape: editor.getShape(childAId)! })

		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getOnlySelectedShapeId()).toBe(childAId)
		expect(editor.getFocusedGroupId()).toBe(groupId)
		editor.expectToBeIn('select.idle')
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
			.keyPress('Enter')
			.expectToBeIn('select.editing_shape')
	})
})

describe('When undo/redo restores an invalid editing shape', () => {
	// Regression: https://github.com/tldraw/tldraw/issues/9113
	// Setting the editing shape is not recorded in history, but clearing it on delete is.
	// When create + edit + delete of the same shape collapse into a single history entry,
	// the shape's add/remove cancel out while the editingShapeId update survives. Undoing
	// then restores editingShapeId pointing at a shape that no longer exists, which used to
	// crash with "Entered editing state without an editing shape". The editor must never
	// enter the editing state without a valid editing shape.
	it('does not crash when undo restores editingShapeId for a deleted shape', () => {
		const id = createShapeId()
		editor.markHistoryStoppingPoint('start')
		editor.createShape({ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
		editor.setEditingShape(id)
		editor.deleteShapes([id])

		expect(() => editor.undo()).not.toThrow()

		editor.expectToBeIn('select.idle')
		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getShape(id)).toBeUndefined()

		// Redoing back through the same history entry must also stay safe.
		expect(() => editor.redo()).not.toThrow()
		editor.expectToBeIn('select.idle')
		expect(editor.getEditingShapeId()).toBe(null)
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
					props: {
						scale: 2,
						autoSize: false,
						w: 200,
						richText: toRichText('hello'),
					},
				},
			])
			.select(id)
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		// Update:
		// Previously, double clicking text edges would reset the scale and prevent editing. This is no longer the case.
		//
		// expect(editor.getEditingShapeId()).toBe(null)
		// editor.expectShapeToMatch({ id, props: { scale: 1, autoSize: true } })
		// editor.doubleClick(100, 100, { target: 'selection', handle: 'left' })

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

	it('selects a grouped shape without editing when double clicking its edge from outside the group', () => {
		const childAId = createShapeId()
		const childBId = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([
				{ id: childAId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
				{ id: childBId, type: 'geo', x: 300, y: 100, props: { w: 100, h: 100 } },
			])
			.groupShapes([childAId, childBId])

		const groupId = editor.getOnlySelectedShapeId()!

		editor.pointerMove(100, 150).click(100, 150).pointerMove(100, 150).click(100, 150)

		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getOnlySelectedShapeId()).toBe(childAId)
		expect(editor.getFocusedGroupId()).toBe(groupId)
		editor.expectToBeIn('select.idle')
	})

	it('drills into a group and enters editing on the trailing third click (2 + 1)', () => {
		// 3 rapid clicks decompose as "double_click (drill) + click (edit)":
		// click 1 selects the group, click 2 drills to the child, click 3
		// lands on the now-selected child's text label and starts editing.
		const childAId = createShapeId()
		const childBId = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([
				{ id: childAId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
				{ id: childBId, type: 'geo', x: 300, y: 100, props: { w: 100, h: 100 } },
			])
			.groupShapes([childAId, childBId])

		const groupId = editor.getOnlySelectedShapeId()!
		editor.selectNone()

		const childA = editor.getShape(childAId)!
		// Each click is a separate user click. Reset the click state between
		// them so they aren't coalesced into a single multi-click sequence:
		// click 1 selects the group, click 2 drills to the child, click 3 lands
		// on the now-selected child's label and starts editing.
		editor.click(150, 150, { target: 'shape', shape: childA })
		editor.cancelDoubleClick()
		editor.click(150, 150, { target: 'shape', shape: childA })
		editor.cancelDoubleClick()
		editor.click(150, 150, { target: 'shape', shape: childA })

		expect(editor.getOnlySelectedShapeId()).toBe(childAId)
		expect(editor.getFocusedGroupId()).toBe(groupId)
		expect(editor.getEditingShapeId()).toBe(childAId)
		editor.expectToBeIn('select.editing_shape')
	})

	it('drills through nested groups and enters editing on the fourth click', () => {
		// Each rapid click drills one level via PointingShape.onPointerUp:
		// click 1 selects the outer group, click 2 drills to the inner group,
		// click 3 drills to childA. Click 4 lands on the already-selected
		// childA's text label and fires the PointingShape text-label-edit
		// branch — drill, drill, drill, edit.
		const childAId = createShapeId()
		const childBId = createShapeId()
		const childCId = createShapeId()
		const innerGroupId = createShapeId()
		const outerGroupId = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([
				{ id: childAId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
				{ id: childBId, type: 'geo', x: 300, y: 100, props: { w: 100, h: 100 } },
				{ id: childCId, type: 'geo', x: 500, y: 100, props: { w: 100, h: 100 } },
			])
			.groupShapes([childAId, childBId], { groupId: innerGroupId })
			.groupShapes([innerGroupId, childCId], { groupId: outerGroupId })
			.selectNone()

		const childA = editor.getShape(childAId)!
		// Each click is a separate user click that drills one level. Reset the
		// click state between them so they aren't coalesced: click 1 selects the
		// outer group, click 2 drills to the inner group, click 3 drills to
		// childA, click 4 lands on childA's label and starts editing.
		editor.click(150, 150, { target: 'shape', shape: childA })
		editor.cancelDoubleClick()
		editor.click(150, 150, { target: 'shape', shape: childA })
		editor.cancelDoubleClick()
		editor.click(150, 150, { target: 'shape', shape: childA })
		editor.cancelDoubleClick()
		editor.click(150, 150, { target: 'shape', shape: childA })

		expect(editor.getOnlySelectedShapeId()).toBe(childAId)
		expect(editor.getFocusedGroupId()).toBe(innerGroupId)
		expect(editor.getEditingShapeId()).toBe(childAId)
		editor.expectToBeIn('select.editing_shape')
	})

	it('enters editing for a selected shape inside the focused group when double clicking its edge', () => {
		const childAId = createShapeId()
		const childBId = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([
				{ id: childAId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
				{ id: childBId, type: 'geo', x: 300, y: 100, props: { w: 100, h: 100 } },
			])
			.groupShapes([childAId, childBId])

		const groupId = editor.getOnlySelectedShapeId()!
		expect(editor.isShapeOfType(editor.getShape(groupId)!, 'group')).toBe(true)

		// Drill into the group: first click selects the group, second click
		// focuses the group and selects child A.
		const childA = editor.getShape(childAId)!
		editor
			.click(150, 150, { target: 'shape', shape: childA })
			.click(150, 150, { target: 'shape', shape: childA })
		expect(editor.getOnlySelectedShapeId()).toBe(childAId)
		expect(editor.getFocusedGroupId()).toBe(groupId)

		// Simulate the user pausing between drilling and starting the
		// double-click — the ClickManager (and our snapshot of the focused
		// group) reset at that boundary in production.
		editor.cancelDoubleClick()

		// Double-click on the right edge of child A — must enter editing even
		// though the parent is a group, because the group is the focused one.
		editor.doubleClick(200, 150, { target: 'selection', handle: 'right' })

		expect(editor.getEditingShapeId()).toBe(childAId)
		editor.expectToBeIn('select.editing_shape')
	})

	it('does not edit when double-clicking into a group from page level, even with a page-level sibling already selected', () => {
		// page
		// ├── innerGroup
		// │   ├── child
		// │   └── childB
		// └── sibling
		//
		// The user is at page level. Selecting the page-level sibling does
		// not focus any group, so focusedGroupId stays at pageId. A
		// subsequent double-click on childB must drill into the group and
		// select the child, never enter editing — the drill context is empty
		// because no group has been entered yet.
		const childId = createShapeId()
		const childBId = createShapeId()
		const siblingId = createShapeId()
		const innerGroupId = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([
				{ id: childId, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } },
				{ id: childBId, type: 'geo', x: 60, y: 0, props: { w: 50, h: 50 } },
				{ id: siblingId, type: 'geo', x: 200, y: 0, props: { w: 50, h: 50 } },
			])
			.groupShapes([childId, childBId], { groupId: innerGroupId })
			.selectNone()

		// Select the page-level sibling with a single click. This shouldn't
		// focus any group.
		const sibling = editor.getShape(siblingId)!
		editor.click(225, 25, { target: 'shape', shape: sibling })
		expect(editor.getOnlySelectedShapeId()).toBe(siblingId)
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())

		editor.cancelDoubleClick()

		// Drill into innerGroup and select childB — and stop there. Editing
		// must not start. The two clicks are separate user clicks, so reset the
		// click state between them.
		const childB = editor.getShape(childBId)!
		editor.click(85, 25, { target: 'shape', shape: childB })
		editor.cancelDoubleClick()
		editor.click(85, 25, { target: 'shape', shape: childB })

		expect(editor.getOnlySelectedShapeId()).toBe(childBId)
		expect(editor.getFocusedGroupId()).toBe(innerGroupId)
		expect(editor.getEditingShapeId()).toBe(null)
		editor.expectToBeIn('select.idle')
	})

	it('drills one level on double-click of a deeper-nested shape without entering editing', () => {
		// Outer group contains an inner group (with two children) and a
		// sibling shape S. The user drills into the outer group by selecting
		// S. They then double-click a grandchild (a child of the inner
		// group, which is itself inside the outer group). The inner group is
		// *deeper* than the user's current drill level, so the double-click
		// drills one level (into the inner group, selecting the grandchild)
		// and stops there — editing requires another click.
		const grandChildId = createShapeId()
		const grandChildBId = createShapeId()
		const siblingId = createShapeId()
		const innerGroupId = createShapeId()
		const outerGroupId = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([
				{ id: grandChildId, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } },
				{ id: grandChildBId, type: 'geo', x: 60, y: 0, props: { w: 50, h: 50 } },
				{ id: siblingId, type: 'geo', x: 200, y: 0, props: { w: 50, h: 50 } },
			])
			.groupShapes([grandChildId, grandChildBId], { groupId: innerGroupId })
			.groupShapes([innerGroupId, siblingId], { groupId: outerGroupId })
			.selectNone()

		// Drill into the outer group by clicking the sibling shape twice:
		// click 1 selects the outer group, click 2 drills and selects S. The
		// clicks are separate user clicks, so reset the click state between them.
		const sibling = editor.getShape(siblingId)!
		editor.click(225, 25, { target: 'shape', shape: sibling })
		editor.cancelDoubleClick()
		editor.click(225, 25, { target: 'shape', shape: sibling })
		expect(editor.getOnlySelectedShapeId()).toBe(siblingId)
		expect(editor.getFocusedGroupId()).toBe(outerGroupId)

		editor.cancelDoubleClick()

		// Two clicks on the grandchild. Click 1 selects the inner group
		// (drilling from the outer group's level), click 2 drills into the inner
		// group and selects the grandchild. Editing must NOT start — the inner
		// group is deeper than the outer group the user has actually entered, so
		// editing requires a further click.
		const grandChild = editor.getShape(grandChildId)!
		editor.click(25, 25, { target: 'shape', shape: grandChild })
		editor.cancelDoubleClick()
		editor.click(25, 25, { target: 'shape', shape: grandChild })

		expect(editor.getOnlySelectedShapeId()).toBe(grandChildId)
		expect(editor.getFocusedGroupId()).toBe(innerGroupId)
		expect(editor.getEditingShapeId()).toBe(null)
		editor.expectToBeIn('select.idle')
	})

	it('enters editing for a sibling shape inside an outer group when drilled into a nested group', () => {
		// Outer group contains an inner group and a sibling shape S. The user
		// drills into the inner group; S is still directly selectable because
		// the outer group is on the drill stack. Double-clicking S should
		// therefore enter editing, even though S's parent (the outer group) is
		// not the currently focused group.
		const innerChildId = createShapeId()
		const innerChildBId = createShapeId()
		const siblingId = createShapeId()
		const innerGroupId = createShapeId()
		const outerGroupId = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([
				{ id: innerChildId, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } },
				{ id: innerChildBId, type: 'geo', x: 60, y: 0, props: { w: 50, h: 50 } },
				{ id: siblingId, type: 'geo', x: 200, y: 0, props: { w: 50, h: 50 } },
			])
			.groupShapes([innerChildId, innerChildBId], { groupId: innerGroupId })
			.groupShapes([innerGroupId, siblingId], { groupId: outerGroupId })
			.selectNone()

		// Drill all the way into the inner group: 1) select outer, 2) drill to
		// inner, 3) drill to inner's child. After this the focused group is
		// the inner group.
		const innerChild = editor.getShape(innerChildId)!
		// Separate user clicks, each drilling one level; reset the click state
		// between them so they aren't coalesced into a double-click.
		editor.click(25, 25, { target: 'shape', shape: innerChild })
		editor.cancelDoubleClick()
		editor.click(25, 25, { target: 'shape', shape: innerChild })
		editor.cancelDoubleClick()
		editor.click(25, 25, { target: 'shape', shape: innerChild })
		expect(editor.getOnlySelectedShapeId()).toBe(innerChildId)
		expect(editor.getFocusedGroupId()).toBe(innerGroupId)

		// Reset the click manager state so the next double-click starts a
		// fresh sequence.
		editor.cancelDoubleClick()

		// Double-click the sibling shape. Its parent is the outer group,
		// which is an ancestor of the focused inner group, so editing must
		// start.
		const sibling = editor.getShape(siblingId)!
		editor.doubleClick(225, 25, { target: 'shape', shape: sibling })

		expect(editor.getEditingShapeId()).toBe(siblingId)
		editor.expectToBeIn('select.editing_shape')
	})

	it('enters editing for a shape inside the focused group when double clicking the shape', () => {
		const childAId = createShapeId()
		const childBId = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([
				{ id: childAId, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
				{ id: childBId, type: 'geo', x: 300, y: 100, props: { w: 100, h: 100 } },
			])
			.groupShapes([childAId, childBId])

		const groupId = editor.getOnlySelectedShapeId()!

		// Drill into the group, then (after the click sequence has settled)
		// double-click the child directly.
		const childA = editor.getShape(childAId)!
		editor
			.click(150, 150, { target: 'shape', shape: childA })
			.click(150, 150, { target: 'shape', shape: childA })
		expect(editor.getOnlySelectedShapeId()).toBe(childAId)
		expect(editor.getFocusedGroupId()).toBe(groupId)

		editor.cancelDoubleClick()

		editor.doubleClick(150, 150, { target: 'shape', shape: childA })

		expect(editor.getEditingShapeId()).toBe(childAId)
		editor.expectToBeIn('select.editing_shape')
	})

	it('Resets the cursor to default when entering editing mode from a resize handle', () => {
		const id = createShapeId()
		editor
			.selectAll()
			.deleteShapes(editor.getSelectedShapeIds())
			.selectNone()
			.createShapes([{ id, type: 'geo' }])
			.select(id)

		editor.setCursor({ type: 'ew-resize', rotation: 0 })
		expect(editor.getInstanceState().cursor.type).toBe('ew-resize')

		editor.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		expect(editor.getEditingShapeId()).toBe(id)
		expect(editor.getInstanceState().cursor.type).toBe('default')
	})
})

describe('When double clicking a selection handle that registers as a canvas event', () => {
	let overlayEditor: TestEditor
	beforeEach(() => {
		overlayEditor = new TestEditor({ overlayUtils: defaultOverlayUtils })
	})

	it('Routes a canvas-targeted double-click on a resize edge handle to onDoubleClickEdge', () => {
		const id = createShapeId()
		overlayEditor
			.createShapes([{ id, type: 'frame', x: 100, y: 100, props: { w: 200, h: 200 } }])
			.select(id)

		const spy = vi.spyOn(
			overlayEditor.getShapeUtil('frame') as Required<ShapeUtil<TLFrameShape>>,
			'onDoubleClickEdge'
		)
		const bounds = overlayEditor.getSelectionPageBounds()!

		// Double-click on the right edge handle without specifying target — defaults
		// to target: 'canvas', the same payload a real DOM double-click produces when
		// the press lands on the overlay layer rather than a shape.
		overlayEditor.doubleClick(bounds.maxX, bounds.midY)

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][1]).toMatchObject({ target: 'selection', handle: 'right' })
	})

	it('Routes a canvas-targeted double-click on a resize corner handle to onDoubleClickCorner', () => {
		const id = createShapeId()
		overlayEditor
			.createShapes([{ id, type: 'frame', x: 100, y: 100, props: { w: 200, h: 200 } }])
			.select(id)

		const spy = vi.spyOn(
			overlayEditor.getShapeUtil('frame') as Required<ShapeUtil<TLFrameShape>>,
			'onDoubleClickCorner'
		)
		const bounds = overlayEditor.getSelectionPageBounds()!

		overlayEditor.doubleClick(bounds.maxX, bounds.maxY)

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy.mock.calls[0][1]).toMatchObject({ target: 'selection', handle: 'bottom_right' })
	})

	it('Routes a canvas-targeted double-click on an arrow handle to onDoubleClickHandle', () => {
		const id = createShapeId()
		overlayEditor
			.createShapes([
				{
					id,
					type: 'arrow',
					x: 100,
					y: 100,
					props: { start: { x: 0, y: 0 }, end: { x: 100, y: 100 } },
				},
			])
			.select(id)

		expect(overlayEditor.getShape<TLArrowShape>(id)!.props.arrowheadEnd).toBe('arrow')

		// Double-click on the end handle without specifying target — defaults to
		// target: 'canvas', the payload a real DOM double-click produces when the
		// press lands on the handle overlay. This should toggle the arrowhead.
		overlayEditor.doubleClick(200, 200)

		expect(overlayEditor.getShape<TLArrowShape>(id)!.props.arrowheadEnd).toBe('none')

		overlayEditor.doubleClick(200, 200)

		expect(overlayEditor.getShape<TLArrowShape>(id)!.props.arrowheadEnd).toBe('arrow')
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
			{
				id: ids.geo1,
				type: 'geo',
				props: { richText: toRichText('hello world ') },
			},
			{
				id: ids.geo2,
				type: 'geo',
				props: { richText: toRichText('hello world ') },
			},
			{
				id: ids.text1,
				type: 'text',
				props: { richText: toRichText('hello world ') },
			},
			{
				id: ids.text2,
				type: 'text',
				props: { richText: toRichText('hello world ') },
			},
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
	// because useEditablePlainText implements the behavior in React
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
		expect(editor.getIsReadonly()).toBe(true)

		const shape = editor.getShape(ids.embed1)
		editor.doubleClick(100, 100, { target: 'shape', shape })
		expect(editor.getEditingShapeId()).toBe(ids.embed1)
	})

	it('Begins editing embed when pressing Enter on a selected embed', () => {
		expect(editor.getEditingShapeId()).toBe(null)
		expect(editor.getSelectedShapeIds().length).toBe(0)
		expect(editor.getIsReadonly()).toBe(true)

		editor.setSelectedShapes([ids.embed1])
		expect(editor.getSelectedShapeIds().length).toBe(1)

		editor.keyPress('Enter')
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

test('right clicking a shape inside of a group does not focus the group if the group is selected', () => {
	const boxAId = createShapeId()
	const boxBId = createShapeId()
	editor.createShapes([
		{ id: boxAId, type: 'geo', x: 100, y: 100 },
		{ id: boxBId, type: 'geo', x: 200, y: 200 },
	])
	editor.groupShapes([boxAId, boxBId])
	const groupId = editor.getOnlySelectedShapeId()
	editor.pointerDown(100, 100, { target: 'shape', button: 2, shape: editor.getShape(boxAId)! })
	editor.pointerUp(100, 100, { target: 'shape', button: 2, shape: editor.getShape(boxAId)! })
	expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
	editor.pointerDown(100, 100, { target: 'shape', button: 0, shape: editor.getShape(boxAId)! })
	editor.pointerUp(100, 100, { target: 'shape', button: 0, shape: editor.getShape(boxAId)! })
	expect(editor.getFocusedGroupId()).toBe(groupId)
})

describe('when passing a function to onInteractionEnd', () => {
	it('calls the function for cropping', () => {
		const id = createShapeId('image')
		editor.createShapes([
			{
				id,
				type: 'image',
				x: 100,
				y: 100,
				props: {
					w: 1200,
					h: 800,
				},
			},
		])

		editor.select(id)

		const fn = vi.fn()
		editor.setCurrentTool('select.cropping', {
			handle: 'bottom_right',
			onInteractionEnd: fn,
		})
		editor.pointerUp(50, 50)

		expect(fn).toHaveBeenCalled()
	})

	it('calls the function for pointing crop handle', () => {
		const fn = vi.fn()
		editor.setCurrentTool('select.crop.pointing_crop_handle', {
			onInteractionEnd: fn,
		})
		editor.pointerUp(50, 50)
		expect(fn).toHaveBeenCalled()
	})

	it('calls the function for pointing arrow label', () => {
		const fn = vi.fn()
		const id = createShapeId('arrow')

		const arrow = {
			id,
			type: 'arrow' as const,
			x: 100,
			y: 100,
			props: {
				richText: toRichText('Test Label'),
				start: { x: 0, y: 0 },
				end: { x: 100, y: 0 },
			},
		}

		editor.createShapes([arrow])

		editor.setCurrentTool('select.pointing_arrow_label', {
			shape: arrow,
			onInteractionEnd: fn,
		})
		editor.pointerUp(50, 50)
		expect(fn).toHaveBeenCalled()
	})

	it('calls the function for pointing a resize handle', () => {
		const fn = vi.fn()
		editor.setCurrentTool('select.pointing_resize_handle', {
			target: 'selection',
			handle: 'bottom_right',
			onInteractionEnd: fn,
		})
		editor.pointerUp(50, 50)
		expect(fn).toHaveBeenCalled()
	})

	it('calls the function for pointing a rotate handle', () => {
		const fn = vi.fn()
		editor.setCurrentTool('select.pointing_rotate_handle', {
			target: 'selection',
			handle: 'bottom_right_rotate',
			onInteractionEnd: fn,
		})
		editor.pointerUp(50, 50)
		expect(fn).toHaveBeenCalled()
	})

	it('calls the function for resizing', () => {
		const id = createShapeId('box')
		editor.createShapes([
			{
				id,
				type: 'geo',
				x: 100,
				y: 100,
			},
		])

		editor.select(id)

		const fn = vi.fn()
		editor.setCurrentTool('select.resizing', {
			target: 'selection',
			handle: 'bottom_right',
			onInteractionEnd: fn,
		})
		editor.pointerUp(50, 50)
		expect(fn).toHaveBeenCalled()
	})

	it('calls the function for translating', () => {
		const id = createShapeId('box')
		editor.createShapes([
			{
				id,
				type: 'geo',
				x: 100,
				y: 100,
			},
		])
		editor.select(id)

		const fn = vi.fn()
		editor.setCurrentTool('select.translating', {
			onInteractionEnd: fn,
		})
		editor.pointerUp(50, 50)
		expect(fn).toHaveBeenCalled()
	})
})

describe('when passing a string to onInteractionEnd', () => {
	it('transitions to the tool for cropping', () => {
		const id = createShapeId('image')
		editor.createShapes([
			{
				id,
				type: 'image',
				x: 100,
				y: 100,
				props: {
					w: 1200,
					h: 800,
				},
			},
		])

		editor.select(id)

		editor.setCurrentTool('select.cropping', {
			handle: 'bottom_right',
			onInteractionEnd: 'select.idle',
		})
		editor.pointerUp(50, 50)

		editor.expectToBeIn('select.idle')
	})

	it('transitions to the tool for pointing crop handle', () => {
		editor.setCurrentTool('select.crop.pointing_crop_handle', {
			onInteractionEnd: 'select.idle',
		})
		editor.pointerUp(50, 50)
		editor.expectToBeIn('select.idle')
	})

	it('transitions to the tool for pointing arrow label', () => {
		const id = createShapeId('arrow')

		const arrow = {
			id,
			type: 'arrow' as const,
			x: 100,
			y: 100,
			props: {
				richText: toRichText('Test Label'),
				start: { x: 0, y: 0 },
				end: { x: 100, y: 0 },
			},
		}

		editor.createShapes([arrow])

		editor.setCurrentTool('select.pointing_arrow_label', {
			shape: arrow,
			onInteractionEnd: 'select.idle',
		})
		editor.pointerUp(50, 50)
		editor.expectToBeIn('select.idle')
	})

	it('transitions to the tool for pointing a resize handle', () => {
		editor.setCurrentTool('select.pointing_resize_handle', {
			target: 'selection',
			handle: 'bottom_right',
			onInteractionEnd: 'select.idle',
		})
		editor.pointerUp(50, 50)
		editor.expectToBeIn('select.idle')
	})

	it('transitions to the tool for pointing a rotate handle', () => {
		editor.setCurrentTool('select.pointing_rotate_handle', {
			target: 'selection',
			handle: 'bottom_right_rotate',
			onInteractionEnd: 'select.idle',
		})
		editor.pointerUp(50, 50)
		editor.expectToBeIn('select.idle')
	})

	it('transitions to the tool for resizing', () => {
		const id = createShapeId('box')
		editor.createShapes([
			{
				id,
				type: 'geo',
				x: 100,
				y: 100,
			},
		])

		editor.select(id)

		editor.setCurrentTool('select.resizing', {
			target: 'selection',
			handle: 'bottom_right',
			onInteractionEnd: 'select.idle',
		})
		editor.pointerUp(50, 50)
		editor.expectToBeIn('select.idle')
	})

	it('transitions to the tool for translating', () => {
		const id = createShapeId('box')
		editor.createShapes([
			{
				id,
				type: 'geo',
				x: 100,
				y: 100,
			},
		])
		editor.select(id)

		editor.setCurrentTool('select.translating', {
			onInteractionEnd: 'select.idle',
		})
		editor.pointerUp(50, 50)
		editor.expectToBeIn('select.idle')
	})
})

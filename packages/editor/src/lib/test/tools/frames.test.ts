import { DefaultFillStyle, TLArrowShape, createShapeId } from '@tldraw/tlschema'
import { FrameShapeUtil } from '../../editor/shapes/frame/FrameShapeUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

jest.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

const ids = {
	boxA: createShapeId('boxA'),
}

describe('creating frames', () => {
	it('can be done', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		expect(editor.onlySelectedShape?.type).toBe('frame')
		expect(editor.getPageBounds(editor.onlySelectedShape!)).toMatchObject({
			x: 100,
			y: 100,
			w: 100,
			h: 100,
		})
	})
	it('will create with a default size if no dragging happens', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerUp(100, 100)
		expect(editor.onlySelectedShape?.type).toBe('frame')
		const { w, h } = editor.getShapeUtil(FrameShapeUtil).getDefaultProps()
		expect(editor.getPageBounds(editor.onlySelectedShape!)).toMatchObject({
			x: 100 - w / 2,
			y: 100 - h / 2,
			w,
			h,
		})
	})
	it('can be canceled while pointing', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).cancel().pointerUp(100, 100)
		expect(editor.onlySelectedShape?.type).toBe(undefined)
		expect(editor.shapesArray).toHaveLength(0)
	})
	it('can be canceled while dragging', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200)
		editor.expectPathToBe('root.select.resizing')
		editor.cancel()
		editor.pointerUp()
		expect(editor.onlySelectedShape?.type).toBe(undefined)
		expect(editor.shapesArray).toHaveLength(0)
	})
	it('can be undone', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		expect(editor.onlySelectedShape?.type).toBe('frame')
		expect(editor.shapesArray).toHaveLength(1)

		editor.undo()

		expect(editor.onlySelectedShape?.type).toBe(undefined)
		expect(editor.shapesArray).toHaveLength(0)
	})
	it('can be done inside other frames', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameAId = editor.onlySelectedShape!.id

		editor.setSelectedTool('frame')
		editor.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)

		expect(editor.shapesArray).toHaveLength(2)

		expect(editor.onlySelectedShape?.parentId).toEqual(frameAId)

		expect(editor.getPageBounds(editor.onlySelectedShape!)).toMatchObject({
			x: 125,
			y: 125,
			w: 50,
			h: 50,
		})
	})
	it('can be done inside other rotated frames', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameAId = editor.onlySelectedShape!.id

		editor.rotateSelection(Math.PI / 2)

		editor.setSelectedTool('frame')
		editor.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)

		expect(editor.shapesArray).toHaveLength(2)

		expect(editor.onlySelectedShape?.parentId).toEqual(frameAId)

		expect(editor.getPageBounds(editor.onlySelectedShape!)).toCloselyMatchObject({
			x: 125,
			y: 125,
			w: 50,
			h: 50,
		})
	})

	it('can snap', () => {
		editor.createShapes([
			{ type: 'geo', id: ids.boxA, x: 0, y: 0, props: { w: 50, h: 50, fill: 'solid' } },
		])

		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(49, 149)

		expect(editor.getPageBounds(editor.onlySelectedShape!)).toMatchObject({
			x: 49,
			y: 100,
			w: 51,
			h: 49,
		})

		// x should snap
		editor.keyDown('Control')
		expect(editor.snaps.lines).toHaveLength(1)
		expect(editor.getPageBounds(editor.onlySelectedShape!)).toMatchObject({
			x: 50,
			y: 100,
			w: 50,
			h: 49,
		})
	})

	it('switches back to the select tool after creating', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(49, 149).pointerUp()
		editor.expectPathToBe('root.select.idle')
	})
})

describe('frame shapes', () => {
	it('can receive new children when shapes are drawn on top and the frame is rotated', () => {
		// We should be starting from an empty canvas
		expect(editor.shapesArray).toHaveLength(0)

		const frameId = createShapeId('frame')

		editor
			// Create a frame
			.createShapes(
				[{ id: frameId, type: 'frame', x: 100, y: 100, props: { w: 100, h: 100 } }],
				true
			)
			// Rotate it by PI/2
			.rotateSelection(Math.PI / 2)
			// Draw a shape into the frame
			.setSelectedTool('draw')
			.pointerDown(125, 125)
			.pointerMove(175, 175)
			.pointerUp()
			// Draw another shape
			.pointerDown(150, 150)
			.pointerMove(200, 200)
			.pointerUp()

		// The two shapes should have been created
		expect(editor.shapesArray).toHaveLength(3)

		// The shapes should be the child of the frame
		const childIds = editor.getSortedChildIds(frameId)
		expect(childIds.length).toBe(2)

		// The absolute rotation should be zero
		childIds.forEach((id) => expect(editor.getPageRotationById(id)).toBe(0))
		// Which means the local rotation should be -PI/2
		childIds.forEach((id) => expect(editor.getShapeById(id)!.rotation).toBe(-Math.PI / 2))
	})

	it('can be resized', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		editor.resizeSelection({ scaleX: 0.5, scaleY: 0.5 }, 'bottom_right')
		expect(editor.getPageBounds(editor.onlySelectedShape!)).toCloselyMatchObject({
			x: 100,
			y: 100,
			w: 50,
			h: 50,
		})

		editor.undo()
	})

	it('can be reiszied from the center', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		editor.resizeSelection({ scaleX: 0.5, scaleY: 0.5 }, 'bottom_right', { altKey: true })
		expect(editor.getPageBounds(editor.onlySelectedShape!)).toCloselyMatchObject({
			x: 125,
			y: 125,
			w: 50,
			h: 50,
		})
	})

	it('does not resize the children', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = editor.onlySelectedShape!.id

		editor.setSelectedTool('geo')
		editor.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)

		const boxId = editor.onlySelectedShape!.id

		editor.select(frameId)

		editor.resizeSelection({ scaleX: 0.5, scaleY: 0.5 }, 'bottom_right')

		expect(editor.getPageBoundsById(frameId)).toCloselyMatchObject({
			x: 100,
			y: 100,
			w: 50,
			h: 50,
		})
		expect(editor.getPageBoundsById(boxId)).toCloselyMatchObject({
			x: 125,
			y: 125,
			w: 50,
			h: 50,
		})
	})

	it('can have shapes dragged on top and back out', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = editor.onlySelectedShape!.id

		editor.createShapes([
			{ type: 'geo', id: ids.boxA, x: 250, y: 250, props: { w: 50, h: 50, fill: 'solid' } },
		])

		expect(editor.onlySelectedShape!.parentId).toBe(editor.currentPageId)

		editor.setSelectedTool('select')
		editor.pointerDown(275, 275, ids.boxA).pointerMove(150, 150)

		jest.advanceTimersByTime(250)

		expect(editor.onlySelectedShape!.id).toBe(ids.boxA)
		expect(editor.onlySelectedShape!.parentId).toBe(frameId)

		editor.pointerMove(275, 275)
		jest.advanceTimersByTime(250)

		expect(editor.onlySelectedShape!.parentId).toBe(editor.currentPageId)

		editor.pointerMove(150, 150)
		jest.advanceTimersByTime(250)

		expect(editor.onlySelectedShape!.parentId).toBe(frameId)

		editor.pointerUp(150, 150)

		expect(editor.onlySelectedShape!.parentId).toBe(frameId)
	})

	it('can have shapes dragged on top and dropped before the timeout fires', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = editor.onlySelectedShape!.id

		// Create a new shape off of the frame
		editor.createShapes([
			{ type: 'geo', id: ids.boxA, x: 250, y: 250, props: { w: 50, h: 50, fill: 'solid' } },
		])

		// It should be a child of the page
		expect(editor.onlySelectedShape!.parentId).toBe(editor.currentPageId)

		// Drag the shape on top of the frame
		editor.setSelectedTool('select')
		editor.pointerDown(275, 275, ids.boxA).pointerMove(150, 150)

		// The timeout has not fired yet, so the shape is still a child of the current page
		expect(editor.onlySelectedShape!.parentId).toBe(editor.currentPageId)

		// On pointer up, the shape should be dropped into the frame
		editor.pointerUp()
		expect(editor.onlySelectedShape!.parentId).toBe(frameId)
	})

	it('does not reparent shapes that are being dragged from within the frame', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = editor.onlySelectedShape!.id

		// create a box within the frame
		editor.setSelectedTool('geo')
		editor.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)
		expect(editor.onlySelectedShape!.parentId).toBe(frameId)
		const boxAid = editor.onlySelectedShape!.id

		// create another box within the frame
		editor.setSelectedTool('geo')
		editor.pointerDown(130, 130).pointerMove(180, 180).pointerUp(180, 180)
		expect(editor.onlySelectedShape!.parentId).toBe(frameId)
		const boxBid = editor.onlySelectedShape!.id

		// dragging box A around should not cause the index to change or the frame to be highlighted

		editor.setSelectedTool('select')
		editor.pointerDown(125, 125, boxAid).pointerMove(130, 130)

		jest.advanceTimersByTime(2500)

		editor.pointerMove(175, 175)

		jest.advanceTimersByTime(2500)

		expect(editor.onlySelectedShape!.id).toBe(boxAid)
		expect(editor.onlySelectedShape!.parentId).toBe(frameId)
		expect(editor.hintingIds).toHaveLength(0)
		// box A should still be beneath box B
		expect(
			editor.getShapeById(boxAid)!.index.localeCompare(editor.getShapeById(boxBid)!.index)
		).toBe(-1)
	})

	it('can be snapped to when dragging other shapes', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		editor.createShapes([
			{ type: 'geo', id: ids.boxA, x: 250, y: 250, props: { w: 50, h: 50, fill: 'solid' } },
		])

		editor.setSelectedTool('select')
		editor.select(ids.boxA)
		editor.pointerDown(275, 275, ids.boxA).pointerMove(275, 74)
		expect(editor.getPageBoundsById(ids.boxA)).toMatchObject({ y: 49 })
		editor.keyDown('Control')
		expect(editor.getPageBoundsById(ids.boxA)).toMatchObject({ y: 50 })
		expect(editor.snaps.lines).toHaveLength(1)
	})

	it("does not allow outside shapes to snap to the frame's children", () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		editor.setSelectedTool('geo')
		editor.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)
		const innerBoxId = editor.onlySelectedShape!.id

		// make a shape outside the frame
		editor.setSelectedTool('geo')
		editor.pointerDown(275, 125).pointerMove(280, 130).pointerUp(280, 130)
		expect(editor.getPageBounds(editor.onlySelectedShape!)).toMatchObject({
			x: 275,
			y: 125,
			w: 5,
			h: 5,
		})

		// drag it a pixel up, it should not snap even though it's at the same y as the box inside the frame
		editor.setSelectedTool('select')
		editor
			.pointerDown(277.5, 127.5, editor.onlySelectedShape!.id)
			.pointerMove(287.5, 126.5)
			.pointerMove(277.5, 126.5)

		// now try to snap
		editor.keyDown('Control')
		expect(editor.getPageBounds(editor.onlySelectedShape!)).toMatchObject({
			x: 275,
			y: 124,
			w: 5,
			h: 5,
		})
		expect(editor.snaps.lines).toHaveLength(0)
		// and if we unparent the box it should snap
		editor.reparentShapesById([innerBoxId], editor.currentPageId)

		editor.pointerMove(287.5, 126.5).pointerMove(277.5, 126.5)
		expect(editor.snaps.lines).toHaveLength(1)
		expect(editor.getPageBounds(editor.onlySelectedShape!)).toMatchObject({
			x: 275,
			y: 125,
			w: 5,
			h: 5,
		})
	})

	it('children of a frame will not snap to shapes outside the frame', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		const frameId = editor.onlySelectedShape!.id

		// make a shape inside the frame
		editor.setSelectedTool('geo')
		editor.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)
		const innerBoxId = editor.onlySelectedShape!.id

		// make a shape outside the frame
		editor.setSelectedTool('geo')
		editor.pointerDown(275, 125).pointerMove(280, 130).pointerUp(280, 130)
		const outerBoxId = editor.onlySelectedShape!.id

		editor.setSelectedTool('select')
		editor.pointerDown(150, 150, innerBoxId).pointerMove(150, 50).pointerMove(150, 148)
		editor.keyDown('Control')
		expect(editor.snaps.lines).toHaveLength(0)

		// move shape inside the frame to make sure it snaps in there
		editor.reparentShapesById([outerBoxId], frameId).pointerMove(150, 149, { ctrlKey: true })

		expect(editor.snaps.lines).toHaveLength(1)
	})

	it('masks its children', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		editor.setSelectedTool('geo')
		editor.pointerDown(150, 150).pointerMove(250, 250).pointerUp(250, 250)

		expect(editor.getPageBounds(editor.onlySelectedShape!)).toMatchObject({
			x: 150,
			y: 150,
			w: 100,
			h: 100,
		})

		// mask should be a 50px box around the top left corner
		expect(editor.getClipPathById(editor.onlySelectedShape!.id)).toMatchInlineSnapshot(
			`"polygon(-50px -50px,50px -50px,50px 50px,-50px 50px)"`
		)

		editor.reparentShapesById([editor.onlySelectedShape!.id], editor.currentPageId)

		expect(editor.getClipPathById(editor.onlySelectedShape!.id)).toBeUndefined()
	})

	it('masks its nested children', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		editor.setSelectedTool('frame')
		editor.pointerDown(150, 150).pointerMove(250, 250).pointerUp(250, 250)

		const innerFrameId = editor.onlySelectedShape!.id

		editor.setSelectedTool('geo')
		editor.pointerDown(100, 100).pointerMove(250, 250).pointerUp(250, 250)

		const boxId = editor.onlySelectedShape!.id

		editor.reparentShapesById([boxId], innerFrameId)

		// should be a 50px box starting in the middle of the outer frame
		expect(editor.getClipPathById(boxId)).toMatchInlineSnapshot(
			`"polygon(50px 50px,100px 50px,100px 100px,50px 100px)"`
		)
	})

	it('arrows started within the frame will bind to it and have the page as their parent', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		const frameId = editor.onlySelectedShape!.id

		editor.setSelectedTool('arrow')
		editor.pointerDown(150, 150).pointerMove(250, 250).pointerUp(250, 250)

		const arrow = editor.onlySelectedShape! as TLArrowShape

		expect(arrow.props.start).toMatchObject({ boundShapeId: frameId })
		expect(arrow.props.end).toMatchObject({ type: 'point' })

		expect(arrow.parentId).toBe(editor.currentPageId)
	})

	it('arrows started within the frame can bind to a shape within the frame ', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		const frameId = editor.onlySelectedShape!.id

		editor.setSelectedTool('geo')
		editor
			.pointerDown(125, 125)
			.pointerMove(175, 175)
			.pointerUp(175, 175)
			.setStyle(DefaultFillStyle, 'solid')
		const boxId = editor.onlySelectedShape!.id

		editor.setSelectedTool('arrow')
		editor.pointerDown(150, 150).pointerMove(190, 190).pointerUp(190, 190)

		const arrow = editor.onlySelectedShape! as TLArrowShape

		expect(arrow.props.start).toMatchObject({ boundShapeId: boxId })
		expect(arrow.props.end).toMatchObject({ boundShapeId: frameId })

		expect(arrow.parentId).toBe(editor.currentPageId)
	})

	it('can be edited', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = editor.onlySelectedShape!.id

		expect(editor.selectedIds[0]).toBe(frameId)
		expect(editor.pageState.editingId).toBe(null)

		editor.setSelectedTool('select')

		editor.keyDown('Enter')
		editor.keyUp('Enter')

		expect(editor.pageState.editingId).toBe(frameId)
	})

	it('can be selected with box brushing only if the whole frame is selected', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		const frameId = editor.onlySelectedShape!.id

		// select from outside the frame
		editor.setSelectedTool('select')
		editor.pointerDown(50, 50).pointerMove(150, 150)
		editor.expectPathToBe('root.select.brushing')

		expect(editor.selectedIds).toHaveLength(0)

		editor.pointerMove(250, 250)

		expect(editor.selectedIds).toHaveLength(1)
		expect(editor.onlySelectedShape!.id).toBe(frameId)
	})

	it('can be selected with scribble brushing only if the drag starts outside the frame', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		// select from inside the frame
		editor.setSelectedTool('select')
		editor.pointerDown(150, 150).pointerMove(250, 250)
		editor.expectPathToBe('root.select.brushing')

		expect(editor.selectedIds).toHaveLength(0)
	})

	it('children of a frame will not be selected from outside of the frame', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		editor.onlySelectedShape!.id

		// make a shape inside the frame that extends out of the frame
		editor.setSelectedTool('geo')
		editor.pointerDown(150, 150).pointerMove(400, 400).pointerUp(400, 400)
		const innerBoxId = editor.onlySelectedShape!.id

		// select from outside the frame via box brushing
		editor.setSelectedTool('select')
		editor.pointerDown(500, 500).pointerMove(300, 300).pointerUp(300, 300)

		// Check if the inner box was selected
		expect(editor.selectedIds).toHaveLength(0)

		// Select from outside the frame via box brushing
		// but also include the frame in the selection
		editor.pointerDown(400, 0).pointerMove(195, 175).pointerUp(195, 175)

		// Check if the inner box was selected
		expect(editor.selectedIds).toHaveLength(1)
		expect(editor.onlySelectedShape!.id).toBe(innerBoxId)

		// Deselect everything
		editor.deselect()

		// Select from outside the frame via scribble brushing
		editor.keyDown('alt').pointerDown(500, 500).pointerMove(300, 300)

		// Check if in scribble brushing mode
		editor.expectPathToBe('root.select.brushing')

		// Check if the inner box was selected
		editor.pointerUp(300, 300)
		expect(editor.selectedIds).toHaveLength(0)
	})

	it('arrows will not bind to parts of shapes outside the frame', () => {
		editor.setSelectedTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		editor.onlySelectedShape!.id

		// make a shape inside the frame that extends out of the frame
		editor.setSelectedTool('geo')
		editor
			.pointerDown(150, 150)
			.pointerMove(400, 400)
			.pointerUp(400, 400)
			.setStyle(DefaultFillStyle, 'solid')
		const innerBoxId = editor.onlySelectedShape!.id

		// Make an arrow that binds to the inner box's bottom right corner
		editor.setSelectedTool('arrow')
		editor.pointerDown(500, 500).pointerMove(375, 375)

		// Check if the arrow's handles remain points
		let arrow = editor.onlySelectedShape! as TLArrowShape
		expect(arrow.props.start).toMatchObject({
			type: 'point',
			x: 0,
			y: 0,
		})
		expect(arrow.props.end).toMatchObject({
			type: 'point',
			x: -125,
			y: -125,
		})

		// Move the end handle inside the frame
		editor.pointerMove(175, 175).pointerUp(175, 175)

		// Check if arrow's end handle is bound to the inner box
		arrow = editor.onlySelectedShape! as TLArrowShape
		expect(arrow.props.end).toMatchObject({ boundShapeId: innerBoxId })
	})
})

test('arrows bound to a shape within a group within a frame are reparented if the group is moved outside of the frame', () => {
	// frame
	// ┌─────────----------------─┐
	// │         group            │
	// │         ┌──────────────┐ │
	// │  ┌───┐  │       ┌───┐  │ │
	// │  │ a ┼──┼──────►│ b │  │ │
	// │  └───┘  │       └───┘  │ │
	// │         │              │ │
	// │         │  ┌───┐       │ │
	// │         │  │ c │       │ │
	// │         │  └───┘       │ │
	// │         │              │ │
	// │         └──────────────┘ │
	// └──────────────────────────┘
	editor.setSelectedTool('frame')
	editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
	const frameId = editor.onlySelectedShape!.id

	editor.setSelectedTool('geo')
	editor
		.pointerDown(110, 110)
		.pointerMove(120, 120)
		.pointerUp(120, 120)
		.setStyle(DefaultFillStyle, 'solid')
	const boxAId = editor.onlySelectedShape!.id

	editor.setSelectedTool('geo')
	editor
		.pointerDown(180, 110)
		.pointerMove(190, 120)
		.pointerUp(190, 120)
		.setStyle(DefaultFillStyle, 'solid')
	const boxBId = editor.onlySelectedShape!.id

	editor.setSelectedTool('geo')
	editor
		.pointerDown(160, 160)
		.pointerMove(170, 170)
		.pointerUp(170, 170)
		.setStyle(DefaultFillStyle, 'solid')
	const boxCId = editor.onlySelectedShape!.id

	editor.setSelectedTool('select')
	editor.select(boxBId, boxCId)
	editor.groupShapes()
	const groupId = editor.onlySelectedShape!.id

	editor.setSelectedTool('arrow')
	editor.pointerDown(115, 115).pointerMove(185, 115).pointerUp(185, 115)
	const arrowId = editor.onlySelectedShape!.id

	expect(editor.getArrowsBoundTo(boxAId)).toHaveLength(1)
	expect(editor.getArrowsBoundTo(boxBId)).toHaveLength(1)
	expect(editor.getArrowsBoundTo(boxCId)).toHaveLength(0)

	// expect group parent to be the frame
	expect(editor.getShapeById(groupId)!.parentId).toBe(frameId)

	// move the group outside of the frame
	editor.setSelectedTool('select')
	editor.select(groupId)
	editor.translateSelection(200, 0)

	// expect group parent to be the page
	expect(editor.getShapeById(groupId)!.parentId).toBe(editor.currentPageId)
	// expect arrow parent to be the page
	expect(editor.getShapeById(arrowId)!.parentId).toBe(editor.currentPageId)
	// expect arrow index to be greater than group index
	expect(
		editor.getShapeById(arrowId)?.index.localeCompare(editor.getShapeById(groupId)!.index)
	).toBe(1)
})

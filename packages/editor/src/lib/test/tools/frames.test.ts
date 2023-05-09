import { createCustomShapeId, TLArrowShape } from '@tldraw/tlschema'
import { TLFrameShapeDef } from '../../app/shapeutils/TLFrameUtil/TLFrameUtil'
import { TestApp } from '../TestApp'

let app: TestApp

jest.useFakeTimers()

beforeEach(() => {
	app = new TestApp()
})
afterEach(() => {
	app?.dispose()
})

const ids = {
	boxA: createCustomShapeId('boxA'),
}

describe('creating frames', () => {
	it('can be done', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		expect(app.onlySelectedShape?.type).toBe('frame')
		expect(app.getPageBounds(app.onlySelectedShape!)).toMatchObject({
			x: 100,
			y: 100,
			w: 100,
			h: 100,
		})
	})
	it('will create with a default size if no dragging happens', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerUp(100, 100)
		expect(app.onlySelectedShape?.type).toBe('frame')
		const { w, h } = app.getShapeUtilByDef(TLFrameShapeDef).defaultProps()
		expect(app.getPageBounds(app.onlySelectedShape!)).toMatchObject({
			x: 100 - w / 2,
			y: 100 - h / 2,
			w,
			h,
		})
	})
	it('can be canceled while pointing', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).cancel().pointerUp(100, 100)
		expect(app.onlySelectedShape?.type).toBe(undefined)
		expect(app.shapesArray).toHaveLength(0)
	})
	it('can be canceled while dragging', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200)
		app.expectPathToBe('root.select.resizing')
		app.cancel()
		app.pointerUp()
		expect(app.onlySelectedShape?.type).toBe(undefined)
		expect(app.shapesArray).toHaveLength(0)
	})
	it('can be undone', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		expect(app.onlySelectedShape?.type).toBe('frame')
		expect(app.shapesArray).toHaveLength(1)

		app.undo()

		expect(app.onlySelectedShape?.type).toBe(undefined)
		expect(app.shapesArray).toHaveLength(0)
	})
	it('can be done inside other frames', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameAId = app.onlySelectedShape!.id

		app.setSelectedTool('frame')
		app.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)

		expect(app.shapesArray).toHaveLength(2)

		expect(app.onlySelectedShape?.parentId).toEqual(frameAId)

		expect(app.getPageBounds(app.onlySelectedShape!)).toMatchObject({
			x: 125,
			y: 125,
			w: 50,
			h: 50,
		})
	})
	it('can be done inside other rotated frames', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameAId = app.onlySelectedShape!.id

		app.rotateSelection(Math.PI / 2)

		app.setSelectedTool('frame')
		app.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)

		expect(app.shapesArray).toHaveLength(2)

		expect(app.onlySelectedShape?.parentId).toEqual(frameAId)

		expect(app.getPageBounds(app.onlySelectedShape!)).toCloselyMatchObject({
			x: 125,
			y: 125,
			w: 50,
			h: 50,
		})
	})

	it('can snap', () => {
		app.createShapes([
			{ type: 'geo', id: ids.boxA, x: 0, y: 0, props: { w: 50, h: 50, fill: 'solid' } },
		])

		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(49, 149)

		expect(app.getPageBounds(app.onlySelectedShape!)).toMatchObject({
			x: 49,
			y: 100,
			w: 51,
			h: 49,
		})

		// x should snap
		app.keyDown('Control')
		expect(app.snaps.lines).toHaveLength(1)
		expect(app.getPageBounds(app.onlySelectedShape!)).toMatchObject({
			x: 50,
			y: 100,
			w: 50,
			h: 49,
		})
	})

	it('switches back to the select tool after creating', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(49, 149).pointerUp()
		app.expectPathToBe('root.select.idle')
	})
})

describe('frame shapes', () => {
	it('can receive new children when shapes are drawn on top and the frame is rotated', () => {
		// We should be starting from an empty canvas
		expect(app.shapesArray).toHaveLength(0)

		const frameId = app.createShapeId('frame')

		app
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
		expect(app.shapesArray).toHaveLength(3)

		// The shapes should be the child of the frame
		const childIds = app.getSortedChildIds(frameId)
		expect(childIds.length).toBe(2)

		// The absolute rotation should be zero
		childIds.forEach((id) => expect(app.getPageRotationById(id)).toBe(0))
		// Which means the local rotation should be -PI/2
		childIds.forEach((id) => expect(app.getShapeById(id)!.rotation).toBe(-Math.PI / 2))
	})

	it('can be resized', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		app.resizeSelection({ scaleX: 0.5, scaleY: 0.5 }, 'bottom_right')
		expect(app.getPageBounds(app.onlySelectedShape!)).toCloselyMatchObject({
			x: 100,
			y: 100,
			w: 50,
			h: 50,
		})

		app.undo()
	})

	it('can be reiszied from the center', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		app.resizeSelection({ scaleX: 0.5, scaleY: 0.5 }, 'bottom_right', { altKey: true })
		expect(app.getPageBounds(app.onlySelectedShape!)).toCloselyMatchObject({
			x: 125,
			y: 125,
			w: 50,
			h: 50,
		})
	})

	it('does not resize the children', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = app.onlySelectedShape!.id

		app.setSelectedTool('geo')
		app.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)

		const boxId = app.onlySelectedShape!.id

		app.select(frameId)

		app.resizeSelection({ scaleX: 0.5, scaleY: 0.5 }, 'bottom_right')

		expect(app.getPageBoundsById(frameId)).toCloselyMatchObject({
			x: 100,
			y: 100,
			w: 50,
			h: 50,
		})
		expect(app.getPageBoundsById(boxId)).toCloselyMatchObject({
			x: 125,
			y: 125,
			w: 50,
			h: 50,
		})
	})

	it('can have shapes dragged on top and back out', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = app.onlySelectedShape!.id

		app.createShapes([
			{ type: 'geo', id: ids.boxA, x: 250, y: 250, props: { w: 50, h: 50, fill: 'solid' } },
		])

		expect(app.onlySelectedShape!.parentId).toBe(app.currentPageId)

		app.setSelectedTool('select')
		app.pointerDown(275, 275, ids.boxA).pointerMove(150, 150)

		jest.advanceTimersByTime(250)

		expect(app.onlySelectedShape!.id).toBe(ids.boxA)
		expect(app.onlySelectedShape!.parentId).toBe(frameId)

		app.pointerMove(275, 275)
		jest.advanceTimersByTime(250)

		expect(app.onlySelectedShape!.parentId).toBe(app.currentPageId)

		app.pointerMove(150, 150)
		jest.advanceTimersByTime(250)

		expect(app.onlySelectedShape!.parentId).toBe(frameId)

		app.pointerUp(150, 150)

		expect(app.onlySelectedShape!.parentId).toBe(frameId)
	})

	it('can have shapes dragged on top and dropped before the timeout fires', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = app.onlySelectedShape!.id

		// Create a new shape off of the frame
		app.createShapes([
			{ type: 'geo', id: ids.boxA, x: 250, y: 250, props: { w: 50, h: 50, fill: 'solid' } },
		])

		// It should be a child of the page
		expect(app.onlySelectedShape!.parentId).toBe(app.currentPageId)

		// Drag the shape on top of the frame
		app.setSelectedTool('select')
		app.pointerDown(275, 275, ids.boxA).pointerMove(150, 150)

		// The timeout has not fired yet, so the shape is still a child of the current page
		expect(app.onlySelectedShape!.parentId).toBe(app.currentPageId)

		// On pointer up, the shape should be dropped into the frame
		app.pointerUp()
		expect(app.onlySelectedShape!.parentId).toBe(frameId)
	})

	it('does not reparent shapes that are being dragged from within the frame', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = app.onlySelectedShape!.id

		// create a box within the frame
		app.setSelectedTool('geo')
		app.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)
		expect(app.onlySelectedShape!.parentId).toBe(frameId)
		const boxAid = app.onlySelectedShape!.id

		// create another box within the frame
		app.setSelectedTool('geo')
		app.pointerDown(130, 130).pointerMove(180, 180).pointerUp(180, 180)
		expect(app.onlySelectedShape!.parentId).toBe(frameId)
		const boxBid = app.onlySelectedShape!.id

		// dragging box A around should not cause the index to change or the frame to be highlighted

		app.setSelectedTool('select')
		app.pointerDown(125, 125, boxAid).pointerMove(130, 130)

		jest.advanceTimersByTime(2500)

		app.pointerMove(175, 175)

		jest.advanceTimersByTime(2500)

		expect(app.onlySelectedShape!.id).toBe(boxAid)
		expect(app.onlySelectedShape!.parentId).toBe(frameId)
		expect(app.hintingIds).toHaveLength(0)
		// box A should still be beneath box B
		expect(app.getShapeById(boxAid)!.index.localeCompare(app.getShapeById(boxBid)!.index)).toBe(-1)
	})

	it('can be snapped to when dragging other shapes', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		app.createShapes([
			{ type: 'geo', id: ids.boxA, x: 250, y: 250, props: { w: 50, h: 50, fill: 'solid' } },
		])

		app.setSelectedTool('select')
		app.select(ids.boxA)
		app.pointerDown(275, 275, ids.boxA).pointerMove(275, 74)
		expect(app.getPageBoundsById(ids.boxA)).toMatchObject({ y: 49 })
		app.keyDown('Control')
		expect(app.getPageBoundsById(ids.boxA)).toMatchObject({ y: 50 })
		expect(app.snaps.lines).toHaveLength(1)
	})

	it("does not allow outside shapes to snap to the frame's children", () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		app.setSelectedTool('geo')
		app.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)
		const innerBoxId = app.onlySelectedShape!.id

		// make a shape outside the frame
		app.setSelectedTool('geo')
		app.pointerDown(275, 125).pointerMove(280, 130).pointerUp(280, 130)
		expect(app.getPageBounds(app.onlySelectedShape!)).toMatchObject({ x: 275, y: 125, w: 5, h: 5 })

		// drag it a pixel up, it should not snap even though it's at the same y as the box inside the frame
		app.setSelectedTool('select')
		app
			.pointerDown(277.5, 127.5, app.onlySelectedShape!.id)
			.pointerMove(287.5, 126.5)
			.pointerMove(277.5, 126.5)

		// now try to snap
		app.keyDown('Control')
		expect(app.getPageBounds(app.onlySelectedShape!)).toMatchObject({
			x: 275,
			y: 124,
			w: 5,
			h: 5,
		})
		expect(app.snaps.lines).toHaveLength(0)
		// and if we unparent the box it should snap
		app.reparentShapesById([innerBoxId], app.currentPageId)

		app.pointerMove(287.5, 126.5).pointerMove(277.5, 126.5)
		expect(app.snaps.lines).toHaveLength(1)
		expect(app.getPageBounds(app.onlySelectedShape!)).toMatchObject({
			x: 275,
			y: 125,
			w: 5,
			h: 5,
		})
	})

	it('children of a frame will not snap to shapes outside the frame', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		const frameId = app.onlySelectedShape!.id

		// make a shape inside the frame
		app.setSelectedTool('geo')
		app.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)
		const innerBoxId = app.onlySelectedShape!.id

		// make a shape outside the frame
		app.setSelectedTool('geo')
		app.pointerDown(275, 125).pointerMove(280, 130).pointerUp(280, 130)
		const outerBoxId = app.onlySelectedShape!.id

		app.setSelectedTool('select')
		app.pointerDown(150, 150, innerBoxId).pointerMove(150, 50).pointerMove(150, 148)
		app.keyDown('Control')
		expect(app.snaps.lines).toHaveLength(0)

		// move shape inside the frame to make sure it snaps in there
		app.reparentShapesById([outerBoxId], frameId).pointerMove(150, 149, { ctrlKey: true })

		expect(app.snaps.lines).toHaveLength(1)
	})

	it('masks its children', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		app.setSelectedTool('geo')
		app.pointerDown(150, 150).pointerMove(250, 250).pointerUp(250, 250)

		expect(app.getPageBounds(app.onlySelectedShape!)).toMatchObject({
			x: 150,
			y: 150,
			w: 100,
			h: 100,
		})

		// mask should be a 50px box around the top left corner
		expect(app.getClipPathById(app.onlySelectedShape!.id)).toMatchInlineSnapshot(
			`"polygon(-50px -50px,50px -50px,50px 50px,-50px 50px)"`
		)

		app.reparentShapesById([app.onlySelectedShape!.id], app.currentPageId)

		expect(app.getClipPathById(app.onlySelectedShape!.id)).toBeUndefined()
	})

	it('masks its nested children', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		app.setSelectedTool('frame')
		app.pointerDown(150, 150).pointerMove(250, 250).pointerUp(250, 250)

		const innerFrameId = app.onlySelectedShape!.id

		app.setSelectedTool('geo')
		app.pointerDown(100, 100).pointerMove(250, 250).pointerUp(250, 250)

		const boxId = app.onlySelectedShape!.id

		app.reparentShapesById([boxId], innerFrameId)

		// should be a 50px box starting in the middle of the outer frame
		expect(app.getClipPathById(boxId)).toMatchInlineSnapshot(
			`"polygon(50px 50px,100px 50px,100px 100px,50px 100px)"`
		)
	})

	it('arrows started within the frame will bind to it and have the page as their parent', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		const frameId = app.onlySelectedShape!.id

		app.setSelectedTool('arrow')
		app.pointerDown(150, 150).pointerMove(250, 250).pointerUp(250, 250)

		const arrow = app.onlySelectedShape! as TLArrowShape

		expect(arrow.props.start).toMatchObject({ boundShapeId: frameId })
		expect(arrow.props.end).toMatchObject({ type: 'point' })

		expect(arrow.parentId).toBe(app.currentPageId)
	})

	it('arrows started within the frame can bind to a shape within the frame ', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		const frameId = app.onlySelectedShape!.id

		app.setSelectedTool('geo')
		app.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175).setProp('fill', 'solid')
		const boxId = app.onlySelectedShape!.id

		app.setSelectedTool('arrow')
		app.pointerDown(150, 150).pointerMove(190, 190).pointerUp(190, 190)

		const arrow = app.onlySelectedShape! as TLArrowShape

		expect(arrow.props.start).toMatchObject({ boundShapeId: boxId })
		expect(arrow.props.end).toMatchObject({ boundShapeId: frameId })

		expect(arrow.parentId).toBe(app.currentPageId)
	})

	it('can be edited', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = app.onlySelectedShape!.id

		expect(app.selectedIds[0]).toBe(frameId)
		expect(app.pageState.editingId).toBe(null)

		app.setSelectedTool('select')

		app.keyDown('Enter')
		app.keyUp('Enter')

		expect(app.pageState.editingId).toBe(frameId)
	})

	it('can be selected with box brushing only if the whole frame is selected', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		const frameId = app.onlySelectedShape!.id

		// select from outside the frame
		app.setSelectedTool('select')
		app.pointerDown(50, 50).pointerMove(150, 150)
		app.expectPathToBe('root.select.brushing')

		expect(app.selectedIds).toHaveLength(0)

		app.pointerMove(250, 250)

		expect(app.selectedIds).toHaveLength(1)
		expect(app.onlySelectedShape!.id).toBe(frameId)
	})

	it('can be selected with scribble brushing only if the drag starts outside the frame', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		// select from inside the frame
		app.setSelectedTool('select')
		app.pointerDown(150, 150).pointerMove(250, 250)
		app.expectPathToBe('root.select.brushing')

		expect(app.selectedIds).toHaveLength(0)
	})

	it('children of a frame will not be selected from outside of the frame', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		app.onlySelectedShape!.id

		// make a shape inside the frame that extends out of the frame
		app.setSelectedTool('geo')
		app.pointerDown(150, 150).pointerMove(400, 400).pointerUp(400, 400)
		const innerBoxId = app.onlySelectedShape!.id

		// select from outside the frame via box brushing
		app.setSelectedTool('select')
		app.pointerDown(500, 500).pointerMove(300, 300).pointerUp(300, 300)

		// Check if the inner box was selected
		expect(app.selectedIds).toHaveLength(0)

		// Select from outside the frame via box brushing
		// but also include the frame in the selection
		app.pointerDown(400, 0).pointerMove(195, 175).pointerUp(195, 175)

		// Check if the inner box was selected
		expect(app.selectedIds).toHaveLength(1)
		expect(app.onlySelectedShape!.id).toBe(innerBoxId)

		// Deselect everything
		app.deselect()

		// Select from outside the frame via scribble brushing
		app.keyDown('alt').pointerDown(500, 500).pointerMove(300, 300)

		// Check if in scribble brushing mode
		app.expectPathToBe('root.select.brushing')

		// Check if the inner box was selected
		app.pointerUp(300, 300)
		expect(app.selectedIds).toHaveLength(0)
	})

	it('arrows will not bind to parts of shapes outside the frame', () => {
		app.setSelectedTool('frame')
		app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		app.onlySelectedShape!.id

		// make a shape inside the frame that extends out of the frame
		app.setSelectedTool('geo')
		app.pointerDown(150, 150).pointerMove(400, 400).pointerUp(400, 400).setProp('fill', 'solid')
		const innerBoxId = app.onlySelectedShape!.id

		// Make an arrow that binds to the inner box's bottom right corner
		app.setSelectedTool('arrow')
		app.pointerDown(500, 500).pointerMove(375, 375)

		// Check if the arrow's handles remain points
		let arrow = app.onlySelectedShape! as TLArrowShape
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
		app.pointerMove(175, 175).pointerUp(175, 175)

		// Check if arrow's end handle is bound to the inner box
		arrow = app.onlySelectedShape! as TLArrowShape
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
	app.setSelectedTool('frame')
	app.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
	const frameId = app.onlySelectedShape!.id

	app.setSelectedTool('geo')
	app.pointerDown(110, 110).pointerMove(120, 120).pointerUp(120, 120).setProp('fill', 'solid')
	const boxAId = app.onlySelectedShape!.id

	app.setSelectedTool('geo')
	app.pointerDown(180, 110).pointerMove(190, 120).pointerUp(190, 120).setProp('fill', 'solid')
	const boxBId = app.onlySelectedShape!.id

	app.setSelectedTool('geo')
	app.pointerDown(160, 160).pointerMove(170, 170).pointerUp(170, 170).setProp('fill', 'solid')
	const boxCId = app.onlySelectedShape!.id

	app.setSelectedTool('select')
	app.select(boxBId, boxCId)
	app.groupShapes()
	const groupId = app.onlySelectedShape!.id

	app.setSelectedTool('arrow')
	app.pointerDown(115, 115).pointerMove(185, 115).pointerUp(185, 115)
	const arrowId = app.onlySelectedShape!.id

	expect(app.getArrowsBoundTo(boxAId)).toHaveLength(1)
	expect(app.getArrowsBoundTo(boxBId)).toHaveLength(1)
	expect(app.getArrowsBoundTo(boxCId)).toHaveLength(0)

	// expect group parent to be the frame
	expect(app.getShapeById(groupId)!.parentId).toBe(frameId)

	// move the group outside of the frame
	app.setSelectedTool('select')
	app.select(groupId)
	app.translateSelection(200, 0)

	// expect group parent to be the page
	expect(app.getShapeById(groupId)!.parentId).toBe(app.currentPageId)
	// expect arrow parent to be the page
	expect(app.getShapeById(arrowId)!.parentId).toBe(app.currentPageId)
	// expect arrow index to be greater than group index
	expect(app.getShapeById(arrowId)?.index.localeCompare(app.getShapeById(groupId)!.index)).toBe(1)
})

import {
	DefaultFillStyle,
	TLArrowShape,
	TLFrameShape,
	TLShapeId,
	createShapeId,
} from '@tldraw/editor'
import { DEFAULT_FRAME_PADDING, fitFrameToContent, removeFrame } from '../lib/utils/frames/frames'
import { TestEditor } from './TestEditor'

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
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		expect(editor.getOnlySelectedShape()?.type).toBe('frame')
		expect(editor.getShapePageBounds(editor.getOnlySelectedShape()!)).toMatchObject({
			x: 100,
			y: 100,
			w: 100,
			h: 100,
		})
	})
	it('will create with a default size if no dragging happens', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerUp(100, 100)
		expect(editor.getOnlySelectedShape()?.type).toBe('frame')
		const { w, h } = editor.getShapeUtil<TLFrameShape>('frame').getDefaultProps()
		expect(editor.getShapePageBounds(editor.getOnlySelectedShape()!)).toMatchObject({
			x: 100 - w / 2,
			y: 100 - h / 2,
			w,
			h,
		})
	})
	it('can be canceled while pointing', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).cancel().pointerUp(100, 100)
		expect(editor.getOnlySelectedShape()?.type).toBe(undefined)
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
	})
	it('can be canceled while dragging', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200)
		editor.expectToBeIn('select.resizing')
		editor.cancel()
		editor.pointerUp()
		expect(editor.getOnlySelectedShape()?.type).toBe(undefined)
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
	})
	it('can be undone', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		expect(editor.getOnlySelectedShape()?.type).toBe('frame')
		expect(editor.getCurrentPageShapes()).toHaveLength(1)

		editor.undo()

		expect(editor.getOnlySelectedShape()?.type).toBe(undefined)
		expect(editor.getCurrentPageShapes()).toHaveLength(0)
	})
	it('can be done inside other frames', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameAId = editor.getOnlySelectedShape()!.id

		editor.setCurrentTool('frame')
		editor.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)

		expect(editor.getCurrentPageShapes()).toHaveLength(2)

		expect(editor.getOnlySelectedShape()?.parentId).toEqual(frameAId)

		expect(editor.getShapePageBounds(editor.getOnlySelectedShape()!)).toMatchObject({
			x: 125,
			y: 125,
			w: 50,
			h: 50,
		})
	})
	it('can be done inside other rotated frames', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameAId = editor.getOnlySelectedShape()!.id

		editor.rotateSelection(Math.PI / 2)

		editor.setCurrentTool('frame')
		editor.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)

		expect(editor.getCurrentPageShapes()).toHaveLength(2)

		expect(editor.getOnlySelectedShape()?.parentId).toEqual(frameAId)

		expect(editor.getShapePageBounds(editor.getOnlySelectedShape()!)).toCloselyMatchObject({
			x: 125,
			y: 125,
			w: 50,
			h: 50,
		})
	})

	it('parents a shape when drag-creating a frame over it', () => {
		const rectId: TLShapeId = createRect({ pos: [10, 10], size: [20, 20] })
		const frameId = dragCreateFrame({ down: [0, 0], move: [100, 100], up: [100, 100] })
		const parent = editor.getShape(rectId)?.parentId
		expect(parent).toBe(frameId)
	})

	it('does not parent a shape when click-creating a frame over it', () => {
		const rectId: TLShapeId = createRect({ pos: [10, 10], size: [20, 20] })
		editor.setCurrentTool('frame')
		editor.pointerDown(0, 0)
		editor.pointerUp(0, 0)
		const parent = editor.getShape(rectId)?.parentId
		expect(parent).toBe('page:page')
	})

	it('can snap', () => {
		editor.createShapes([
			{ type: 'geo', id: ids.boxA, x: 0, y: 0, props: { w: 50, h: 50, fill: 'solid' } },
		])

		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(49, 149)

		expect(editor.getShapePageBounds(editor.getOnlySelectedShape()!)).toMatchObject({
			x: 49,
			y: 100,
			w: 51,
			h: 49,
		})

		// x should snap
		editor.keyDown('Control')
		expect(editor.snaps.getLines()).toHaveLength(1)
		expect(editor.getShapePageBounds(editor.getOnlySelectedShape()!)).toMatchObject({
			x: 50,
			y: 100,
			w: 50,
			h: 49,
		})
	})

	it('switches back to the select tool after creating', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(49, 149).pointerUp()
		editor.expectToBeIn('select.idle')
	})
})

describe('frame shapes', () => {
	it('can receive new children when shapes are drawn on top and the frame is rotated', () => {
		// We should be starting from an empty canvas
		expect(editor.getCurrentPageShapes()).toHaveLength(0)

		const frameId = createShapeId('frame')

		editor
			// Create a frame
			.createShapes([{ id: frameId, type: 'frame', x: 100, y: 100, props: { w: 100, h: 100 } }])
			.select(frameId)
			// Rotate it by PI/2
			.rotateSelection(Math.PI / 2)
			// Draw a shape into the frame
			.setCurrentTool('draw')
			.pointerDown(125, 125)
			.pointerMove(175, 175)
			.pointerUp()
			// Draw another shape
			.pointerDown(150, 150)
			.pointerMove(200, 200)
			.pointerUp()

		// The two shapes should have been created
		expect(editor.getCurrentPageShapes()).toHaveLength(3)

		// The shapes should be the child of the frame
		const childIds = editor.getSortedChildIdsForParent(frameId)
		expect(childIds.length).toBe(2)

		// The absolute rotation should be zero
		childIds.forEach((id) => expect(editor.getPageRotationById(id)).toBe(0))
		// Which means the local rotation should be -PI/2
		childIds.forEach((id) => expect(editor.getShape(id)!.rotation).toBe(-Math.PI / 2))
	})

	it('can be resized', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		editor.resizeSelection({ scaleX: 0.5, scaleY: 0.5 }, 'bottom_right')
		expect(editor.getShapePageBounds(editor.getOnlySelectedShape()!)).toCloselyMatchObject({
			x: 100,
			y: 100,
			w: 50,
			h: 50,
		})

		editor.undo()
	})

	it('can be reiszied from the center', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		editor.resizeSelection({ scaleX: 0.5, scaleY: 0.5 }, 'bottom_right', { altKey: true })
		expect(editor.getShapePageBounds(editor.getOnlySelectedShape()!)).toCloselyMatchObject({
			x: 125,
			y: 125,
			w: 50,
			h: 50,
		})
	})

	it('does not resize the children', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = editor.getOnlySelectedShape()!.id

		editor.setCurrentTool('geo')
		editor.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)

		const boxId = editor.getOnlySelectedShape()!.id

		editor.select(frameId)

		editor.resizeSelection({ scaleX: 0.5, scaleY: 0.5 }, 'bottom_right')

		expect(editor.getShapePageBounds(frameId)).toCloselyMatchObject({
			x: 100,
			y: 100,
			w: 50,
			h: 50,
		})
		expect(editor.getShapePageBounds(boxId)).toCloselyMatchObject({
			x: 125,
			y: 125,
			w: 50,
			h: 50,
		})
	})
	it('unparents a shape when resize causes it to be out of bounds', () => {
		const rectId: TLShapeId = createRect({ pos: [70, 10], size: [20, 20] })
		dragCreateFrame({ down: [10, 10], move: [100, 100], up: [100, 100] })
		// resize the frame so the shape is out of bounds
		editor.pointerDown(100, 50, { target: 'selection', handle: 'right' })
		editor.pointerMove(50, 50)
		editor.pointerUp(50, 50)
		const parent = editor.getShape(rectId)?.parentId
		expect(parent).toBe('page:page')
	})

	it('doesnt unparent a shape that is only partially out of bounds', () => {
		const rectId: TLShapeId = createRect({ pos: [70, 10], size: [20, 20] })
		const frameId = dragCreateFrame({ down: [0, 0], move: [100, 100], up: [100, 100] })
		const parentBefore = editor.getShape(rectId)?.parentId
		expect(parentBefore).toBe(frameId)
		// resize the frame so the shape is partially out of bounds
		editor.pointerDown(100, 50, { target: 'selection', handle: 'right' })
		editor.pointerMove(70, 50)
		editor.pointerUp(70, 50)
		const parentAfter = editor.getShape(rectId)?.parentId
		expect(parentAfter).toBe(frameId)
	})

	it('does not parent a shape when resizing over it', () => {
		const rectId = createRect({ pos: [70, 10], size: [20, 20] })
		// create frame next to shape
		dragCreateFrame({ down: [10, 10], move: [60, 100], up: [60, 100] })
		// resize the frame so the shape is totally covered
		editor.pointerDown(60, 50, { target: 'selection', handle: 'right' })
		editor.pointerMove(100, 50)
		editor.pointerUp(100, 50)
		const parent = editor.getShape(rectId)?.parentId
		expect(parent).toBe('page:page')
	})

	it('moves children when resizing a parent frame', () => {
		const rectId: TLShapeId = createRect({ size: [20, 20], pos: [10, 10] })
		dragCreateFrame({ down: [10, 10], move: [100, 100], up: [100, 100] })
		editor.pointerDown(0, 0, { target: 'selection', handle: 'top_left' })
		expect(editor.getShape(rectId)?.y).toBe(10)
		editor.pointerMove(-50, -50)
		editor.pointerUp(-50, -50)
		expect(editor.getShape(rectId)?.y).toBe(10)
	})

	it('does not move children when resizing with cmd key held down', () => {
		const rectId: TLShapeId = createRect({ size: [20, 20], pos: [10, 10] })
		dragCreateFrame({ down: [0, 0], move: [100, 100], up: [100, 100] })
		editor.pointerDown(0, 0, { target: 'selection', handle: 'top_left' })
		editor.keyDown('Control')
		editor.pointerMove(-50, -50)
		editor.pointerUp(-50, -50)
		expect(editor.getShape(rectId)?.x).toBe(60)
	})

	it('can have shapes dragged on top and back out', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = editor.getOnlySelectedShape()!.id

		editor.createShapes([
			{ type: 'geo', id: ids.boxA, x: 250, y: 250, props: { w: 50, h: 50, fill: 'solid' } },
		])

		expect(editor.getOnlySelectedShape()!.parentId).toBe(editor.getCurrentPageId())

		editor.setCurrentTool('select')
		editor.pointerDown(275, 275).pointerMove(150, 150)

		jest.advanceTimersByTime(300)

		expect(editor.getOnlySelectedShape()!.id).toBe(ids.boxA)
		expect(editor.getOnlySelectedShape()!.parentId).toBe(frameId)

		editor.pointerMove(275, 275)
		jest.advanceTimersByTime(250)

		expect(editor.getOnlySelectedShape()!.parentId).toBe(editor.getCurrentPageId())

		editor.pointerMove(150, 150)
		jest.advanceTimersByTime(250)

		expect(editor.getOnlySelectedShape()!.parentId).toBe(frameId)

		editor.pointerUp(150, 150)

		expect(editor.getOnlySelectedShape()!.parentId).toBe(frameId)
	})

	it('can have shapes dragged on top and dropped before the timeout fires', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = editor.getOnlySelectedShape()!.id

		// Create a new shape off of the frame
		editor.createShapes([
			{ type: 'geo', id: ids.boxA, x: 250, y: 250, props: { w: 50, h: 50, fill: 'solid' } },
		])

		// It should be a child of the page
		expect(editor.getOnlySelectedShape()!.parentId).toBe(editor.getCurrentPageId())

		// Drag the shape on top of the frame
		editor.setCurrentTool('select')
		editor.pointerDown(275, 275, ids.boxA).pointerMove(150, 150)

		// The timeout has not fired yet, so the shape is still a child of the current page
		expect(editor.getOnlySelectedShape()!.parentId).toBe(editor.getCurrentPageId())

		// On pointer up, the shape should be dropped into the frame
		editor.pointerUp()
		expect(editor.getOnlySelectedShape()!.parentId).toBe(frameId)
	})

	it('does not reparent shapes that are being dragged from within the frame', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = editor.getOnlySelectedShape()!.id

		// create a box within the frame
		editor.setCurrentTool('geo')
		editor.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)
		expect(editor.getOnlySelectedShape()!.parentId).toBe(frameId)
		const boxAid = editor.getOnlySelectedShape()!.id

		// create another box within the frame
		editor.setCurrentTool('geo')
		editor.pointerDown(130, 130).pointerMove(180, 180).pointerUp(180, 180)
		expect(editor.getOnlySelectedShape()!.parentId).toBe(frameId)
		const boxBid = editor.getOnlySelectedShape()!.id

		// dragging box A around should not cause the index to change or the frame to be highlighted

		editor.setCurrentTool('select')
		editor.pointerDown(125, 125, boxAid).pointerMove(130, 130)

		jest.advanceTimersByTime(2500)

		editor.pointerMove(175, 175)

		jest.advanceTimersByTime(2500)

		expect(editor.getOnlySelectedShape()!.id).toBe(boxAid)
		expect(editor.getOnlySelectedShape()!.parentId).toBe(frameId)
		expect(editor.getHintingShapeIds()).toHaveLength(0)
		// box A should still be beneath box B
		expect(editor.getShape(boxAid)!.index.localeCompare(editor.getShape(boxBid)!.index)).toBe(-1)
	})

	it('can be snapped to when dragging other shapes', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		editor.createShapes([
			{ type: 'geo', id: ids.boxA, x: 250, y: 250, props: { w: 50, h: 50, fill: 'solid' } },
		])

		editor.setCurrentTool('select')
		editor.select(ids.boxA)
		editor.pointerDown(275, 275, ids.boxA).pointerMove(275, 74)
		expect(editor.getShapePageBounds(ids.boxA)).toMatchObject({ y: 49 })
		editor.keyDown('Control')
		expect(editor.getShapePageBounds(ids.boxA)).toMatchObject({ y: 50 })
		expect(editor.snaps.getLines()).toHaveLength(1)
	})

	it("does not allow outside shapes to snap to the frame's children", () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		editor.setCurrentTool('geo')
		editor.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)
		const innerBoxId = editor.getOnlySelectedShape()!.id

		// make a shape outside the frame
		editor.setCurrentTool('geo')
		editor.pointerDown(275, 125).pointerMove(280, 130).pointerUp(280, 130)
		expect(editor.getShapePageBounds(editor.getOnlySelectedShape()!)).toMatchObject({
			x: 275,
			y: 125,
			w: 5,
			h: 5,
		})

		// drag it a pixel up, it should not snap even though it's at the same y as the box inside the frame
		editor.setCurrentTool('select')
		editor
			.pointerDown(277.5, 127.5, editor.getOnlySelectedShape()!.id)
			.pointerMove(287.5, 126.5)
			.pointerMove(277.5, 126.5)

		// now try to snap
		editor.keyDown('Control')
		expect(editor.getShapePageBounds(editor.getOnlySelectedShape()!)).toMatchObject({
			x: 275,
			y: 124,
			w: 5,
			h: 5,
		})
		expect(editor.snaps.getLines()).toHaveLength(0)
		// and if we unparent the box it should snap
		editor.reparentShapes([innerBoxId], editor.getCurrentPageId())

		editor.pointerMove(287.5, 126.5).pointerMove(277.5, 126.5)
		expect(editor.snaps.getLines()).toHaveLength(1)
		expect(editor.getShapePageBounds(editor.getOnlySelectedShape()!)).toMatchObject({
			x: 275,
			y: 125,
			w: 5,
			h: 5,
		})
	})

	it('children of a frame will not snap to shapes outside the frame', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		const frameId = editor.getOnlySelectedShape()!.id

		// make a shape inside the frame
		editor.setCurrentTool('geo')
		editor.pointerDown(125, 125).pointerMove(175, 175).pointerUp(175, 175)
		const innerBoxId = editor.getOnlySelectedShape()!.id

		// make a shape outside the frame
		editor.setCurrentTool('geo')
		editor.pointerDown(275, 125).pointerMove(280, 130).pointerUp(280, 130)
		const outerBoxId = editor.getOnlySelectedShape()!.id

		editor.setCurrentTool('select')
		editor.pointerDown(150, 150, innerBoxId).pointerMove(150, 50).pointerMove(150, 148)
		editor.keyDown('Control')
		expect(editor.snaps.getLines()).toHaveLength(0)

		// move shape inside the frame to make sure it snaps in there
		editor.reparentShapes([outerBoxId], frameId).pointerMove(150, 149, { ctrlKey: true })

		expect(editor.snaps.getLines()).toHaveLength(1)
	})

	it('masks its children', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		editor.setCurrentTool('geo')
		editor.pointerDown(150, 150).pointerMove(250, 250).pointerUp(250, 250)

		expect(editor.getShapePageBounds(editor.getOnlySelectedShape()!)).toMatchObject({
			x: 150,
			y: 150,
			w: 100,
			h: 100,
		})

		// mask should be a 50px box around the top left corner
		expect(editor.getShapeClipPath(editor.getOnlySelectedShape()!.id)).toMatchInlineSnapshot(
			`"polygon(-50px -50px,50px -50px,50px 50px,-50px 50px)"`
		)

		editor.reparentShapes([editor.getOnlySelectedShape()!.id], editor.getCurrentPageId())

		expect(editor.getShapeClipPath(editor.getOnlySelectedShape()!.id)).toBeUndefined()
	})

	it('masks its nested children', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		editor.setCurrentTool('frame')
		editor.pointerDown(150, 150).pointerMove(250, 250).pointerUp(250, 250)

		const innerFrameId = editor.getOnlySelectedShape()!.id

		editor.setCurrentTool('geo')
		editor.pointerDown(100, 100).pointerMove(250, 250).pointerUp(250, 250)

		const boxId = editor.getOnlySelectedShape()!.id

		editor.reparentShapes([boxId], innerFrameId)

		// should be a 50px box starting in the middle of the outer frame
		expect(editor.getShapeClipPath(boxId)).toMatchInlineSnapshot(
			`"polygon(50px 50px,100px 50px,100px 100px,50px 100px)"`
		)
	})

	it('arrows started within the frame will bind to it and have the page as their parent', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		const frameId = editor.getOnlySelectedShape()!.id

		editor.setCurrentTool('arrow')
		editor.pointerDown(150, 150).pointerMove(250, 250).pointerUp(250, 250)

		const arrow = editor.getOnlySelectedShape()! as TLArrowShape

		expect(arrow.props.start).toMatchObject({ boundShapeId: frameId })
		expect(arrow.props.end).toMatchObject({ type: 'point' })

		expect(arrow.parentId).toBe(editor.getCurrentPageId())
	})

	it('arrows started within the frame can bind to a shape within the frame ', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		const frameId = editor.getOnlySelectedShape()!.id

		editor.setCurrentTool('geo')
		editor
			.pointerDown(125, 125)
			.pointerMove(175, 175)
			.pointerUp(175, 175)
			.setStyleForSelectedShapes(DefaultFillStyle, 'solid')
			.setStyleForNextShapes(DefaultFillStyle, 'solid')
		const boxId = editor.getOnlySelectedShape()!.id

		editor.setCurrentTool('arrow')
		editor.pointerDown(150, 150).pointerMove(190, 190).pointerUp(190, 190)

		const arrow = editor.getOnlySelectedShape()! as TLArrowShape

		expect(arrow.props.start).toMatchObject({ boundShapeId: boxId })
		expect(arrow.props.end).toMatchObject({ boundShapeId: frameId })

		expect(arrow.parentId).toBe(editor.getCurrentPageId())
	})

	it('can be edited', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)

		const frameId = editor.getOnlySelectedShape()!.id

		expect(editor.getSelectedShapeIds()[0]).toBe(frameId)
		expect(editor.getCurrentPageState().editingShapeId).toBe(null)

		editor.setCurrentTool('select')

		editor.keyDown('Enter')
		editor.keyUp('Enter')

		expect(editor.getCurrentPageState().editingShapeId).toBe(frameId)
	})

	it('can be selected with box brushing only if the whole frame is selected', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		const frameId = editor.getOnlySelectedShape()!.id

		// select from outside the frame
		editor.setCurrentTool('select')
		editor.pointerDown(50, 50).pointerMove(150, 150)
		editor.expectToBeIn('select.brushing')

		expect(editor.getSelectedShapeIds()).toHaveLength(0)

		editor.pointerMove(250, 250)

		expect(editor.getSelectedShapeIds()).toHaveLength(1)
		expect(editor.getOnlySelectedShape()!.id).toBe(frameId)
	})

	it('can be selected with scribble brushing only if the drag starts outside the frame', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		editor.expectToBeIn('select.idle')

		// select from inside the frame
		editor.selectNone()
		editor.setCurrentTool('select')
		editor.pointerDown(150, 150).pointerMove(250, 250)
		editor.expectToBeIn('select.brushing')

		expect(editor.getSelectedShapeIds()).toHaveLength(0)
	})

	it('children of a frame will not be selected from outside of the frame', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		editor.getOnlySelectedShape()!.id

		// make a shape inside the frame that extends out of the frame
		editor.setCurrentTool('geo')
		editor.pointerDown(150, 150).pointerMove(400, 400).pointerUp(400, 400)
		const innerBoxId = editor.getOnlySelectedShape()!.id

		// select from outside the frame via box brushing
		editor.setCurrentTool('select')
		editor.pointerDown(500, 500).pointerMove(300, 300).pointerUp(300, 300)

		// Check if the inner box was selected
		expect(editor.getSelectedShapeIds()).toHaveLength(0)

		// Select from outside the frame via box brushing
		// but also include the frame in the selection
		editor.pointerDown(400, 0).pointerMove(195, 175).pointerUp(195, 175)

		// Check if the inner box was selected
		expect(editor.getSelectedShapeIds()).toHaveLength(1)
		expect(editor.getOnlySelectedShape()!.id).toBe(innerBoxId)

		// Deselect everything
		editor.deselect()

		// Select from outside the frame via scribble brushing
		editor.keyDown('alt').pointerDown(500, 500).pointerMove(300, 300)

		// Check if in scribble brushing mode
		editor.expectToBeIn('select.brushing')

		// Check if the inner box was selected
		editor.pointerUp(300, 300)
		expect(editor.getSelectedShapeIds()).toHaveLength(0)
	})

	it('arrows will not bind to parts of shapes outside the frame', () => {
		editor.setCurrentTool('frame')
		editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
		editor.getOnlySelectedShape()!.id

		// make a shape inside the frame that extends out of the frame
		editor.setCurrentTool('geo')
		editor
			.pointerDown(150, 150)
			.pointerMove(400, 400)
			.pointerUp(400, 400)
			.setStyleForSelectedShapes(DefaultFillStyle, 'solid')
			.setStyleForNextShapes(DefaultFillStyle, 'solid')
		const innerBoxId = editor.getOnlySelectedShape()!.id

		// Make an arrow that binds to the inner box's bottom right corner
		editor.setCurrentTool('arrow')
		editor.pointerDown(500, 500).pointerMove(375, 375)

		// Check if the arrow's handles remain points
		let arrow = editor.getOnlySelectedShape()! as TLArrowShape
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
		arrow = editor.getOnlySelectedShape()! as TLArrowShape
		expect(arrow.props.end).toMatchObject({ boundShapeId: innerBoxId })
	})

	it('correctly fits to its content', () => {
		// Create two rects, their bounds are from [100, 100] to [400, 400],
		// so the frame that fits them (with 50px offset) should be from [50, 50] to [450, 450].
		const rectAId = createRect({ pos: [100, 100], size: [100, 100] })
		const rectBId = createRect({ pos: [300, 300], size: [100, 100] })

		// Create the frame that encloses both rects
		const frameId = dragCreateFrame({ down: [0, 0], move: [700, 700], up: [700, 700] })
		const frame = editor.getShape(frameId)! as TLFrameShape

		const rectA = editor.getShape(rectAId)!
		const rectB = editor.getShape(rectBId)!
		expect(rectA.parentId).toBe(frameId)
		expect(rectB.parentId).toBe(frameId)

		fitFrameToContent(editor, frame.id)
		const newFrame = editor.getShape(frameId)! as TLFrameShape
		expect(newFrame.x).toBe(50)
		expect(newFrame.y).toBe(50)
		expect(newFrame.props.w).toBe(400)
		expect(newFrame.props.h).toBe(400)

		const newRectA = editor.getShape(rectAId)!
		const newRectB = editor.getShape(rectBId)!
		// Rect positions should change by 50px since the frame moved
		// This keeps them in the same relative position
		expect(newRectA.x).toBe(DEFAULT_FRAME_PADDING)
		expect(newRectA.y).toBe(DEFAULT_FRAME_PADDING)
		expect(newRectB.x).toBe(250)
		expect(newRectB.y).toBe(250)
	})

	it('uses padding option', () => {
		// Create two rects, their bounds are from [100, 100] to [400, 400],
		// so the frame that fits them (with 50px offset) should be from [50, 50] to [450, 450].
		const rectAId = createRect({ pos: [100, 100], size: [100, 100] })
		const rectBId = createRect({ pos: [300, 300], size: [100, 100] })

		// Create the frame that encloses both rects
		const frameId = dragCreateFrame({ down: [0, 0], move: [700, 700], up: [700, 700] })
		const frame = editor.getShape(frameId)! as TLFrameShape

		const rectA = editor.getShape(rectAId)!
		const rectB = editor.getShape(rectBId)!
		expect(rectA.parentId).toBe(frameId)
		expect(rectB.parentId).toBe(frameId)

		fitFrameToContent(editor, frame.id, { padding: 100 })
		const newFrame = editor.getShape(frameId)! as TLFrameShape
		expect(newFrame.x).toBe(0)
		expect(newFrame.y).toBe(0)
		expect(newFrame.props.w).toBe(500)
		expect(newFrame.props.h).toBe(500)

		const newRectA = editor.getShape(rectAId)!
		const newRectB = editor.getShape(rectBId)!

		// frame is at 0,0 so positions should be the same for this test
		expect(newRectA.x).toBe(100)
		expect(newRectA.y).toBe(100)
		expect(newRectB.x).toBe(300)
		expect(newRectB.y).toBe(300)
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
	editor.setCurrentTool('frame')
	editor.pointerDown(100, 100).pointerMove(200, 200).pointerUp(200, 200)
	const frameId = editor.getOnlySelectedShape()!.id

	editor.setCurrentTool('geo')
	editor
		.pointerDown(110, 110)
		.pointerMove(120, 120)
		.pointerUp(120, 120)
		.setStyleForSelectedShapes(DefaultFillStyle, 'solid')
		.setStyleForNextShapes(DefaultFillStyle, 'solid')
	const boxAId = editor.getOnlySelectedShape()!.id

	editor.setCurrentTool('geo')
	editor
		.pointerDown(180, 110)
		.pointerMove(190, 120)
		.pointerUp(190, 120)
		.setStyleForSelectedShapes(DefaultFillStyle, 'solid')
		.setStyleForNextShapes(DefaultFillStyle, 'solid')
	const boxBId = editor.getOnlySelectedShape()!.id

	editor.setCurrentTool('geo')
	editor
		.pointerDown(160, 160)
		.pointerMove(170, 170)
		.pointerUp(170, 170)
		.setStyleForSelectedShapes(DefaultFillStyle, 'solid')
		.setStyleForNextShapes(DefaultFillStyle, 'solid')
	const boxCId = editor.getOnlySelectedShape()!.id

	editor.setCurrentTool('select')
	editor.select(boxBId, boxCId)
	editor.groupShapes(editor.getSelectedShapeIds())
	const groupId = editor.getOnlySelectedShape()!.id

	editor.setCurrentTool('arrow')
	editor.pointerDown(115, 115).pointerMove(185, 115).pointerUp(185, 115)
	const arrowId = editor.getOnlySelectedShape()!.id

	expect(editor.getArrowsBoundTo(boxAId)).toHaveLength(1)
	expect(editor.getArrowsBoundTo(boxBId)).toHaveLength(1)
	expect(editor.getArrowsBoundTo(boxCId)).toHaveLength(0)

	// expect group parent to be the frame
	expect(editor.getShape(groupId)!.parentId).toBe(frameId)

	// move the group outside of the frame
	editor.setCurrentTool('select')
	editor.select(groupId)
	editor.translateSelection(200, 0)

	// expect group parent to be the page
	expect(editor.getShape(groupId)!.parentId).toBe(editor.getCurrentPageId())
	// expect arrow parent to be the page
	expect(editor.getShape(arrowId)!.parentId).toBe(editor.getCurrentPageId())
	// expect arrow index to be greater than group index
	expect(editor.getShape(arrowId)?.index.localeCompare(editor.getShape(groupId)!.index)).toBe(1)
})

describe('When dragging a shape inside a group inside a frame', () => {
	const ids = {
		frame1: createShapeId('frame'),
		box1: createShapeId('geo1'),
		box2: createShapeId('geo2'),
		group1: createShapeId('group1'),
	}

	beforeEach(() => {
		editor.createShapes([
			{ id: ids.frame1, type: 'frame', x: 0, y: 0, props: { w: 500, h: 500 } },
			{ id: ids.box1, type: 'geo', parentId: ids.frame1, x: 100, y: 100 },
			{ id: ids.box2, type: 'geo', parentId: ids.frame1, x: 300, y: 300 },
		])
	})

	it('When dragging a shape out of a frame', () => {
		editor.select(ids.box1, ids.box2)

		expect(editor.getSelectedShapeIds()).toHaveLength(2)

		editor.groupShapes(editor.getSelectedShapeIds(), ids.group1)

		expect(editor.getShape(ids.box1)!.parentId).toBe(ids.group1)

		editor.pointerMove(100, 100).click().click()

		expect(editor.getOnlySelectedShape()?.id).toBe(ids.box1)

		editor.pointerMove(150, 150).pointerDown().pointerMove(140, 140)

		jest.advanceTimersByTime(300)

		expect(editor.getShape(ids.box1)!.parentId).toBe(ids.group1)
	})

	it('reparents the shape to the page if it leaves the frame', () => {
		editor.select(ids.box1, ids.box2)

		expect(editor.getSelectedShapeIds()).toHaveLength(2)

		editor.groupShapes(editor.getSelectedShapeIds(), ids.group1)

		expect(editor.getShape(ids.box1)!.parentId).toBe(ids.group1)

		editor.pointerMove(100, 100).click().click()

		expect(editor.getOnlySelectedShape()?.id).toBe(ids.box1)
		expect(editor.getFocusedGroupId()).toBe(ids.group1)

		editor
			.pointerMove(150, 150)
			.pointerDown()
			.pointerMove(-200, -200)
			.pointerMove(-200, -200)
			.pointerUp()

		jest.advanceTimersByTime(300)

		expect(editor.getShape(ids.box1)!.parentId).toBe(editor.getCurrentPageId())
	})
})

describe('When deleting/removing a frame', () => {
	it('deletes a frame and its children', () => {
		const rectId: TLShapeId = createRect({ size: [20, 20], pos: [10, 10] })
		const frameId = dragCreateFrame({ down: [0, 0], move: [100, 100], up: [100, 100] })
		editor.deleteShape(frameId)
		expect(editor.getShape(rectId)).toBeUndefined()
	})
	it('removes a frame but not its children', () => {
		const rectId: TLShapeId = createRect({ size: [20, 20], pos: [10, 10] })
		const frameId = dragCreateFrame({ down: [10, 10], move: [100, 100], up: [100, 100] })
		removeFrame(editor, [frameId])
		expect(editor.getShape(rectId)).toBeDefined()
	})
	it('reparents the children of a frame when removing it', () => {
		const rectId: TLShapeId = createRect({ size: [20, 20], pos: [10, 10] })
		const frame1Id = dragCreateFrame({ down: [10, 10], move: [100, 100], up: [100, 100] })
		const frame2Id = dragCreateFrame({ down: [0, 0], move: [110, 110], up: [110, 110] })
		removeFrame(editor, [frame1Id])
		expect(editor.getShape(rectId)?.parentId).toBe(frame2Id)
	})
})

describe('When dragging a shape', () => {
	it('parents a shape when dragging it into a frame', () => {
		const rectId: TLShapeId = createRect({ pos: [70, 10], size: [20, 20] })
		// create frame next to shape
		const frameId = dragCreateFrame({ down: [0, 0], move: [60, 100], up: [60, 100] })
		// drag shape into frame
		editor.pointerDown(80, 15)
		editor.pointerMove(30, 50)
		editor.pointerUp(30, 50)
		const parent = editor.getShape(rectId)?.parentId
		expect(parent).toBe(frameId)
	})
	it('Unparents a shape when dragging it out of a frame', () => {
		const rectId: TLShapeId = createRect({ pos: [10, 10], size: [20, 20] })
		editor.pointerDown(15, 15, { target: 'selection' })
		editor.pointerMove(-100, -100)
		editor.pointerUp(-100, -100)
		const parent = editor.getShape(rectId)?.parentId
		expect(parent).toBe('page:page')
	})
})

function dragCreateFrame({
	down,
	move,
	up,
}: {
	down: [number, number]
	move: [number, number]
	up: [number, number]
}): TLShapeId {
	editor.setCurrentTool('frame')
	editor.pointerDown(...down)
	editor.pointerMove(...move)
	editor.pointerUp(...up)
	const shapes = editor.getSelectedShapes()
	const frameId = shapes[0].id
	return frameId
}

function createRect({ pos, size }: { pos: [number, number]; size: [number, number] }) {
	const rectId: TLShapeId = createShapeId()
	editor.createShapes([
		{
			id: rectId,
			x: pos[0],
			y: pos[1],
			props: { w: size[0], h: size[1] },
			type: 'geo',
		},
	])
	return rectId
}

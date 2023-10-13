import { PageRecordType, TLShape, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	ellipse1: createShapeId('ellipse1'),
	ellipse2: createShapeId('ellipse2'),
	page1: PageRecordType.createId('page1'),
	page2: PageRecordType.createId('page2'),
}

beforeEach(() => {
	editor = new TestEditor()
	const page0Id = editor.currentPageId
	editor.createPage({ name: ids.page1, id: ids.page1 })
	expect(editor.currentPageId).toBe(page0Id)
	editor.setCurrentPage(ids.page1)
	expect(editor.currentPageId).toBe(ids.page1)
	editor.createShapes([
		{ id: ids.ellipse1, type: 'geo', x: 0, y: 0, props: { geo: 'ellipse' } },
		{ id: ids.box1, type: 'geo', x: 0, y: 0 },
		{ id: ids.box2, parentId: ids.box1, type: 'geo', x: 150, y: 150 },
	])
	editor.createPage({ name: ids.page2, id: ids.page2 })
	expect(editor.currentPageId).toBe(ids.page1)

	expect(editor.getShape(ids.box1)!.parentId).toEqual(ids.page1)
	expect(editor.getShape(ids.box2)!.parentId).toEqual(ids.box1)
})

describe('Editor.moveShapesToPage', () => {
	it('Moves shapes to page', () => {
		editor.moveShapesToPage([ids.box2, ids.ellipse1], ids.page2)
		expect(editor.currentPageId).toBe(ids.page2)

		expect(editor.getShape(ids.box2)!.parentId).toBe(ids.page2)
		expect(editor.getShape(ids.ellipse1)!.parentId).toBe(ids.page2)

		// box1 didn't get moved, still on page 1
		expect(editor.getShape(ids.box1)!.parentId).toBe(ids.page1)

		expect([...editor.currentPageShapeIds].sort()).toMatchObject([ids.box2, ids.ellipse1])

		expect(editor.currentPageId).toBe(ids.page2)

		editor.setCurrentPage(ids.page1)

		expect([...editor.currentPageShapeIds]).toEqual([ids.box1])
	})

	it('Moves children to page', () => {
		editor.moveShapesToPage([ids.box1], ids.page2)
		expect(editor.getShape(ids.box2)!.parentId).toBe(ids.box1)
		expect(editor.getShape(ids.box1)!.parentId).toBe(ids.page2)
		expect(editor.getShape(ids.ellipse1)!.parentId).toBe(ids.page1)
	})

	it('Adds undo items', () => {
		editor.history.clear()
		editor.moveShapesToPage([ids.box1], ids.page2)
		expect(editor.history.numUndos).toBeGreaterThan(1)
	})

	it('Does nothing on an empty ids array', () => {
		editor.history.clear()
		editor.moveShapesToPage([], ids.page2)
		expect(editor.history.numUndos).toBe(0)
	})

	it('Does nothing if the new page is not found or is deleted', () => {
		editor.history.clear()
		editor.moveShapesToPage([ids.box1], PageRecordType.createId('missing'))
		expect(editor.history.numUndos).toBe(0)
	})

	it('Does not move shapes to the current page', () => {
		editor.history.clear()
		editor.moveShapesToPage([ids.box1], ids.page1)
		expect(editor.history.numUndos).toBe(0)
	})

	it('Restores on undo / redo', () => {
		expect(editor.currentPageId).toBe(ids.page1)
		expect([...editor.currentPageShapeIds].sort()).toMatchObject([ids.box1, ids.box2, ids.ellipse1])

		editor.mark('move shapes to page')
		editor.moveShapesToPage([ids.box2], ids.page2)

		expect(editor.currentPageId).toBe(ids.page2)
		expect([...editor.currentPageShapeIds].sort()).toMatchObject([ids.box2])

		editor.undo()

		expect(editor.currentPageId).toBe(ids.page1)
		expect([...editor.currentPageShapeIds].sort()).toMatchObject([ids.box1, ids.box2, ids.ellipse1])

		editor.redo()

		expect(editor.currentPageId).toBe(ids.page2)
		expect([...editor.currentPageShapeIds].sort()).toMatchObject([ids.box2])
	})

	it('Sets the correct indices', () => {
		editor = new TestEditor()
		const page2Id = PageRecordType.createId('newPage2')

		editor.createPage({ name: 'New Page 2', id: page2Id })
		editor.setCurrentPage(page2Id)
		expect(editor.currentPageId).toBe(page2Id)
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { geo: 'ellipse' } }])
		editor.expectShapeToMatch({
			id: ids.box1,
			parentId: page2Id,
			index: 'a1',
		})

		const page3Id = PageRecordType.createId('newPage3')

		editor.createPage({ name: 'New Page 3', id: page3Id })
		editor.setCurrentPage(page3Id)
		expect(editor.currentPageId).toBe(page3Id)
		editor.createShapes([{ id: ids.box2, type: 'geo', x: 0, y: 0, props: { geo: 'ellipse' } }])
		editor.expectShapeToMatch({
			id: ids.box2,
			parentId: page3Id,
			index: 'a1',
		})

		editor.setCurrentPage(page2Id)
		editor.select(ids.box1)
		editor.moveShapesToPage([ids.box1], page3Id)

		expect(editor.currentPageId).toBe(page3Id)

		editor.expectShapeToMatch(
			{
				id: ids.box2,
				parentId: page3Id,
				index: 'a1',
			},
			{
				id: ids.box1,
				parentId: page3Id,
				index: 'a2', // should be a2 now
			}
		)
	})
})

describe('arrows', () => {
	let firstBox: TLShape
	let secondBox: TLShape

	beforeEach(() => {
		editor.selectAll().deleteShapes(editor.selectedShapeIds)
		// draw a first box
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: 200,
				y: 200,
				props: {
					fill: 'solid',
				},
			},
			{
				id: ids.box2,
				type: 'geo',
				x: 400,
				y: 400,
				props: {
					fill: 'solid',
				},
			},
		])

		firstBox = editor.getShape(ids.box1)!
		secondBox = editor.getShape(ids.box2)!
	})

	it("retains an arrow's bound position if it's bound shape is moved to another page", () => {
		editor.setCurrentTool('arrow')

		editor.pointerDown(250, 250)
		editor.pointerMove(255, 255)
		editor.pointerMove(450, 450)
		editor.pointerUp(450, 450)
		const arrow = editor.onlySelectedShape!

		expect(editor.getShapePageBounds(editor.onlySelectedShape!)).toCloselyMatchObject({
			// exiting at the bottom right corner of the first box
			x: 300,
			y: 300,
		})

		// move the second box up 200 px
		editor.select(secondBox.id)
		editor.translateSelection(0, -200)

		expect(editor.getArrowsBoundTo(firstBox.id).length).toBe(1)
		expect(editor.getArrowsBoundTo(secondBox.id).length).toBe(1)
		// move the second box to another page
		editor.moveShapesToPage([secondBox.id], ids.page2)

		expect(editor.getArrowsBoundTo(firstBox.id).length).toBe(1)
		expect(editor.getArrowsBoundTo(secondBox.id).length).toBe(0)

		expect(editor.getShapePageBounds(arrow)).toCloselyMatchObject({
			x: 300,
			y: 250,
			w: 150,
			h: 0,
		})
	})

	it('retains the arrow binding if you move the arrow to the other page too', () => {
		editor
			.setCurrentTool('arrow')
			.pointerDown(250, 250)
			.pointerMove(255, 255)
			.pointerMove(450, 450)
			.pointerUp(450, 450)
		const arrow = editor.onlySelectedShape!

		expect(editor.getArrowsBoundTo(firstBox.id).length).toBe(1)
		expect(editor.getArrowsBoundTo(secondBox.id).length).toBe(1)

		editor.moveShapesToPage([arrow.id, firstBox.id], ids.page2)

		expect(editor.getArrowsBoundTo(firstBox.id).length).toBe(1)

		expect(editor.getArrowsBoundTo(secondBox.id).length).toBe(0)
	})

	it('centers the camera on the shapes in the new page', () => {
		editor.setCurrentTool('arrow').pointerDown(250, 250).pointerMove(450, 450).pointerUp(450, 450)

		editor.moveShapesToPage([ids.box1, ids.box2], ids.page2)
		const { selectionPageBounds } = editor
		expect(editor.viewportPageCenter).toMatchObject(selectionPageBounds!.center)
	})
})

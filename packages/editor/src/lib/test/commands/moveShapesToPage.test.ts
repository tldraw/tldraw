import { createCustomShapeId, TLPage, TLShape } from '@tldraw/tlschema'
import { TestApp } from '../TestApp'

let app: TestApp

const ids = {
	box1: createCustomShapeId('box1'),
	box2: createCustomShapeId('box2'),
	ellipse1: createCustomShapeId('ellipse1'),
	ellipse2: createCustomShapeId('ellipse2'),
	page1: TLPage.createCustomId('page1'),
	page2: TLPage.createCustomId('page2'),
}

beforeEach(() => {
	app = new TestApp()
	app.createPage(ids.page1, ids.page1)
	app.createShapes([
		{ id: ids.ellipse1, type: 'geo', x: 0, y: 0, props: { geo: 'ellipse' } },
		{ id: ids.box1, type: 'geo', x: 0, y: 0 },
		{ id: ids.box2, parentId: ids.box1, type: 'geo', x: 150, y: 150 },
	])
	app.createPage(ids.page2, ids.page2)
	app.setCurrentPageId(ids.page1)

	expect(app.getShapeById(ids.box1)!.parentId).toEqual(ids.page1)
	expect(app.getShapeById(ids.box2)!.parentId).toEqual(ids.box1)
})

describe('App.moveShapesToPage', () => {
	it('Moves shapes to page', () => {
		app.moveShapesToPage([ids.box2, ids.ellipse1], ids.page2)
		expect(app.currentPageId).toBe(ids.page2)

		expect(app.getShapeById(ids.box2)!.parentId).toBe(ids.page2)
		expect(app.getShapeById(ids.ellipse1)!.parentId).toBe(ids.page2)

		// box1 didn't get moved, still on page 1
		expect(app.getShapeById(ids.box1)!.parentId).toBe(ids.page1)

		expect([...app.shapeIds].sort()).toMatchObject([ids.box2, ids.ellipse1])

		expect(app.currentPageId).toBe(ids.page2)

		app.setCurrentPageId(ids.page1)

		expect([...app.shapeIds]).toEqual([ids.box1])
	})

	it('Moves children to page', () => {
		app.moveShapesToPage([ids.box1], ids.page2)
		expect(app.getShapeById(ids.box2)!.parentId).toBe(ids.box1)
		expect(app.getShapeById(ids.box1)!.parentId).toBe(ids.page2)
		expect(app.getShapeById(ids.ellipse1)!.parentId).toBe(ids.page1)
	})

	it('Adds undo items', () => {
		app.history.clear()
		app.moveShapesToPage([ids.box1], ids.page2)
		expect(app.history.numUndos).toBeGreaterThan(1)
	})

	it('Does nothing on an empty ids array', () => {
		app.history.clear()
		app.moveShapesToPage([], ids.page2)
		expect(app.history.numUndos).toBe(0)
	})

	it('Does nothing if the new page is not found or is deleted', () => {
		app.history.clear()
		app.moveShapesToPage([ids.box1], TLPage.createCustomId('missing'))
		expect(app.history.numUndos).toBe(0)
	})

	it('Does not move shapes to the current page', () => {
		app.history.clear()
		app.moveShapesToPage([ids.box1], ids.page1)
		expect(app.history.numUndos).toBe(0)
	})

	it('Restores on undo / redo', () => {
		expect(app.currentPageId).toBe(ids.page1)
		expect([...app.shapeIds].sort()).toMatchObject([ids.box1, ids.box2, ids.ellipse1])

		app.mark('move shapes to page')
		app.moveShapesToPage([ids.box2], ids.page2)

		expect(app.currentPageId).toBe(ids.page2)
		expect([...app.shapeIds].sort()).toMatchObject([ids.box2])

		app.undo()

		expect(app.currentPageId).toBe(ids.page1)
		expect([...app.shapeIds].sort()).toMatchObject([ids.box1, ids.box2, ids.ellipse1])

		app.redo()

		expect(app.currentPageId).toBe(ids.page2)
		expect([...app.shapeIds].sort()).toMatchObject([ids.box2])
	})

	it('Sets the correct indices', () => {
		app = new TestApp()
		const page2Id = TLPage.createCustomId('newPage2')

		app.createPage('New Page 2', page2Id)
		expect(app.currentPageId).toBe(page2Id)
		app.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { geo: 'ellipse' } }])
		app.expectShapeToMatch({
			id: ids.box1,
			parentId: page2Id,
			index: 'a1',
		})

		const page3Id = TLPage.createCustomId('newPage3')
		app.createPage('New Page 3', page3Id)
		expect(app.currentPageId).toBe(page3Id)
		app.createShapes([{ id: ids.box2, type: 'geo', x: 0, y: 0, props: { geo: 'ellipse' } }])
		app.expectShapeToMatch({
			id: ids.box2,
			parentId: page3Id,
			index: 'a1',
		})

		app.setCurrentPageId(page2Id)
		app.select(ids.box1)
		app.moveShapesToPage([ids.box1], page3Id)

		expect(app.currentPageId).toBe(page3Id)

		app.expectShapeToMatch(
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
	let arrow: TLShape
	beforeEach(() => {
		// draw a first box
		app
			.setSelectedTool('geo')
			.pointerDown(200, 200)
			.pointerMove(300, 300)
			.pointerUp(300, 300)
			.setProp('fill', 'solid')
		firstBox = app.onlySelectedShape!

		// draw a second box
		app
			.setSelectedTool('geo')
			.pointerDown(400, 400)
			.pointerMove(500, 500)
			.pointerUp(500, 500)
			.setProp('fill', 'solid')
		secondBox = app.onlySelectedShape!

		// draw an arrow from the first box to the second box
		app.setSelectedTool('arrow').pointerDown(250, 250).pointerMove(450, 450).pointerUp(450, 450)
		arrow = app.onlySelectedShape!
	})

	it("retains an arrow's bound position if it's bound shape is moved to another page", () => {
		expect(app.getPageBounds(arrow)).toCloselyMatchObject({
			// exiting at the bottom right corner of the first box
			x: 300,
			y: 300,
		})

		// move the second box up 200 px
		app.select(secondBox.id)
		app.translateSelection(0, -200)

		expect(app.getArrowsBoundTo(firstBox.id).length).toBe(1)
		expect(app.getArrowsBoundTo(secondBox.id).length).toBe(1)
		// move the second box to another page
		app.moveShapesToPage([secondBox.id], ids.page2)

		expect(app.getArrowsBoundTo(firstBox.id).length).toBe(1)
		expect(app.getArrowsBoundTo(secondBox.id).length).toBe(0)

		expect(app.getPageBounds(arrow)).toCloselyMatchObject({
			x: 300,
			y: 250,
			w: 150,
			h: 0,
		})
	})

	it('retains the arrow binding if you move the arrow to the other page too', () => {
		expect(app.getArrowsBoundTo(firstBox.id).length).toBe(1)
		expect(app.getArrowsBoundTo(secondBox.id).length).toBe(1)

		app.moveShapesToPage([arrow.id, firstBox.id], ids.page2)

		expect(app.getArrowsBoundTo(firstBox.id).length).toBe(1)

		expect(app.getArrowsBoundTo(secondBox.id).length).toBe(0)
	})

	it('centers the camera on the shapes in the new page', () => {
		app.moveShapesToPage([ids.box1, ids.box2], ids.page2)
		const { selectedPageBounds } = app
		expect(app.viewportPageCenter).toMatchObject(selectedPageBounds!.center)
	})
})

import { MAX_PAGES } from '../../constants'
import { TestEditor } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
	app.createShapes([
		{
			id: TestEditor.CreateShapeId(),
			type: 'geo',
		},
	])
})

it('Duplicates a page', () => {
	const oldPageId = app.currentPageId
	const camera = { ...app.camera }
	const n = app.pages.length
	expect(app.shapesArray.length).toBe(1)

	const existingIds = new Set(app.pages.map((s) => s.id))

	app.duplicatePage()

	// Creates the new page
	expect(app.pages.length).toBe(n + 1)

	// Navigates to the new page
	const newPageId = app.pages.find((p) => !existingIds.has(p.id))!.id
	expect(app.currentPageId).toBe(newPageId)

	// Duplicates the shapes
	expect(app.shapesArray.length).toBe(1)

	// Also duplicates the camera
	expect(app.camera.x).toBe(camera.x)
	expect(app.camera.y).toBe(camera.y)
	expect(app.zoomLevel).toBe(camera.z)

	app.undo()
	expect(app.pages.length).toBe(n)
	expect(app.currentPageId).toBe(oldPageId)

	app.redo()
	expect(app.pages.length).toBe(n + 1)
	expect(app.currentPageId).toBe(newPageId)
})

it("Doesn't duplicate the page if max pages is reached", () => {
	for (let i = 0; i < MAX_PAGES; i++) {
		app.duplicatePage()
	}
	expect(app.pages.length).toBe(MAX_PAGES)
})

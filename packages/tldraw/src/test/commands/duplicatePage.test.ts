import { MAX_PAGES, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{
			id: createShapeId(),
			type: 'geo',
		},
	])
})

it('Duplicates a page', () => {
	const oldPageId = editor.currentPageId
	const camera = { ...editor.camera }
	const n = editor.pages.length
	expect(editor.currentPageShapes.length).toBe(1)

	const existingIds = new Set(editor.pages.map((s) => s.id))

	editor.duplicatePage(editor.currentPageId)

	// Creates the new page
	expect(editor.pages.length).toBe(n + 1)

	// Navigates to the new page
	const newPageId = editor.pages.find((p) => !existingIds.has(p.id))!.id
	expect(editor.currentPageId).toBe(newPageId)

	// Duplicates the shapes
	expect(editor.currentPageShapes.length).toBe(1)

	// Also duplicates the camera
	expect(editor.camera.x).toBe(camera.x)
	expect(editor.camera.y).toBe(camera.y)
	expect(editor.zoomLevel).toBe(camera.z)

	editor.undo()
	expect(editor.pages.length).toBe(n)
	expect(editor.currentPageId).toBe(oldPageId)

	editor.redo()
	expect(editor.pages.length).toBe(n + 1)
	expect(editor.currentPageId).toBe(newPageId)
})

it("Doesn't duplicate the page if max pages is reached", () => {
	for (let i = 0; i < MAX_PAGES; i++) {
		editor.duplicatePage(editor.currentPageId)
	}
	expect(editor.pages.length).toBe(MAX_PAGES)
})

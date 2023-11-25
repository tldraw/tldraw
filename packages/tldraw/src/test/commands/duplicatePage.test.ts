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
	const oldPageId = editor.getCurrentPageId()
	const camera = { ...editor.getCamera() }
	const n = editor.getPages().length
	expect(editor.getCurrentPageShapes().length).toBe(1)

	const existingIds = new Set(editor.getPages().map((s) => s.id))

	editor.duplicatePage(editor.getCurrentPageId())

	// Creates the new page
	expect(editor.getPages().length).toBe(n + 1)

	// Navigates to the new page
	const newPageId = editor.getPages().find((p) => !existingIds.has(p.id))!.id
	expect(editor.getCurrentPageId()).toBe(newPageId)

	// Duplicates the shapes
	expect(editor.getCurrentPageShapes().length).toBe(1)

	// Also duplicates the camera
	expect(editor.getCamera().x).toBe(camera.x)
	expect(editor.getCamera().y).toBe(camera.y)
	expect(editor.getZoomLevel()).toBe(camera.z)

	editor.undo()
	expect(editor.getPages().length).toBe(n)
	expect(editor.getCurrentPageId()).toBe(oldPageId)

	editor.redo()
	expect(editor.getPages().length).toBe(n + 1)
	expect(editor.getCurrentPageId()).toBe(newPageId)
})

it("Doesn't duplicate the page if max pages is reached", () => {
	for (let i = 0; i < MAX_PAGES; i++) {
		editor.duplicatePage(editor.getCurrentPageId())
	}
	expect(editor.getPages().length).toBe(MAX_PAGES)
})

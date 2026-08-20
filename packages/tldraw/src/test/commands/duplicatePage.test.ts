import { createShapeId } from '@tldraw/editor'
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
	for (let i = 0; i < editor.options.maxPages; i++) {
		editor.duplicatePage(editor.getCurrentPageId())
	}
	expect(editor.getPages().length).toBe(editor.options.maxPages)
})

it('Keeps the duplicated shapes at their original coordinates, even when offscreen', () => {
	editor.createShapes([{ id: createShapeId('offscreen'), type: 'geo', x: 5000, y: 5000 }])
	// look at an empty part of the page so that no shape overlaps the viewport
	editor.setCamera({ x: -20000, y: -20000, z: 1 })
	const positions = editor
		.getCurrentPageShapes()
		.map((s) => ({ x: s.x, y: s.y }))
		.sort((a, b) => a.x - b.x)

	editor.duplicatePage(editor.getCurrentPageId())

	expect(
		editor
			.getCurrentPageShapes()
			.map((s) => ({ x: s.x, y: s.y }))
			.sort((a, b) => a.x - b.x)
	).toEqual(positions)
})

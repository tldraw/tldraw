import { PageRecordType, createShapeId } from '@tldraw/editor'
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

it('Keeps shapes at their original coordinates when they are off screen', () => {
	const id = createShapeId()
	editor.createShapes([{ id, type: 'geo', x: 1000, y: 1000, props: { w: 100, h: 100 } }])
	// Pan so the shape is nowhere near the viewport
	editor.setCamera({ x: -10000, y: -10000, z: 1 })
	expect(editor.getViewportPageBounds().collides(editor.getShapePageBounds(id)!)).toBe(false)

	const existingIds = new Set(editor.getPages().map((s) => s.id))
	editor.duplicatePage(editor.getCurrentPageId())

	const newPageId = editor.getPages().find((p) => !existingIds.has(p.id))!.id
	expect(editor.getCurrentPageId()).toBe(newPageId)

	const copies = editor.getCurrentPageShapes().filter((s) => s.type === 'geo' && s.x === 1000)
	expect(copies).toHaveLength(1)
	expect(copies[0]).toMatchObject({ x: 1000, y: 1000 })
})

it('Uses the duplicated page camera when duplicating a page other than the current one', () => {
	const sourcePageId = editor.getCurrentPageId()
	const id = createShapeId()
	editor.createShapes([{ id, type: 'geo', x: 1000, y: 1000, props: { w: 100, h: 100 } }])
	editor.setCamera({ x: 200, y: 300, z: 2 })

	const otherPageId = PageRecordType.createId()
	editor.createPage({ id: otherPageId, name: 'Other' })
	editor.setCurrentPage(otherPageId)
	editor.setCamera({ x: -10000, y: -10000, z: 0.5 })

	const existingIds = new Set(editor.getPages().map((s) => s.id))
	editor.duplicatePage(sourcePageId)

	const newPageId = editor.getPages().find((p) => !existingIds.has(p.id))!.id
	expect(editor.getCurrentPageId()).toBe(newPageId)
	expect(editor.getCamera()).toMatchObject({ x: 200, y: 300, z: 2 })
	const copies = editor.getCurrentPageShapes().filter((s) => s.type === 'geo' && s.x === 1000)
	expect(copies).toHaveLength(1)
	expect(copies[0]).toMatchObject({ x: 1000, y: 1000 })
})

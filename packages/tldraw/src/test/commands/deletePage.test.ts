import { PageRecordType, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('deletePage', () => {
	it('deletes the page', () => {
		const page2Id = PageRecordType.createId('page2')
		editor.createPage({ name: 'New Page 2', id: page2Id })

		const pages = editor.getPages()
		expect(pages.length).toBe(2)
		editor.deletePage(pages[0].id)
		expect(editor.getPages().length).toBe(1)
		expect(editor.getPages()[0]).toEqual(pages[1])
	})
	it('is undoable and redoable', () => {
		const page2Id = PageRecordType.createId('page2')
		editor.markHistoryStoppingPoint('before creating page')
		editor.createPage({ name: 'New Page 2', id: page2Id })

		const pages = editor.getPages()
		expect(pages.length).toBe(2)

		editor.markHistoryStoppingPoint('before deleting page')
		editor.deletePage(pages[0].id)
		expect(editor.getPages().length).toBe(1)

		editor.undo()
		expect(editor.getPages().length).toBe(2)
		expect(editor.getPages()).toEqual(pages)
		editor.redo()
		expect(editor.getPages().length).toBe(1)
		expect(editor.getPages()[0]).toEqual(pages[1])
	})
	it('does not allow deleting all pages', () => {
		const page2Id = PageRecordType.createId('page2')
		editor.markHistoryStoppingPoint('before creating page')
		editor.createPage({ name: 'New Page 2', id: page2Id })

		const pages = editor.getPages()
		editor.deletePage(pages[1].id)
		editor.deletePage(pages[0].id)

		expect(editor.getPages().length).toBe(1)

		editor.deletePage(editor.getPages()[0].id)
		expect(editor.getPages().length).toBe(1)
	})
	it('switches the page if you are deleting the current page', () => {
		const page2Id = PageRecordType.createId('page2')
		editor.markHistoryStoppingPoint('before creating page')
		editor.createPage({ name: 'New Page 2', id: page2Id })

		const currentPageId = editor.getCurrentPageId()
		editor.deletePage(currentPageId)
		expect(editor.getPages().length).toBe(1)
		expect(editor.getCurrentPageId()).not.toBe(currentPageId)
		expect(editor.getCurrentPageId()).toBe(editor.getPages()[0].id)
	})
	it('switches the page if another user or tab deletes the current page', () => {
		const currentPageId = editor.getCurrentPageId()
		const page2Id = PageRecordType.createId('page2')
		editor.markHistoryStoppingPoint('before creating')
		editor.createPage({ name: 'New Page 2', id: page2Id })

		editor.store.mergeRemoteChanges(() => {
			editor.store.remove([currentPageId])
		})

		expect(editor.getPages().length).toBe(1)
		expect(editor.getCurrentPageId()).not.toBe(currentPageId)
		expect(editor.getCurrentPageId()).toBe(editor.getPages()[0].id)
	})

	it('deletes all shapes that belong to the deleted page', () => {
		// Create a second page
		const page2Id = PageRecordType.createId('page2')
		editor.createPage({ name: 'Page 2', id: page2Id })

		// Switch to the second page
		editor.setCurrentPage(page2Id)

		// Add some shapes to the second page
		const shape1Id = createShapeId('shape1')
		const shape2Id = createShapeId('shape2')
		const shape3Id = createShapeId('shape3')

		editor.createShape({ id: shape1Id, type: 'text', x: 100, y: 100 })
		editor.createShape({ id: shape2Id, type: 'geo', x: 200, y: 200, props: { geo: 'rectangle' } })
		editor.createShape({ id: shape3Id, type: 'geo', x: 300, y: 300, props: { geo: 'ellipse' } })

		// Verify shapes were created and belong to the second page
		expect(editor.getShape(shape1Id)).toBeDefined()
		expect(editor.getShape(shape2Id)).toBeDefined()
		expect(editor.getShape(shape3Id)).toBeDefined()
		expect(editor.getShape(shape1Id)?.parentId).toBe(page2Id)
		expect(editor.getShape(shape2Id)?.parentId).toBe(page2Id)
		expect(editor.getShape(shape3Id)?.parentId).toBe(page2Id)

		// Delete the second page
		editor.deletePage(page2Id)

		// Verify the page was deleted
		expect(editor.getPages().length).toBe(1)
		expect(editor.getPages()[0].id).not.toBe(page2Id)

		// Verify all shapes that belonged to the deleted page were also deleted
		expect(editor.getShape(shape1Id)).toBeUndefined()
		expect(editor.getShape(shape2Id)).toBeUndefined()
		expect(editor.getShape(shape3Id)).toBeUndefined()
	})

	it('deletes locked shapes that belong to the deleted page', () => {
		// Create a second page
		const page2Id = PageRecordType.createId('page2')
		editor.createPage({ name: 'Page 2', id: page2Id })

		// Switch to the second page
		editor.setCurrentPage(page2Id)

		// Add some shapes to the second page
		const shape1Id = createShapeId('shape1')
		const shape2Id = createShapeId('shape2')
		const shape3Id = createShapeId('shape3')

		editor.createShape({ id: shape1Id, type: 'text', x: 100, y: 100 })
		editor.createShape({ id: shape2Id, type: 'geo', x: 200, y: 200, props: { geo: 'rectangle' } })
		editor.createShape({ id: shape3Id, type: 'geo', x: 300, y: 300, props: { geo: 'ellipse' } })

		// Lock some of the shapes
		editor.updateShape({ id: shape1Id, type: 'text', isLocked: true })
		editor.updateShape({ id: shape2Id, type: 'geo', isLocked: true })

		// Verify shapes were created and belong to the second page
		expect(editor.getShape(shape1Id)).toBeDefined()
		expect(editor.getShape(shape2Id)).toBeDefined()
		expect(editor.getShape(shape3Id)).toBeDefined()
		expect(editor.getShape(shape1Id)?.parentId).toBe(page2Id)
		expect(editor.getShape(shape2Id)?.parentId).toBe(page2Id)
		expect(editor.getShape(shape3Id)?.parentId).toBe(page2Id)
		expect(editor.getShape(shape1Id)?.isLocked).toBe(true)
		expect(editor.getShape(shape2Id)?.isLocked).toBe(true)
		expect(editor.getShape(shape3Id)?.isLocked).toBe(false)

		// Delete the second page
		editor.deletePage(page2Id)

		// Verify the page was deleted
		expect(editor.getPages().length).toBe(1)
		expect(editor.getPages()[0].id).not.toBe(page2Id)

		// Verify all shapes that belonged to the deleted page were also deleted, including locked ones
		expect(editor.getShape(shape1Id)).toBeUndefined()
		expect(editor.getShape(shape2Id)).toBeUndefined()
		expect(editor.getShape(shape3Id)).toBeUndefined()
	})
})

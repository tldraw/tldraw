import { PageRecordType, TLPageId, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('setCurrentPage', () => {
	it('sets the current page', () => {
		const page1Id = editor.pages[0].id
		const page2Id = PageRecordType.createId('page2')

		editor.createPage({ name: 'New Page 2', id: page2Id })
		expect(editor.currentPageId).toBe(page1Id)

		editor.setCurrentPage(page2Id)
		expect(editor.currentPageId).toEqual(page2Id)

		expect(editor.currentPage).toEqual(editor.pages[1])

		editor.setCurrentPage(page1Id)

		expect(editor.currentPage).toEqual(editor.pages[0])

		const page3Id = PageRecordType.createId('page3')
		editor.createPage({ name: 'New Page 3', id: page3Id })
		expect(editor.currentPageId).toBe(page1Id)
		editor.setCurrentPage(page3Id)

		expect(editor.currentPageId).toEqual(page3Id)
		expect(editor.currentPage).toEqual(editor.pages[2])

		editor.setCurrentPage(editor.pages[0].id)

		expect(editor.currentPageId).toEqual(editor.pages[0].id)
		expect(editor.currentPage).toEqual(editor.pages[0])
	})

	it("adding a page to the store by any means adds tab state for the page if it doesn't already exist", () => {
		const page = PageRecordType.create({ name: 'test', index: 'a4' })
		expect(editor.pageStates.find((p) => p.pageId === page.id)).toBeUndefined()
		editor.store.put([page])
		expect(editor.pageStates.find((p) => p.pageId === page.id)).not.toBeUndefined()
	})

	it('squashes', () => {
		const page2Id = PageRecordType.createId('page2')
		editor.createPage({ name: 'New Page 2', index: page2Id })

		editor.history.clear()
		editor.setCurrentPage(editor.pages[1].id)
		editor.setCurrentPage(editor.pages[0].id)
		editor.setCurrentPage(editor.pages[0].id)
		expect(editor.history.numUndos).toBe(1)
	})

	it('preserves the undo stack', () => {
		const boxId = createShapeId('geo')
		const page2Id = PageRecordType.createId('page2')
		editor.createPage({ name: 'New Page 2', id: page2Id })

		editor.history.clear()
		editor.createShapes([{ type: 'geo', id: boxId, props: { w: 100, h: 100 } }])
		editor.undo()
		editor.setCurrentPage(editor.pages[1].id)
		editor.setCurrentPage(editor.pages[0].id)
		editor.setCurrentPage(editor.pages[0].id)
		expect(editor.getShape(boxId)).toBeUndefined()
		expect(editor.history.numUndos).toBe(1)
		editor.redo()
		expect(editor.getShape(boxId)).not.toBeUndefined()
	})

	it('logs an error when trying to navigate to a page that does not exist', () => {
		const initialPageId = editor.currentPageId
		expect(editor.currentPageId).toBe(initialPageId)
		console.error = jest.fn()

		expect(() => {
			editor.setCurrentPage('page:does-not-exist' as TLPageId)
		}).not.toThrow()

		expect(console.error).toHaveBeenCalled()
		expect(editor.currentPageId).toBe(initialPageId)
	})
})

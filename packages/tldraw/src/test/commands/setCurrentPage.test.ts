import { IndexKey, PageRecordType, TLPageId, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('setCurrentPage', () => {
	it('sets the current page', () => {
		const page1Id = editor.getPages()[0].id
		const page2Id = PageRecordType.createId('page2')

		editor.createPage({ name: 'New Page 2', id: page2Id })
		expect(editor.getCurrentPageId()).toBe(page1Id)

		editor.setCurrentPage(page2Id)
		expect(editor.getCurrentPageId()).toEqual(page2Id)

		expect(editor.getCurrentPage()).toEqual(editor.getPages()[1])

		editor.setCurrentPage(page1Id)

		expect(editor.getCurrentPage()).toEqual(editor.getPages()[0])

		const page3Id = PageRecordType.createId('page3')
		editor.createPage({ name: 'New Page 3', id: page3Id })
		expect(editor.getCurrentPageId()).toBe(page1Id)
		editor.setCurrentPage(page3Id)

		expect(editor.getCurrentPageId()).toEqual(page3Id)
		expect(editor.getCurrentPage()).toEqual(editor.getPages()[2])

		editor.setCurrentPage(editor.getPages()[0].id)

		expect(editor.getCurrentPageId()).toEqual(editor.getPages()[0].id)
		expect(editor.getCurrentPage()).toEqual(editor.getPages()[0])
	})

	it("adding a page to the store by any means adds tab state for the page if it doesn't already exist", () => {
		const page = PageRecordType.create({ name: 'test', index: 'a4' as IndexKey })
		expect(editor.getPageStates().find((p) => p.pageId === page.id)).toBeUndefined()
		editor.store.put([page])
		expect(editor.getPageStates().find((p) => p.pageId === page.id)).not.toBeUndefined()
	})

	it('squashes', () => {
		const page1Id = editor.getCurrentPageId()
		const page2Id = PageRecordType.createId('page2')
		editor.createPage({ name: 'New Page 2', id: page2Id })
		editor.setCurrentPage(page1Id)
		editor.setCurrentPage(page2Id)
		editor.setCurrentPage(page2Id)
		editor.undo()
		expect(editor.getCurrentPageId()).toBe(page1Id)
	})

	it('preserves the undo stack', () => {
		const boxId = createShapeId('geo')
		const page2Id = PageRecordType.createId('page2')
		editor.createPage({ name: 'New Page 2', id: page2Id })

		editor.clearHistory()
		editor.createShapes([{ type: 'geo', id: boxId, props: { w: 100, h: 100 } }])
		editor.undo()
		editor.setCurrentPage(editor.getPages()[1].id)
		editor.setCurrentPage(editor.getPages()[0].id)
		editor.setCurrentPage(editor.getPages()[0].id)
		expect(editor.getShape(boxId)).toBeUndefined()
		// expect(editor.history.getNumUndos()).toBe(1)
		editor.redo()
		expect(editor.getShape(boxId)).not.toBeUndefined()
	})

	it('logs an error when trying to navigate to a page that does not exist', () => {
		const initialPageId = editor.getCurrentPageId()
		expect(editor.getCurrentPageId()).toBe(initialPageId)
		console.error = vi.fn()

		expect(() => {
			editor.setCurrentPage('page:does-not-exist' as TLPageId)
		}).not.toThrow()

		expect(console.error).toHaveBeenCalled()
		expect(editor.getCurrentPageId()).toBe(initialPageId)
	})

	it('cancels any in-progress actions', () => {
		const page1Id = editor.getPages()[0].id
		const page2Id = PageRecordType.createId('page2')

		editor.createPage({ name: 'New Page 2', id: page2Id })
		expect(editor.getCurrentPageId()).toBe(page1Id)

		const geoId = createShapeId()
		editor.createShape({ type: 'geo', id: geoId, props: { w: 100, h: 100 } })
		editor.select(geoId)
		editor.keyPress('Enter')

		expect(editor.isIn('select.editing_shape')).toBe(true)

		editor.setCurrentPage(page2Id)
		expect(editor.isIn('select.idle')).toBe(true)
	})

	it('applies camera constraints', () => {
		const spy = vi.spyOn(editor, 'setCamera')

		let currentPageId = editor.getCurrentPageId()
		expect(currentPageId).toMatchInlineSnapshot(`"page:page"`)
		spy.mockImplementation(() => {
			currentPageId = editor.getCurrentPageId()
			return editor
		})

		editor.createPage({ name: 'New Page 2', id: PageRecordType.createId('page2') })
		expect(spy).toHaveBeenCalledTimes(0)
		editor.setCurrentPage(PageRecordType.createId('page2'))
		expect(spy).toHaveBeenCalledTimes(1)
		expect(currentPageId).toMatchInlineSnapshot(`"page:page2"`)

		expect(spy)
	})
})

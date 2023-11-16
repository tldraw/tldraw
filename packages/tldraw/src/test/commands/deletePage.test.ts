import { PageRecordType } from '@tldraw/editor'
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
		editor.mark('before creating page')
		editor.createPage({ name: 'New Page 2', id: page2Id })

		const pages = editor.getPages()
		expect(pages.length).toBe(2)

		editor.mark('before deleting page')
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
		editor.mark('before creating page')
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
		editor.mark('before creating page')
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
		editor.mark('before creating')
		editor.createPage({ name: 'New Page 2', id: page2Id })

		editor.store.mergeRemoteChanges(() => {
			editor.store.remove([currentPageId])
		})

		expect(editor.getPages().length).toBe(1)
		expect(editor.getCurrentPageId()).not.toBe(currentPageId)
		expect(editor.getCurrentPageId()).toBe(editor.getPages()[0].id)
	})
})

import { PageRecordType } from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'

let app: TestEditor

beforeEach(() => {
	app = new TestEditor()
})

describe('deletePage', () => {
	it('deletes the page', () => {
		const page2Id = PageRecordType.createCustomId('page2')
		app.createPage('New Page 2', page2Id)

		const pages = app.pages
		expect(pages.length).toBe(2)
		app.deletePage(pages[0].id)
		expect(app.pages.length).toBe(1)
		expect(app.pages[0]).toEqual(pages[1])
	})
	it('is undoable and redoable', () => {
		const page2Id = PageRecordType.createCustomId('page2')
		app.mark()
		app.createPage('New Page 2', page2Id)

		const pages = app.pages
		expect(pages.length).toBe(2)

		app.mark()
		app.deletePage(pages[0].id)
		expect(app.pages.length).toBe(1)

		app.undo()
		expect(app.pages.length).toBe(2)
		expect(app.pages).toEqual(pages)
		app.redo()
		expect(app.pages.length).toBe(1)
		expect(app.pages[0]).toEqual(pages[1])
	})
	it('does not allow deleting all pages', () => {
		const page2Id = PageRecordType.createCustomId('page2')
		app.mark()
		app.createPage('New Page 2', page2Id)

		const pages = app.pages
		app.deletePage(pages[1].id)
		app.deletePage(pages[0].id)

		expect(app.pages.length).toBe(1)

		app.deletePage(app.pages[0].id)
		expect(app.pages.length).toBe(1)
	})
	it('switches the page if you are deleting the current page', () => {
		const page2Id = PageRecordType.createCustomId('page2')
		app.mark()
		app.createPage('New Page 2', page2Id)

		const currentPageId = app.currentPageId
		app.deletePage(currentPageId)
		expect(app.pages.length).toBe(1)
		expect(app.currentPageId).not.toBe(currentPageId)
		expect(app.currentPageId).toBe(app.pages[0].id)
	})
	it('switches the page if another user or tab deletes the current page', () => {
		const currentPageId = app.currentPageId
		const page2Id = PageRecordType.createCustomId('page2')
		app.mark()
		app.createPage('New Page 2', page2Id)

		app.store.mergeRemoteChanges(() => {
			app.store.remove([currentPageId])
		})

		expect(app.pages.length).toBe(1)
		expect(app.currentPageId).not.toBe(currentPageId)
		expect(app.currentPageId).toBe(app.pages[0].id)
	})
})

import { MAX_PAGES } from '../../constants'
import { TestApp } from '../TestApp'

let app: TestApp

beforeEach(() => {
	app = new TestApp()
})

it('Creates a page', () => {
	const oldPageId = app.currentPageId
	const n = app.pages.length
	app.createPage('Page 1')
	expect(app.pages.length).toBe(n + 1)
	const newPageId = app.pages[n].id
	expect(app.currentPageId).toBe(newPageId)
	app.undo()
	expect(app.pages.length).toBe(n)
	expect(app.currentPageId).toBe(oldPageId)
	app.redo()
	expect(app.pages.length).toBe(n + 1)
	expect(app.currentPageId).toBe(newPageId)
})

it("Doesn't create a page if max pages is reached", () => {
	for (let i = 0; i < MAX_PAGES + 1; i++) {
		app.createPage(`Test Page ${i}`)
	}
	expect(app.pages.length).toBe(MAX_PAGES)
})

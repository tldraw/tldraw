import { PageRecordType } from '@tldraw/tlschema'
import { MAX_PAGES } from '../../constants'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('Creates a page', () => {
	const oldPageId = editor.currentPageId
	const n = editor.pages.length
	editor.createPage('Page 1')
	expect(editor.pages.length).toBe(n + 1)
	const newPageId = editor.pages[n].id
	expect(editor.currentPageId).toBe(newPageId)
	editor.undo()
	expect(editor.pages.length).toBe(n)
	expect(editor.currentPageId).toBe(oldPageId)
	editor.redo()
	expect(editor.pages.length).toBe(n + 1)
	expect(editor.currentPageId).toBe(newPageId)
})

it("Doesn't create a page if max pages is reached", () => {
	for (let i = 0; i < MAX_PAGES + 1; i++) {
		editor.createPage(`Test Page ${i}`)
	}
	expect(editor.pages.length).toBe(MAX_PAGES)
})

it('[regression] does not die if every page has the same index', () => {
	expect(editor.pages.length).toBe(1)
	const page = editor.pages[0]
	editor.store.put([
		{
			...page,
			id: PageRecordType.createId('2'),
			name: 'a',
		},
		{
			...page,
			id: PageRecordType.createId('3'),
			name: 'b',
		},
		{
			...page,
			id: PageRecordType.createId('4'),
			name: 'c',
		},
	])

	expect(editor.pages.every((p) => p.index === page.index)).toBe(true)

	editor.createPage('My Special Test Page')
	expect(editor.pages.some((p) => p.name === 'My Special Test Page')).toBe(true)
})

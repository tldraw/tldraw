import { MAX_PAGES, PageRecordType } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

it('Creates a page', () => {
	const oldPageId = editor.getCurrentPageId()
	const n = editor.getPages().length
	editor.mark('creating new page')
	editor.createPage({ name: 'Page 1' })
	expect(editor.getPages().length).toBe(n + 1)
	const newPageId = editor.getPages()[n].id
	// does not move to the new page right away
	expect(editor.getCurrentPageId()).toBe(oldPageId)

	// needs to be done manually
	editor.setCurrentPage(newPageId)
	expect(editor.getCurrentPageId()).toBe(newPageId)

	editor.undo()
	expect(editor.getPages().length).toBe(n)
	expect(editor.getCurrentPageId()).toBe(oldPageId)

	editor.redo()
	expect(editor.getPages().length).toBe(n + 1)
	expect(editor.getCurrentPageId()).toBe(newPageId)
})

it("Doesn't create a page if max pages is reached", () => {
	for (let i = 0; i < MAX_PAGES + 1; i++) {
		editor.createPage({ name: `Test Page ${i}` })
	}
	expect(editor.getPages().length).toBe(MAX_PAGES)
})

it('[regression] does not die if every page has the same index', () => {
	expect(editor.getPages().length).toBe(1)
	const page = editor.getPages()[0]
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

	expect(editor.getPages().every((p) => p.index === page.index)).toBe(true)

	editor.createPage({ name: 'My Special Test Page' })
	expect(editor.getPages().some((p) => p.name === 'My Special Test Page')).toBe(true)
})

import { atom, PageRecordType, TLPageId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

const page2 = PageRecordType.createId('page2')
const page3 = PageRecordType.createId('page3')

const hidden = atom<Set<TLPageId>>('hidden pages', new Set())

let editor: TestEditor

beforeEach(() => {
	hidden.set(new Set())
	editor = new TestEditor({
		getPageVisibility: (page) => (hidden.get().has(page.id) ? 'hidden' : 'visible'),
	})
	editor.createPage({ id: page2, name: 'Page 2' })
	editor.createPage({ id: page3, name: 'Page 3' })
})

describe('getPageVisibility option', () => {
	it('leaves hidden pages out of getVisiblePages, but not getPages', () => {
		hidden.set(new Set([page2]))
		expect(editor.getVisiblePages().map((p) => p.id)).toEqual([editor.getPages()[0].id, page3])
		expect(editor.getPages()).toHaveLength(3)
		expect(editor.isPageHidden(page2)).toBe(true)
		expect(editor.isPageHidden(page3)).toBe(false)
	})

	it('does not navigate to a hidden page', () => {
		hidden.set(new Set([page2]))
		const before = editor.getCurrentPageId()
		editor.setCurrentPage(page2)
		expect(editor.getCurrentPageId()).toBe(before)
		editor.setCurrentPage(page3)
		expect(editor.getCurrentPageId()).toBe(page3)
	})

	it('moves to the first visible page when the current page becomes hidden', () => {
		editor.setCurrentPage(page3)
		hidden.set(new Set([page3]))
		expect(editor.getCurrentPageId()).toBe(editor.getPages()[0].id)
	})

	it('stays on the current page when no page is visible', () => {
		editor.setCurrentPage(page3)
		hidden.set(new Set(editor.getPages().map((p) => p.id)))
		expect(editor.getCurrentPageId()).toBe(page3)
	})

	it('hides nothing without the option', () => {
		const plain = new TestEditor()
		expect(plain.isPageHidden(plain.getCurrentPageId())).toBe(false)
		expect(plain.getVisiblePages()).toEqual(plain.getPages())
	})
})

describe('page operations with hidden pages', () => {
	it('does not delete the last visible page', () => {
		const first = editor.getPages()[0].id
		hidden.set(new Set([page2, page3]))
		editor.deletePage(first)
		expect(editor.getPage(first)).toBeDefined()
	})

	it('moves to a visible neighbour when it deletes the current page', () => {
		const first = editor.getPages()[0].id
		hidden.set(new Set([page2]))
		editor.deletePage(first)
		expect(editor.getCurrentPageId()).toBe(page3)
	})

	it('leaves a hidden page without an undo step', () => {
		editor.setCurrentPage(page3)
		editor.markHistoryStoppingPoint()
		hidden.set(new Set([page3]))
		const first = editor.getPages()[0].id
		expect(editor.getCurrentPageId()).toBe(first)
		editor.undo()
		expect(editor.getCurrentPageId()).toBe(first)
	})
})

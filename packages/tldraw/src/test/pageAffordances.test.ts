import { PageRecordType, TLPage } from '@tldraw/editor'
import {
	canDeletePage,
	canUpdatePage,
	onMovePage,
} from '../lib/ui/components/PageMenu/edit-pages-shared'
import { fakeLicense } from './fakeLicense'
import { TestEditor } from './TestEditor'

it('asks isChangePermitted about the page itself, so a rule covering some pages is respected', () => {
	const locked = PageRecordType.createId('locked')
	const editor = new TestEditor({
		isChangePermitted: (change) => (change.next ?? change.prev).id !== locked,
	})
	fakeLicense(editor)
	editor.createPage({ id: locked, name: 'Locked' })
	const page = (id: string) => editor.getPage(id as TLPage['id'])!
	const open = editor.getCurrentPage()
	expect([canUpdatePage(editor, page(locked)), canDeletePage(editor, page(locked))]).toEqual([
		false,
		false,
	])
	expect([canUpdatePage(editor, open), canDeletePage(editor, open)]).toEqual([true, true])
})

it("doesn't move a page the user can't change, however the move is asked for", () => {
	const locked = PageRecordType.createId('locked')
	const editor = new TestEditor({
		isChangePermitted: (change) => (change.next ?? change.prev).id !== locked,
	})
	fakeLicense(editor)
	editor.createPage({ id: locked, name: 'Locked' })
	editor.createPage({ name: 'Other' })
	const order = () => editor.getPages().map((p) => p.name)
	const before = order()
	onMovePage(editor, locked, 1, 0, () => {})
	expect(order()).toEqual(before)
	onMovePage(editor, editor.getPages()[2].id, 2, 0, () => {})
	expect(order()[0]).toBe('Other')
})

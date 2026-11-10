import {
	Editor,
	getIndexAbove,
	getIndexBelow,
	getIndexBetween,
	IndexKey,
	TLPage,
	TLPageId,
} from '@tldraw/editor'
import { TLUiEventContextType } from '../../context/events'

export function onMovePage(
	editor: Editor,
	id: TLPageId,
	from: number,
	to: number,
	trackEvent: TLUiEventContextType
) {
	if (from === to) return

	let index: IndexKey

	const pages = editor.getPages()

	const below = from > to ? pages[to - 1] : pages[to]
	const above = from > to ? pages[to] : pages[to + 1]

	if (below && !above) {
		index = getIndexAbove(below.index)
	} else if (!below && above) {
		index = getIndexBelow(pages[0].index)
	} else {
		index = getIndexBetween(below.index, above.index)
	}

	if (index !== pages[from].index) {
		editor.markHistoryStoppingPoint('moving page')
		editor.updatePage({
			id: id as TLPageId,
			index,
		})
		trackEvent('move-page', { source: 'page-menu' })
	}
}

// Each of these asks about the permission by name and about the page itself, so a rule that
// only covers some pages still gets a say.

export function canCreatePage(editor: Editor) {
	return editor.can('tl:page:create')
}

export function canUpdatePage(editor: Editor, page: TLPage) {
	return (
		editor.can('tl:page:update') &&
		editor.canChangeRecord({ type: 'update', prev: page, next: page })
	)
}

// A copy of a page with shapes on it creates those shapes too.
export function canDuplicatePage(editor: Editor, page: TLPage) {
	if (!canCreatePage(editor)) return false
	return editor.getPageShapeIds(page).size === 0 || editor.can('tl:shape:create')
}

// Deleting a page deletes the shapes on it.
export function canDeletePage(editor: Editor, page: TLPage) {
	if (!editor.can('tl:page:delete')) return false
	if (!editor.canChangeRecord({ type: 'delete', prev: page, next: null })) return false
	return editor.getPageShapeIds(page).size === 0 || editor.can('tl:shape:delete')
}

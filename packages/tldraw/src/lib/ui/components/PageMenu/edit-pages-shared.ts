import {
	Editor,
	getIndexAbove,
	getIndexBelow,
	getIndexBetween,
	IndexKey,
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

	// `from` and `to` are positions in the page menu, which lists only visible pages
	const pages = editor.getVisiblePages()
	const below = from > to ? pages[to - 1] : pages[to]

	// Hidden pages can sit between visible ones, so place the page right after `below` in the
	// full page order. Using only visible neighbours could give a hidden page's index.
	const others = editor.getPages().filter((page) => page.id !== id)
	if (!below) {
		index = getIndexBelow(others[0].index)
	} else {
		const next = others[others.findIndex((page) => page.id === below.id) + 1]
		index = next ? getIndexBetween(below.index, next.index) : getIndexAbove(below.index)
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

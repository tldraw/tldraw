import {
	Editor,
	getIndexAbove,
	getIndexBelow,
	getIndexBetween,
	IndexKey,
	TLPageId,
} from '@tldraw/editor'
import { TLUiEventContextType } from '../../context/events'

export const onMovePage = (
	editor: Editor,
	id: TLPageId,
	from: number,
	to: number,
	trackEvent: TLUiEventContextType
) => {
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

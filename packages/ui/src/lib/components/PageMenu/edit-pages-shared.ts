import { Editor, getIndexAbove, getIndexBelow, getIndexBetween, TLPageId } from '@tldraw/editor'

export const onMovePage = (editor: Editor, id: TLPageId, from: number, to: number) => {
	let index: string

	const pages = editor.pages

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
		editor.mark('moving page')
		editor.updatePage({
			id: id as TLPageId,
			index,
		})
	}
}

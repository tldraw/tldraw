import type { Editor } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibraryItemId } from '../lib/schema'

/**
 * Places a copy of an item at the centre of the viewport and selects it, the same way pasting
 * does. Rejects with the source's error when the item can't be loaded.
 * @public
 */
export async function placeLibraryItem(
	editor: Editor,
	source: LibrarySource,
	itemId: TLLibraryItemId
) {
	const { content } = await source.getItemContent(itemId)
	editor.markHistoryStoppingPoint('place library item')
	editor.putContentOntoCurrentPage(content, {
		point: editor.getViewportPageBounds().center,
		select: true,
	})
}

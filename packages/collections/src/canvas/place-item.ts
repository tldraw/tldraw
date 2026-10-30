import type { Editor } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { TLCollectionItemId } from '../lib/schema'

/**
 * Places a copy of an item at the centre of the viewport and selects it, the same way pasting
 * does. Rejects with the source's error when the item can't be loaded.
 * @public
 */
export async function placeCollectionItem(
	editor: Editor,
	source: CollectionSource,
	itemId: TLCollectionItemId
) {
	const { content } = await source.getItemContent(itemId)
	editor.markHistoryStoppingPoint('place collection item')
	editor.putContentOntoCurrentPage(content, {
		point: editor.getViewportPageBounds().center,
		select: true,
	})
}

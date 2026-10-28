import type { Editor, TLShapeId } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import {
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	type TLCollectionId,
	type TLCollectionItem,
} from '../lib/schema'

/**
 * Saves shapes from the current page to a collection, with a rendered thumbnail. Their bindings
 * and assets go with them, as when copying. Rejects with the source's error when the save is
 * refused.
 * @public
 */
export async function saveShapesToCollection(
	editor: Editor,
	source: CollectionSource,
	collectionId: TLCollectionId,
	shapeIds: TLShapeId[],
	name?: string
): Promise<TLCollectionItem> {
	const content = editor.getContentFromCurrentPage(shapeIds)
	if (!content) throw new Error('No shapes to save')
	const { blob } = await editor.toImage(shapeIds, { format: 'png', background: false })
	return source.addItem(collectionId, {
		name,
		content: { formatVersion: CURRENT_ITEM_CONTENT_FORMAT_VERSION, content },
		thumbnail: blob,
	})
}

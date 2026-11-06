import type { Editor, TLShapeId } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import {
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	type TLCollectionId,
	type TLCollectionItem,
} from '../lib/schema'

// The longest edge of a thumbnail, in CSS pixels, rendered at twice that. Tiles are narrower, and
// a source may keep thumbnails in the document itself, so they are kept small.
const THUMBNAIL_SIZE = 160

/**
 * Saves shapes from the current page to a collection as they are, with a rendered thumbnail.
 * Their bindings and assets go with them, as when copying, and several shapes keep their layout
 * without being grouped. Rejects with the source's error when the save is refused.
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
	const bounds = editor.getShapesPageBounds(shapeIds)
	const scale = bounds ? Math.min(1, THUMBNAIL_SIZE / Math.max(bounds.w, bounds.h)) : 1
	const { blob } = await editor.toImage(shapeIds, {
		format: 'webp',
		quality: 0.8,
		scale,
		pixelRatio: 2,
		background: false,
	})
	return source.addItem(collectionId, {
		name,
		content: { formatVersion: CURRENT_ITEM_CONTENT_FORMAT_VERSION, content },
		thumbnail: blob,
	})
}

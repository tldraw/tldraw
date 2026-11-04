import { sanitizeSvg, type Editor, type TLShapeId } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import {
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	type TLCollectionId,
	type TLCollectionItem,
} from '../lib/schema'

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
	// A preview follows the viewer's theme once the panel sets its colour variables.
	const preview = await editor.getSvgString(shapeIds, { preview: true, background: false })
	// Cleaned like a dropped SVG, so the stored file is safe for other readers. The panel cleans it
	// again when drawing: anyone can store a thumbnail through the source's API.
	const thumbnail = preview && sanitizeSvg(preview.svg)
	return source.addItem(collectionId, {
		name,
		content: { formatVersion: CURRENT_ITEM_CONTENT_FORMAT_VERSION, content },
		thumbnail: thumbnail ? new Blob([thumbnail], { type: 'image/svg+xml' }) : undefined,
	})
}

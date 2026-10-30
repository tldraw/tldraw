import type { Editor, TLContent, TLShapeId } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import {
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	type TLCollectionId,
	type TLCollectionItem,
} from '../lib/schema'

/**
 * Changes an item's content before it's saved, e.g. to wrap several shapes in a group or a frame
 * (see {@link wrapInGroup}). It runs while the shapes are still on the page, so `editor` can
 * measure them. The shapes on the page aren't changed.
 * @public
 */
export type PrepareItemContent = (content: TLContent, editor: Editor) => TLContent

/** @public */
export interface SaveShapesOptions {
	/** Left out, the item is unnamed. */
	name?: string
	/** Left out, the shapes are saved as they are. */
	prepareItemContent?: PrepareItemContent
}

/**
 * Saves shapes from the current page to a collection, with a rendered thumbnail. Their bindings
 * and assets go with them, as when copying, and several shapes keep their layout without being
 * grouped unless `prepareItemContent` does so. Rejects with the source's error when the save is
 * refused.
 * @public
 */
export async function saveShapesToCollection(
	editor: Editor,
	source: CollectionSource,
	collectionId: TLCollectionId,
	shapeIds: TLShapeId[],
	{ name, prepareItemContent }: SaveShapesOptions = {}
): Promise<TLCollectionItem> {
	const copied = editor.getContentFromCurrentPage(shapeIds)
	if (!copied) throw new Error('No shapes to save')
	const content = prepareItemContent ? prepareItemContent(copied, editor) : copied
	const { blob } = await editor.toImage(shapeIds, { format: 'png', background: false })
	return source.addItem(collectionId, {
		name,
		content: { formatVersion: CURRENT_ITEM_CONTENT_FORMAT_VERSION, content },
		thumbnail: blob,
	})
}

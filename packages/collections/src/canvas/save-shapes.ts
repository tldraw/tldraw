import {
	Box,
	Geometry2dFilters,
	type Editor,
	type TLImageExportOptions,
	type TLShapeId,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import {
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	type TLCollectionId,
	type TLCollectionItem,
} from '../lib/schema'

/**
 * Saves shapes from the current page to a collection as they are, with a thumbnail rendered in
 * each colour mode.
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
	const { ids, ...options } = getThumbnailExport(editor, shapeIds)
	const [light, dark] = await Promise.all([
		editor.toImage(ids, { ...options, darkMode: false }),
		editor.toImage(ids, { ...options, darkMode: true }),
	])
	return source.addItem(collectionId, {
		name,
		content: { formatVersion: CURRENT_ITEM_CONTENT_FORMAT_VERSION, content },
		thumbnail: light.blob,
		darkThumbnail: dark.blob,
	})
}

// Exported alone, a frame draws only its contents, cropped like a slide (#5993), but a thumbnail
// should show what gets placed: the frame, border and name. That rule only applies to a single id,
// so the frame is passed twice (it's drawn once).
function getThumbnailExport(
	editor: Editor,
	shapeIds: TLShapeId[]
): TLImageExportOptions & { ids: TLShapeId[] } {
	const options: TLImageExportOptions = { format: 'png', background: false }
	const frame = shapeIds.length === 1 ? editor.getShape(shapeIds[0]) : undefined
	if (!frame || !editor.isShapeFrameLike(frame)) return { ...options, ids: shapeIds }

	// Not the name's bounds: they scale with the zoom, so the name would be cut off when zoomed in.
	// The padding leaves room for it, drawn at a fixed size above the frame.
	const outline = editor.getShapeGeometry(frame).getVertices(Geometry2dFilters.EXCLUDE_LABELS)
	const bounds = Box.FromPoints(editor.getShapePageTransform(frame).applyToPoints(outline))
	return {
		...options,
		ids: [frame.id, frame.id],
		bounds,
		padding: editor.options.defaultSvgPadding,
	}
}

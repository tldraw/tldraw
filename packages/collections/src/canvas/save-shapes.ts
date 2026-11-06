import {
	Box,
	Geometry2dFilters,
	type Editor,
	type TLImageExportOptions,
	type TLShape,
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

// Tiles are a few hundred pixels across; uncapped, a photo item's thumbnail came out at 5 MB.
const MAX_THUMBNAIL_SIZE = 512

// Exported alone, a frame draws only its contents, cropped like a slide (#5993), but a thumbnail
// should show what gets placed: the frame, border and name. That rule only applies to a single id,
// so the frame is passed twice (it's drawn once).
function getThumbnailExport(
	editor: Editor,
	shapeIds: TLShapeId[]
): TLImageExportOptions & { ids: TLShapeId[] } {
	const padding = editor.options.defaultSvgPadding
	const shape = shapeIds.length === 1 ? editor.getShape(shapeIds[0]) : undefined
	const frame = shape && editor.isShapeFrameLike(shape) ? shape : undefined
	const bounds = frame
		? getFrameOutline(editor, frame)
		: (editor.getShapesPageBounds(shapeIds) ?? undefined)
	const options: TLImageExportOptions = {
		format: 'png',
		background: false,
		// The default is 2; shrink it for big exports, so small ones stay as sharp as before.
		pixelRatio: bounds
			? Math.min(2, MAX_THUMBNAIL_SIZE / (Math.max(bounds.w, bounds.h) + padding * 2))
			: undefined,
	}
	if (!frame) return { ...options, ids: shapeIds }
	return { ...options, ids: [frame.id, frame.id], bounds, padding }
}

// Not the name's bounds: they scale with the zoom, so the name would be cut off when zoomed in.
// The export's padding leaves room for it, drawn at a fixed size above the frame.
function getFrameOutline(editor: Editor, frame: TLShape) {
	const outline = editor.getShapeGeometry(frame).getVertices(Geometry2dFilters.EXCLUDE_LABELS)
	return Box.FromPoints(editor.getShapePageTransform(frame).applyToPoints(outline))
}

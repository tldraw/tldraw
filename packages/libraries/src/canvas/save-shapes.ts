import {
	Box,
	Geometry2dFilters,
	type Editor,
	type TLContent,
	type TLImageExportOptions,
	type TLShape,
	type TLShapeId,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import {
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	type TLLibraryId,
	type TLLibraryItem,
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
 * Saves shapes from the current page to a library, with a thumbnail rendered in each colour
 * mode. Their bindings and assets go with them, as when copying, and several shapes keep their
 * layout without being grouped unless `prepareItemContent` does so. Rejects with the source's
 * error when the save is refused.
 * @public
 */
export async function saveShapesToLibrary(
	editor: Editor,
	source: LibrarySource,
	libraryId: TLLibraryId,
	shapeIds: TLShapeId[],
	{ name, prepareItemContent }: SaveShapesOptions = {}
): Promise<TLLibraryItem> {
	const copied = editor.getContentFromCurrentPage(shapeIds)
	if (!copied) throw new Error('No shapes to save')
	const content = prepareItemContent ? prepareItemContent(copied, editor) : copied
	const { ids, ...options } = getThumbnailExport(editor, shapeIds)
	const [light, dark] = await Promise.all([
		editor.toImage(ids, { ...options, darkMode: false }),
		editor.toImage(ids, { ...options, darkMode: true }),
	])
	return source.addItem(libraryId, {
		name,
		content: { formatVersion: CURRENT_ITEM_CONTENT_FORMAT_VERSION, content },
		thumbnail: { light: light.blob, dark: dark.blob },
	})
}

// Every thumbnail is zoomed to this many pixels on its longest side, whatever the item's size, so
// a small item fills its tile like a big one and only two images are ever kept per item. Tiles are
// a few hundred pixels across; a photo item at its own size came out at 5 MB.
const THUMBNAIL_SIZE = 512
// Exports that aren't a frame are drawn with padding and then trimmed to their content, so a tiny
// item zoomed to THUMBNAIL_SIZE would need a canvas many times bigger. Caps that, for items under
// about 9 units across.
const MAX_RENDER_SIZE = 4096

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
	const longest = bounds && Math.max(bounds.w, bounds.h)
	const options: TLImageExportOptions = {
		format: 'png',
		background: false,
		pixelRatio:
			longest === undefined
				? undefined
				: Math.min(
						// A frame keeps its padding; anything else is trimmed down to its content.
						THUMBNAIL_SIZE / (frame ? longest + padding * 2 : longest),
						MAX_RENDER_SIZE / (longest + padding * 2)
					),
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

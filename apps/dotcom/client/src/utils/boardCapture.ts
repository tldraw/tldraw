import { ThumbnailShapeMeasurement } from '@tldraw/dotcom-shared'
import {
	Box,
	Editor,
	TLArrowShape,
	TLShape,
	TLShapeId,
	VecLike,
	compact,
	getArrowInfo,
} from 'tldraw'

// What the MCP tools need from an editor, whichever editor is answering: the render page's throwaway
// one (pages/thumbnail-render.tsx), or the one in a user's open tab (tla/utils/tabRender.ts). The two
// have to agree, because a tool can be served by either from one call to the next.

export function getThumbnailContentInset(width: number, height: number) {
	return Math.max(48, Math.min(160, width * 0.12, height * 0.18))
}

// The shapes a job asked for, filtered to those on the current page. Deliberately not a store lookup:
// `editor.getShape` answers for a shape on any page, and callers use this to decide what to draw or
// delete on *this* one. Membership is read from the current page rather than from each shape's
// `parentId`, which for a shape inside a frame names the frame instead of the page.
export function getRequestedShapeIds(editor: Editor, shapeIds: string[]): TLShapeId[] {
	const onCurrentPage = editor.getCurrentPageShapeIds()
	return shapeIds.filter((id): id is TLShapeId => onCurrentPage.has(id as TLShapeId))
}

export function getRequestedBounds(editor: Editor, ids: TLShapeId[]) {
	return Box.Common(compact(ids.map((id) => editor.getShapePageBounds(id))))
}

/**
 * One shape as the MCP tools describe it, or undefined if it has no bounds.
 *
 * Text comes from the shape's own util, which is the authoritative answer — a Worker reading the
 * record can only approximate it, and gets nothing at all for shapes whose text is computed rather
 * than stored.
 */
export function measureShapeForMcp(
	editor: Editor,
	id: TLShapeId
): ThumbnailShapeMeasurement | undefined {
	const shape = editor.getShape(id)
	const box = editor.getShapePageBounds(id)
	if (!shape || !box) return undefined
	const text = editor.getShapeUtil(shape).getText(shape)
	const arrow = editor.isShapeOfType<TLArrowShape>(shape, 'arrow')
		? measureArrow(editor, shape)
		: undefined
	const dimensions = measureDimensions(editor, shape)
	return {
		x: box.x,
		y: box.y,
		w: box.w,
		h: box.h,
		...(text ? { text } : null),
		...(arrow ? { arrow } : null),
		...(dimensions ? { dimensions } : null),
	}
}

// Where an arrow is drawn, in page space. A bound arrow's record holds only a placeholder stub; its
// real ends are resolved against the shapes it is bound to, which needs the editor.
export function measureArrow(
	editor: Editor,
	shape: TLArrowShape
): ThumbnailShapeMeasurement['arrow'] | undefined {
	const info = getArrowInfo(editor, shape)
	if (!info) return undefined
	const transform = editor.getShapePageTransform(shape)
	const toPage = (point: VecLike) => {
		const { x, y } = transform.applyToPoint(point)
		return { x, y }
	}
	return { start: toPage(info.start.point), end: toPage(info.end.point) }
}

// The shapes whose size the record does not hold: a text's height comes from laying out its text,
// and a group or a freehand stroke has no size of its own — a stroke's is the one thing left to say
// about it once its points are dropped. Everything else is left out: a geo's size follows from its
// record (w by h + growY), and a line's or arrow's isn't a meaningful w and h.
const MEASURED_DIMENSION_TYPES = new Set(['text', 'group', 'draw', 'highlight'])

// A shape's own unrotated size as drawn. Geometry bounds rather than page bounds, which for a rotated
// shape are the larger axis-aligned box around it.
export function measureDimensions(
	editor: Editor,
	shape: TLShape
): ThumbnailShapeMeasurement['dimensions'] | undefined {
	if (!MEASURED_DIMENSION_TYPES.has(shape.type)) return undefined
	const { w, h } = editor.getShapeGeometry(shape).bounds
	return { w, h }
}

/** The rectangle `bounds` of the page, as a PNG of exactly `width` by `height`. */
export async function renderThumbnailPng(
	editor: Editor,
	shapeIds: TLShapeId[],
	{
		theme,
		width,
		height,
		bounds,
		scale,
	}: { theme: 'light' | 'dark'; width: number; height: number; bounds: Box; scale: number }
): Promise<Blob> {
	const { blob } = await editor.toImage(shapeIds, {
		format: 'png',
		bounds,
		scale,
		padding: 0,
		background: true,
		darkMode: theme === 'dark',
		pixelRatio: 1,
	})
	return normalizeThumbnailSize(blob, width, height)
}

// The export's bitmap sizing floors fractional dimensions, so a fractional camera zoom can come
// back a pixel short of the requested output (e.g. 500 / 0.82 * 0.82 = 499.99…). Redraw onto an
// exactly-sized canvas when that happens; the sub-pixel stretch is invisible.
async function normalizeThumbnailSize(blob: Blob, width: number, height: number): Promise<Blob> {
	const bitmap = await createImageBitmap(blob)
	try {
		if (bitmap.width === width && bitmap.height === height) return blob

		const canvas = document.createElement('canvas')
		canvas.width = width
		canvas.height = height
		const context = canvas.getContext('2d')
		if (!context) return blob
		context.drawImage(bitmap, 0, 0, width, height)
		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(result) => (result ? resolve(result) : reject(new Error('Could not resize thumbnail'))),
				'image/png'
			)
		})
	} finally {
		bitmap.close()
	}
}

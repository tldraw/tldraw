import { BoxModel, Editor, TLCommentAnchor, TLCommentThread, TLShapeId, VecLike } from 'tldraw'
import { getRegionCommentOptions } from './region-options'
import { openThreadId } from './state'

/** Where an imprecise shape comment sits by default: the shape's top-right corner. Overridable. @public */
export const DEFAULT_IMPRECISE_SHAPE_ANCHOR = { x: 1, y: 0 }

/** The default corner a region's pin and composer sit on, as a normalized 0–1 offset (bottom-right).
 *  Overridable per editor via region options; pin position, composer placement, region move, and
 *  which corner has no resize handle all derive from the chosen corner. */
export const REGION_PIN_CORNER: VecLike = { x: 1, y: 1 }

/** The page point of a region's pin corner. */
export function regionPinPoint(region: BoxModel, corner: VecLike = REGION_PIN_CORNER): VecLike {
	return {
		x: region.x + corner.x * region.w,
		y: region.y + corner.y * region.h,
	}
}

/**
 * Where a thread's pin sits on the page, for each anchor kind. Null hides the pin. For imprecise
 * shape anchors the pin uses `impreciseShapeAnchor` (a normalized 0–1 spot, top-right by default)
 * rather than the stored `x`/`y`.
 * @public
 */
export function anchorPagePoint(
	editor: Editor,
	anchor: TLCommentAnchor,
	impreciseShapeAnchor: { x: number; y: number } = DEFAULT_IMPRECISE_SHAPE_ANCHOR
): { x: number; y: number } | null {
	switch (anchor.type) {
		case 'shape': {
			const bounds = editor.getShapePageBounds(anchor.shapeId as TLShapeId)
			if (!bounds) return null
			// Precise pins sit at their stored x/y; imprecise ones at the consumer's default spot.
			const { x, y } = anchor.isPrecise ? anchor : impreciseShapeAnchor
			return { x: bounds.minX + x * bounds.w, y: bounds.minY + y * bounds.h }
		}
		case 'text-range': {
			const bounds = editor.getShapePageBounds(anchor.shapeId as TLShapeId)
			if (!bounds) return null
			return { x: bounds.maxX, y: bounds.minY }
		}
		case 'point':
			return { x: anchor.x, y: anchor.y }
		case 'region':
			return regionPinPoint(anchor, getRegionCommentOptions(editor).pinCorner)
		case 'page':
			return null
	}
}

/** How close, in screen pixels, an `'outline'` hit must be to a shape's line. */
const OUTLINE_HIT_MARGIN_PX = 8

/** How a point is judged to be over a shape. @public */
export interface CommentTargetOptions {
	/** Alt: attach to nothing, so the comment stays a free point over whatever is beneath it. */
	detach?: boolean
	/**
	 * What counts as being over a shape. `'area'` (the default) takes anywhere within its outline,
	 * which is what placing a comment wants — tldraw's default fill is `'none'`, so a geometry-only
	 * test would leave a freshly drawn rectangle's whole interior unattachable. `'outline'` requires
	 * the point to be on the shape's actual line, ignoring any fill.
	 */
	hit?: 'area' | 'outline'
}

/**
 * The shape a comment placed at `page` would attach to, or undefined when it should float free.
 *
 * Shared by the tool's hover hint, the pin drag's hint, and both of their drops, so the highlight
 * always names exactly what the release will do.
 * @public
 */
export function commentTargetShape(
	editor: Editor,
	page: { x: number; y: number },
	{ detach = false, hit = 'area' }: CommentTargetOptions = {}
) {
	if (detach) return undefined
	if (hit === 'area') return editor.getShapeAtPoint(page, { hitInside: true })

	// Outline mode. `getShapeAtPoint` can't express this: with `hitInside: false` a *filled* shape
	// still swallows its whole interior, because the geometry reports inside points as negative
	// distance whenever `isFilled`. So gather the candidates and measure each one's distance to its
	// own outline, where the sign is exactly what we want to discard.
	const margin = OUTLINE_HIT_MARGIN_PX / editor.getZoomLevel()
	// Top-most first, so the first match is the one the pointer is visually over.
	for (const shape of editor.getShapesAtPoint(page, { hitInside: true, margin })) {
		const geometry = editor.getShapeGeometry(shape)
		const local = editor.getPointInShapeSpace(shape, page)
		if (Math.abs(geometry.distanceToPoint(local)) <= margin) return shape
	}
	return undefined
}

/**
 * The anchor a comment placed at `page` should take: the shape under the point, else a free page
 * point. Shape anchors are always precise — a comment stays exactly where it was put.
 * @public
 */
export function anchorAtPoint(
	editor: Editor,
	page: { x: number; y: number },
	options: CommentTargetOptions = {}
): TLCommentAnchor {
	const hit = commentTargetShape(editor, page, options)
	if (!hit) return { type: 'point', x: page.x, y: page.y }
	return shapeAnchorAt(editor, hit.id, page, true)
}

/**
 * A shape anchor for a page point. `x`/`y` are the point's normalized (0–1) offset within the
 * shape's page bounds, remembered either way. When `precise` the pin sits at exactly `x`/`y`;
 * otherwise it sits at the consumer's imprecise default (top-right out of the box).
 *
 * Placement always passes `precise` now — imprecise anchors are only produced by consumers calling
 * this directly, and by comments stored before the change. {@link anchorPagePoint} still renders
 * them, so those keep working.
 * @public
 */
export function shapeAnchorAt(
	editor: Editor,
	shapeId: TLShapeId,
	page: { x: number; y: number },
	precise: boolean
): TLCommentAnchor {
	const bounds = editor.getShapePageBounds(shapeId)
	if (!bounds || bounds.w === 0 || bounds.h === 0) {
		return { type: 'shape', shapeId, x: 0.5, y: 0.5, isPrecise: precise }
	}
	return {
		type: 'shape',
		shapeId,
		x: (page.x - bounds.minX) / bounds.w,
		y: (page.y - bounds.minY) / bounds.h,
		isPrecise: precise,
	}
}

/** Open a thread and bring it into view — switch to its page if needed, then center its pin. @public */
export function focusThread(
	editor: Editor,
	thread: TLCommentThread,
	impreciseShapeAnchor?: { x: number; y: number }
): void {
	if (thread.pageId !== editor.getCurrentPageId()) {
		editor.setCurrentPage(thread.pageId as any)
	}
	openThreadId.set(editor, thread.id)
	const point = anchorPagePoint(editor, thread.anchor, impreciseShapeAnchor)
	if (point) editor.centerOnPoint(point, { animation: { duration: 200 } })
}

import { BoxModel, Editor, TLCommentAnchor, TLCommentThread, TLShapeId, VecLike } from 'tldraw'
import { getRegionCommentOptions } from './region-options'
import { openThreadId } from './state'

/** Where an imprecise shape comment sits by default: the shape's top-right corner. Overridable. @public */
export const DEFAULT_IMPRECISE_SHAPE_ANCHOR = { x: 1, y: 0 }

/** How far an imprecise shape pin steps inside the shape from its anchor spot, in screen px —
 *  most of the marker sits within the shape, with a small overhang past the corner. */
export const IMPRECISE_PIN_INSET_PX = 20

/** Imprecise shape pins tuck inside the shape rather than hanging off its edge: the marker
 *  extends up-right of its anchor point, so step it toward the shape's centre. Screen px — the
 *  pin is screen-fixed while the shape scales with zoom. Null for anchors that need no inset. */
export function impreciseShapePinInset(
	anchor: TLCommentThread['anchor'],
	spot: { x: number; y: number }
): { x: number; y: number } | null {
	if (anchor.type !== 'shape' || anchor.isPrecise) return null
	return {
		x: Math.sign(0.5 - spot.x) * IMPRECISE_PIN_INSET_PX,
		y: Math.sign(0.5 - spot.y) * IMPRECISE_PIN_INSET_PX,
	}
}

/** The default corner a region's pin and composer sit on, as a normalized 0–1 offset (bottom-right).
 *  Overridable per editor via region options; pin position, composer placement, region move, and
 *  which corner has no resize handle all derive from the chosen corner. */
export const REGION_PIN_CORNER: VecLike = { x: 1, y: 1 }

/** A region anchor's pin corner: the corner its creating drag released on, when recorded, else
 *  the editor's configured default. @public */
export function regionAnchorPinCorner(
	editor: Editor,
	anchor: Extract<TLCommentAnchor, { type: 'region' }>
): VecLike {
	if (anchor.pinX !== undefined && anchor.pinY !== undefined) {
		return { x: anchor.pinX, y: anchor.pinY }
	}
	return getRegionCommentOptions(editor).pinCorner
}

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
			return regionPinPoint(anchor, regionAnchorPinCorner(editor, anchor))
		case 'page':
			return null
	}
}

/**
 * A shape anchor for a page point. `x`/`y` are the point's normalized (0–1) offset within the
 * shape's page bounds, remembered either way. When `precise` the pin sits at exactly `x`/`y`;
 * otherwise it sits at the consumer's imprecise default (top-right out of the box). Placement
 * gestures get `precise` from the `shouldBePrecise` commenting option (always precise, by default).
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

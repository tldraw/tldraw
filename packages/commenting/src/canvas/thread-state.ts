import {
	BoxModel,
	Editor,
	Mat,
	TLCommentAnchor,
	TLCommentThread,
	TLShape,
	TLShapeId,
	Vec,
	VecLike,
} from 'tldraw'
import { getCommentingOptions } from './options'
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
	editor: Editor,
	anchor: TLCommentThread['anchor'],
	spot: { x: number; y: number }
): { x: number; y: number } | null {
	if (anchor.type !== 'shape' || anchor.isPrecise) return null
	const inset = {
		x: Math.sign(0.5 - spot.x) * IMPRECISE_PIN_INSET_PX,
		y: Math.sign(0.5 - spot.y) * IMPRECISE_PIN_INSET_PX,
	}
	// The spot is a corner of the shape's own bounds, so which way "toward the centre" points turns
	// with the shape: without this a rotated shape's pin would step out of the shape, not into it.
	const rotation = editor.getShapePageTransform(anchor.shapeId as TLShapeId)?.rotation() ?? 0
	return rotation === 0 ? inset : Vec.Rot(inset, rotation)
}

/** The default corner a region's pin and composer sit on, as a normalized 0–1 offset (bottom-right).
 *  Overridable per editor via the `regionPinCorner` commenting option; pin position, composer
 *  placement, region move, and which corner has no resize handle all derive from the chosen corner. */
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
	return getCommentingOptions(editor).regionPinCorner
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
 *
 * A shape anchor's `x`/`y` are normalized within the shape's own bounds and resolved through the
 * shape's page transform, so the pin rides every part of that transform — rotating the shape
 * carries the pin around with it instead of leaving it behind in the bounding box.
 * @public
 */
export function anchorPagePoint(
	editor: Editor,
	anchor: TLCommentAnchor,
	impreciseShapeAnchor: { x: number; y: number } = DEFAULT_IMPRECISE_SHAPE_ANCHOR
): { x: number; y: number } | null {
	switch (anchor.type) {
		case 'shape': {
			const shape = editor.getShape(anchor.shapeId as TLShapeId)
			if (!shape) return null
			const transform = editor.getShapePageTransform(shape)
			if (!transform) return null
			const { point, size } = editor.getShapeGeometry(shape).bounds
			// Precise pins sit at their stored x/y; imprecise ones at the consumer's default spot.
			const spot = anchor.isPrecise ? anchor : impreciseShapeAnchor
			return Mat.applyToPoint(transform, Vec.Add(point, Vec.MulV(spot, size)))
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
 * The shape a comment placed at a page point should anchor to, or undefined for empty canvas.
 *
 * Uses the editor's hit-test margin, the same slack select and hover use. Without it, shapes whose
 * geometry is an open path — arrows, lines, draw strokes — are unhittable in practice: their
 * geometry reports a positive distance for every point off the stroke, so a zero margin only
 * matches a pixel-perfect click right on the line.
 *
 * `hitFrameInside` lets a click inside a frame's body anchor to the frame — without it a frame is
 * hit only on its edge/label (the select-tool convention), so the frame's interior would fall
 * through to a bare point. A child shape under the pointer still wins (children sort above the
 * frame), so only a frame's empty interior anchors the frame.
 *
 * @internal
 */
export function commentTargetShapeAt(editor: Editor, page: VecLike): TLShape | undefined {
	return editor.getShapeAtPoint(page, {
		hitInside: true,
		hitFrameInside: true,
		margin: editor.getHitTestMargin(),
	})
}

/**
 * A shape anchor for a page point. `x`/`y` are the point's normalized (0–1) offset within the
 * shape's own bounds — taken in the shape's own space, so a pin placed on a rotated shape records
 * the spot it was dropped on rather than a spot in the bounding box. Remembered either way: when
 * `precise` the pin sits at exactly `x`/`y`; otherwise it sits at the consumer's imprecise default
 * (top-right out of the box). Placement gestures get `precise` from the `shouldBePrecise`
 * commenting option (always precise, by default).
 * @public
 */
export function shapeAnchorAt(
	editor: Editor,
	shapeId: TLShapeId,
	page: { x: number; y: number },
	precise: boolean
): TLCommentAnchor {
	const shape = editor.getShape(shapeId)
	const bounds = shape && editor.getShapeGeometry(shape).bounds
	if (!shape || !bounds || bounds.w === 0 || bounds.h === 0) {
		return { type: 'shape', shapeId, x: 0.5, y: 0.5, isPrecise: precise }
	}
	const local = editor.getPointInShapeSpace(shape, page)
	return {
		type: 'shape',
		shapeId,
		x: (local.x - bounds.minX) / bounds.w,
		y: (local.y - bounds.minY) / bounds.h,
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

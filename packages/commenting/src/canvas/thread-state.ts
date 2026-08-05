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
import { commentsSidebarOpen, openThreadId } from './state'
import { POPOVER_OFFSET } from './thread-view'

/** How far an imprecise shape pin steps inside the shape from its anchor spot, in screen px —
 *  most of the marker sits within the shape, with a small overhang past the corner. */
export const IMPRECISE_PIN_INSET_PX = 20

/** Screen-pixel margin by which the viewport is inflated when culling canvas markers (thread pins
 *  and cluster badges), so a marker just off-screen is already mounted when a pan brings it in. */
const MARKER_CULL_MARGIN_PX = 120

/**
 * Whether a viewport-space point sits within the viewport inflated by
 * {@link MARKER_CULL_MARGIN_PX}. The cull test for screen-fixed markers: off-screen markers
 * return null from their position signal and unmount instead of tracking every camera frame.
 * @internal
 */
export function isInInflatedViewport(editor: Editor, point: VecLike): boolean {
	const viewport = editor.getViewportScreenBounds()
	const margin = MARKER_CULL_MARGIN_PX
	return (
		point.x >= -margin &&
		point.y >= -margin &&
		point.x <= viewport.w + margin &&
		point.y <= viewport.h + margin
	)
}

/**
 * Whether any part of a page-space box overlaps the viewport inflated by
 * {@link MARKER_CULL_MARGIN_PX}. The cull test for region-anchored threads, whose dashed box can
 * be on screen while the pin corner itself is not.
 * @internal
 */
export function isBoxInInflatedViewport(editor: Editor, box: BoxModel): boolean {
	const viewport = editor.getViewportScreenBounds()
	const margin = MARKER_CULL_MARGIN_PX
	// Zoom is positive, so the page box's corners keep their order through the transform.
	const min = editor.pageToViewport({ x: box.x, y: box.y })
	const max = editor.pageToViewport({ x: box.x + box.w, y: box.y + box.h })
	return (
		max.x >= -margin &&
		max.y >= -margin &&
		min.x <= viewport.w + margin &&
		min.y <= viewport.h + margin
	)
}

/** Imprecise shape pins tuck inside the shape rather than hanging off its edge: the marker
 *  extends up-right of its anchor point, so step it toward the shape's centre. Screen px — the
 *  pin is screen-fixed while the shape scales with zoom. Null for anchors that need no inset. */
export function impreciseShapePinInset(
	editor: Editor,
	anchor: TLCommentThread['anchor']
): { x: number; y: number } | null {
	if (anchor.type !== 'shape' || anchor.isPrecise) return null
	const spot = getCommentingOptions(editor).impreciseShapeAnchor
	const inset = {
		x: Math.sign(0.5 - spot.x) * IMPRECISE_PIN_INSET_PX,
		y: Math.sign(0.5 - spot.y) * IMPRECISE_PIN_INSET_PX,
	}
	// The spot is a corner of the shape's own bounds, so which way "toward the centre" points turns
	// with the shape: without this a rotated shape's pin would step out of the shape, not into it.
	const rotation = editor.getShapePageTransform(anchor.shapeId as TLShapeId)?.rotation() ?? 0
	return rotation === 0 ? inset : Vec.Rot(inset, rotation)
}

/** The corner a region's pin and composer sit on, as a normalized 0–1 offset (bottom-right). Pin
 *  position, composer placement, region move, and which corner has no resize handle all derive
 *  from it. */
export const REGION_PIN_CORNER: VecLike = { x: 1, y: 1 }

/** A region anchor's pin corner: the corner its creating drag released on, when recorded, else
 *  {@link REGION_PIN_CORNER}. @internal */
export function regionAnchorPinCorner(
	anchor: Extract<TLCommentAnchor, { type: 'region' }>
): VecLike {
	if (anchor.pinX !== undefined && anchor.pinY !== undefined) {
		return { x: anchor.pinX, y: anchor.pinY }
	}
	return REGION_PIN_CORNER
}

/** The page point of a region's pin corner. */
export function regionPinPoint(region: BoxModel, corner: VecLike = REGION_PIN_CORNER): VecLike {
	return {
		x: region.x + corner.x * region.w,
		y: region.y + corner.y * region.h,
	}
}

/**
 * Where a thread's pin sits on the page, for each anchor kind. Null hides the pin. Imprecise shape
 * anchors use {@link CommentingOptions.impreciseShapeAnchor} rather than the stored `x`/`y`.
 *
 * A shape anchor's `x`/`y` are normalized within the shape's bounds and resolved through its page
 * transform, so the pin rides rotation instead of being left behind in the bounding box.
 * @public
 */
export function anchorPagePoint(
	editor: Editor,
	anchor: TLCommentAnchor
): { x: number; y: number } | null {
	switch (anchor.type) {
		case 'shape': {
			const shape = editor.getShape(anchor.shapeId as TLShapeId)
			if (!shape) return null
			const transform = editor.getShapePageTransform(shape)
			if (!transform) return null
			const { point, size } = editor.getShapeGeometry(shape).bounds
			// Precise pins sit at their stored x/y; imprecise ones at the editor's configured spot.
			const spot = anchor.isPrecise ? anchor : getCommentingOptions(editor).impreciseShapeAnchor
			return Mat.applyToPoint(transform, Vec.Add(point, Vec.MulV(spot, size)))
		}
		case 'point':
			return { x: anchor.x, y: anchor.y }
		case 'region':
			return regionPinPoint(anchor, regionAnchorPinCorner(anchor))
		case 'page':
			return null
	}
}

/**
 * The shape a comment placed at a page point should anchor to, or undefined for empty canvas.
 *
 * Uses the editor's hit-test margin, the same slack select and hover use — without it, open-path
 * shapes (arrows, lines, draw strokes) are unhittable in practice.
 *
 * `hitFrameInside` lets a click inside a frame's body anchor to the frame, which it otherwise
 * wouldn't (the select-tool convention hits only the edge/label). A child shape under the pointer
 * still wins, so only a frame's empty interior anchors the frame.
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
 * shape's own bounds, taken in the shape's own space, so a pin on a rotated shape records the spot
 * it was dropped on. Remembered either way: when `precise` the pin sits at exactly `x`/`y`,
 * otherwise at the consumer's imprecise default.
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
export function focusThread(editor: Editor, thread: TLCommentThread): void {
	if (thread.pageId !== editor.getCurrentPageId()) {
		editor.setCurrentPage(thread.pageId as any)
	}
	openThreadId.set(editor, thread.id)
	const point = anchorPagePoint(editor, thread.anchor)
	if (!point) return
	const offset = commentCenterScreenOffset(editor) / editor.getZoomLevel()
	editor.centerOnPoint({ x: point.x + offset, y: point.y }, { animation: { duration: 200 } })
}

/** The left inset a nudged pin never crosses, and the gap kept between thread UI and sidebar. */
const CENTER_MARGIN_PX = 8

/** How far the open thread UI reaches right of its pin, in screen px: the popover's offset plus
 *  the thread panel's fixed width (300px, `.tlui-cmt-thread`). */
const THREAD_UI_EXTENT_PX = POPOVER_OFFSET.thread.x + 300

/**
 * How far right of a centered-on pin the true viewport center should sit, in screen px. While the
 * comments sidebar covers the viewport's right edge, dead-centering a pin would put its thread
 * popover under the sidebar — so centering aims at the middle of the uncovered area instead, never
 * past the viewport's left edge. Zero when the sidebar is closed or not on screen.
 * @internal
 */
export function commentCenterScreenOffset(editor: Editor): number {
	if (!commentsSidebarOpen.get(editor)) return 0
	const sidebar = editor.getContainer().querySelector('.tlui-cmt-canvas-sidebar')
	if (!sidebar) return 0
	const viewport = editor.getViewportScreenBounds()
	// Viewport screen bounds are the container's client rect, so this is container-local.
	const sidebarLeft = sidebar.getBoundingClientRect().left - viewport.x
	if (sidebarLeft >= viewport.w) return 0
	// Aim the pin at the middle of the uncovered area, nudged left until the thread UI clears the
	// sidebar — but never past the left edge (the edge wins when there's no room for both).
	const pinX = Math.max(
		Math.min(sidebarLeft / 2, sidebarLeft - CENTER_MARGIN_PX - THREAD_UI_EXTENT_PX),
		CENTER_MARGIN_PX
	)
	return viewport.w / 2 - pinX
}

import {
	BoxModel,
	Editor,
	Geometry2dFilters,
	Mat,
	TLCommentAnchor,
	TLCommentThread,
	TLShape,
	TLShapeId,
	VecLike,
} from 'tldraw'
import { getRegionCommentOptions } from './region-options'
import { openThreadId } from './state'

/** A shape anchor, narrowed out of the anchor union. */
type TLShapeCommentAnchor = Extract<TLCommentAnchor, { type: 'shape' }>

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
			const shape = editor.getShape(anchor.shapeId as TLShapeId)
			if (!shape) return null
			const transform = editor.getShapePageTransform(shape)
			if (!transform) return null
			// Resolve against the shape's own geometry box and then push the result through its page
			// transform, the way arrow bindings do. Using page bounds instead would measure against an
			// axis-aligned box that grows as the shape rotates, so a stored fraction would drift across
			// the shape — the pin would slide off the thing it was placed on.
			const bounds = editor.getShapeGeometry(shape).bounds
			// Precise pins sit at their stored x/y; imprecise ones at the consumer's default spot.
			const { x, y } = anchor.isPrecise ? anchor : impreciseShapeAnchor
			return Mat.applyToPoint(transform, {
				x: bounds.minX + x * bounds.w,
				y: bounds.minY + y * bounds.h,
			})
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

/**
 * A shape anchor for a page point: the exact inverse of {@link anchorPagePoint}'s shape case. The
 * page point is pulled into the shape's own space and normalized against its geometry box, so the
 * pair round-trips through rotation, nesting, and resizing.
 *
 * `precise` is always true for comments placed or dragged by this package — a comment stays where
 * you put it. The parameter remains for consumers building anchors themselves, and
 * {@link anchorPagePoint} still renders `isPrecise: false` records stored before that changed.
 * @public
 */
export function shapeAnchorAt(
	editor: Editor,
	shapeId: TLShapeId,
	page: { x: number; y: number },
	precise: boolean
): TLCommentAnchor {
	return shapeAnchorFor(editor, shapeId, page, precise)
}

function shapeAnchorFor(
	editor: Editor,
	shapeId: TLShapeId,
	page: { x: number; y: number },
	precise: boolean
): TLShapeCommentAnchor {
	const shape = editor.getShape(shapeId)
	if (!shape) return { type: 'shape', shapeId, x: 0.5, y: 0.5, isPrecise: precise }
	const bounds = editor.getShapeGeometry(shape).bounds
	const local = editor.getPointInShapeSpace(shape, page)
	return {
		type: 'shape',
		shapeId,
		// A shape with no extent on an axis (a perfectly straight line) can't be normalized along it;
		// centre that axis rather than dividing by zero. The other axis still works normally.
		x: bounds.w === 0 ? 0.5 : (local.x - bounds.minX) / bounds.w,
		y: bounds.h === 0 ? 0.5 : (local.y - bounds.minY) / bounds.h,
		isPrecise: precise,
	}
}

/** How close, in screen pixels, a point must be to a shape's stroke to attach to it. */
const OUTLINE_HIT_MARGIN_PX = 8

/**
 * Shape types with no drawn stroke to aim at — pictures, text, widgets. Outline-only binding would
 * leave these reachable by their border alone, so a comment dropped in the middle of a photo would
 * miss it entirely. These attach anywhere within their area instead.
 *
 * Frames are deliberately absent: a frame's border is a real line, and binding anywhere inside one
 * would attach every comment in a frame to the frame itself.
 */
const AREA_BOUND_SHAPE_TYPES: ReadonlySet<string> = new Set([
	'image',
	'video',
	'text',
	'note',
	'bookmark',
	'embed',
])

/**
 * The shape a comment placed at `page` would attach to, or undefined for empty canvas.
 *
 * A comment binds to a shape's stroke, not its fill: anywhere there's ink, nothing in the blank
 * space a shape's outline encloses. That can't be had from `getShapeAtPoint`, whose `hitInside`
 * flag is only consulted for hollow shapes — a filled shape reports interior points as a negative
 * distance and is returned outright. So this measures distance to the outline itself and discards
 * the sign, which is exactly the "I'm inside a fill" information we don't want.
 * @public
 */
export function commentTargetShape(editor: Editor, page: VecLike): TLShape | undefined {
	// Screen-space margin, so the stroke stays equally easy to hit at any zoom. Without one it is a
	// couple of pixels wide and effectively unhittable.
	const margin = OUTLINE_HIT_MARGIN_PX / editor.getZoomLevel()
	// Top-most first, so the first match is the shape the pointer is visually over.
	for (const shape of editor.getShapesAtPoint(page, { hitInside: true, margin })) {
		if (AREA_BOUND_SHAPE_TYPES.has(shape.type)) return shape
		const local = editor.getPointInShapeSpace(shape, page)
		// Labels excluded: a geo shape's label is a filled rectangle in the middle of the shape, and
		// would otherwise read as ink exactly where the fill is supposed to be inert.
		const distance = editor
			.getShapeGeometry(shape)
			.distanceToPoint(local, false, Geometry2dFilters.EXCLUDE_NON_STANDARD)
		if (Math.abs(distance) <= margin) return shape
	}
	return undefined
}

/** Where a placement or drag would land, and what to highlight while it's in progress. @public */
export interface CommentDropTarget {
	anchor: TLCommentAnchor
	/** The shape to hint, or null when the drop would leave the comment unattached. */
	highlightShapeId: TLShapeId | null
}

/** @public */
export interface ResolveCommentDropOptions {
	/** The anchor being dragged, when re-anchoring an existing comment rather than placing a new one. */
	current?: TLCommentAnchor
	/** Alt: hold the comment on the shape it is already attached to (see {@link resolveCommentDrop}). */
	constrain?: boolean
}

/**
 * Resolve a page point into the anchor a drop would produce and the shape to highlight while
 * getting there. Both come from one call so the highlight can never promise something the drop
 * doesn't deliver.
 *
 * Two modes:
 * - Normal: attach to whatever shape's stroke is under the point, else leave the comment a free
 *   page point. Dragging a comment off a stroke onto blank canvas is how it detaches.
 * - Constrained (Alt, on a comment already attached to a shape): keep that shape and let the
 *   comment sit anywhere within its box, fill included, clamped to the box's edges.
 * @public
 */
export function resolveCommentDrop(
	editor: Editor,
	page: VecLike,
	{ current, constrain = false }: ResolveCommentDropOptions = {}
): CommentDropTarget {
	if (constrain && current?.type === 'shape') {
		const shapeId = current.shapeId as TLShapeId
		if (editor.getShape(shapeId)) {
			const anchor = shapeAnchorFor(editor, shapeId, page, true)
			return {
				anchor: { ...anchor, x: clamp01(anchor.x), y: clamp01(anchor.y) },
				highlightShapeId: shapeId,
			}
		}
	}

	const hit = commentTargetShape(editor, page)
	if (!hit) return { anchor: { type: 'point', x: page.x, y: page.y }, highlightShapeId: null }
	return { anchor: shapeAnchorFor(editor, hit.id, page, true), highlightShapeId: hit.id }
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value))
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

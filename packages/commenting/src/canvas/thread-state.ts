import { Editor, TLCommentAnchor, TLCommentThread, TLShapeId } from 'tldraw'
import { openThreadId } from './state'

/** Where an imprecise shape comment sits by default: the shape's top-right corner. Overridable. */
export const DEFAULT_IMPRECISE_SHAPE_ANCHOR = { x: 1, y: 0 }

/**
 * Where a thread's pin sits on the page, for each anchor kind. Null hides the pin. For imprecise
 * shape anchors the pin uses `impreciseShapeAnchor` (a normalized 0–1 spot, top-right by default)
 * rather than the stored `x`/`y`.
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
			return { x: anchor.x + anchor.w, y: anchor.y }
		case 'page':
			return null
	}
}

/**
 * A shape anchor for a page point. `x`/`y` are the point's normalized (0–1) offset within the
 * shape's page bounds, remembered either way. When `precise` (Alt held) the pin sits at exactly
 * `x`/`y`; otherwise it sits at the consumer's imprecise default (top-right out of the box).
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

/** Open a thread and bring it into view — switch to its page if needed, then center its pin. */
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

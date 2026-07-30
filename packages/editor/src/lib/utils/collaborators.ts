import { VecLike } from '../primitives/Vec'

/**
 * Whether a collaborator's cursor (page coords) is inside the viewport, with a small margin for the
 * cursor glyph so it isn't culled the instant its hotspot crosses the edge.
 *
 * Single source of truth for the cursor/hint split: the DOM cursor layer renders a collaborator
 * when this is true, and `CollaboratorHintOverlayUtil` draws the viewport-edge hint when it's
 * false. Sharing the predicate keeps those two exhaustive and mutually exclusive — a margin change
 * can't open a dead zone (neither renders) or a double-render (both).
 *
 * @public
 */
export function isCursorInViewport(
	cursor: VecLike,
	viewport: { minX: number; minY: number; maxX: number; maxY: number },
	zoom: number
): boolean {
	return !(
		cursor.x < viewport.minX - 12 / zoom ||
		cursor.y < viewport.minY - 16 / zoom ||
		cursor.x > viewport.maxX - 12 / zoom ||
		cursor.y > viewport.maxY - 16 / zoom
	)
}

import { Editor, Vec, maybeSnapToGrid } from '@tldraw/editor'

/**
 * Grid-snaps a dragged handle point under the same rules translate and resize use for
 * shapes: the accel key suspends the grid, and an active shape snap (one with an
 * indicator showing) wins over it. Without the second rule the grid would pull the
 * handle off the very point the snap indicator is drawn on.
 */
export function maybeSnapHandleToGrid(point: Vec, editor: Editor): Vec {
	if (editor.inputs.getAccelKey() || editor.snaps.getIndicators().length > 0) {
		return point.clone()
	}
	return maybeSnapToGrid(point, editor)
}

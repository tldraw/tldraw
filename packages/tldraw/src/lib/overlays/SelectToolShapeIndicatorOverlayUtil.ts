import { ShapeIndicatorOverlayUtil } from '@tldraw/editor'

/**
 * Shape indicator overlay configured for the select tool.
 *
 * Selection indicators show while the select tool is idle, editing a shape, or
 * mid-interaction (brushing or pointing). The hover indicator shows only in the
 * resting states (idle or editing), so it doesn't flicker during a drag.
 *
 * This keeps the select tool's state paths in the tldraw package rather than in
 * the editor's tool-agnostic `ShapeIndicatorOverlayUtil`.
 *
 * @public
 */
export class SelectToolShapeIndicatorOverlayUtil extends ShapeIndicatorOverlayUtil {
	override shouldShowSelectionIndicators(): boolean {
		return this.editor.isInAny(
			'select.idle',
			'select.editing_shape',
			'select.brushing',
			'select.scribble_brushing',
			'select.pointing_shape',
			'select.pointing_selection',
			'select.pointing_handle'
		)
	}

	override shouldShowHoverIndicator(): boolean {
		return this.editor.isInAny('select.idle', 'select.editing_shape')
	}
}

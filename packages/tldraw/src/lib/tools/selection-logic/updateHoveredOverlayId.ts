import { Editor } from '@tldraw/editor'

/**
 * Update the hovered overlay id. This should be called BEFORE updateHoveredShapeId
 * so that overlays take priority over shapes for hover state.
 *
 * @returns true if an overlay is hovered (meaning shape hover should be skipped)
 * @internal
 */
export function updateHoveredOverlayId(editor: Editor): boolean {
	if (editor.isDisposed) return false

	const currentPagePoint = editor.inputs.getCurrentPagePoint()
	const margin = editor.options.hitTestMargin / editor.getZoomLevel()
	const overlay = editor.overlays.getOverlayAtPoint(currentPagePoint, margin)

	const previousOverlayId = editor.overlays.getHoveredOverlayId()

	if (overlay) {
		editor.overlays.setHoveredOverlay(overlay.id)
		// Clear shape hover when over an overlay
		editor.setHoveredShape(null)

		// Update cursor based on the hovered overlay
		const util = editor.overlays.getOverlayUtil(overlay)
		const cursor = util.getCursor(overlay)
		if (cursor) {
			editor.setCursor({ type: cursor, rotation: editor.getSelectionRotation() })
		}

		return true
	}

	// Reset cursor when leaving an overlay
	if (previousOverlayId) {
		editor.setCursor({ type: 'default', rotation: 0 })
	}

	editor.overlays.setHoveredOverlay(null)
	return false
}

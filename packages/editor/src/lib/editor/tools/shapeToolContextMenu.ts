import type { Editor } from '../Editor'

/**
 * Shared handler for a long-press in a shape-creation tool's pointing/drawing
 * state. On a coarse pointer this cancels any pending shape creation, switches
 * to the select tool, and selects the shape under the pointer, so the
 * browser-fired `contextmenu` opens the normal selection context menu with no
 * stray shape left behind (issue #8277).
 *
 * Gated on `isCoarsePointer`: on a fine pointer (mouse) the long-press timer
 * powers the deliberate "pause before drag to start a precise arrow" gesture,
 * which we must not disturb. The bug only manifests on coarse pointers, because
 * that is also where the browser fires `contextmenu` at the long-press mark.
 *
 * The `cancelPendingCreation` callback is the tool's own cleanup — it knows
 * whether it needs to `bailToMark` a shape it created early (note, draw, arrow,
 * line, text) or simply transition back to idle (geo, box).
 *
 * Right-clicks are handled separately, in the editor's event dispatch, which
 * routes every right-click through the select tool regardless of the active
 * tool. A long-press needs this dedicated handler because it can interrupt an
 * in-progress creation that only the tool itself knows how to unwind.
 *
 * @internal
 */
export function handleShapeCreationLongPress(
	editor: Editor,
	cancelPendingCreation: () => void
): void {
	if (!editor.getInstanceState().isCoarsePointer) return

	cancelPendingCreation()

	// Switch to the select tool and select the shape under the pointer, so the
	// context menu opens as the normal selection menu — full shape actions, with
	// the selection shown by its normal bounds.
	editor.setCurrentTool('select')
	selectShapeUnderPointer(editor)
}

/**
 * Mirror SelectTool Idle.onRightClick (canvas case): select the outermost
 * selectable shape under the pointer so the menu reflects it, otherwise clear
 * the selection.
 */
function selectShapeUnderPointer(editor: Editor): void {
	const point = editor.inputs.getCurrentPagePoint()
	const hit = editor.getShapeAtPoint(point, {
		margin: editor.options.hitTestMargin / editor.getZoomLevel(),
		hitInside: false,
		hitLabels: true,
		hitLocked: true,
		hitFrameInside: true,
		renderingOnly: true,
	})

	if (hit) {
		const target = editor.getOutermostSelectableShape(hit)
		editor.markHistoryStoppingPoint('selecting shape')
		editor.setSelectedShapes([target.id])
	} else {
		editor.selectNone()
	}
}

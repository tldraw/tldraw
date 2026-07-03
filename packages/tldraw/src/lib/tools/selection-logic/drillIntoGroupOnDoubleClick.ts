import { Editor, TLShape } from '@tldraw/editor'

/**
 * A double click should behave like two clicks: at any focus layer, it drills one
 * level deeper into the group hierarchy rather than jumping straight to editing.
 * The first double click on a shape inside an unfocused group selects the group,
 * the next selects the shape inside it, and so on. Only once a shape is reachable
 * at the current focus layer does a double click edit (or crop) it. Groups always
 * drill; they are never edited. Because selecting a child focuses its parent
 * group, the pattern resets whenever the focus layer changes.
 *
 * Frames and the page are not focus layers, so a shape inside a frame (or at the
 * top level) is reachable directly and edits on double click as usual.
 *
 * @returns `true` if the double click drilled into a group, in which case the
 * caller should stop. `false` if the shape is reachable at the focused layer and
 * the caller should handle the double click normally (e.g. begin editing).
 *
 * @internal
 */
export function drillIntoGroupOnDoubleClick(editor: Editor, hitShape: TLShape): boolean {
	const isGroup = editor.isShapeOfType(hitShape, 'group')

	// The outermost selectable ancestor, respecting the focus layer but ignoring
	// the current selection. If that's the shape itself and the shape isn't a
	// group, then there's no unfocused group left to drill into — let the caller
	// handle the double click (e.g. begin editing).
	if (!isGroup && editor.getOutermostSelectableShape(hitShape).id === hitShape.id) {
		return false
	}

	// Otherwise drill one level down: select the outermost selectable ancestor
	// that isn't already selected — the same step a single click would take.
	const selectedShapeIds = editor.getSelectedShapeIds()
	const shapeToSelect = editor.getOutermostSelectableShape(
		hitShape,
		(parent) => !selectedShapeIds.includes(parent.id)
	)

	if (!selectedShapeIds.includes(shapeToSelect.id)) {
		editor.markHistoryStoppingPoint('drilling into group on double click')
		editor.select(shapeToSelect.id)
	}

	return true
}

import type { Editor } from '../Editor'

/**
 * Shared handler for a long-press in a discrete shape-creation tool's pointing
 * state (geo, note, line, text, arrow, frame). On a coarse pointer this cancels
 * any pending creation so the long-press leaves no shape behind (issue #8277).
 * It does not open a context menu — that is a select-tool surface, reached on
 * touch only from the select tool, and on desktop from a right-click (which the
 * editor routes through the select tool).
 *
 * Gated on `isCoarsePointer`: on a fine pointer (mouse) the long-press timer
 * powers the deliberate "pause before drag to start a precise arrow" gesture,
 * which we must not disturb. The bug only manifests on coarse pointers, because
 * that is also where the browser fires `contextmenu` at the long-press mark.
 *
 * The `cancelPendingCreation` callback is the tool's own cleanup — it knows
 * whether it needs to `bailToMark` a shape it created early or simply transition
 * back to idle. Continuous-gesture tools (draw, highlight, eraser, laser) are
 * excluded: their press is their own action, so they handle (or ignore) the
 * long-press themselves.
 *
 * @internal
 */
export function cancelShapeCreationOnLongPress(
	editor: Editor,
	cancelPendingCreation: () => void
): void {
	if (!editor.getInstanceState().isCoarsePointer) return

	cancelPendingCreation()
}

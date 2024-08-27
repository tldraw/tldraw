import { Editor, TLContent, VecLike } from '@tldraw/editor'

/**
 * When the clipboard has tldraw content, paste it into the scene.
 *
 * @param editor - The editor instance.
 * @param clipboard - The clipboard model.
 * @param point - The point at which to paste the text.
 * @internal
 */
export function pasteTldrawContent(editor: Editor, clipboard: TLContent, point?: VecLike) {
	const selectionBoundsBefore = editor.getSelectionPageBounds()
	editor.markHistoryStoppingPoint('paste')
	editor.putContentOntoCurrentPage(clipboard, {
		point: point,
		select: true,
	})
	const selectedBoundsAfter = editor.getSelectionPageBounds()
	if (
		selectionBoundsBefore &&
		selectedBoundsAfter &&
		selectionBoundsBefore?.collides(selectedBoundsAfter)
	) {
		// Creates a 'puff' to show a paste has happened.
		editor.updateInstanceState({ isChangingStyle: true })
		editor.timers.setTimeout(() => {
			editor.updateInstanceState({ isChangingStyle: false })
		}, 150)
	}
}

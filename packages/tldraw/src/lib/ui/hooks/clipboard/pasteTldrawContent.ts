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
	const p = point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : undefined)

	editor.mark('paste')
	editor.putContentOntoCurrentPage(clipboard, {
		point: p,
		select: true,
	})
}

import { Editor, createAssetShapeAtPoint } from '@tldraw/editor'
import { VecLike } from '@tldraw/primitives'

/**
 * When the clipboard has svg text, create a text shape and insert it into the scene
 *
 * @param editor - The editor instance.
 * @param text - The text to paste.
 * @param point - (optional) The point at which to paste the text.
 * @internal
 */
export async function pasteSvgText(editor: Editor, text: string, point?: VecLike) {
	const p =
		point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

	editor.mark('paste')
	return await createAssetShapeAtPoint(editor, text, p)
}

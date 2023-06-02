import { Editor, createAssetShapeAtPoint } from '@tldraw/editor'
import { VecLike } from '@tldraw/primitives'

/**
 * When the clipboard has svg text, create a text shape and insert it into the scene
 *
 * @param app - The app instance.
 * @param text - The text to paste.
 * @param point - (optional) The point at which to paste the text.
 * @internal
 */
export async function pasteSvgText(app: Editor, text: string, point?: VecLike) {
	const p = point ?? (app.inputs.shiftKey ? app.inputs.currentPagePoint : app.viewportPageCenter)

	app.mark('paste')
	return await createAssetShapeAtPoint(app, text, p)
}

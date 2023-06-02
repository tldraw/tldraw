import { Editor, TLClipboardModel } from '@tldraw/editor'
import { VecLike } from '@tldraw/primitives'

/**
 * When the clipboard has tldraw content, paste it into the scene.
 *
 * @param app - The app instance.
 * @param clipboard - The clipboard model.
 * @param point - (optional) The point at which to paste the text.
 * @internal
 */
export function pasteTldrawContent(app: Editor, clipboard: TLClipboardModel, point?: VecLike) {
	const p = point ?? (app.inputs.shiftKey ? app.inputs.currentPagePoint : undefined)

	app.mark('paste')
	app.putContent(clipboard, {
		point: p,
		select: true,
	})
}

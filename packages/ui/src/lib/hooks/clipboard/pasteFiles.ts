import { Editor } from '@tldraw/editor'
import { VecLike } from '@tldraw/primitives'
import { UiCallbacksContextType } from '../useOnCreateShapesFromInteraction'

/**
 * When the clipboard has a file, create an image shape from the file and paste it into the scene
 *
 * @param editor - The editor instance.
 * @param urls - The file urls.
 * @param point - (optional) The point at which to paste the file.
 * @internal
 */
export async function pasteFiles(
	editor: Editor,
	callbacks: UiCallbacksContextType,
	urls: string[],
	point?: VecLike
) {
	const blobs = await Promise.all(urls.map(async (url) => await (await fetch(url)).blob()))

	const files = blobs.map(
		(blob) =>
			new File([blob], 'tldrawFile', {
				type: blob.type,
			})
	)

	editor.mark('paste')
	await callbacks.onCreateShapeFromInteraction(editor, {
		type: 'files',
		files,
		point:
			point ??
			(editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter),
		ignoreParent: false,
	})
	urls.forEach((url) => URL.revokeObjectURL(url))
}

import {
	Editor,
	createBookmarkShapeAtPoint,
	createEmbedShapeAtPoint,
	getEmbedInfo,
} from '@tldraw/editor'
import { VecLike } from '@tldraw/primitives'
import { pasteFiles } from './pasteFiles'

/**
 * When the clipboard has plain text that is a valid URL, create a bookmark shape and insert it into
 * the scene
 *
 * @param app - The app instance.
 * @param url - The URL to paste.
 * @param point - (optional) The point at which to paste the file.
 * @internal
 */
export async function pasteUrl(app: Editor, url: string, point?: VecLike) {
	const p = point ?? (app.inputs.shiftKey ? app.inputs.currentPagePoint : app.viewportPageCenter)

	// Lets see if its an image and we have CORs
	try {
		const resp = await fetch(url)
		if (resp.headers.get('content-type')?.match(/^image\//)) {
			app.mark('paste')
			pasteFiles(app, [url])
			return
		}
	} catch (err: any) {
		if (err.message !== 'Failed to fetch') {
			console.error(err)
		}
	}

	app.mark('paste')

	// try to paste as an embed first
	const embedInfo = getEmbedInfo(url)

	if (embedInfo) {
		return await createEmbedShapeAtPoint(app, embedInfo.url, p, embedInfo.definition)
	}

	// otherwise, try to paste as a bookmark
	return await createBookmarkShapeAtPoint(app, url, p)
}

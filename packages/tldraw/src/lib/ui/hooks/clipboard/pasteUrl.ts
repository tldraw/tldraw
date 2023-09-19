import { Editor, TLExternalContentSource, VecLike } from '@tldraw/editor'
import { pasteFiles } from './pasteFiles'

/**
 * When the clipboard has plain text that is a valid URL, create a bookmark shape and insert it into
 * the scene
 *
 * @param editor - The editor instance.
 * @param url - The URL to paste.
 * @param point - (optional) The point at which to paste the file.
 * @internal
 */
export async function pasteUrl(
	editor: Editor,
	url: string,
	point?: VecLike,
	sources?: TLExternalContentSource[]
) {
	// Lets see if its an image and we have CORs
	try {
		const resp = await fetch(url)
		if (resp.headers.get('content-type')?.match(/^image\//)) {
			editor.mark('paste')
			pasteFiles(editor, [url])
			return
		}
	} catch (err: any) {
		if (err.message !== 'Failed to fetch') {
			console.error(err)
		}
	}

	editor.mark('paste')

	return await editor.putExternalContent({
		type: 'url',
		point,
		url,
		sources,
	})
}

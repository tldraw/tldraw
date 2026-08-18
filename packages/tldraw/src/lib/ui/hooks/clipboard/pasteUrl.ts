import { Editor, TLExternalContentSource, VecLike } from '@tldraw/editor'
import { putPastedExternalContent } from './putPastedContent'

/**
 * When the clipboard has plain text that is a valid URL, create a bookmark shape and insert it into
 * the scene
 *
 * @internal
 */
export async function pasteUrl(
	editor: Editor,
	url: string,
	point?: VecLike,
	sources?: TLExternalContentSource[],
	clipboardPasteSource: 'native-event' | 'clipboard-read' = 'native-event'
) {
	editor.markHistoryStoppingPoint('paste')

	return await putPastedExternalContent(
		editor,
		{
			type: 'url',
			point,
			url,
			sources,
		},
		{ source: clipboardPasteSource, point }
	)
}

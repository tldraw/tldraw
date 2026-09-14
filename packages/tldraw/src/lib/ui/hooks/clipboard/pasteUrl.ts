import { Editor, TLExternalContentSource, TLShapeId, VecLike } from '@tldraw/editor'
import { getSelectedLinkShape } from '../../../utils/shapes/shapes'
import { putPastedExternalContent } from './putPastedContent'

function getLinkTargetShapeId(editor: Editor, url: string): TLShapeId | undefined {
	// `new URL()` tolerates line breaks, so a `text/uri-list` holding several urls would otherwise
	// be written to the shape verbatim.
	if (/\s/.test(url)) return undefined

	return getSelectedLinkShape(editor)?.id
}

/**
 * When the clipboard has plain text that is a valid URL, create a bookmark shape and insert it into
 * the scene — or, when a single shape that can hold a link is selected, set that shape's link
 * instead.
 *
 * @param editor - The editor instance.
 * @param url - The URL to paste.
 * @param point - The point at which to paste the file.
 * @internal
 */
export async function pasteUrl(
	editor: Editor,
	url: string,
	point?: VecLike,
	sources?: TLExternalContentSource[],
	clipboardPasteSource: 'native-event' | 'clipboard-read' = 'native-event'
) {
	// A `text/uri-list` terminates each url with a line break, and some apps leave one on a copied
	// plain text url too. `new URL()` accepts them, so they would otherwise reach the shape.
	const trimmedUrl = url.trim()

	editor.markHistoryStoppingPoint('paste')

	return await putPastedExternalContent(
		editor,
		{
			type: 'url',
			point,
			url: trimmedUrl,
			sources,
			shapeId: getLinkTargetShapeId(editor, trimmedUrl),
		},
		{ source: clipboardPasteSource, point }
	)
}

import { Editor, TLExternalContentSource, TLShapeId, VecLike } from '@tldraw/editor'
import { putPastedExternalContent } from './putPastedContent'

/**
 * The selected shape a pasted link should be attached to. Embeds are excluded because their `url`
 * is the embedded content's source rather than a link decorating the shape.
 */
function getLinkTargetShapeId(editor: Editor, url: string): TLShapeId | undefined {
	// `new URL()` tolerates line breaks, so a `text/uri-list` holding several urls would otherwise
	// be written to the shape verbatim.
	if (/\s/.test(url)) return undefined

	const shape = editor.getOnlySelectedShape()
	if (!shape || shape.type === 'embed') return undefined
	if (!('url' in shape.props) || typeof shape.props.url !== 'string') return undefined
	if (editor.isShapeOrAncestorLocked(shape)) return undefined

	return shape.id
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
	editor.markHistoryStoppingPoint('paste')

	return await putPastedExternalContent(
		editor,
		{
			type: 'url',
			point,
			url,
			sources,
			shapeId: getLinkTargetShapeId(editor, url),
		},
		{ source: clipboardPasteSource, point }
	)
}

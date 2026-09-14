import { Editor, T, TLExternalContentSource, TLShapeId, VecLike } from '@tldraw/editor'
import { putPastedExternalContent } from './putPastedContent'

/**
 * A link we can write onto a shape. Shape `url` props are validated with `T.linkUrl`, so writing
 * one we can't turn into a link would throw and crash the editor (#8097) — e.g. the `file://` url
 * of a copied file. `new URL()` also tolerates line breaks, so a `text/uri-list` holding several
 * urls would otherwise be written to the shape verbatim. Both fall through to the bookmark path,
 * which reports what it can't handle with a toast.
 */
function isAttachableLink(url: string) {
	return !/\s/.test(url) && T.linkUrl.isValid(url)
}

/**
 * The shape a link pasted at `point` should be attached to. Embeds are excluded because their
 * `url` is the embedded content's source rather than a link decorating the shape.
 */
function getLinkTargetShapeId(editor: Editor, point: VecLike): TLShapeId | undefined {
	const shape = editor.getShapeAtPoint(point, {
		hitInside: true,
		// A locked shape shouldn't pass the link through to whatever sits behind it: hit it here
		// and reject it below.
		hitLocked: true,
		margin: editor.getHitTestMargin(),
		renderingOnly: true,
	})

	if (!shape || shape.type === 'embed') return undefined
	if (!('url' in shape.props) || typeof shape.props.url !== 'string') return undefined
	if (editor.isShapeOrAncestorLocked(shape)) return undefined

	return shape.id
}

/**
 * When the clipboard has plain text that is a valid URL, create a bookmark shape and insert it into
 * the scene — or, when the paste is aimed at a shape that can hold a link, set that shape's link
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
	// A keyboard paste happens with the pointer wherever the user left it on the canvas, so the
	// shape under it is the one they aimed at. A menu paste happens with the pointer on the menu
	// item, so only the point the menu itself supplies (where the user right-clicked) counts.
	const targetPoint =
		point ?? (clipboardPasteSource === 'native-event' ? editor.inputs.getCurrentPagePoint() : null)

	const shapeId =
		targetPoint && isAttachableLink(url) ? getLinkTargetShapeId(editor, targetPoint) : undefined

	editor.markHistoryStoppingPoint('paste')

	return await putPastedExternalContent(
		editor,
		{
			type: 'url',
			point,
			url,
			sources,
			shapeId,
		},
		{ source: clipboardPasteSource, point }
	)
}

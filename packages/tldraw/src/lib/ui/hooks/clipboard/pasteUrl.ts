import { Editor, ExtractShapeByProps, TLExternalContentSource, VecLike } from '@tldraw/editor'
import { getShapeToHover } from '../../../tools/selection-logic/updateHoveredShapeId'
import { putPastedExternalContent, resolvePastedExternalContent } from './putPastedContent'

type ShapeWithUrl = ExtractShapeByProps<{ url: string }>

/**
 * The shape a pasted link should be attached to: the shape the user sees hovered, when it can hold
 * a link. Embeds are excluded because their `url` is the embedded content's source rather than a
 * link decorating the shape.
 */
function getLinkTargetShape(editor: Editor, point: VecLike): ShapeWithUrl | undefined {
	const hoveredShapeId = getShapeToHover(editor, point)
	if (!hoveredShapeId) return undefined

	const shape = editor.getShape(hoveredShapeId)
	if (!shape || shape.type === 'embed') return undefined
	if (!('url' in shape.props) || typeof shape.props.url !== 'string') return undefined
	if (editor.isShapeOrAncestorLocked(shape)) return undefined

	return shape as ShapeWithUrl
}

/**
 * When the clipboard has plain text that is a valid URL, create a bookmark shape and insert it into
 * the scene — or, when the pointer is over a shape that can hold a link, set that shape's link
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

	const content = await resolvePastedExternalContent(
		editor,
		{
			type: 'url',
			point,
			url,
			sources,
		},
		{ source: clipboardPasteSource, point }
	)
	if (!content) return

	if (content.type === 'url') {
		const target = getLinkTargetShape(editor, point ?? editor.inputs.getCurrentPagePoint())
		if (target) {
			editor.updateShapes([{ id: target.id, type: target.type, props: { url: content.url } }])
			return
		}
	}

	return await editor.putExternalContent(content)
}

/**
 * Paste several URLs at once. These always become bookmarks: a shape can only hold one link, so
 * there's no sensible way to attach a list of them to the shape under the pointer.
 *
 * @internal
 */
export function pasteUrls(
	editor: Editor,
	urls: string[],
	point?: VecLike,
	sources?: TLExternalContentSource[],
	clipboardPasteSource: 'native-event' | 'clipboard-read' = 'native-event'
) {
	editor.markHistoryStoppingPoint('paste')

	for (const url of urls) {
		putPastedExternalContent(
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
}

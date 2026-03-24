import { Editor, TLExternalContent, VecLike } from '@tldraw/editor'

/** @internal */
export interface PutPastedExternalContentMeta {
	source: 'native-event' | 'clipboard-read'
	point?: VecLike
}

/** @internal */
export async function putPastedExternalContent(
	editor: Editor,
	content: TLExternalContent<unknown>,
	meta: PutPastedExternalContentMeta
) {
	const point =
		meta.point ??
		('point' in content ? (content as { point?: VecLike | undefined }).point : undefined)

	if (editor.options.onBeforePasteFromClipboard) {
		const result = await editor.options.onBeforePasteFromClipboard({
			editor,
			content,
			source: meta.source,
			point,
		})
		if (result === false) return
		if (result != null) content = result
	}
	return editor.putExternalContent(content)
}

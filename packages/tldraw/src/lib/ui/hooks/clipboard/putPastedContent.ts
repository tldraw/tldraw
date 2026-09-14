import { Editor, TLExternalContent, VecLike } from '@tldraw/editor'

/** @internal */
export interface PutPastedExternalContentMeta {
	source: 'native-event' | 'clipboard-read'
	point?: VecLike
}

/**
 * Run pasted content through the `onBeforePasteFromClipboard` option. Returns the content to put
 * into the scene (which the option may have replaced), or `undefined` if the paste was cancelled.
 *
 * @internal
 */
export async function resolvePastedExternalContent(
	editor: Editor,
	content: TLExternalContent<unknown>,
	meta: PutPastedExternalContentMeta
): Promise<TLExternalContent<unknown> | undefined> {
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
		if (result === false) return undefined
		if (result != null) return result
	}

	return content
}

/** @internal */
export async function putPastedExternalContent(
	editor: Editor,
	content: TLExternalContent<unknown>,
	meta: PutPastedExternalContentMeta
) {
	const resolved = await resolvePastedExternalContent(editor, content, meta)
	if (!resolved) return
	return editor.putExternalContent(resolved)
}

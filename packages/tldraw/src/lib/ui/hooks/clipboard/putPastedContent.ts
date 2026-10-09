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
	const finalContent = await runBeforePasteFromClipboard(editor, content, meta)
	if (!finalContent) return
	return editor.putExternalContent(finalContent)
}

/**
 * Runs the `onBeforePasteFromClipboard` hook. Returns the content to paste, or null if the hook
 * cancelled the paste.
 *
 * @internal
 */
export async function runBeforePasteFromClipboard(
	editor: Editor,
	content: TLExternalContent<unknown>,
	meta: PutPastedExternalContentMeta
): Promise<TLExternalContent<unknown> | null> {
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
		if (result === false) return null
		if (result != null) return result
	}
	return content
}

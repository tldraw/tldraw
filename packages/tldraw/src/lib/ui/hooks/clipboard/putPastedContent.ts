import { Editor, TLExternalContent } from '@tldraw/editor'

/** @internal */
export async function putPastedExternalContent(
	editor: Editor,
	content: TLExternalContent<unknown>
) {
	if (editor.options.onBeforePasteFromClipboard) {
		const result = editor.options.onBeforePasteFromClipboard({ editor, content })
		if (result === false) return
		if (result != null) content = result
	}
	return editor.putExternalContent(content)
}

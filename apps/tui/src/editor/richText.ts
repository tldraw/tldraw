import { Editor, TLRichText, TLShape, renderPlaintextFromRichText, toRichText } from 'tldraw'

/**
 * Local copy of packages/tldraw/src/lib/utils/text/richText.ts:150-162, which is not exported. An
 * empty document is either an empty `content` array or a single paragraph with no/empty content.
 */
export function isEmptyRichText(richText: TLRichText): boolean {
	if (richText.content.length === 0) return true
	if (richText.content.length === 1) {
		const node = richText.content[0] as { content?: unknown[] }
		if (!node.content || node.content.length === 0) return true
	}
	return false
}

/** Plaintext with one line per paragraph ('' for empty rich text). */
export function richTextToPlaintext(editor: Editor, richText: TLRichText): string {
	return renderPlaintextFromRichText(editor, richText)
}

/** One paragraph per line; empty lines become empty paragraphs. */
export function plaintextToRichText(text: string): TLRichText {
	return toRichText(text)
}

/**
 * The editable text of a shape: `richText` for geo/text/note/arrow (and any custom shape with that
 * prop), the `name` for frames, null for shapes without text.
 */
export function getShapePlaintext(editor: Editor, shape: TLShape): string | null {
	const props = shape.props as { richText?: TLRichText; name?: string }
	if (props.richText) return richTextToPlaintext(editor, props.richText)
	if (shape.type === 'frame' && typeof props.name === 'string') return props.name
	return null
}

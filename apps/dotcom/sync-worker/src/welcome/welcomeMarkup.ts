// The codec between a welcome shape's tiptap richText and a flat lokalise message string. The only
// markup welcome copy uses is bold, represented in the catalog as `<strong>…</strong>` — the same
// convention as the rest of dotcom's rich-text messages — so a translator sees and preserves the
// bold runs without touching tiptap's node shape.
//
// Two directions:
//   - serialize (richText → message): used at extract time to derive the English a translator sees
//     straight from the baked snapshot, and at bake time to assert the manifest still matches the art.
//   - parse (message → inline nodes): used at bake time to turn a translated message back into the
//     text/bold nodes that replace a shape's paragraph content.

/** A tiptap inline text node, optionally bold. The only inline shape welcome copy uses. */
export interface WelcomeTextNode {
	type: 'text'
	text: string
	marks?: Array<{ type: 'bold' }>
}

/** A tiptap richText doc. Welcome copy shapes are single-paragraph; structure is otherwise opaque. */
export interface WelcomeRichText {
	type: 'doc'
	attrs?: Record<string, unknown>
	content: Array<{ type: string; attrs?: Record<string, unknown>; content?: WelcomeTextNode[] }>
}

function isBold(node: WelcomeTextNode): boolean {
	return !!node.marks?.some((m) => m.type === 'bold')
}

/**
 * Serialize a welcome richText doc to a message string, wrapping bold runs in `<strong>`. Paragraphs
 * join with a newline (welcome copy is single-paragraph in practice, but this stays faithful if that
 * ever changes). Inverse of {@link inlineContentFromMessage}.
 */
export function messageFromRichText(richText: WelcomeRichText): string {
	return richText.content
		.map((para) =>
			(para.content ?? [])
				.map((node) => (isBold(node) ? `<strong>${node.text}</strong>` : node.text))
				.join('')
		)
		.join('\n')
}

/**
 * Parse a message string into the inline text nodes for a single paragraph, turning `<strong>` runs
 * into bold-marked nodes. Empty runs (e.g. a message that opens with `<strong>`) are dropped so the
 * node list never carries empty text. Inverse of {@link messageFromRichText} for one paragraph.
 */
export function inlineContentFromMessage(message: string): WelcomeTextNode[] {
	return message
		.split(/<strong>(.*?)<\/strong>/g)
		.map((chunk, i): WelcomeTextNode => {
			const bold = i % 2 === 1
			return bold
				? { type: 'text', text: chunk, marks: [{ type: 'bold' }] }
				: { type: 'text', text: chunk }
		})
		.filter((node) => node.text.length > 0)
}

// The codec between a welcome shape's tiptap richText and a flat lokalise message string. Welcome
// copy uses two inline marks — bold and highlight — represented in the catalog as `<strong>…</strong>`
// and `<mark>…</mark>` (the `<strong>` chunk convention the rest of dotcom's messages use, plus the
// HTML tiptap itself emits for the Highlight extension). A translator sees and preserves the tags
// without touching tiptap's node shape. The two marks are independent and may overlap on the same
// run (the welcome doc's emphasis is bold + highlight together), so the tags can nest.
//
// Two directions:
//   - serialize (richText → message): used at extract time to derive the English a translator sees
//     straight from the baked snapshot, and at bake time to assert the manifest still matches the art.
//   - parse (message → inline nodes): used at bake time to turn a translated message back into the
//     text nodes (with their marks) that replace a shape's paragraph content.

/** A welcome inline mark. `highlight` renders the yellow marker; `bold` renders bold. */
export type WelcomeMarkType = 'bold' | 'highlight'

/** A tiptap inline text node, optionally bold and/or highlighted. */
export interface WelcomeTextNode {
	type: 'text'
	text: string
	marks?: Array<{ type: WelcomeMarkType }>
}

/** A tiptap richText doc. Welcome copy shapes are single-paragraph; structure is otherwise opaque. */
export interface WelcomeRichText {
	type: 'doc'
	attrs?: Record<string, unknown>
	content: Array<{ type: string; attrs?: Record<string, unknown>; content?: WelcomeTextNode[] }>
}

// Tag <-> mark. Highlight is the outer tag, matching tiptap's HTML (its Highlight extension has a
// higher render priority than bold), so a run with both serializes to `<mark><strong>…</strong></mark>`.
const TAG_BY_MARK: Record<WelcomeMarkType, string> = { highlight: 'mark', bold: 'strong' }
const MARK_BY_TAG: Record<string, WelcomeMarkType> = { mark: 'highlight', strong: 'bold' }

function hasMark(node: WelcomeTextNode, type: WelcomeMarkType): boolean {
	return !!node.marks?.some((m) => m.type === type)
}

/**
 * Serialize a welcome richText doc to a message string: each run's text wrapped in `<strong>` if
 * bold and `<mark>` if highlighted (highlight outermost). Paragraphs join with a newline (welcome
 * copy is single-paragraph in practice, but this stays faithful if that ever changes). Inverse of
 * {@link inlineContentFromMessage}.
 */
export function messageFromRichText(richText: WelcomeRichText): string {
	return richText.content
		.map((para) =>
			(para.content ?? [])
				.map((node) => {
					let text = node.text
					if (hasMark(node, 'bold')) text = `<${TAG_BY_MARK.bold}>${text}</${TAG_BY_MARK.bold}>`
					if (hasMark(node, 'highlight'))
						text = `<${TAG_BY_MARK.highlight}>${text}</${TAG_BY_MARK.highlight}>`
					return text
				})
				.join('')
		)
		.join('\n')
}

/**
 * Parse a message string into the inline text nodes for a single paragraph, turning `<strong>` and
 * `<mark>` runs (in any nesting) into nodes carrying the corresponding marks. A stack tracks the open
 * tags so overlapping marks resolve correctly. Empty runs are dropped so the node list never carries
 * empty text. Inverse of {@link messageFromRichText} for one paragraph.
 */
export function inlineContentFromMessage(message: string): WelcomeTextNode[] {
	const nodes: WelcomeTextNode[] = []
	const open: WelcomeMarkType[] = []
	const tagRe = /<(\/?)(strong|mark)>/g

	const pushText = (text: string) => {
		if (!text) return
		const types = [...new Set(open)]
		nodes.push(
			types.length
				? { type: 'text', text, marks: types.map((type) => ({ type })) }
				: { type: 'text', text }
		)
	}

	let last = 0
	let match: RegExpExecArray | null
	while ((match = tagRe.exec(message))) {
		pushText(message.slice(last, match.index))
		const [, closing, tag] = match
		const mark = MARK_BY_TAG[tag]
		if (closing) {
			const at = open.lastIndexOf(mark)
			if (at !== -1) open.splice(at, 1)
		} else {
			open.push(mark)
		}
		last = tagRe.lastIndex
	}
	pushText(message.slice(last))
	return nodes
}

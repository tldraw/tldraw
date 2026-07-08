import { TLRichText } from '@tldraw/tlschema'

/**
 * Flattens a rich text comment body to plaintext for display in the basic comments UI. Walks the
 * ProseMirror-style JSON collecting text nodes, separating paragraphs with newlines. Temporary:
 * comment bodies are stored as rich text end-to-end; a rich text UI is forthcoming.
 *
 * @public
 */
export function richTextToPlaintext(body: TLRichText): string {
	const parts: string[] = []
	const visit = (node: any) => {
		if (typeof node?.text === 'string') parts.push(node.text)
		if (Array.isArray(node?.content)) {
			for (const child of node.content) visit(child)
			if (node.type === 'paragraph') parts.push('\n')
		}
	}
	visit(body)
	return parts.join('').trimEnd()
}

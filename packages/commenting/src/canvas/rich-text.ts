import { TLRichText } from 'tldraw'

/**
 * Flatten a rich-text comment body to plaintext: walk the ProseMirror-style JSON collecting text
 * nodes, separating paragraphs with newlines. A convenience for consumers rendering bodies as
 * plain or markdown text; richer rendering can read the `TLRichText` directly.
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

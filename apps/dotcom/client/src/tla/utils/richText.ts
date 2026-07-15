import { TLRichText } from 'tldraw'

/**
 * Flattens a rich text comment body to plaintext for display in the basic comments UI. Walks the
 * ProseMirror-style JSON collecting text nodes, separating paragraphs with newlines. Temporary:
 * comment bodies are stored as rich text end-to-end; a rich text UI is forthcoming.
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

/**
 * Collects the member ids `@`-mentioned in a comment body. Mentions are TipTap `mention` nodes
 * embedded in the rich text JSON — `{ type: 'mention', attrs: { id, label } }` — where `attrs.id`
 * is the member id (the same id space as `app.userId`). Walks the body the same way
 * {@link richTextToPlaintext} does.
 */
export function getMentionedMemberIds(body: TLRichText): string[] {
	const ids: string[] = []
	const visit = (node: any) => {
		if (node?.type === 'mention' && typeof node?.attrs?.id === 'string') ids.push(node.attrs.id)
		if (Array.isArray(node?.content)) {
			for (const child of node.content) visit(child)
		}
	}
	visit(body)
	return ids
}

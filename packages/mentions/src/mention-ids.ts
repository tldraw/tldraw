/**
 * Collects the member ids `@`-mentioned in a rich-text body. Mentions are the `mention` nodes
 * {@link createMentionExtension} writes into the body JSON — `{ type: 'mention', attrs: { id, label } }`
 * — where `attrs.id` is the mentioned member's id. Duplicate mentions of the same member collapse to
 * one id. Any non-conforming input yields no mentions, so callers can pass bodies held as any JSON
 * type.
 * @internal
 */
export function extractMentionIds(body: unknown): string[] {
	const ids = new Set<string>()
	const visit = (node: unknown) => {
		if (typeof node !== 'object' || node === null) return
		const { type, attrs, content } = node as {
			type?: unknown
			attrs?: { id?: unknown }
			content?: unknown
		}
		if (type === 'mention' && typeof attrs?.id === 'string') ids.add(attrs.id)
		if (Array.isArray(content)) {
			for (const child of content) visit(child)
		}
	}
	visit(body)
	return [...ids]
}

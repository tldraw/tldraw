/**
 * Collects the member ids `@`-mentioned in a comment's rich-text body. Mentions are TipTap
 * `mention` nodes embedded in the body JSON — `{ type: 'mention', attrs: { id, label } }` — where
 * `attrs.id` is the mentioned member's user id. Duplicate mentions of the same member collapse to
 * one id.
 *
 * Used by the sync-worker, which extracts mention rows into the `comment_mention` table when
 * draining comment records to Postgres, so the notifications query can filter "comments that
 * mention me" server-side. The client uses the same function from `@tldraw/mentions`, which the
 * worker can't import: that package pulls in React and TipTap. The body is typed
 * `unknown` because callers hold it as different JSON types (TLRichText, ReadonlyJSONValue, raw
 * Postgres JSONB); any non-conforming input just yields no mentions.
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

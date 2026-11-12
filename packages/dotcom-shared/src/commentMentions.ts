/**
 * Collects the member ids `@`-mentioned in a comment's rich-text body. Mentions are TipTap
 * `mention` nodes embedded in the body JSON — `{ type: 'mention', attrs: { id, label } }` — where
 * `attrs.id` is the mentioned member's user id. Duplicate mentions of the same member collapse to
 * one id.
 *
 * Shared between the sync-worker (which extracts mention rows into the `comment_mention` table
 * when draining comment records to Postgres, so the notifications query can filter "comments that
 * mention me" server-side) and the client (which labels notification rows). The body is typed
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

/**
 * An MCP agent's id carries this prefix: `mcp-agent:<uuid>`, one per owner and agent name on a board
 * (see the sync-worker's `getOrCreateAgent`). It is not a user id; the comment's author is still the
 * agent's owner.
 */
export const MCP_AGENT_ID_PREFIX = 'mcp-agent:'

/** The comment `meta` key naming the agent that posted it through the MCP server's write_comment. */
export const MCP_AGENT_COMMENT_META_KEY = 'mcpAgent'

/** The agent a comment's `meta` names, or null for a comment no agent posted. */
export function getMcpAgentFromCommentMeta(meta: unknown): { id: string; name: string } | null {
	if (typeof meta !== 'object' || meta === null) return null
	const agent = (meta as Record<string, unknown>)[MCP_AGENT_COMMENT_META_KEY]
	if (typeof agent !== 'object' || agent === null) return null
	const { id, name } = agent as Record<string, unknown>
	if (typeof id !== 'string' || !id.startsWith(MCP_AGENT_ID_PREFIX)) return null
	if (typeof name !== 'string' || !name) return null
	return { id, name }
}

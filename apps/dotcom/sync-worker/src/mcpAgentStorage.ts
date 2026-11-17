import { MCP_AGENT_ID_PREFIX } from '@tldraw/dotcom-shared'

// The SQL behind the MCP agents that have commented on a board, in the board's durable object.

/** The subset of Cloudflare's `SqlStorage` these statements need. */
export interface McpAgentSql {
	exec(query: string, ...bindings: unknown[]): { toArray(): unknown[] }
}

export interface McpAgent {
	id: string
	ownerUserId: string
	name: string
}

/**
 * An agent is one per (owner, name): the same user's Claude commenting twice is one agent, and their
 * Claude and their Cursor are two. `nameKey` is the case-folded name, so "claude" and "Claude" don't
 * split into two agents with the same label.
 */
export function ensureMcpAgentTables(sql: McpAgentSql) {
	sql.exec(
		`CREATE TABLE IF NOT EXISTS mcp_agent (
			id TEXT PRIMARY KEY,
			ownerUserId TEXT NOT NULL,
			name TEXT NOT NULL,
			nameKey TEXT NOT NULL,
			createdAt INTEGER NOT NULL,
			UNIQUE (ownerUserId, nameKey)
		)`
	)
}

export function agentNameKey(name: string) {
	return name.trim().toLowerCase()
}

/** The owner's agent of this name, created on first use. */
export function getOrCreateAgent(
	sql: McpAgentSql,
	{ ownerUserId, name, now }: { ownerUserId: string; name: string; now: number }
): McpAgent {
	const nameKey = agentNameKey(name)
	const existing = sql
		.exec(
			'SELECT id, ownerUserId, name FROM mcp_agent WHERE ownerUserId = ? AND nameKey = ?',
			ownerUserId,
			nameKey
		)
		.toArray() as McpAgent[]
	if (existing[0]) return existing[0]
	const agent = { id: `${MCP_AGENT_ID_PREFIX}${crypto.randomUUID()}`, ownerUserId, name }
	sql.exec(
		'INSERT INTO mcp_agent (id, ownerUserId, name, nameKey, createdAt) VALUES (?, ?, ?, ?, ?)',
		agent.id,
		ownerUserId,
		name,
		nameKey,
		now
	)
	return agent
}

import { MCP_AGENT_ID_PREFIX, extractMentionIds } from '@tldraw/dotcom-shared'
import { commentBodyToPlainText } from './routes/tla/boardTools'

// The SQL behind MCP agents on a board: which agents have commented here, in which threads, and the
// @mentions of them that the MCP server hands back as events (see `pollAgentMentionEvents`). Kept
// apart from TLFileDurableObject, like mcpClusterIndexStorage.ts, so it runs against a real SQLite
// database in a test.

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
 * One @mention of an agent, as stored. The text is copied at mention time rather than read back from
 * the comment, because the event describes what was asked, and an edit afterwards is not a new ask.
 */
export interface McpAgentMentionEvent {
	seq: number
	agentId: string
	agentName: string
	threadId: string
	commentId: string
	pageId: string
	text: string
	createdAt: number
}

/** How many mention events a board keeps. Older ones fall off, and a cursor behind them is truncated. */
export const MCP_AGENT_EVENT_RETENTION = 500

/**
 * An agent is one per (owner, name): the same user's Claude commenting twice is one agent to mention,
 * and their Claude and their Cursor are two. `nameKey` is the case-folded name, so "claude" and
 * "Claude" don't split into two mention targets with the same label.
 *
 * `mcp_agent_event_floor` holds the highest seq pruned so far, which is what tells a poll that a
 * cursor fell behind retention; AUTOINCREMENT keeps seqs from being reused after a prune.
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
	sql.exec(
		`CREATE TABLE IF NOT EXISTS mcp_agent_thread (
			threadId TEXT NOT NULL,
			agentId TEXT NOT NULL,
			createdAt INTEGER NOT NULL,
			PRIMARY KEY (threadId, agentId)
		)`
	)
	sql.exec(
		`CREATE TABLE IF NOT EXISTS mcp_agent_event (
			seq INTEGER PRIMARY KEY AUTOINCREMENT,
			agentId TEXT NOT NULL,
			ownerUserId TEXT NOT NULL,
			threadId TEXT NOT NULL,
			commentId TEXT NOT NULL,
			pageId TEXT NOT NULL,
			text TEXT NOT NULL,
			createdAt INTEGER NOT NULL,
			UNIQUE (commentId, agentId)
		)`
	)
	sql.exec('CREATE TABLE IF NOT EXISTS mcp_agent_event_floor (id INTEGER PRIMARY KEY, seq INTEGER)')
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

export function registerAgentThread(
	sql: McpAgentSql,
	{ agentId, threadId, now }: { agentId: string; threadId: string; now: number }
) {
	sql.exec(
		'INSERT OR IGNORE INTO mcp_agent_thread (threadId, agentId, createdAt) VALUES (?, ?, ?)',
		threadId,
		agentId,
		now
	)
}

export function getAgentThreadIds(sql: McpAgentSql, agentId: string): string[] {
	const rows = sql
		.exec('SELECT threadId FROM mcp_agent_thread WHERE agentId = ? ORDER BY createdAt', agentId)
		.toArray() as { threadId: string }[]
	return rows.map((row) => row.threadId)
}

/** The fields of a committed comment record a mention is read from. */
export interface MentioningComment {
	id: string
	threadId: string
	pageId: string
	authorId: string
	body: unknown
	isDeleted: boolean
}

/** The agent ids a comment body mentions — cheap, and empty for a comment that mentions only people. */
export function getMentionedAgentIds(body: unknown): string[] {
	return extractMentionIds(body).filter((id) => id.startsWith(MCP_AGENT_ID_PREFIX))
}

/**
 * Records an event for each agent `comment` mentions that belongs to the comment's author, and
 * registers the thread as one that agent is in. Returns the events written.
 *
 * Only the owner's own mentions count for now: an agent acts with its owner's account, so a mention
 * from anyone else would be someone else prompting it. A mention of an agent the author doesn't own
 * is ignored rather than refused — the comment itself is fine, it just doesn't reach an agent.
 *
 * Once per (comment, agent): an edit that keeps the mention is not a second ask, and an edit that
 * adds one is a first.
 */
export function recordAgentMentions(
	sql: McpAgentSql,
	comment: MentioningComment,
	now: number
): McpAgentMentionEvent[] {
	if (comment.isDeleted) return []
	const mentioned = getMentionedAgentIds(comment.body)
	if (mentioned.length === 0) return []

	const placeholders = mentioned.map(() => '?').join(', ')
	const agents = sql
		.exec(
			`SELECT id, ownerUserId, name FROM mcp_agent WHERE ownerUserId = ? AND id IN (${placeholders})`,
			comment.authorId,
			...mentioned
		)
		.toArray() as McpAgent[]
	if (agents.length === 0) return []

	const text = commentBodyToPlainText(comment.body)
	const written: McpAgentMentionEvent[] = []
	for (const agent of agents) {
		const before = readSeq(sql, comment.id, agent.id)
		sql.exec(
			`INSERT OR IGNORE INTO mcp_agent_event
				(agentId, ownerUserId, threadId, commentId, pageId, text, createdAt)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
			agent.id,
			agent.ownerUserId,
			comment.threadId,
			comment.id,
			comment.pageId,
			text,
			now
		)
		registerAgentThread(sql, { agentId: agent.id, threadId: comment.threadId, now })
		if (before !== null) continue
		const seq = readSeq(sql, comment.id, agent.id)
		if (seq === null) continue
		written.push({
			seq,
			agentId: agent.id,
			agentName: agent.name,
			threadId: comment.threadId,
			commentId: comment.id,
			pageId: comment.pageId,
			text,
			createdAt: now,
		})
	}
	if (written.length > 0) pruneAgentEvents(sql)
	return written
}

function readSeq(sql: McpAgentSql, commentId: string, agentId: string): number | null {
	const rows = sql
		.exec('SELECT seq FROM mcp_agent_event WHERE commentId = ? AND agentId = ?', commentId, agentId)
		.toArray() as { seq: number }[]
	return rows[0] ? Number(rows[0].seq) : null
}

function pruneAgentEvents(sql: McpAgentSql) {
	const rows = sql
		.exec(
			'SELECT seq FROM mcp_agent_event ORDER BY seq DESC LIMIT 1 OFFSET ?',
			MCP_AGENT_EVENT_RETENTION
		)
		.toArray() as { seq: number }[]
	const cutoff = rows[0]?.seq
	if (cutoff === undefined) return
	sql.exec('DELETE FROM mcp_agent_event WHERE seq <= ?', cutoff)
	sql.exec(
		'INSERT INTO mcp_agent_event_floor (id, seq) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET seq = MAX(seq, excluded.seq)',
		cutoff
	)
}

function readFloor(sql: McpAgentSql): number {
	const rows = sql.exec('SELECT seq FROM mcp_agent_event_floor WHERE id = 1').toArray() as {
		seq: number
	}[]
	return rows[0] ? Number(rows[0].seq) : 0
}

function readHeadSeq(sql: McpAgentSql): number {
	const rows = sql
		.exec(`SELECT seq FROM sqlite_sequence WHERE name = 'mcp_agent_event'`)
		.toArray() as { seq: number }[]
	return rows[0] ? Number(rows[0].seq) : 0
}

export interface PollAgentMentionsInput {
	ownerUserId: string
	/** Only this agent's mentions, by case-folded name. Null for all of the owner's agents here. */
	agentNameKey: string | null
	/** The last seq the caller has seen, or null to start from now. */
	cursor: number | null
	maxEvents: number
	/** Skip mentions older than this, per the events extension's `maxAgeMs`. */
	maxAgeMs: number | null
	now: number
}

export interface PollAgentMentionsResult {
	events: McpAgentMentionEvent[]
	cursor: number
	truncated: boolean
	hasMore: boolean
}

/**
 * One poll of the owner's mention events after `cursor`, oldest first, in the shape the events
 * extension's `events/poll` result needs.
 *
 * The cursor is this board's event seq, shared by every owner here, so it moves past other people's
 * events too — which is what lets a quiet subscription's cursor keep up with retention. A cursor ahead
 * of the head means the board's storage was reset; the poll starts over from now, truncated.
 */
export function pollAgentMentionEvents(
	sql: McpAgentSql,
	input: PollAgentMentionsInput
): PollAgentMentionsResult {
	const head = readHeadSeq(sql)
	if (input.cursor === null) return { events: [], cursor: head, truncated: false, hasMore: false }
	if (input.cursor > head) return { events: [], cursor: head, truncated: true, hasMore: false }

	let from = input.cursor
	let truncated = false
	const floor = readFloor(sql)
	if (from < floor) {
		from = floor
		truncated = true
	}

	const filters = ['seq > ?', 'e.ownerUserId = ?']
	const bindings: unknown[] = [from, input.ownerUserId]
	if (input.agentNameKey !== null) {
		filters.push('a.nameKey = ?')
		bindings.push(input.agentNameKey)
	}
	if (input.maxAgeMs !== null) {
		const ageFloor = input.now - input.maxAgeMs
		const skipped = sql
			.exec(
				`SELECT COUNT(*) AS count FROM mcp_agent_event e JOIN mcp_agent a ON a.id = e.agentId
					WHERE ${filters.join(' AND ')} AND e.createdAt < ?`,
				...bindings,
				ageFloor
			)
			.toArray() as { count: number }[]
		if (Number(skipped[0]?.count ?? 0) > 0) truncated = true
		filters.push('e.createdAt >= ?')
		bindings.push(ageFloor)
	}

	// One past the cap says whether there is more without a second count.
	const rows = sql
		.exec(
			`SELECT e.seq, e.agentId, a.name AS agentName, e.threadId, e.commentId, e.pageId, e.text, e.createdAt
				FROM mcp_agent_event e JOIN mcp_agent a ON a.id = e.agentId
				WHERE ${filters.join(' AND ')}
				ORDER BY e.seq LIMIT ?`,
			...bindings,
			input.maxEvents + 1
		)
		.toArray() as McpAgentMentionEvent[]
	const hasMore = rows.length > input.maxEvents
	const events = rows.slice(0, input.maxEvents).map((row) => ({
		...row,
		seq: Number(row.seq),
		createdAt: Number(row.createdAt),
	}))
	// A partial batch resumes after its last event; a complete one jumps to the head, past every
	// other owner's events, so the next poll doesn't rescan them.
	const cursor = hasMore ? events[events.length - 1].seq : head
	return { events, cursor, truncated, hasMore }
}

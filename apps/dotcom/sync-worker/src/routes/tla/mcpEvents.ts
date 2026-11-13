import { agentNameKey, McpAgentMentionEvent } from '../../mcpAgentStorage'
import { getCallbackUrlProblem, parseWebhookSecret } from '../../mcpWebhooks'
import { sha256 } from '../../utils/hash'
import { AGENT_NAME_MAX_LENGTH } from './boardTools'

// The MCP Events extension (SEP-3415, draft): how an agent hears that its user @mentioned it in a
// board's comments. Poll and webhook delivery: both keep their state in the board's own Durable
// Object (see mcpAgentStorage.ts), where the cursor is the board's event seq. Webhook is the mode
// ChatGPT uses. Push would need a long-lived connection this stateless Worker doesn't hold.

export const EVENTS_EXTENSION_ID = 'io.modelcontextprotocol/events'

export const AGENT_MENTIONED_EVENT_NAME = 'comment.agent_mentioned'

// The extension's general-purpose codes. Provisional until the SEP is accepted.
export const EVENTS_NOT_FOUND = -32023
export const EVENTS_FORBIDDEN = -32024
export const EVENTS_UNSUPPORTED = -32026
export const EVENTS_CALLBACK_ENDPOINT_ERROR = -32027

/** How often a client should poll when nothing is waiting. */
export const AGENT_MENTION_POLL_MS = 15_000
export const AGENT_MENTION_MAX_EVENTS = 50

export function getEventDefinitions() {
	return [
		{
			name: AGENT_MENTIONED_EVENT_NAME,
			description:
				'Fires when your user @mentions you in a comment on a tldraw.com board, to ask you something. You can be mentioned on a board once you have commented on it with write_comment, by the agentName you used there. Reply with write_comment, passing the threadId from the event.',
			delivery: ['poll', 'webhook'],
			inputSchema: {
				type: 'object',
				additionalProperties: false,
				properties: {
					boardId: {
						type: 'string',
						description:
							'The board to listen on: a boardId from search_boards, or the :slug of a file URL (https://www.tldraw.com/f/:slug).',
					},
					agentName: {
						type: 'string',
						maxLength: AGENT_NAME_MAX_LENGTH,
						description:
							'Only mentions of the agent with this name, as you passed it to write_comment. Omit for mentions of any of your user’s agents on the board.',
					},
				},
				required: ['boardId'],
			},
			payloadSchema: {
				type: 'object',
				properties: {
					boardId: { type: 'string' },
					threadId: { type: 'string', description: 'Pass to write_comment to reply.' },
					commentId: { type: 'string' },
					pageId: { type: 'string' },
					agentName: { type: 'string', description: 'The agent that was mentioned.' },
					text: {
						type: 'string',
						description: 'The comment, as plain text, with mentions written as @name.',
					},
					url: { type: 'string', description: 'Opens the thread on tldraw.com.' },
				},
				required: ['boardId', 'threadId', 'commentId', 'pageId', 'agentName', 'text', 'url'],
			},
		},
	]
}

/** A JSON-RPC error the events methods answer with, raised from parsing. */
export class EventsRequestError extends Error {
	constructor(
		readonly code: number,
		message: string,
		readonly data?: Record<string, unknown>
	) {
		super(message)
	}
}

/** Webhook grants: an hour by default, never under five minutes or over a day. */
export const WEBHOOK_DEFAULT_TTL_MS = 60 * 60 * 1000
export const WEBHOOK_MIN_TTL_MS = 5 * 60 * 1000
export const WEBHOOK_MAX_TTL_MS = 24 * 60 * 60 * 1000

/**
 * The grant for a suggested `ttlMs`. A request for no expiry (null) gets the longest finite grant
 * instead: this server keeps its subscriptions TTL-scoped, which the extension allows by answering a
 * finite `refreshBefore`.
 */
export function grantWebhookTtlMs(suggested: number | null | undefined): number {
	if (suggested === undefined) return WEBHOOK_DEFAULT_TTL_MS
	if (suggested === null) return WEBHOOK_MAX_TTL_MS
	return Math.min(Math.max(suggested, WEBHOOK_MIN_TTL_MS), WEBHOOK_MAX_TTL_MS)
}

export interface AgentMentionPoll {
	boardId: string
	agentNameKey: string | null
	cursor: number | null
	maxEvents: number
	maxAgeMs: number | null
}

/** `events/poll` params, checked against the one event this server offers. */
export function parseAgentMentionPoll(params: unknown): AgentMentionPoll {
	const value = requireParams(params)
	return {
		...parseSubscriptionArguments(value),
		cursor: parseCursor(value.cursor),
		maxEvents: parseMaxEvents(value.maxEvents),
		maxAgeMs: parseMaxAgeMs(value.maxAgeMs),
	}
}

export interface AgentMentionSubscribe {
	boardId: string
	agentNameKey: string | null
	url: string
	/** The `whsec_` secret as given, which is what the board stores and signs with. */
	secret: string
	cursor: number | null
	ttlMs: number
}

/** `events/subscribe` params: the poll's arguments plus a webhook `delivery`. */
export function parseAgentMentionSubscribe(params: unknown): AgentMentionSubscribe {
	const value = requireParams(params)
	const args = parseSubscriptionArguments(value)
	const delivery = value.delivery
	if (typeof delivery !== 'object' || delivery === null) {
		throw invalid('delivery must be an object with mode, url and secret')
	}
	const { mode, url, secret } = delivery as Record<string, unknown>
	if (mode !== undefined && mode !== 'webhook') {
		throw new EventsRequestError(EVENTS_UNSUPPORTED, 'Unsupported delivery mode', {
			feature: 'deliveryMode',
			value: mode,
		})
	}
	const urlProblem = getCallbackUrlProblem(url)
	if (urlProblem) throw invalid(urlProblem)
	if (!parseWebhookSecret(secret)) {
		throw invalid('delivery.secret must be whsec_ followed by base64 of 24 to 64 random bytes')
	}
	const ttl = value.ttlMs
	if (ttl !== undefined && ttl !== null && (typeof ttl !== 'number' || !Number.isFinite(ttl))) {
		throw invalid('ttlMs must be a number of milliseconds, or null')
	}
	return {
		...args,
		url: url as string,
		secret: secret as string,
		cursor: parseCursor(value.cursor),
		ttlMs: grantWebhookTtlMs(ttl as number | null | undefined),
	}
}

/** `events/unsubscribe` params: the subscription's key, minus the principal the route supplies. */
export function parseAgentMentionUnsubscribe(params: unknown): {
	boardId: string
	agentNameKey: string | null
	url: string
} {
	const value = requireParams(params)
	const args = parseSubscriptionArguments(value)
	const url = (value.delivery as { url?: unknown } | undefined)?.url
	if (typeof url !== 'string') throw invalid('delivery.url is required')
	return { ...args, url }
}

/**
 * A subscription's id: deterministic over (principal, url, name, arguments), per the extension, so a
 * refresh lands on the same one. Arguments go in normalized, so `agentName: "claude"` and
 * `agentName: "Claude"` are one subscription, as they are one agent.
 */
export async function getSubscriptionId({
	userId,
	url,
	boardId,
	agentNameKey,
}: {
	userId: string
	url: string
	boardId: string
	agentNameKey: string | null
}) {
	const key = JSON.stringify([userId, url, AGENT_MENTIONED_EVENT_NAME, boardId, agentNameKey])
	return `sub_${(await sha256(key)).slice(0, 32)}`
}

function requireParams(params: unknown): Record<string, unknown> {
	if (typeof params !== 'object' || params === null) {
		throw invalid('params must be an object with name and arguments')
	}
	const value = params as Record<string, unknown>
	if (value.name !== AGENT_MENTIONED_EVENT_NAME) {
		throw new EventsRequestError(EVENTS_NOT_FOUND, `Unknown event: ${String(value.name)}`, {
			kind: 'event',
		})
	}
	return value
}

function parseSubscriptionArguments(value: Record<string, unknown>) {
	const args = value.arguments
	if (typeof args !== 'object' || args === null) {
		throw invalid('arguments must be an object with a boardId')
	}
	const { boardId, agentName } = args as Record<string, unknown>
	if (typeof boardId !== 'string' || !boardId.trim()) throw invalid('arguments.boardId is required')
	if (agentName !== undefined && agentName !== null && typeof agentName !== 'string') {
		throw invalid('arguments.agentName must be a string')
	}
	return {
		boardId: boardId.trim(),
		agentNameKey: agentName ? agentNameKey(agentName) || null : null,
	}
}

// Absent means null, per the extension: both "start from now".
function parseCursor(value: unknown): number | null {
	if (value === undefined || value === null) return null
	if (typeof value !== 'string' || !/^\d{1,15}$/.test(value)) {
		throw invalid('cursor must be a cursor from an earlier events/poll result, or null')
	}
	return Number(value)
}

function parseMaxEvents(value: unknown): number {
	if (value === undefined || value === null) return AGENT_MENTION_MAX_EVENTS
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
		throw invalid('maxEvents must be a positive integer')
	}
	return Math.min(value, AGENT_MENTION_MAX_EVENTS)
}

function parseMaxAgeMs(value: unknown): number | null {
	if (value === undefined || value === null) return null
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
		throw invalid('maxAgeMs must be a non-negative number of milliseconds')
	}
	return value
}

function invalid(message: string) {
	return new EventsRequestError(-32602, message)
}

/**
 * One mention as an `EventOccurrence`. The `eventId` is stable per (comment, agent), which is the
 * pair the board stores a mention once for, so a client deduplicating across polls sees one ask.
 */
export function toAgentMentionOccurrence(
	event: McpAgentMentionEvent,
	{ boardId, origin }: { boardId: string; origin: string }
) {
	return {
		eventId: `${event.commentId}/${event.agentId}`,
		name: AGENT_MENTIONED_EVENT_NAME,
		timestamp: new Date(event.createdAt).toISOString(),
		data: {
			boardId,
			threadId: event.threadId,
			commentId: event.commentId,
			pageId: event.pageId,
			agentName: event.agentName,
			text: event.text,
			url: `${origin}/f/${boardId}?comment=${encodeURIComponent(event.threadId)}`,
		},
	}
}

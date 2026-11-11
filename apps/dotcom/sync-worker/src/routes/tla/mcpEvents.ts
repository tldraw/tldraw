import { agentNameKey, McpAgentMentionEvent } from '../../mcpAgentStorage'
import { AGENT_NAME_MAX_LENGTH } from './boardTools'

// The MCP Events extension (SEP-3415, draft): how an agent hears that its user @mentioned it in a
// board's comments. Poll delivery only — this server is a stateless Worker, and a poll needs no
// subscription state beyond the cursor, which is a seq in the board's own Durable Object (see
// mcpAgentStorage.ts). Push needs a long-lived connection and webhook a subscription store, neither
// of which this server has.

export const EVENTS_EXTENSION_ID = 'io.modelcontextprotocol/events'

export const AGENT_MENTIONED_EVENT_NAME = 'comment.agent_mentioned'

// The extension's general-purpose codes. Provisional until the SEP is accepted.
export const EVENTS_NOT_FOUND = -32023
export const EVENTS_FORBIDDEN = -32024

/** How often a client should poll when nothing is waiting. */
export const AGENT_MENTION_POLL_MS = 15_000
export const AGENT_MENTION_MAX_EVENTS = 50

export function getEventDefinitions() {
	return [
		{
			name: AGENT_MENTIONED_EVENT_NAME,
			description:
				'Fires when your user @mentions you in a comment on a tldraw.com board, to ask you something. You can be mentioned on a board once you have commented on it with write_comment, by the agentName you used there. Reply with write_comment, passing the threadId from the event.',
			delivery: ['poll'],
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

export interface AgentMentionPoll {
	boardId: string
	agentNameKey: string | null
	cursor: number | null
	maxEvents: number
	maxAgeMs: number | null
}

/** `events/poll` params, checked against the one event this server offers. */
export function parseAgentMentionPoll(params: unknown): AgentMentionPoll {
	if (typeof params !== 'object' || params === null) {
		throw invalid('params must be an object with name, arguments and cursor')
	}
	const { name, arguments: args, cursor, maxEvents, maxAgeMs } = params as Record<string, unknown>
	if (name !== AGENT_MENTIONED_EVENT_NAME) {
		throw new EventsRequestError(EVENTS_NOT_FOUND, `Unknown event: ${String(name)}`, {
			kind: 'event',
		})
	}
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
		cursor: parseCursor(cursor),
		maxEvents: parseMaxEvents(maxEvents),
		maxAgeMs: parseMaxAgeMs(maxAgeMs),
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

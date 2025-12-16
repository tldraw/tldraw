import { RecordsDiff } from '@tldraw/store'
import { TLRecord } from '@tldraw/tlschema'
import { JsonValue } from '@tldraw/utils'
import { AgentAction } from './AgentAction'
import { AgentRequestSource } from './AgentRequest'
import { FairyMemoryLevel } from './FairyMemoryLevel'
import { Streaming } from './Streaming'

export type ChatHistoryItem =
	| ChatHistoryActionItem
	| ChatHistoryPromptItem
	| ChatHistoryContinuationItem
	| ChatHistoryMemoryTransitionItem

/**
 * A prompt from the user.
 */
export interface ChatHistoryPromptItem {
	id?: string
	type: 'prompt'
	promptSource: AgentRequestSource
	agentFacingMessage: string
	userFacingMessage: string | null
	memoryLevel: FairyMemoryLevel
}

/**
 * An action done by the agent.
 */
export interface ChatHistoryActionItem {
	id?: string
	type: 'action'
	action: Streaming<AgentAction>
	diff: RecordsDiff<TLRecord>
	acceptance: 'pending' | 'accepted' | 'rejected'
	memoryLevel: FairyMemoryLevel
	/**
	 * Timestamp (milliseconds since epoch) when the action completed.
	 * Only set when action.complete === true.
	 */
	timestamp?: number
}

/**
 * A follow-up request from the agent, with data retrieved from the previous request.
 */
export interface ChatHistoryContinuationItem {
	id?: string
	type: 'continuation'
	data: JsonValue[]
	memoryLevel: FairyMemoryLevel
}

export interface ChatHistoryMemoryTransitionItem {
	id?: string
	type: 'memory-transition'
	memoryLevel: FairyMemoryLevel
	agentFacingMessage: string
	userFacingMessage: string | null
}

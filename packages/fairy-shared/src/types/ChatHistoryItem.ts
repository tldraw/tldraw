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
	type: 'action'
	action: Streaming<AgentAction>
	diff: RecordsDiff<TLRecord>
	acceptance: 'pending' | 'accepted' | 'rejected'
	memoryLevel: FairyMemoryLevel
}

/**
 * A follow-up request from the agent, with data retrieved from the previous request.
 */
export interface ChatHistoryContinuationItem {
	type: 'continuation'
	data: JsonValue[]
	memoryLevel: FairyMemoryLevel
}

export interface ChatHistoryMemoryTransitionItem {
	type: 'memory-transition'
	memoryLevel: FairyMemoryLevel
	agentFacingMessage: string
	userFacingMessage: string | null
}

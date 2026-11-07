import { JsonValue, RecordsDiff, TLRecord } from 'tldraw'
import { FocusedShape } from '../format/FocusedShape'
import { AgentAction } from './AgentAction'
import { AgentRequestSource } from './AgentRequest'
import { ContextItem } from './ContextItem'
import { Streaming } from './Streaming'

export type ChatHistoryItem =
	| ChatHistoryActionItem
	| ChatHistoryPromptItem
	| ChatHistoryContinuationItem

/**
 * A prompt from a user, another agent, or the agent itself.
 */
export interface ChatHistoryPromptItem {
	type: 'prompt'
	promptSource: AgentRequestSource
	agentFacingMessage: string
	userFacingMessage: string | null
	contextItems: ContextItem[]
	selectedShapes: FocusedShape[]
}

/**
 * An action done by the agent.
 */
export interface ChatHistoryActionItem {
	type: 'action'
	action: Streaming<AgentAction>
	diff: RecordsDiff<TLRecord>
	acceptance: 'pending' | 'accepted' | 'rejected'
	/**
	 * What the action did, which the model reads as the result of its tool call.
	 * Only set when the action is complete.
	 */
	result?: string
}

/**
 * A follow-up request from the agent, with data retrieved from the previous request.
 */
export interface ChatHistoryContinuationItem {
	type: 'continuation'
	data: JsonValue[]
}

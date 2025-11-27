import { RecordsDiff } from '@tldraw/store'
import { TLRecord } from '@tldraw/tlschema'
import { JsonValue } from '@tldraw/utils'
import { AgentAction } from './AgentAction'
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
	id?: string // Optional for backward compatibility with old messages
	type: 'prompt'
	message: string
	memoryLevel: FairyMemoryLevel
}

/**
 * An action done by the agent.
 */
export interface ChatHistoryActionItem {
	id?: string // Optional for backward compatibility with old messages
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
	id?: string // Optional for backward compatibility with old messages
	type: 'continuation'
	data: JsonValue[]
	memoryLevel: FairyMemoryLevel
}

export interface ChatHistoryMemoryTransitionItem {
	id?: string // Optional for backward compatibility with old messages
	type: 'memory-transition'
	memoryLevel: FairyMemoryLevel
	message: string
	userFacingMessage: string | null
}

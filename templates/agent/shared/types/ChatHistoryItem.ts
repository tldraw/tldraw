import { SimpleShape } from '../format/SimpleShape'
import { AgentAction } from './AgentAction'
import { AgentActionResult } from './AgentActionResult'
import { ContextItem } from './ContextItem'
import { Streaming } from './Streaming'

export type ChatHistoryItem = ChatHistoryActionItem | ChatHistoryPromptItem

export interface ChatHistoryPromptItem {
	type: 'prompt'
	message: string
	contextItems: ContextItem[]
	selectedShapes: SimpleShape[]
}

export interface ChatHistoryActionItem {
	type: 'action'
	action: Streaming<AgentAction>
	result: AgentActionResult
	acceptance: 'pending' | 'accepted' | 'rejected'
}

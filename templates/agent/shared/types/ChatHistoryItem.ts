import { RecordsDiff, TLRecord } from 'tldraw'
import { SimpleShape } from '../format/SimpleShape'
import { AgentAction } from './AgentAction'
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
	diff: RecordsDiff<TLRecord>
	acceptance: 'pending' | 'accepted' | 'rejected'
}

import { RecordsDiff, TLRecord } from 'tldraw'
import { IAgentEvent } from '../../../worker/prompt/AgentEvent'
import { ContextItem } from '../../types/ContextItem'
import { Streaming } from '../../types/Streaming'
import { AgentIconType } from '../icons/AgentIcon'

export type AgentHistoryItem =
	| EventHistoryItem
	| ChangeHistoryItem
	| PromptHistoryItem
	| GroupHistoryItem

export type AgentHistoryItemStatus = 'progress' | 'done' | 'cancelled'

export interface EventHistoryItem {
	type: 'event'
	event: Streaming<IAgentEvent>
	status: AgentHistoryItemStatus
}

export interface ChangeHistoryItem {
	type: 'change'
	event: Streaming<IAgentEvent>
	diff: RecordsDiff<TLRecord>
	acceptance: 'pending' | 'accepted' | 'rejected'
	status: AgentHistoryItemStatus
}

export interface GroupHistoryItem {
	type: 'group'
	items: ChangeHistoryItem[]
	status: AgentHistoryItemStatus
}

export interface PromptHistoryItem {
	type: 'prompt'
	message: string
	contextItems: ContextItem[]
	status: AgentHistoryItemStatus
}

export interface EventHistoryItemDefinition {
	icon?: AgentIconType
	message?: { progress?: string; done?: string; cancelled?: string }
}

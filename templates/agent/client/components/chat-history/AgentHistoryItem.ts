import { RecordsDiff, TLRecord } from 'tldraw'
import { AgentEvent } from '../../../shared/types/AgentEvent'
import { ContextItem } from '../../../shared/types/ContextItem'
import { Streaming } from '../../../shared/types/Streaming'
import { AgentIconType } from '../icons/AgentIcon'

export type AgentHistoryItem =
	| EventHistoryItem
	| ChangeHistoryItem
	| PromptHistoryItem
	| GroupHistoryItem

export type AgentHistoryItemStatus = 'progress' | 'done' | 'cancelled'

export interface EventHistoryItem {
	type: 'event'
	event: Streaming<AgentEvent>
	status: AgentHistoryItemStatus
}

export interface ChangeHistoryItem {
	type: 'change'
	event: Streaming<AgentEvent>
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

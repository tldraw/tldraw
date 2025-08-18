import { RecordsDiff, TLRecord } from 'tldraw'
import { AgentEvent } from '../../../shared/types/AgentEvent'
import { ContextItem } from '../../../shared/types/ContextItem'
import { Streaming } from '../../../shared/types/Streaming'
import { AgentIconType } from '../icons/AgentIcon'

export type AgentHistoryItem = AgentEventHistoryItem | AgentPromptHistoryItem

export type AgentHistoryItemStatus = 'progress' | 'done' | 'cancelled'

export interface AgentPromptHistoryItem {
	type: 'prompt'
	message: string
	contextItems: ContextItem[]
	status: AgentHistoryItemStatus
}

export interface AgentEventHistoryItem {
	type: 'event'
	event: Streaming<AgentEvent>
	diff: RecordsDiff<TLRecord>
	acceptance: 'pending' | 'accepted' | 'rejected'
	status: AgentHistoryItemStatus
}

export interface AgentEventHistoryItemDefinition {
	icon?: AgentIconType
	message?: { progress?: string; done?: string; cancelled?: string }
}

import { RecordsDiff, TLRecord } from 'tldraw'
import { AgentIconType } from '../../client/components/icons/AgentIcon'
import { AgentAction } from './AgentAction'
import { ContextItem } from './ContextItem'
import { Streaming } from './Streaming'

export type AgentHistoryItem = AgentActionHistoryItem | AgentPromptHistoryItem

export type AgentHistoryItemStatus = 'progress' | 'done' | 'cancelled'

export interface AgentPromptHistoryItem {
	type: 'prompt'
	message: string
	contextItems: ContextItem[]
	status: AgentHistoryItemStatus
}

export interface AgentActionHistoryItem {
	type: 'action'
	action: Streaming<AgentAction>
	diff: RecordsDiff<TLRecord>
	acceptance: 'pending' | 'accepted' | 'rejected'
	status: AgentHistoryItemStatus
}

export interface AgentActionHistoryItemDefinition {
	icon?: AgentIconType
	message?: { progress?: string; done?: string; cancelled?: string }
}

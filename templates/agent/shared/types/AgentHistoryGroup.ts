import { AgentEventHistoryItem, AgentPromptHistoryItem } from './AgentHistoryItem'

export type AgentHistoryGroup = AgentPromptHistoryGroup | AgentEventHistoryGroup

export interface AgentPromptHistoryGroup {
	type: 'prompt'
	item: AgentPromptHistoryItem
}

export interface AgentEventHistoryGroup {
	type: 'event'
	items: AgentEventHistoryItem[]
	showDiff: boolean
}

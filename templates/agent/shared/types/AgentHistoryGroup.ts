import { AgentActionHistoryItem, AgentPromptHistoryItem } from './AgentHistoryItem'

export type AgentHistoryGroup = AgentPromptHistoryGroup | AgentActionHistoryGroup

export interface AgentPromptHistoryGroup {
	type: 'prompt'
	item: AgentPromptHistoryItem
}

export interface AgentActionHistoryGroup {
	type: 'action'
	items: AgentActionHistoryItem[]
	showDiff: boolean
}

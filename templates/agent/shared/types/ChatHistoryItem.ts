import { ISimpleShape } from '../format/SimpleShape'
import { AgentAction } from './AgentAction'
import { AgentActionResult } from './AgentActionResult'
import { IContextItem } from './ContextItem'
import { Streaming } from './Streaming'

export type IChatHistoryItem = IChatHistoryActionItem | IChatHistoryPromptItem

export interface IChatHistoryPromptItem {
	type: 'prompt'
	message: string
	contextItems: IContextItem[]
	selectedShapes: ISimpleShape[]
}

export interface IChatHistoryActionItem {
	type: 'action'
	action: Streaming<AgentAction>
	result: AgentActionResult
	acceptance: 'pending' | 'accepted' | 'rejected'
}

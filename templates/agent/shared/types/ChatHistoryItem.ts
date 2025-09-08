import { RecordsDiff, TLRecord } from 'tldraw'
import { ISimpleShape } from '../format/SimpleShape'
import { AgentAction } from './AgentAction'
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
	diff: RecordsDiff<TLRecord>
	acceptance: 'pending' | 'accepted' | 'rejected'
}

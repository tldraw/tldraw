import { RecordsDiff, TLRecord } from 'tldraw'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { AgentIconType } from '../components/chat-history/AgentIcon'
import { ContextItem } from './ContextItem'
import { Streaming } from './Streaming'

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

export const EVENT_HISTORY_ITEM_DEFINITIONS: Record<
	IAgentEvent['_type'],
	EventHistoryItemDefinition
> = {
	message: {},

	align: { icon: 'cursor' },
	create: { icon: 'pencil' },
	delete: { icon: 'trash' },
	distribute: { icon: 'cursor' },
	label: { icon: 'pencil' },
	move: { icon: 'cursor' },
	place: { icon: 'target' },
	stack: { icon: 'cursor' },
	update: { icon: 'cursor' },

	think: {
		icon: 'brain',
		message: {
			progress: 'Thinking: ',
			done: 'Thought: ',
			cancelled: 'Thought cancelled. ',
		},
	},

	review: {
		icon: 'search',
		message: {
			progress: 'Reviewing: ',
			done: 'Reviewed: ',
			cancelled: 'Review cancelled. ',
		},
	},

	setMyView: {
		icon: 'eye',
		message: {
			progress: 'Setting my view: ',
			done: 'Set my view: ',
			cancelled: 'Setting my view cancelled. ',
		},
	},
}

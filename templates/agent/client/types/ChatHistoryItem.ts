import { RecordsDiff, TLRecord } from 'tldraw'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { AgentIconType } from '../components/chat-history/AgentIcon'
import { ContextItem } from './ContextItem'
import { Streaming } from './Streaming'

export type ChatHistoryItem =
	| UserMessageHistoryItem
	| AgentChangeHistoryItem
	| AgentChangeGroupHistoryItem
	| AgentMessageHistoryItem
	| AgentActionHistoryItem
	| AgentRawHistoryItem
	| StatusThinkingHistoryItem

export interface UserMessageHistoryItem {
	type: 'user-message'
	message: string
	status: 'done'
	contextItems: ContextItem[]
}

export interface StatusThinkingHistoryItem {
	type: 'status-thinking'
	message: string
	status: 'progress' | 'done' | 'cancelled'
}

export interface AgentMessageHistoryItem {
	type: 'agent-message'
	message: string
	status: 'progress' | 'done' | 'cancelled'
}

export interface AgentChangeHistoryItem {
	type: 'agent-change'
	diff: RecordsDiff<TLRecord>
	event: Streaming<IAgentEvent>
	status: 'progress' | 'done' | 'cancelled'
	acceptance: 'accepted' | 'rejected' | 'pending'
}

export interface AgentChangeGroupHistoryItem {
	type: 'agent-change-group'
	items: AgentChangeHistoryItem[]
	status: 'progress' | 'done' | 'cancelled'
}

export interface AgentRawHistoryItem {
	type: 'agent-raw'
	event: Streaming<IAgentEvent>
	status: 'progress' | 'done' | 'cancelled'
}

export interface AgentActionHistoryItem {
	type: 'agent-action'
	action: 'thinking' | 'creating' | 'deleting' | 'updating' | 'review' | 'setMyView'
	status: 'progress' | 'done' | 'cancelled'
	info: string
}

export interface AgentActionDefinition {
	icon: AgentIconType
	message: { progress: string; done: string; cancelled: string }
}

export interface AgentChangeDefinition {
	icon: React.ReactNode
}

export const ACTION_HISTORY_ITEM_DEFINITIONS: Record<
	AgentActionHistoryItem['action'],
	AgentActionDefinition
> = {
	thinking: {
		icon: 'brain',
		message: {
			progress: 'Thinking: ',
			done: 'Thought: ',
			cancelled: 'Thought cancelled. ',
		},
	},
	creating: {
		icon: 'pencil',
		message: {
			progress: 'Creating: ',
			done: 'Created: ',
			cancelled: 'Creation cancelled. ',
		},
	},
	deleting: {
		icon: 'trash',
		message: {
			progress: 'Deleting: ',
			done: 'Deleted: ',
			cancelled: 'Deletion cancelled. ',
		},
	},
	updating: {
		icon: 'refresh',
		message: {
			progress: 'Updating: ',
			done: 'Updated: ',
			cancelled: 'Update cancelled. ',
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

export const AGENT_EVENT_ICONS: Partial<Record<IAgentEvent['_type'], AgentIconType>> = {
	distribute: 'cursor',
	stack: 'cursor',
	align: 'cursor',
	place: 'target',
	label: 'pencil',
	move: 'cursor',
	delete: 'trash',
	create: 'pencil',
	update: 'cursor',
}

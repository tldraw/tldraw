import { RecordsDiff, TLRecord } from 'tldraw'
import { BrainIcon } from '../icons/BrainIcon'
import { CursorIcon } from '../icons/CursorIcon'
import { EyeIcon } from '../icons/EyeIcon'
import { PencilIcon } from '../icons/PencilIcon'
import { RefreshIcon } from '../icons/RefreshIcon'
import { SearchIcon } from '../icons/SearchIcon'
import { TargetIcon } from '../icons/TargetIcon'
import { TrashIcon } from '../icons/TrashIcon'
import { ContextItem } from './ContextItem'
import { Streaming, TLAgentChange } from './TLAgentChange'

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
	change: TLAgentChange
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
	change: Streaming<TLAgentChange>
	status: 'progress' | 'done' | 'cancelled'
}

export interface AgentActionHistoryItem {
	type: 'agent-action'
	action: 'thinking' | 'creating' | 'deleting' | 'updating' | 'review' | 'setMyView'
	status: 'progress' | 'done' | 'cancelled'
	info: string
}

export interface AgentActionDefinition {
	icon: React.ReactNode
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
		icon: <BrainIcon />,
		message: {
			progress: 'Thinking: ',
			done: 'Thought: ',
			cancelled: 'Thought cancelled. ',
		},
	},
	creating: {
		icon: <PencilIcon />,
		message: {
			progress: 'Creating: ',
			done: 'Created: ',
			cancelled: 'Creation cancelled. ',
		},
	},
	deleting: {
		icon: <TrashIcon />,
		message: {
			progress: 'Deleting: ',
			done: 'Deleted: ',
			cancelled: 'Deletion cancelled. ',
		},
	},
	updating: {
		icon: <RefreshIcon />,
		message: {
			progress: 'Updating: ',
			done: 'Updated: ',
			cancelled: 'Update cancelled. ',
		},
	},
	review: {
		icon: <SearchIcon />,
		message: {
			progress: 'Reviewing: ',
			done: 'Reviewed: ',
			cancelled: 'Review cancelled. ',
		},
	},
	setMyView: {
		icon: <EyeIcon />,
		message: {
			progress: 'Setting my view: ',
			done: 'Set my view: ',
			cancelled: 'Setting my view cancelled. ',
		},
	},
}

export const AGENT_CHANGE_TYPE_DEFINITIONS: Partial<
	Record<TLAgentChange['type'], AgentChangeDefinition>
> = {
	distribute: {
		icon: <CursorIcon />,
	},
	stack: {
		icon: <CursorIcon />,
	},
	align: {
		icon: <CursorIcon />,
	},
	place: {
		icon: <TargetIcon />,
	},
	createShape: {
		icon: <PencilIcon />,
	},
	updateShape: {
		icon: <CursorIcon />,
	},
	deleteShape: {
		icon: <TrashIcon />,
	},
	createBinding: {
		icon: <PencilIcon />,
	},
	updateBinding: {
		icon: <CursorIcon />,
	},
	deleteBinding: {
		icon: <TrashIcon />,
	},
}

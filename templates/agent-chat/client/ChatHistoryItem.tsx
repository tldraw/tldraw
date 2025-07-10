export type ChatHistoryItem =
	| UserMessageHistoryItem
	// | AgentChangeHistoryItem //TODO
	| AgentMessageHistoryItem
	| AgentActionHistoryItem

export interface UserMessageHistoryItem {
	type: 'user-message'
	message: string
}

export interface AgentMessageHistoryItem {
	type: 'agent-message'
	message: string
}

// export interface AgentChangeHistoryItem {
// 	type: 'agent-change'
// 	change: string
// }

export function UserMessageHistoryItem({ item }: { item: UserMessageHistoryItem }) {
	return <div className="user-chat-message">{item.message}</div>
}

export function AgentMessageHistoryItem({ item }: { item: AgentMessageHistoryItem }) {
	return <div className="agent-chat-message">{item.message}</div>
}

// TODO
// export function AgentChangeHistoryItem({ item }: { item: AgentChangeHistoryItem }) {
// 	return <div className="agent-change-message">{item.change}</div>
// }

export function AgentActionHistoryItem({ item }: { item: AgentActionHistoryItem }) {
	const actionDefinition = ACTION_HISTORY_ITEM_DEFINITIONS[item.action]
	const icon = actionDefinition.icon
	const message = actionDefinition.message[item.status]

	return (
		<div className="agent-action-message">
			<span>{icon}</span>
			<span>
				<strong>{message}</strong>
				{item.info ?? ''}
			</span>
		</div>
	)
}

export interface AgentActionDefinition {
	icon: string
	message: { progress: string; done: string; cancelled: string }
}

export interface AgentActionHistoryItem {
	type: 'agent-action'
	action: 'thinking' | 'creating' | 'deleting' | 'updating' | 'planning'
	status: 'progress' | 'done' | 'cancelled'
	info: string
}

export const ACTION_HISTORY_ITEM_DEFINITIONS: Record<
	AgentActionHistoryItem['action'],
	AgentActionDefinition
> = {
	thinking: {
		icon: '🧠',
		message: {
			progress: 'Thinking: ',
			done: 'Thought: ',
			cancelled: 'Thought: ',
		},
	},
	planning: {
		icon: '🎯',
		message: {
			progress: 'Planning: ',
			done: 'Plan: ',
			cancelled: 'Planning cancelled: ',
		},
	},
	creating: {
		icon: '✏️',
		message: {
			progress: 'Creating: ',
			done: 'Created: ',
			cancelled: 'Creation cancelled: ',
		},
	},
	deleting: {
		icon: '🗑️',
		message: {
			progress: 'Deleting: ',
			done: 'Deleted: ',
			cancelled: 'Deletion cancelled: ',
		},
	},
	updating: {
		icon: '🔄',
		message: {
			progress: 'Updating: ',
			done: 'Updated: ',
			cancelled: 'Update cancelled: ',
		},
	},
}

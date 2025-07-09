export type ChatHistoryItem =
	| UserMessageHistoryItem
	| AgentMessageHistoryItem
	| AgentChangeHistoryItem
	| AgentActionHistoryItem

export interface UserMessageHistoryItem {
	type: 'user-message'
	message: string
}

export interface AgentMessageHistoryItem {
	type: 'agent-message'
	message: string
}

export interface AgentActionHistoryItem {
	type: 'agent-action'
	action: 'editing'
	status: 'progress' | 'done' | 'cancelled'
}

export interface AgentChangeHistoryItem {
	type: 'agent-change'
	change: string
}

export function UserMessageHistoryItem({ item }: { item: UserMessageHistoryItem }) {
	return <div className="user-chat-message">{item.message}</div>
}

export function AgentMessageHistoryItem({ item }: { item: AgentMessageHistoryItem }) {
	return <div className="agent-chat-message">{item.message}</div>
}

export function AgentChangeHistoryItem({ item }: { item: AgentChangeHistoryItem }) {
	return <div className="agent-change-message">{item.change}</div>
}

export function AgentActionHistoryItem({ item }: { item: AgentActionHistoryItem }) {
	const actionDefinition = ACTION_HISTORY_ITEM_DEFINITIONS[item.action]

	const icon = actionDefinition.icon

	const message = actionDefinition.message[item.status]

	return (
		<div className="agent-action-message">
			<span>{icon}</span>
			<span>{message}</span>
		</div>
	)
}

export interface AgentActionDefinition {
	icon: string
	message: { progress: string; done: string; cancelled: string }
}

export const ACTION_HISTORY_ITEM_DEFINITIONS: Record<
	AgentActionHistoryItem['action'],
	AgentActionDefinition
> = {
	editing: {
		icon: '✏️',
		message: {
			progress: 'Editing the board...',
			done: 'Edited the board.',
			cancelled: 'Edits cancelled.',
		},
	},
}

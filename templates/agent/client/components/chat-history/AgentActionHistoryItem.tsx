import {
	ACTION_HISTORY_ITEM_DEFINITIONS,
	AgentActionHistoryItem,
} from '../../types/ChatHistoryItem'

export function AgentActionHistoryItem({ item }: { item: AgentActionHistoryItem }) {
	const actionDefinition = ACTION_HISTORY_ITEM_DEFINITIONS[item.action]
	const icon = actionDefinition.icon
	const message = actionDefinition.message[item.status]

	return (
		<div className="agent-action-message">
			<span>{icon}</span>
			<span>
				<strong>{message}</strong>
				<span>{item.info ?? ''}</span>
			</span>
		</div>
	)
}

import { AgentMessageHistoryItem } from '../../types/ChatHistoryItem'

export function AgentMessageHistoryItem({ item }: { item: AgentMessageHistoryItem }) {
	return <div className="agent-chat-message">{item.message}</div>
}

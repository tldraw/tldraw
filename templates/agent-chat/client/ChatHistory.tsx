import { AgentActionHistoryItem, ChatHistoryItem, UserMessageHistoryItem } from './ChatHistoryItem'

export function ChatHistory({ items }: { items: ChatHistoryItem[] }) {
	return (
		<div className="chat-history">
			{items.map((item, index) => {
				switch (item.type) {
					case 'user-message':
						return <UserMessageHistoryItem key={index} item={item} />
					// case 'agent-message':
					// 	return <AgentMessageHistoryItem key={index} item={item} />
					// case 'agent-change':
					// 	return <AgentChangeHistoryItem key={index} item={item} />
					case 'agent-action':
						return <AgentActionHistoryItem key={index} item={item} />
				}
			})}
		</div>
	)
}

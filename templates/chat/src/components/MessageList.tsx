import { type UIMessage } from '@ai-sdk/react'
import { ChatMessage } from './ChatMessage'

interface MessageListProps {
	messages: UIMessage[]
}

export function MessageList({ messages }: MessageListProps) {
	return (
		<div className="message-list">
			{messages.map((message) => (
				<ChatMessage key={message.id} message={message} />
			))}
		</div>
	)
}

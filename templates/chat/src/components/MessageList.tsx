import { type UIMessage } from '@ai-sdk/react'
import { memo } from 'react'
import { ChatMessage, ImageClickTarget } from './ChatMessage'

interface MessageListProps {
	messages: UIMessage[]
	onImageClick: (target: ImageClickTarget) => void
}

export const MessageList = memo(function MessageList({ messages, onImageClick }: MessageListProps) {
	return (
		<div className="message-list">
			{messages.map((message) => (
				<ChatMessage key={message.id} message={message} onImageClick={onImageClick} />
			))}
		</div>
	)
})

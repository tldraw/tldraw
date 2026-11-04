import { memo } from 'react'
import type { ChatMessage as ChatMessageData } from '@/types'
import { ChatMessage, ImageClickTarget } from './ChatMessage'

interface MessageListProps {
	messages: ChatMessageData[]
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

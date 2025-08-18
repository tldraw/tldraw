import { type UIMessage } from '@ai-sdk/react'
import { useEffect, useRef } from 'react'
import { ChatMessage } from './ChatMessage'

interface MessageListProps {
	messages: UIMessage[]
}

export function MessageList({ messages }: MessageListProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null)

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	useEffect(() => {
		scrollToBottom()
	}, [messages])

	return (
		<div className="message-list">
			{messages.map((message) => (
				<ChatMessage key={message.id} message={message} />
			))}
			<div ref={messagesEndRef} />
		</div>
	)
}

'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'

export function Chat() {
	const { messages, sendMessage, status } = useChat({
		transport: new DefaultChatTransport({
			api: '/api/chat',
		}),
	})

	const handleSendMessage = (text: string) => {
		sendMessage({ text })
	}

	const hasMessages = messages.length > 0

	if (!hasMessages) {
		return (
			<div className="empty-chat-container">
				<div className="empty-chat-content">
					<h1 className="empty-chat-title">How can I help?</h1>
					<div className="centered-input">
						<ChatInput
							onSendMessage={handleSendMessage}
							disabled={status !== 'ready'}
							autoFocus={true}
						/>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="chat-container">
			<MessageList messages={messages} />
			<div className="chat-footer">
				<ChatInput
					onSendMessage={handleSendMessage}
					disabled={status !== 'ready'}
					autoFocus={true}
				/>
			</div>
		</div>
	)
}

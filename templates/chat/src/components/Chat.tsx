'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, FileUIPart, TextUIPart } from 'ai'
import { useEffect } from 'react'
import { useScrollToBottom } from '../hooks/useScrollToBottom'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'
import { WhiteboardImage } from './WhiteboardModal'

export function Chat() {
	const { messages, sendMessage, status } = useChat({
		transport: new DefaultChatTransport({
			api: '/api/chat',
		}),
	})

	const handleSendMessage = (text: string, images: WhiteboardImage[]) => {
		const parts: (TextUIPart | FileUIPart)[] = images.map(
			(image): FileUIPart => ({ type: 'file', url: image.url, mediaType: image.type })
		)
		if (text.trim()) {
			parts.push({ type: 'text', text })
		}
		sendMessage({
			parts,
		})
	}

	const scrollToBottom = useScrollToBottom()

	useEffect(() => {
		scrollToBottom()
	}, [messages, scrollToBottom])

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
							scrollToBottom={scrollToBottom}
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
					scrollToBottom={scrollToBottom}
				/>
			</div>
		</div>
	)
}

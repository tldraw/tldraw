'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, FileUIPart, TextUIPart, UIMessage } from 'ai'
import { useCallback, useEffect } from 'react'
import { useChatMessageStorage } from '@/hooks/useChatMessageStorage'
import { uploadMessageContents } from '@/utils/uploadMessageContents'
import { useChatInputState } from '../hooks/useChatInputState'
import { useScrollToBottom } from '../hooks/useScrollToBottom'
import { ChatInput } from './ChatInput'
import { ImageClickTarget } from './ChatMessage'
import { ClearChatIcon } from './ClearChatIcon'
import { MessageList } from './MessageList'
import { TldrawProviderMetadata, WhiteboardImage } from './WhiteboardModal'

export function Chat() {
	const [initialMessages, saveMessages] = useChatMessageStorage()

	if (!initialMessages) return null

	return <ChatInner initialMessages={initialMessages} saveMessages={saveMessages} />
}

function ChatInner({
	initialMessages,
	saveMessages,
}: {
	initialMessages: UIMessage[]
	saveMessages: (messages: UIMessage[]) => void
}) {
	const [chatInputState, chatInputDispatch] = useChatInputState()

	// The Vercel AI SDK's useChat hook sends messages to the server and manages the chat history.
	// You could replace this with your own chat implementation.
	const chat = useChat({
		transport: new DefaultChatTransport({
			api: '/api/chat',
			prepareSendMessagesRequest: async (options) => {
				const { messagesToSend, messagesToSave } = await uploadMessageContents(options.messages)
				chat.setMessages(messagesToSave)
				return {
					body: {
						...options.body,
						id: options.id,
						messages: messagesToSend,
						trigger: options.trigger,
						messageId: options.messageId,
					},
				}
			},
		}),
		messages: initialMessages,
	})

	const { sendMessage, status, error, clearError, setMessages } = chat

	useEffect(() => {
		if (chat.status === 'ready') {
			saveMessages(chat.messages)
		}
	}, [chat.status, chat.messages, saveMessages])

	useEffect(() => {
		if (error) {
			alert(error.message)
			clearError()
		}
	}, [error, clearError])

	const handleSendMessage = useCallback(
		(text: string, images: WhiteboardImage[]) => {
			chatInputDispatch({ type: 'clear' })

			const parts: (TextUIPart | FileUIPart)[] = images.map((image): FileUIPart => {
				const tldrawMetadata: TldrawProviderMetadata = {
					snapshot: image.snapshot,
					imageName: image.name,
				}
				return {
					type: 'file',
					url: image.url,
					filename: image.name,
					mediaType: image.type,
					providerMetadata: { tldraw: tldrawMetadata } as any,
				}
			})

			if (text.trim()) {
				parts.push({ type: 'text', text })
			}

			sendMessage({ parts })
		},
		[sendMessage, chatInputDispatch]
	)

	const scrollToBottom = useScrollToBottom()
	useEffect(() => {
		scrollToBottom()
	}, [chat.messages, scrollToBottom])

	// Clicking an image in the chat history opens it in the whiteboard modal, where the user can
	// annotate it and re-add it to the chat.
	const handleImageClick = useCallback(
		(opts: ImageClickTarget) => chatInputDispatch({ type: 'openWhiteboard', ...opts }),
		[chatInputDispatch]
	)

	const handleClearChat = useCallback(() => {
		setMessages([])
		saveMessages([])
	}, [setMessages, saveMessages])

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		if (
			e.dataTransfer.types.includes('Files') &&
			!chatInputState.openWhiteboard &&
			!chatInputState.isDragging
		) {
			chatInputDispatch({ type: 'dragEnter' })
		}
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			chatInputDispatch({ type: 'dragLeave' })
		}
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		const file = e.dataTransfer.files[0]
		if (file && file.type.startsWith('image/') && !chatInputState.openWhiteboard) {
			chatInputDispatch({ type: 'drop', file })
		} else {
			chatInputDispatch({ type: 'dragLeave' })
		}
	}

	// An empty chat puts the input right in the middle of the page.
	if (chat.messages.length === 0) {
		return (
			<div
				className="empty-chat-container"
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<div className="empty-chat-content">
					<h1 className="empty-chat-title">How can I help?</h1>
					<div className="centered-input">
						<ChatInput
							onSendMessage={handleSendMessage}
							waitingForResponse={status !== 'ready'}
							scrollToBottom={scrollToBottom}
							state={chatInputState}
							dispatch={chatInputDispatch}
						/>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div
			className="chat-container"
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<div className="chat-header">
				<button className="icon-button" onClick={handleClearChat} title="Clear chat">
					<ClearChatIcon />
				</button>
			</div>
			<MessageList messages={chat.messages} onImageClick={handleImageClick} />
			<div className="chat-footer">
				<ChatInput
					onSendMessage={handleSendMessage}
					waitingForResponse={status !== 'ready'}
					scrollToBottom={scrollToBottom}
					state={chatInputState}
					dispatch={chatInputDispatch}
				/>
			</div>
		</div>
	)
}

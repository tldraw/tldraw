'use client'

import { useChatMessageStorage } from '@/hooks/useChatMessageStorage'
import { uploadMessageContents } from '@/utils/uploadMessageContents'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, FileUIPart, TextUIPart, UIMessage } from 'ai'
import { useCallback, useEffect } from 'react'
import { TldrawUiTooltip, TLEditorSnapshot } from 'tldraw'
import { useChatInputState } from '../hooks/useChatInputState'
import { useScrollToBottom } from '../hooks/useScrollToBottom'
import { ChatInput } from './ChatInput'
import { ClearChatIcon } from './ClearChatIcon'
import { MessageList } from './MessageList'
import { TldrawProviderMetadata, WhiteboardImage } from './WhiteboardModal'

export function Chat() {
	// store chat messages locally in the browser
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
	// All state relating to the chat input and the tldraw modal is managed in this hook
	const [chatInputState, chatInputDispatch] = useChatInputState()

	// We use the Vercel AI SDK's useChat hook to send messages to the server and manage the chat
	// history. You could replace this with your own chat implementation.
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

	// save the chat messages to local storage when the chat finishes
	useEffect(() => {
		if (chat.status === 'ready') {
			saveMessages(chat.messages)
		}
	}, [chat.status, chat.messages, saveMessages, setMessages])

	// If the chat encounters an error, we alert the user and clear the error.
	useEffect(() => {
		if (error) {
			alert(error.message)
			clearError()
		}
	}, [error, clearError])

	// when the user send a message, we take the text they've written and any images / sketches
	// they've attached and send them to the model.
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

			sendMessage({
				parts,
			})
		},
		[sendMessage, chatInputDispatch]
	)

	// keep the chat scrolled to the bottom as messages are added or changed
	const scrollToBottom = useScrollToBottom()
	useEffect(() => {
		scrollToBottom()
	}, [chat.messages, scrollToBottom])

	// when the user clicks on an image from chat history, we open the tldraw modal. here they can
	// see a larger version of the image, but also annotate it and re-add it to the chat.
	const handleImageClick = useCallback(
		(opts: { snapshot: TLEditorSnapshot; imageName: string } | { uploadedFile: File }) => {
			chatInputDispatch({
				type: 'openWhiteboard',
				...opts,
			})
		},
		[chatInputDispatch]
	)

	const handleClearChat = useCallback(() => {
		setMessages([])
		saveMessages([])
	}, [setMessages, saveMessages])

	// users can drag and drop images to the chat input area to add them to their message. when
	// they're dragging we keep track of a special isDragging state.
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

	// if the chat is empty, we put the input area right in the middle of the page
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

	// otherwise, we show the chat history and the input area at the bottom.
	return (
		<div
			className="chat-container"
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<div className="chat-header">
				<TldrawUiTooltip content="Clear chat" side="right">
					<button className="icon-button" onClick={handleClearChat}>
						<ClearChatIcon />
					</button>
				</TldrawUiTooltip>
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

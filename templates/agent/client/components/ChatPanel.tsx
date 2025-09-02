import { FormEventHandler, useCallback, useRef } from 'react'
import { useToasts, useValue } from 'tldraw'
import { convertTldrawShapeToSimpleShape } from '../../shared/format/SimpleShape'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { IChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import { handleRequest } from '../agent/handleRequest'
import { TldrawAgent } from '../agent/TldrawAgent'
import { ChatHistory } from './chat-history/ChatHistory'
import { ChatInput } from './ChatInput'
import { TodoList } from './TodoList'

export function ChatPanel({ agent }: { agent: TldrawAgent }) {
	const { editor } = agent
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const toast = useToasts()
	const modelName = useValue(agent.$modelName)

	const handleError = useCallback(
		(e: any) => {
			const message = typeof e === 'string' ? e : e instanceof Error && e.message
			toast.addToast({
				title: 'Error',
				description: message || 'An error occurred',
				severity: 'error',
			})
			console.error(e)
		},
		[toast]
	)

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()
			if (!inputRef.current) return
			const formData = new FormData(e.currentTarget)
			const value = formData.get('input') as string

			// If we're currently generating, interrupt the current request
			if (agent.isGenerating()) {
				agent.cancel()
			}

			// If the user's message is empty, do nothing
			if (value === '') return

			// If every todo item is done, clear the todo list
			agent.$todoList.update((items) => {
				if (items.every((item) => item.status === 'done')) {
					return []
				}
				return items
			})

			// Move the user's input to chat history
			const promptHistoryItem: IChatHistoryItem = {
				type: 'prompt',
				message: value,
				contextItems: agent.$contextItems.get(),
				selectedShapes: editor
					.getSelectedShapes()
					.map((shape) => convertTldrawShapeToSimpleShape(shape, editor)),
			}

			agent.$chatHistory.update((prev) => [...prev, promptHistoryItem])
			agent.$contextItems.set([])
			inputRef.current.value = ''

			// Create and send the request
			const request: AgentRequest = {
				message: promptHistoryItem.message,
				contextItems: promptHistoryItem.contextItems,
				bounds: editor.getViewportPageBounds(),
				modelName,
				type: 'user',
			}

			await handleRequest({ agent, request, onError: handleError })
		},
		[agent, modelName, editor, handleError]
	)

	function handleNewChat() {
		agent.reset()
	}

	function NewChatButton() {
		return (
			<button className="new-chat-button" onClick={handleNewChat}>
				+
			</button>
		)
	}

	return (
		<div className="chat-panel tl-theme__dark">
			<div className="chat-header">
				<NewChatButton />
			</div>
			<ChatHistory agent={agent} />
			<div className="chat-input-container">
				<TodoList agent={agent} />
				<ChatInput agent={agent} handleSubmit={handleSubmit} inputRef={inputRef} />
			</div>
		</div>
	)
}

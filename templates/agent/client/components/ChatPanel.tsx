import { FormEventHandler, useCallback, useRef, useState } from 'react'
import { useToasts, useValue } from 'tldraw'
import { convertTldrawShapeToSimpleShape } from '../../shared/format/SimpleShape'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { IChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import { advanceSchedule } from '../agent/advanceSchedule'
import { TldrawAgent } from '../agent/TldrawAgent'
import { $contextItems } from '../atoms/contextItems'
import { $modelName } from '../atoms/modelName'
import { ChatHistory } from './chat-history/ChatHistory'
import { ChatInput } from './ChatInput'
import { TodoList } from './TodoList'

export function ChatPanel({ agent }: { agent: TldrawAgent }) {
	const { editor } = agent
	const [isGenerating, setIsGenerating] = useState(false)
	const rCancelFn = useRef<(() => void) | null>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const toast = useToasts()
	const modelName = useValue('modelName', () => $modelName.get(), [$modelName])

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
			const formData = new FormData(e.currentTarget)
			const value = formData.get('input') as string

			// If we're currently generating, interrupt the current request
			if (rCancelFn.current) {
				rCancelFn.current()
				rCancelFn.current = null

				agent.$currentViewport.set(null)
				agent.$currentContextItems.set([])
				setIsGenerating(false)
			}

			// If the user's message is empty, do nothing
			if (value === '') return
			if (inputRef.current) inputRef.current.value = ''

			// If every todo item is done, clear the todo list
			agent.$todoList.update((items) => {
				if (items.every((item) => item.status === 'done')) {
					return []
				}
				return items
			})

			const promptHistoryItem: IChatHistoryItem = {
				type: 'prompt',
				message: value,
				contextItems: $contextItems.get(),
				selectedShapes: editor
					.getSelectedShapes()
					.map((shape) => convertTldrawShapeToSimpleShape(shape, editor)),
			}

			agent.$currentContextItems.set(promptHistoryItem.contextItems)
			$contextItems.set([])
			agent.$chatHistory.update((prev) => [...prev, promptHistoryItem])
			setIsGenerating(true)
			const request: AgentRequest = {
				message: promptHistoryItem.message,
				contextItems: promptHistoryItem.contextItems,
				bounds: editor.getViewportPageBounds(),
				modelName,
				type: 'user',
			}

			const { promise, cancel } = advanceSchedule({ agent, request, onError: handleError })
			rCancelFn.current = cancel
			await promise
			rCancelFn.current = null

			setIsGenerating(false)

			// TODO
			// right now, we clear the changes when the agent finishes its turn. However, this loses all the changes that happened while the agent was working. We should make this more sophisticated.
			agent.$userActionsHistory.set([])
			agent.$currentContextItems.set([])
			agent.$currentViewport.set(null)
		},
		[agent, modelName, editor, rCancelFn, handleError]
	)

	function handleNewChat() {
		if (rCancelFn.current) {
			rCancelFn.current()
			rCancelFn.current = null
		}

		setIsGenerating(false)
		$contextItems.set([])
		agent.$chatHistory.set([])
		agent.$currentContextItems.set([])
		agent.$currentViewport.set(null)
		agent.$todoList.set([])
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
			<ChatHistory agent={agent} isGenerating={isGenerating} />
			<div className="chat-input-container">
				<TodoList agent={agent} />
				<ChatInput
					handleSubmit={handleSubmit}
					inputRef={inputRef}
					isGenerating={isGenerating}
					editor={editor}
				/>
			</div>
		</div>
	)
}
